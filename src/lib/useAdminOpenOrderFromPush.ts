import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { router } from "expo-router";

export function useAdminOpenOrderFromPush() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data: any = resp.notification.request.content.data;
      if (data?.type === "new_order" && data?.orderId) {
        router.push({
          pathname: "/(admin)/orders/[id]",
          params: { id: String(data.orderId) },
        });
      }
    });
    return () => sub.remove();
  }, []);
}
