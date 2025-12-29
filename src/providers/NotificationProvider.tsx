// src/providers/NotificationProvider.tsx
import { registerForPushNotificationsAsync } from "@lib/notifications";
import { supabase } from "@lib/supabase";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useAuth } from "./AuthProvider";

// Foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NotificationProvider = ({ children }: PropsWithChildren) => {
  const { profile, session } = useAuth();

  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [pushError, setPushError] = useState<string>("");

  const didInit = useRef(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const savePushToken = async (userId: string, newToken: string) => {
    if (!newToken) return;

    // Avoid unnecessary DB writes
    setExpoPushToken((prev) => (prev === newToken ? prev : newToken));

    const { error } = await supabase
      .from("profiles")
      .update({ expo_push_token: newToken })
      .eq("id", userId);

    if (error) {
      console.log("[push] Failed to save token:", error.message);
    }
  };

  // 1) Register token when the user is logged in and profile is available
  useEffect(() => {
    // Prevent double-runs in dev / remounts
    if (didInit.current) return;

    // Only register if user is logged in and we have a profile id
    if (!session?.user?.id || !profile?.id) return;

    didInit.current = true;

    let cancelled = false;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (cancelled) return;

        await savePushToken(profile.id, token);
        setPushError("");
        console.log("[push] Expo Push Token:", token);
      } catch (err: any) {
        const msg = typeof err?.message === "string" ? err.message : String(err);
        console.log("[push] registration error:", msg);
        if (cancelled) return;

        setExpoPushToken("");
        setPushError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, profile?.id]);

  // 2) Listeners (once)
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[push] Notification received:", notification);
      }
    );

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("[push] Notification response:", response);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Optional: clear saved token when user logs out
  useEffect(() => {
    if (!session?.user?.id) {
      didInit.current = false;
      setExpoPushToken("");
      setPushError("");
    }
  }, [session?.user?.id]);

  return <>{children}</>;
};

export default NotificationProvider;
