// src/providers/NotificationProvider.tsx
import { registerForPushNotificationsAsync } from "@lib/notifications";
import { supabase } from "@lib/supabase";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, type PropsWithChildren } from "react";
import { useAuth } from "./AuthProvider";
// import { useRouter } from "expo-router"; // ✅ لو هتعمل navigation من هنا

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
  // const router = useRouter(); // ✅ لو هتعمل navigation من هنا

  // منع تكرار تسجيل التوكن لنفس اليوزر
  const lastRegisteredUserIdRef = useRef<string | null>(null);

  // 1) Register + save token (per user)
  useEffect(() => {
    const userId = session?.user?.id;
    const profileId = profile?.id; // غالبًا نفس userId

    if (!userId || !profileId) return;

    // لو اتسجل قبل كده لنفس اليوزر
    if (lastRegisteredUserIdRef.current === userId) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (cancelled) return;

        // ✅ Update فقط (بدون upsert) عشان TS ما يطلبش full_name/phone
        const { error } = await supabase
          .from("profiles")
          .update({ expo_push_token: token })
          .eq("id", profileId);

        if (cancelled) return;

        if (error) {
          console.log("[push] Failed to save token:", error.message);
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

        const data: any = response?.notification?.request?.content?.data ?? {};
        const type = String(data?.type ?? "");

        // ⚠️ اختياري: لو عايز تفتح صفحات من هنا
        // لو أنت بتعمل ده في hook تاني -> سيب ده مقفول
        /*
        if (type === "request" && data?.requestId) {
          router.push({
            pathname: "/(admin)/requests/[id]",
            params: { id: String(data.requestId) },
          });
        }

        if (type === "property" && data?.propertyId) {
          router.push({
            pathname: "/(admin)/home/[id]",
            params: { id: String(data.propertyId) },
          });
        }
        */
      }
    );

    return () => {
      n1.remove();
      n2.remove();
    };
  }, []);

  // 3) Reset on logout
  useEffect(() => {
    if (!session?.user?.id) {
      lastRegisteredUserIdRef.current = null;
    }
  }, [session?.user?.id]);

  return <>{children}</>;
}
