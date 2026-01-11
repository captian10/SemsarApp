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

import type { Tables } from "database.types";
import { registerForPushNotificationsAsync } from "@/lib/notifications"; // ✅ عدّل المسار لو مختلف

/**
 * ✅ IMPORTANT
 * This MUST match the storageKey you use in createClient(..., { auth: { storageKey } })
 */
const AUTH_STORAGE_KEY = "sb-semsarapp-auth";

type DbRole = "user" | "admin";

type Profile = {
  id: string;
  role: DbRole; // NOTE: not used for admin routing anymore (DB source of truth = admin_users)
  full_name: string;
  phone: string;
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
    .select("id, role, full_name, phone, expo_push_token")
    .eq("id", userId)
    .maybeSingle<Tables<"profiles">>();
}

async function fetchProfileWithRetry(userId: string, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const { data, error } = await getMyProfileRow(userId);
    if (error) throw error;
    if (data) return data;
    await sleep(450);
  }
  return null;
}

/**
 * ✅ Check admin from DB source of truth (admin_users) via RPC
 * RPC signature recommended: public.is_admin(uid uuid) returns boolean
 */
async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin", { uid: userId });
  if (error) {
    console.log("[auth] is_admin rpc error:", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * ✅ Save push token AFTER profile exists (with retries)
 */
async function saveExpoPushToken(userId: string) {
  const token = await registerForPushNotificationsAsync();
  if (!token) {
    console.log("[push] no token (null) -> not saving");
    return;
  }

  for (let i = 0; i < 6; i++) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("id", userId)
      .select("id, expo_push_token")
      .maybeSingle();

    if (!error && data?.id) {
      console.log("[push] saved token ✅");
      return;
    }

    console.log("[push] save attempt failed:", error?.message ?? "no row yet");
    await sleep(400);
  }

  console.log("[push] failed to save token after retries ❌");
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // prevent older fetches from overriding newer ones
  const fetchIdRef = useRef(0);

  // save token once per login/session
  const tokenSavedForUserRef = useRef<string | null>(null);

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
        setIsAdmin(false);
        tokenSavedForUserRef.current = null; // ✅ reset per-login
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
      setIsAdmin(false);
      setProfileLoading(false);
      return;
    }

    const myFetchId = ++fetchIdRef.current;
    setProfileLoading(true);

    try {
      // 1) fetch profile (retry because trigger might create it slightly later)
      const row = await fetchProfileWithRetry(user.id, 8);
      if (myFetchId !== fetchIdRef.current) return;

      if (!row) {
        setProfile(null);
        // still try admin check (won't hurt)
        const admin = await fetchIsAdmin(user.id);
        if (myFetchId !== fetchIdRef.current) return;
        setIsAdmin(admin);
        return;
      }

      setProfile({
        id: row.id,
        role: normalizeRole((row as any).role),
        full_name: s((row as any).full_name, "مستخدم"),
        phone: s((row as any).phone, ""),
        email: s(user.email, "") || null,
      });

      // 2) fetch admin (source of truth = admin_users)
      const admin = await fetchIsAdmin(user.id);
      if (myFetchId !== fetchIdRef.current) return;
      setIsAdmin(admin);

      // 3) save token once per login/session (only if profile exists)
      if (tokenSavedForUserRef.current !== user.id) {
        tokenSavedForUserRef.current = user.id;
        saveExpoPushToken(user.id).catch((e) =>
          console.log("[push] save crash:", e?.message ?? String(e))
        );
      }
    } catch (e: any) {
      if (myFetchId !== fetchIdRef.current) return;
      console.log("[auth] refetchProfile error:", e?.message ?? String(e));
      setProfile(null);
      setIsAdmin(false);
    } finally {
      if (myFetchId === fetchIdRef.current) setProfileLoading(false);
    }
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    refetchProfile();
  }, [refetchProfile]);

  const loading = authLoading || (session ? profileLoading : false);

  const signOut = useCallback(async () => {
    const uid = session?.user?.id;

    try {
      // ✅ clear token on logout
      if (uid) {
        const { error } = await supabase
          .from("profiles")
          .update({ expo_push_token: null })
          .eq("id", uid);

        if (error)
          console.log("[auth] clear expo_push_token error:", error.message);
      }
    } catch {}

    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setAuthLoading(false);
      setProfileLoading(false);
      tokenSavedForUserRef.current = null;
    }
  }, [session?.user?.id]);

  const resetAuth = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {}

    try {
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      for (let i = 0; i < 30; i++) {
        await SecureStore.deleteItemAsync(`${AUTH_STORAGE_KEY}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${AUTH_STORAGE_KEY}.meta`);
    } catch (e: any) {
      console.log("[auth] resetAuth securestore error:", e?.message ?? String(e));
    } finally {
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setAuthLoading(false);
      setProfileLoading(false);
      tokenSavedForUserRef.current = null;
    }
  }, [session?.user?.id]);

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
