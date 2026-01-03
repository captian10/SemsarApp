// providers/AuthProvider.tsx
import { supabase } from "@lib/supabase";
import type { Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

/**
 * ✅ IMPORTANT
 * This MUST match the storageKey you use in createClient(..., { auth: { storageKey } })
 * Example (recommended in your supabase client):
 *   storageKey: "sb-semsarapp-auth"
 */
const AUTH_STORAGE_KEY = "sb-semsarapp-auth";

type Profile = {
  id: string;
  role: string; // 'user' | 'admin' in DB (enum user_role)
  full_name: string | null;
  phone: string | null;
  email: string | null; // comes from auth.user.email, not DB column
} | null;

type AuthData = {
  session: Session | null;
  profile: Profile;
  loading: boolean;
  isAdmin: boolean;

  // actions
  refetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthData>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refetchProfile: async () => {},
  signOut: async () => {},
  resetAuth: async () => {},
});

const safeText = (v: unknown, fallback: string | null = null) => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

const withTimeout = <T,>(
  promiseLike: PromiseLike<T>,
  ms = 8000
): Promise<T> => {
  const p = Promise.resolve(promiseLike);

  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error("Profile fetch timeout")), ms);
  });

  return Promise.race([p, timeout]).finally(() => {
    if (t) clearTimeout(t);
  });
};

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // prevents old fetch result from overriding newer one
  const fetchIdRef = useRef(0);

  // ✅ init session + subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) console.log("getSession error:", error);
        setSession(data.session ?? null);
      } catch (e: any) {
        console.log("getSession crash:", e?.message ?? String(e));
        setSession(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession ?? null);
        setProfile(null); // will refetch below
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refetchProfile = useCallback(async () => {
    const user = session?.user;

    if (!user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    const myFetchId = ++fetchIdRef.current;
    setProfileLoading(true);

    try {
      // 1) Try read profile row (NOTE: no email column in table)
      const res = await withTimeout(
        supabase
          .from("profiles")
          .select("id, role, full_name, phone")
          .eq("id", user.id)
          .maybeSingle(),
        8000
      );

      if (myFetchId !== fetchIdRef.current) return;

      const { data, error } = res;

      if (error) {
        console.log("profile fetch error:", error);
        setProfile(null);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          role: String(data.role ?? "user"), // enum user_role: 'user' | 'admin'
          full_name: data.full_name ?? null,
          phone: data.phone ?? null,
          email: safeText(user.email, null), // from auth, not DB
        });
        return;
      }

      // 2) If row missing -> upsert a default row (no email column)
      const meta = (user.user_metadata as any) ?? {};
      const payload = {
        id: user.id,
        role: "user",
        full_name: safeText(meta.full_name, null),
        phone: safeText(meta.phone, null),
      };

      const upRes = await withTimeout(
        supabase
          .from("profiles")
          .upsert(payload, { onConflict: "id" })
          .select("id, role, full_name, phone")
          .maybeSingle(),
        8000
      );

      if (myFetchId !== fetchIdRef.current) return;

      const { data: up, error: upErr } = upRes;

      if (upErr) {
        console.log("profiles upsert (missing row) error:", upErr);
        setProfile(null);
        return;
      }

      setProfile(
        up
          ? {
              id: up.id,
              role: String(up.role ?? "user"),
              full_name: up.full_name ?? null,
              phone: up.phone ?? null,
              email: safeText(user.email, null),
            }
          : null
      );
    } catch (e: any) {
      if (myFetchId !== fetchIdRef.current) return;
      console.log("refetchProfile error:", e?.message ?? String(e));
      setProfile(null);
    } finally {
      if (myFetchId === fetchIdRef.current) setProfileLoading(false);
    }
  }, [session?.user?.id, session?.user?.email]);

  // ✅ fetch profile when session changes
  useEffect(() => {
    refetchProfile();
  }, [refetchProfile]);

  const isAdmin = useMemo(() => {
    const r = String(profile?.role ?? "")
      .trim()
      .toLowerCase();
    return r === "admin";
  }, [profile?.role]);

  const loading = authLoading || (session ? profileLoading : false);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (e: any) {
      console.log("signOut error:", e?.message ?? String(e));
    } finally {
      setSession(null);
      setProfile(null);
      setAuthLoading(false);
      setProfileLoading(false);
    }
  }, []);

  /**
   * ✅ Use this if app is stuck on ActivityIndicator after restart.
   * Clears stored session in SecureStore + signs out.
   */
  const resetAuth = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {}

    try {
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);

      // also delete chunked keys if they exist
      for (let i = 0; i < 30; i++) {
        await SecureStore.deleteItemAsync(`${AUTH_STORAGE_KEY}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${AUTH_STORAGE_KEY}.meta`);
    } catch (e: any) {
      console.log("resetAuth securestore error:", e?.message ?? String(e));
    } finally {
      setSession(null);
      setProfile(null);
      setAuthLoading(false);
      setProfileLoading(false);
    }
  }, []);

  const value = useMemo<AuthData>(
    () => ({
      session,
      profile,
      loading,
      isAdmin,
      refetchProfile,
      signOut,
      resetAuth,
    }),
    [session, profile, loading, isAdmin, refetchProfile, signOut, resetAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
