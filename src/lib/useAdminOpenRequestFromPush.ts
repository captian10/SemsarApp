import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export const useAdminOpenRequestFromPush = () => {
  const router = useRouter();

  useEffect(() => {
    // ✅ لما تفتح التطبيق من إشعار
    Notifications.getLastNotificationResponseAsync().then((res) => {
      const data: any = res?.notification?.request?.content?.data;
      const requestId = data?.requestId || data?.id; // خليها مرنة
      if (requestId) {
        router.push({ pathname: "/(admin)/requests/[id]", params: { id: String(requestId) } });
      }
    });

    // ✅ لما يضغط على إشعار والتطبيق مفتوح/خلفية
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data: any = res?.notification?.request?.content?.data;
      const requestId = data?.requestId || data?.id;
      if (requestId) {
        router.push({ pathname: "/(admin)/requests/[id]", params: { id: String(requestId) } });
      }
    });

    return () => sub.remove();
  }, [router]);
};
