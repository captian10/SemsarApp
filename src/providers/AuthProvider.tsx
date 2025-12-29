import { supabase } from "@lib/supabase";
import type { Session } from "@supabase/supabase-js";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type Profile = {
  id: string;
  group?: string | null;
} | null;

type AuthData = {
  session: Session | null;
  profile: Profile;
  loading: boolean;      // ✅ true until session AND profile (if needed) are ready
  isAdmin: boolean;
};

const AuthContext = createContext<AuthData>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // 1) initial session + subscribe once
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) console.log("getSession error:", error);
      setSession(initialSession ?? null);
      setAuthLoading(false);
    };

    init();

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      // ✅ reset profile so we refetch for the new user (or clear on logout)
      setProfile(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // 2) fetch profile whenever user changes
  useEffect(() => {
    let cancelled = false;

    const userId = session?.user?.id;

    // logout or no session => no profile
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, group")
        .eq("id", userId)
        .single();

      if (cancelled) return;

      if (error) {
        console.log("profile fetch error:", error);
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfile(data ?? null);
      setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const isAdmin = profile?.group === "ADMIN";

  // ✅ IMPORTANT: loading is true until profile is resolved (for logged-in users)
  const loading = authLoading || (session ? profileLoading : false);

  const value = useMemo<AuthData>(
    () => ({
      session,
      profile,
      loading,
      isAdmin,
    }),
    [session, profile, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
