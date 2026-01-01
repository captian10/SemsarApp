import "react-native-url-polyfill/auto";
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
  // Android channels (Android 8+)
  if (Platform.OS === "android") {
    // Default channel (general)
    await Notifications.setNotificationChannelAsync("default", {
      name: "الإشعارات",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });

    // Orders channel (order updates)
    await Notifications.setNotificationChannelAsync("orders", {
      name: "تحديثات الطلبات",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // Must be a physical device
  if (!Device.isDevice) {
    handleRegistrationError("لازم تستخدم موبايل حقيقي عشان الإشعارات تشتغل.");
  }

  // Permissions
  const perm = await Notifications.getPermissionsAsync();
  let finalStatus = perm.status;

  if (finalStatus !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }

  if (finalStatus !== "granted") {
    handleRegistrationError("لم يتم منح صلاحيات الإشعارات.");
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
        "فشل استخراج Expo Push Token، لكن يوجد Native FCM Token. راجع إعدادات FCM / google-services.json."
      );
    } catch (nativeErr: any) {
      const nativeMsg =
        typeof nativeErr?.message === "string" ? nativeErr.message : String(nativeErr);

      handleRegistrationError(
        `مشكلة إعداد الإشعارات:\n\nExpo token error: ${msg}\nNative token error: ${nativeMsg}\n\nغالباً google-services.json غير مطبق أو مشكلة Google Play Services أو شبكة/VPN/Private DNS.`
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
    /** Android only (Expo): which channel to use */
    channelId?: string;
  }
): Promise<ExpoPushTicket> {
  if (!isExpoPushToken(expoPushToken)) {
    throw new Error("Invalid Expo push token format.");
  }

  const message: Record<string, any> = {
    to: expoPushToken,
    sound: opts?.sound ?? "default",
    title: opts?.title ?? "إشعار",
    body: opts?.body ?? "",
    data: opts?.data ?? {},
  };

  // Expo supports channelId for Android
  if (opts?.channelId) message.channelId = opts.channelId;

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

// ----------------------------
// Status normalization + messages
// ----------------------------

type NormalizedStatus = "new" | "cooking" | "delivering" | "delivered" | "canceled";

const normalizeStatus = (s: unknown): string => String(s ?? "").trim().toLowerCase();

/**
 * Map whatever comes from DB/Admin UI (New/Cooking/Cancelled/Preparing/etc)
 * into one stable key for UI + notifications.
 */
const toStatusKey = (raw: unknown): NormalizedStatus | null => {
  const s = normalizeStatus(raw);

  if (!s) return null;

  // Accept both spellings
  if (s === "canceled" || s === "cancelled") return "canceled";

  // Accept synonyms
  if (s === "preparing" || s === "preparation") return "cooking";

  // Direct matches
  if (s === "new") return "new";
  if (s === "cooking") return "cooking";
  if (s === "delivering") return "delivering";
  if (s === "delivered") return "delivered";

  return null;
};

/**
 * Arabic notification messages by normalized status key.
 */
const STATUS_MESSAGE_AR: Record<NormalizedStatus, string> = {
  new: "تم استلام طلبك ✅",
  cooking: "جاري تجهيز طلبك 🍳",
  delivering: "طلبك في الطريق 🚚",
  delivered: "تم توصيل طلبك 🎉",
  canceled: "تم إلغاء طلبك ❌",
};

// If you ever want bilingual, keep this and switch later
const STATUS_MESSAGE_EN: Record<NormalizedStatus, string> = {
  new: "We received your order ✅",
  cooking: "Your order is being prepared 🍳",
  delivering: "Your order is on the way 🚚",
  delivered: "Your order was delivered 🎉",
  canceled: "Your order was canceled ❌",
};

// Change this if you want EN
const APP_LANG: "ar" | "en" = "ar";

const STATUS_MESSAGE: Record<NormalizedStatus, string> =
  APP_LANG === "ar" ? STATUS_MESSAGE_AR : STATUS_MESSAGE_EN;

/**
 * Notify user about order update.
 * IMPORTANT: Best practice is to run this on a backend with service role.
 */
export const notifyUserAboutOrderUpdate = async (
  order: Tables<"orders">,
  newStatus: unknown
): Promise<ExpoPushTicket | null> => {
  if (!order?.id) {
    console.log("[push] Missing order id");
    return null;
  }
  if (!order?.user_id) {
    console.log("[push] No user_id for order:", order.id);
    return null;
  }

  const key = toStatusKey(newStatus);
  const rawStatus = String(newStatus ?? "");

  const token = await getUserExpoPushToken(order.user_id);
  if (!token) {
    console.log("[push] No token for user:", order.user_id);
    return null;
  }

  const title = APP_LANG === "ar" ? "تحديث الطلب" : "Order update";
  const body = key
    ? STATUS_MESSAGE[key]
    : APP_LANG === "ar"
    ? `تم تحديث حالة طلبك إلى: ${rawStatus}`
    : `Your order is now: ${rawStatus}`;

  try {
    const ticket = await sendPushNotification(token, {
      title,
      body,
      channelId: "orders",
      data: {
        type: "order_status_updated",
        orderId: order.id,
        status: rawStatus,
        status_normalized: key ?? "",
      },
    });

    console.log("[push] Push sent:", ticket);
    return ticket;
  } catch (e: any) {
    console.log("[push] Failed to send push:", e?.message ?? String(e));
    return null;
  }
};
