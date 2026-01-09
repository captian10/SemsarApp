// src/lib/notifications.ts
import "react-native-url-polyfill/auto";

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@lib/supabase";
import type { TablesInsert } from "database.types";

/**
 * SemsarApp Notifications — clean + type-safe
 *
 * - Foreground notification handler
 * - Android channels (default / requests / listings)
 * - Register + get Expo push token
 * - Save token to profile (update + fallback upsert)
 * - Call Edge Function "notify-new-listing" with forced Authorization header
 */

export type PushChannelId = "default" | "requests" | "listings";

export type BroadcastNewListingArgs = {
  kind: "property" | "job";
  id: string;
  title?: string;
  city?: string | null;
  company?: string | null;
};

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const isExpoPushToken = (t: unknown): t is string =>
  typeof t === "string" &&
  (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["));

function getProjectIdOrThrow(): string {
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      "Project ID not found. Add extra.eas.projectId (EAS) in app config."
    );
  }

  return String(projectId);
}

async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "الإشعارات",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync("requests", {
    name: "طلبات واستفسارات العقارات",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync("listings", {
    name: "عقارات ووظائف",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function getExpoToken(projectId: string): Promise<string> {
  let lastErr: any = null;

  for (let i = 1; i <= 3; i++) {
    try {
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (!isExpoPushToken(token)) throw new Error("Invalid Expo push token.");
      return token;
    } catch (e) {
      lastErr = e;
      await sleep(600 * i);
    }
  }

  throw new Error(
    `[push] Failed to get Expo push token: ${lastErr?.message ?? String(lastErr)}`
  );
}

export async function registerForPushNotificationsAsync(): Promise<string> {
  await setupAndroidChannels();

  if (!Device.isDevice) {
    throw new Error("لازم تستخدم موبايل حقيقي عشان الإشعارات تشتغل.");
  }

  const perm = await Notifications.getPermissionsAsync();
  let finalStatus = perm.status;

  if (finalStatus !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }

  if (finalStatus !== "granted") {
    throw new Error("لم يتم منح صلاحيات الإشعارات.");
  }

  const projectId = getProjectIdOrThrow();
  return getExpoToken(projectId);
}

export async function registerAndSaveMyPushToken(): Promise<string | null> {
  try {
    const token = await registerForPushNotificationsAsync();
    await saveMyExpoPushToken(token);
    return token;
  } catch (e: any) {
    console.log("[push] registerAndSaveMyPushToken failed:", e?.message ?? String(e));
    return null;
  }
}

async function getAccessTokenWithRetry(tries = 6): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const { data } = await supabase.auth.getSession();
    const t = data.session?.access_token;
    if (t) return t;
    await sleep(250);
  }
  return null;
}

export async function saveMyExpoPushToken(token: string) {
  if (!isExpoPushToken(token)) return;

  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;

  // 1) Update first
  const { data: updated, error: upErr } = await supabase
    .from("profiles")
    .update({ expo_push_token: token })
    .eq("id", uid)
    .select("id")
    .maybeSingle();

  if (upErr) {
    console.log("[push] saveMyExpoPushToken update error:", upErr.message);
    return;
  }

  if (updated?.id) {
    console.log("[push] Token saved:", token);
    return;
  }

  // 2) Fallback upsert (profile row not created yet)
  // ✅ Your DB types say phone is string (NOT nullable) => use ""
  const fallback: TablesInsert<"profiles"> = {
    id: uid,
    full_name: "مستخدم",
    phone: "",
    expo_push_token: token,
  };

  const { error: insErr } = await supabase
    .from("profiles")
    .upsert(fallback, { onConflict: "id" });

  if (insErr) {
    console.log("[push] saveMyExpoPushToken upsert fallback error:", insErr.message);
  } else {
    console.log("[push] Token saved (upsert fallback):", token);
  }
}

export async function getMyExpoPushToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return null;

  const { data: row, error } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("id", uid)
    .single<{ expo_push_token: string | null }>();

  if (error) {
    console.log("[push] getMyExpoPushToken error:", error.message);
    return null;
  }

  const t = row?.expo_push_token ?? null;
  return isExpoPushToken(t) ? t : null;
}

async function tryReadErrorBody(err: any): Promise<string | null> {
  try {
    const res = err?.context;
    if (res && typeof res.text === "function") return await res.text();
  } catch {}

  try {
    const blob = err?.context?._bodyInit?._data;
    if (typeof blob === "string") return blob;
  } catch {}

  return null;
}

export async function broadcastNewListing(args: BroadcastNewListingArgs) {
  const accessToken = await getAccessTokenWithRetry(6);
  if (!accessToken) throw new Error("Not authenticated (no access token).");

  const res = await supabase.functions.invoke("notify-new-listing", {
    body: {
      kind: args.kind,
      id: args.id,
      title: args.title?.trim() || undefined,
      city: args.city ?? null,
      company: args.company ?? null,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.error) {
    const anyErr = res.error as any;

    console.log("[push] notify-new-listing status:", anyErr?.context?.status);
    console.log("[push] notify-new-listing message:", anyErr?.message);

    const bodyTxt = await tryReadErrorBody(anyErr);
    if (bodyTxt) console.log("[push] notify-new-listing body:", bodyTxt);

    throw new Error(anyErr?.message ?? res.error.message);
  }

  return res.data as any;
}
