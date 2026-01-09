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

import type { Tables, TablesInsert } from "database.types";

/**
 * ✅ IMPORTANT
 * This MUST match the storageKey you use in createClient(..., { auth: { storageKey } })
 */
const AUTH_STORAGE_KEY = "sb-semsarapp-auth";

type DbRole = "user" | "admin";

type Profile = {
  id: string;
  role: DbRole;
  full_name: string;
  phone: string; // ✅ string (your generated types say NOT nullable)
  email: string | null;
} | null;

type AuthData = {
  session: Session | null;
  profile: Profile;
  loading: boolean;
  isAdmin: boolean;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const s = (v: unknown, fallback = "") => {
  const x = String(v ?? "").trim();
  return x ? x : fallback;
};

const normalizeRole = (v: unknown): DbRole =>
  String(v ?? "user").toLowerCase() === "admin" ? "admin" : "user";

async function getMyProfileRow(userId: string) {
  return supabase
    .from("profiles")
    .select("id, role, full_name, phone")
    .eq("id", userId)
    .maybeSingle<Tables<"profiles">>();
}

/**
 * Sometimes profile row is created slightly later by trigger.
 * We retry a bit.
 */
async function fetchProfileWithRetry(userId: string, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const { data, error } = await getMyProfileRow(userId);
    if (error) throw error;
    if (data) return data;
    await sleep(450);
  }
  return null;
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // prevent older fetches from overriding newer ones
  const fetchIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) console.log("[auth] getSession error:", error.message);
        setSession(data.session ?? null);
      } catch (e: any) {
        console.log("[auth] getSession crash:", e?.message ?? String(e));
        setSession(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession ?? null);
        setProfile(null);
      }
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
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
      // 1) try read (retry a bit)
      const row = await fetchProfileWithRetry(user.id, 6);
      if (myFetchId !== fetchIdRef.current) return;

      if (row) {
        setProfile({
          id: row.id,
          role: normalizeRole((row as any).role),
          full_name: s(row.full_name, "مستخدم"),
          phone: s(row.phone, ""), // ✅ keep as string
          email: s(user.email, "") || null,
        });
        return;
      }

      // 2) fallback upsert minimal safe fields (NO role)
      const meta = (user.user_metadata as any) ?? {};

      const minimal: TablesInsert<"profiles"> = {
        id: user.id,
        full_name: s(meta.full_name, "مستخدم"),
        phone: s(meta.phone, ""), // ✅ MUST be string (not null)
      };

      const { data: up, error: upErr } = await supabase
        .from("profiles")
        .upsert(minimal, { onConflict: "id" })
        .select("id, role, full_name, phone")
        .maybeSingle<Tables<"profiles">>();

      if (myFetchId !== fetchIdRef.current) return;

      if (upErr) {
        console.log("[auth] profiles upsert fallback error:", upErr.message);
        setProfile(null);
        return;
      }

      if (up) {
        setProfile({
          id: up.id,
          role: normalizeRole((up as any).role),
          full_name: s(up.full_name, "مستخدم"),
          phone: s(up.phone, ""),
          email: s(user.email, "") || null,
        });
      } else {
        setProfile(null);
      }
    } catch (e: any) {
      if (myFetchId !== fetchIdRef.current) return;
      console.log("[auth] refetchProfile error:", e?.message ?? String(e));
      setProfile(null);
    } finally {
      if (myFetchId === fetchIdRef.current) setProfileLoading(false);
    }
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    refetchProfile();
  }, [refetchProfile]);

  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);
  const loading = authLoading || (session ? profileLoading : false);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (e: any) {
      console.log("[auth] signOut error:", e?.message ?? String(e));
    } finally {
      setSession(null);
      setProfile(null);
      setAuthLoading(false);
      setProfileLoading(false);
    }
  }, []);

  const resetAuth = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {}

    try {
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      // delete chunked keys if any
      for (let i = 0; i < 30; i++) {
        await SecureStore.deleteItemAsync(`${AUTH_STORAGE_KEY}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${AUTH_STORAGE_KEY}.meta`);
    } catch (e: any) {
      console.log(
        "[auth] resetAuth securestore error:",
        e?.message ?? String(e)
      );
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
