// src/providers/NotificationProvider.tsx
import { registerForPushNotificationsAsync } from "@lib/notifications";
import { supabase } from "@lib/supabase";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, type PropsWithChildren } from "react";
import { useAuth } from "./AuthProvider";

// Foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function NotificationProvider({ children }: PropsWithChildren) {
  const { session, profile } = useAuth();

  // نخزن آخر userId اتسجل له توكن عشان ما نكررهاش
  const lastRegisteredUserIdRef = useRef<string | null>(null);

  // 1) Register + save token (per user)
  useEffect(() => {
    const userId = session?.user?.id;
    const profileId = profile?.id;

    // لازم يبقى فيه session + profile
    if (!userId || !profileId) return;

    // لو اتسجل قبل كده لنفس اليوزر: متعملش حاجة
    if (lastRegisteredUserIdRef.current === userId) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (cancelled) return;

        // 1) هات التوكن القديم من الـ profile
        const { data: existing, error: readErr } = await supabase
          .from("profiles")
          .select("expo_push_token")
          .eq("id", profileId)
          .single();

        if (cancelled) return;

        if (readErr) {
          console.log("[push] Failed to read existing token:", readErr.message);
        }

        const oldToken = (existing as any)?.expo_push_token ?? null;

        // 2) لو نفس التوكن موجود -> خلاص
        if (oldToken === token) {
          lastRegisteredUserIdRef.current = userId;
          return;
        }

        // 3) خزّن التوكن الجديد
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ expo_push_token: token })
          .eq("id", profileId);

        if (upErr) {
          console.log("[push] Failed to save token:", upErr.message);
          return;
        }

        lastRegisteredUserIdRef.current = userId;
        console.log("[push] Token saved:", token);
      } catch (err: any) {
        console.log(
          "[push] registration error:",
          typeof err?.message === "string" ? err.message : String(err)
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, profile?.id]);

  // 2) Listeners (once)
  useEffect(() => {
    const n1 = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[push] Notification received:", notification);
    });

    const n2 = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("[push] Notification response:", response);
      }
    );

    return () => {
      n1.remove();
      n2.remove();
    };
  }, []);

  // 3) Reset on logout (so next login registers again)
  useEffect(() => {
    if (!session?.user?.id) {
      lastRegisteredUserIdRef.current = null;
    }
  }, [session?.user?.id]);

  return <>{children}</>;
}
