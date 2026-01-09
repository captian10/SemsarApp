// src/providers/NotificationProvider.tsx
import React, { useEffect, useRef, type PropsWithChildren } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { useAuth } from "./AuthProvider";
import { registerAndSaveMyPushToken } from "@lib/notifications";

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PushData = {
  kind?: "property" | "job";
  id?: string;

  // legacy support (optional)
  type?: string;
  propertyId?: string;
  jobId?: string;
};

function navigateFromPush(router: ReturnType<typeof useRouter>, data: PushData) {
  // ✅ new format: { kind, id }
  if (data?.kind === "property" && data?.id) {
    router.push({ pathname: "/(user)/home/[id]", params: { id: String(data.id) } });
    return;
  }
  if (data?.kind === "job" && data?.id) {
    router.push({ pathname: "/(user)/jobs/[id]", params: { id: String(data.id) } });
    return;
  }

  // ✅ legacy
  const type = String(data?.type ?? "");
  if (type === "new_property" && data?.propertyId) {
    router.push({
      pathname: "/(user)/home/[id]",
      params: { id: String(data.propertyId) },
    });
    return;
  }
  if (type === "new_job" && data?.jobId) {
    router.push({
      pathname: "/(user)/jobs/[id]",
      params: { id: String(data.jobId) },
    });
    return;
  }
}

export default function NotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const router = useRouter();

  const lastRegisteredUserIdRef = useRef<string | null>(null);

  // 1) Register + save token once per user
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    if (lastRegisteredUserIdRef.current === userId) return;

    let cancelled = false;

    (async () => {
      const token = await registerAndSaveMyPushToken();
      if (cancelled) return;

      if (token) lastRegisteredUserIdRef.current = userId;
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // 2) Listeners
  useEffect(() => {
    const onReceive = Notifications.addNotificationReceivedListener((n) => {
      console.log("[push] received data:", n.request.content.data);
    });

    const onTap = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = (res?.notification?.request?.content?.data ?? {}) as PushData;
      console.log("[push] tapped data:", data);
      navigateFromPush(router, data);
    });

    // 3) If app opened from killed state by tapping notification
    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      const data = (last?.notification?.request?.content?.data ?? {}) as PushData;
      navigateFromPush(router, data);
    })();

    return () => {
      onReceive.remove();
      onTap.remove();
    };
  }, [router]);

  // 4) Reset on logout
  useEffect(() => {
    if (!session?.user?.id) lastRegisteredUserIdRef.current = null;
  }, [session?.user?.id]);

  return <>{children}</>;
}
