import type { Tables } from "@database.types";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * Notes:
 * - registerForPushNotificationsAsync() is safe to call from the app.
 * - Sending push notifications SHOULD be done on a backend (Supabase Edge Function / Node),
 *   not from the client app, to avoid abuse.
 */

function handleRegistrationError(message: string): never {
  alert(message);
  throw new Error(message);
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const isExpoPushToken = (t: unknown): t is string =>
  typeof t === "string" &&
  (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["));

async function getExpoTokenWithRetry(projectId: string, retries = 5) {
  let delay = 1000;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : String(err);
      console.log(`[push] Expo token attempt ${attempt}/${retries} failed:`, msg);

      const transient =
        msg.includes("SERVICE_NOT_AVAILABLE") ||
        msg.includes("ExecutionException") ||
        msg.includes("java.io.IOException");

      if (!transient || attempt === retries) throw err;

      await sleep(delay);
      delay *= 2;
    }
  }

  throw new Error("Failed to fetch Expo push token after retries.");
}

export async function registerForPushNotificationsAsync(): Promise<string> {
  // Android channel (required for Android 8+)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // Must be a physical device
  if (!Device.isDevice) {
    handleRegistrationError("Must use a physical device for push notifications.");
  }

  // Permissions
  const perm = await Notifications.getPermissionsAsync();
  let finalStatus = perm.status;

  if (finalStatus !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }

  if (finalStatus !== "granted") {
    handleRegistrationError("Permission not granted to get push token.");
  }

  // projectId is required for getExpoPushTokenAsync
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  if (!projectId) {
    handleRegistrationError("Project ID not found (extra.eas.projectId).");
  }

  // Try Expo push token
  try {
    return await getExpoTokenWithRetry(projectId, 5);
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : String(err);
    console.log("[push] Expo token failed:", msg);

    // Debug-only fallback: try native device token (FCM) to diagnose issues
    try {
      const nativeToken = (await Notifications.getDevicePushTokenAsync()).data;
      console.log("[push] Native device token (FCM):", nativeToken);

      handleRegistrationError(
        "Expo Push Token failed, but native FCM token exists. If you plan to use Expo Push Service, fix FCM setup/network so Expo token can be generated."
      );
    } catch (nativeErr: any) {
      const nativeMsg =
        typeof nativeErr?.message === "string" ? nativeErr.message : String(nativeErr);

      handleRegistrationError(
        `Push setup problem:\n\nExpo token error: ${msg}\nNative token error: ${nativeMsg}\n\nUsually this means google-services.json not applied, Google Play Services issue, or network/VPN/Private DNS restrictions.`
      );
    }
  }
}

export type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: Record<string, any>;
};

export async function sendPushNotification(
  expoPushToken: string,
  opts?: {
    title?: string;
    body?: string;
    data?: Record<string, any>;
    sound?: "default" | null;
  }
): Promise<ExpoPushTicket> {
  if (!isExpoPushToken(expoPushToken)) {
    throw new Error("Invalid Expo push token format.");
  }

  const message = {
    to: expoPushToken,
    sound: opts?.sound ?? "default",
    title: opts?.title ?? "Notification",
    body: opts?.body ?? "",
    data: opts?.data ?? {},
  };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Expo push request failed (${res.status}): ${text}`);
  }

  const json = text ? JSON.parse(text) : {};
  const ticket: ExpoPushTicket | undefined = json?.data?.[0];

  if (!ticket) {
    throw new Error(`Unexpected Expo response: ${text}`);
  }

  if (ticket.status === "error") {
    throw new Error(
      `Expo push error: ${ticket.message ?? "Unknown"} | details: ${JSON.stringify(
        ticket.details ?? {}
      )}`
    );
  }

  return ticket;
}

// ----------------------------
// Supabase helpers
// ----------------------------

type ProfilePushTokenRow = { expo_push_token: string | null };

/**
 * Fetch only the token column (less data, safer).
 * Returns null if not found or token missing.
 */
export const getUserExpoPushToken = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("id", userId)
    .single<ProfilePushTokenRow>();

  if (error) {
    console.log("[push] getUserExpoPushToken error:", error.message);
    return null;
  }

  const token = data?.expo_push_token ?? null;
  return typeof token === "string" && token.length > 0 ? token : null;
};

// Optional: nicer messages per status (edit to match your OrderStatusList exactly)
const STATUS_MESSAGE: Record<string, string> = {
  new: "We received your order ✅",
  cooking: "Your order is being prepared 🍳",
  delivering: "Your order is on the way 🚚",
  delivered: "Your order was delivered 🎉",
  canceled: "Your order was canceled ❌",
};

/**
 * Notify user about order update.
 * IMPORTANT: Best practice is to run this on a backend with service role.
 */
export const notifyUserAboutOrderUpdate = async (
  order: Tables<"orders">,
  newStatus: string
): Promise<ExpoPushTicket | null> => {
  if (!order?.id) {
    console.log("[push] Missing order id");
    return null;
  }
  if (!order?.user_id) {
    console.log("[push] No user_id for order:", order.id);
    return null;
  }
  if (!newStatus) {
    console.log("[push] Missing newStatus for order:", order.id);
    return null;
  }

  const token = await getUserExpoPushToken(order.user_id);
  if (!token) {
    console.log("[push] No token for user:", order.user_id);
    return null;
  }

  const title = "Order update";
  const body = STATUS_MESSAGE[newStatus] ?? `Your order is now: ${newStatus}`;

  try {
    const ticket = await sendPushNotification(token, {
      title,
      body,
      data: {
        type: "order_status_updated",
        orderId: order.id,
        status: newStatus,
      },
    });

    console.log("[push] Push sent:", ticket);
    return ticket;
  } catch (e: any) {
    console.log("[push] Failed to send push:", e?.message ?? String(e));
    return null;
  }
};
