// src/lib/supabase.ts
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "database.types";

// ✅ ثابت عشان resetAuth يبقى سهل
export const SUPABASE_STORAGE_KEY = "sb-semsarapp-auth";

// ✅ اقرأ env بشكل آمن
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // ✅ React Native
    storageKey: SUPABASE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce", // ✅ الأفضل للموبايل
  },
  global: {
    fetch, // ✅ مهم في RN
    headers: {
      // ✅ helpful (optional) to identify app in logs
      "X-Client-Info": "semsarapp",
    },
  },
});
