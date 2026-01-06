import "react-native-url-polyfill/auto";
import type { Tables } from "@database.types";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * Notes:
 * - registerForPushNotificationsAsync() safe to call from app.
 * - Sending PUSH to other users/admins SHOULD be done from backend (Edge Function)
 *   because RLS will block reading other users' tokens in production.
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
    await Notifications.setNotificationChannelAsync("default", {
      name: "الإشعارات",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });

    // ✅ Real estate requests channel
    await Notifications.setNotificationChannelAsync("requests", {
      name: "طلبات واستفسارات العقارات",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (!Device.isDevice) {
    handleRegistrationError("لازم تستخدم موبايل حقيقي عشان الإشعارات تشتغل.");
  }

  const perm = await Notifications.getPermissionsAsync();
  let finalStatus = perm.status;

  if (finalStatus !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }

  if (finalStatus !== "granted") {
    handleRegistrationError("لم يتم منح صلاحيات الإشعارات.");
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  if (!projectId) {
    handleRegistrationError("Project ID not found (extra.eas.projectId).");
  }

  try {
    return await getExpoTokenWithRetry(projectId, 5);
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : String(err);
    console.log("[push] Expo token failed:", msg);

    // Debug fallback: native token to diagnose
    try {
      const nativeToken = (await Notifications.getDevicePushTokenAsync()).data;
      console.log("[push] Native device token:", nativeToken);

      handleRegistrationError(
        "فشل استخراج Expo Push Token، لكن يوجد Native Token. راجع إعدادات FCM / google-services.json."
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
    channelId?: "default" | "requests";
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

  if (!ticket) throw new Error(`Unexpected Expo response: ${text}`);
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

// ⚠️ IMPORTANT: reading ALL admin tokens from client will be blocked by RLS in production.
// best: do this in Edge Function with service role.
export const getAdminExpoPushTokens = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("role", "admin");

  if (error) {
    console.log("[push] getAdminExpoPushTokens error:", error.message);
    return [];
  }

  const tokens = (data ?? [])
    .map((r: any) => r?.expo_push_token)
    .filter((t: any) => isExpoPushToken(t)) as string[];

  // unique
  return Array.from(new Set(tokens));
};

// ----------------------------
// Requests: status normalization + messages
// ----------------------------

export type NormalizedRequestStatus = "new" | "answered" | "closed";

const normalizeStatus = (s: unknown): string => String(s ?? "").trim().toLowerCase();

const toRequestStatusKey = (raw: unknown): NormalizedRequestStatus | null => {
  const s = normalizeStatus(raw);
  if (!s) return null;

  if (s === "new") return "new";
  if (s === "answered") return "answered";
  if (s === "closed") return "closed";

  // accept some synonyms if you want:
  if (s === "open") return "new";
  if (s === "resolved") return "closed";

  return null;
};

const REQUEST_STATUS_MESSAGE_AR: Record<NormalizedRequestStatus, string> = {
  new: "تم استلام طلبك ✅",
  answered: "تم الرد على طلبك 💬",
  closed: "تم إغلاق الطلب ✅",
};

const REQUEST_STATUS_MESSAGE_EN: Record<NormalizedRequestStatus, string> = {
  new: "We received your request ✅",
  answered: "Your request has been answered 💬",
  closed: "Your request has been closed ✅",
};

const APP_LANG: "ar" | "en" = "ar";

const REQUEST_STATUS_MESSAGE =
  APP_LANG === "ar" ? REQUEST_STATUS_MESSAGE_AR : REQUEST_STATUS_MESSAGE_EN;

// ----------------------------
// Real-estate notifications
// ----------------------------

/**
 * ✅ Notify USER when their request status changes (answered/closed)
 * Use from backend/admin action (recommended).
 */
export const notifyUserAboutRequestUpdate = async (
  request: Tables<"requests">,
  newStatus: unknown
): Promise<ExpoPushTicket | null> => {
  if (!request?.id) return null;

  const userId = (request as any)?.user_id as string | null;
  if (!userId) {
    console.log("[push] request has no user_id:", request.id);
    return null;
  }

  const key = toRequestStatusKey(newStatus);
  const rawStatus = String(newStatus ?? "");

  const token = await getUserExpoPushToken(userId);
  if (!token) {
    console.log("[push] No token for user:", userId);
    return null;
  }

  const title = APP_LANG === "ar" ? "تحديث الطلب" : "Request update";
  const body = key
    ? REQUEST_STATUS_MESSAGE[key]
    : APP_LANG === "ar"
    ? `تم تحديث حالة طلبك إلى: ${rawStatus}`
    : `Your request is now: ${rawStatus}`;

  try {
    return await sendPushNotification(token, {
      title,
      body,
      channelId: "requests",
      data: {
        type: "request_updated",
        requestId: request.id,
        propertyId: (request as any)?.property_id ?? null,
        status: rawStatus,
        status_normalized: key ?? "",
      },
    });
  } catch (e: any) {
    console.log("[push] Failed to send request update:", e?.message ?? String(e));
    return null;
  }
};

/**
 * ✅ Notify ADMINS when a new request is created
 * Use from backend trigger/edge function ideally.
 */
export const notifyAdminsAboutNewRequest = async (payload: {
  requestId: string;
  propertyId?: string | null;
  phone?: string | null;
}): Promise<void> => {
  const tokens = await getAdminExpoPushTokens();
  if (!tokens.length) {
    console.log("[push] No admin tokens found.");
    return;
  }

  const title = APP_LANG === "ar" ? "طلب جديد 📩" : "New request 📩";
  const body =
    APP_LANG === "ar"
      ? "فيه عميل بعت استفسار جديد على عقار."
      : "A new inquiry was submitted for a property.";

  await Promise.all(
    tokens.map(async (t) => {
      try {
        await sendPushNotification(t, {
          title,
          body,
          channelId: "requests",
          data: {
            type: "request_created",
            requestId: payload.requestId,
            propertyId: payload.propertyId ?? null,
            phone: payload.phone ?? null,
          },
        });
      } catch (e: any) {
        console.log("[push] admin push failed:", e?.message ?? String(e));
      }
    })
  );
};
