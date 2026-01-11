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
    // ✅ required by newer expo-notifications
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PushData = {
  kind?: "property" | "job";
  id?: string;

  // legacy support
  type?: string;
  propertyId?: string;
  jobId?: string;
};

function navigateFromPush(
  router: ReturnType<typeof useRouter>,
  data: PushData,
  isAuthed: boolean
) {
  // Don't navigate if user isn't authenticated yet
  if (!isAuthed) return;

  // ✅ new format: { kind, id }
  if (data?.kind === "property" && data?.id) {
    router.push({
      pathname: "/(user)/home/[id]",
      params: { id: String(data.id) },
    });
    return;
  }

  if (data?.kind === "job" && data?.id) {
    router.push({
      pathname: "/(user)/jobs/[id]",
      params: { id: String(data.id) },
    });
    return;
  }

  // ✅ legacy support
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

  // ✅ If push tap happens before auth/router are ready, queue it
  const pendingNavRef = useRef<PushData | null>(null);

  const userId = session?.user?.id ?? null;
  const isAuthed = Boolean(userId);

  // 1) Register + save token once per user
  useEffect(() => {
    if (!userId) return;
    if (lastRegisteredUserIdRef.current === userId) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await registerAndSaveMyPushToken();
        if (cancelled) return;
        if (token) lastRegisteredUserIdRef.current = userId;
      } catch (e: any) {
        console.log("[push] registerAndSaveMyPushToken crash:", e?.message ?? String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 2) Listeners + killed-state open
  useEffect(() => {
    const onReceive = Notifications.addNotificationReceivedListener((n) => {
      console.log("[push] received data:", n.request.content.data);
    });

    const onTap = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = (res?.notification?.request?.content?.data ?? {}) as PushData;
      console.log("[push] tapped data:", data);

      if (!isAuthed) {
        pendingNavRef.current = data; // wait until session exists
        return;
      }
      navigateFromPush(router, data, true);
    });

    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        const data = (last?.notification?.request?.content?.data ?? {}) as PushData;

        // If there is no meaningful data, do nothing
        const hasAny =
          !!data?.kind || !!data?.id || !!data?.type || !!data?.propertyId || !!data?.jobId;
        if (!hasAny) return;

        if (!isAuthed) {
          pendingNavRef.current = data;
          return;
        }
        navigateFromPush(router, data, true);
      } catch (e: any) {
        console.log("[push] getLastNotificationResponseAsync crash:", e?.message ?? String(e));
      }
    })();

    return () => {
      onReceive.remove();
      onTap.remove();
    };
  }, [router, isAuthed]);

  // 3) Flush any pending navigation once auth becomes available
  useEffect(() => {
    if (!isAuthed) return;
    const pending = pendingNavRef.current;
    if (!pending) return;

    pendingNavRef.current = null;
    navigateFromPush(router, pending, true);
  }, [isAuthed, router]);

  // 4) Reset on logout
  useEffect(() => {
    if (!isAuthed) {
      lastRegisteredUserIdRef.current = null;
      pendingNavRef.current = null;
    }
  }, [isAuthed]);

  return <>{children}</>;
}
