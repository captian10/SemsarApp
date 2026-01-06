import "react-native-url-polyfill/auto";

import { Database } from "@database.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ✅ خليه ثابت عشان مسح الجلسة يبقى سهل
export const SUPABASE_STORAGE_KEY = "sb-semsarapp-auth";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient<Database>(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    storage: AsyncStorage, // ✅ React Native
    storageKey: SUPABASE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce", // ✅ أفضل للموبايل
  },
  global: {
    // ✅ مهم في React Native
    fetch,
  },
});
