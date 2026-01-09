// supabase/functions/notify-new-listing/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
function chunk(arr, size) {
  const out = [];
  for(let i = 0; i < arr.length; i += size)out.push(arr.slice(i, i + size));
  return out;
}
function isExpoPushToken(t) {
  return typeof t === "string" && (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["));
}
serve(async (req)=>{
  try {
    // CORS preflight
    if (req.method === "OPTIONS") return new Response("ok", {
      headers: corsHeaders
    });
    if (req.method !== "POST") return json(405, {
      error: "Method Not Allowed"
    });
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      // If verify_jwt=true, the gateway may 401 before reaching here.
      // But if it reaches here, we still enforce it.
      return json(401, {
        error: "Missing bearer token"
      });
    }
    // 1) Verify caller (JWT) using anon key
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return json(401, {
        error: "Unauthorized"
      });
    }
    // 2) Service-role client (bypass RLS) to read role + tokens
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    // ✅ Admin check (service role = no RLS issues)
    const { data: callerProfile, error: callerProfErr } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (callerProfErr) return json(500, {
      error: callerProfErr.message
    });
    if (!callerProfile || String(callerProfile.role).toLowerCase() !== "admin") {
      return json(403, {
        error: "Forbidden"
      });
    }
    // 3) Validate body
    let body;
    try {
      body = await req.json();
    } catch  {
      return json(400, {
        error: "Invalid JSON"
      });
    }
    const kind = body?.kind;
    const id = String(body?.id ?? "").trim();
    if (kind !== "property" && kind !== "job" || !id) {
      return json(400, {
        error: "Bad Request"
      });
    }
    // 4) Read all expo tokens (exclude the caller/admin himself)
    const { data: rows, error: tokErr } = await supabaseAdmin.from("profiles").select("id, expo_push_token").not("expo_push_token", "is", null).neq("id", user.id);
    if (tokErr) return json(500, {
      error: tokErr.message
    });
    const tokens = Array.from(new Set((rows ?? []).map((r)=>String(r.expo_push_token ?? "").trim()).filter((t)=>isExpoPushToken(t))));
    const listingTitle = String(body?.title ?? "").trim();
    const city = String(body?.city ?? "").trim();
    const company = String(body?.company ?? "").trim();
    const title = kind === "property" ? "إعلان جديد 🏠" : "وظيفة جديدة 💼";
    const messageBody = kind === "property" ? (listingTitle ? listingTitle : "تم إضافة عقار جديد") + (city ? ` • ${city}` : "") : (listingTitle ? listingTitle : "تم إضافة وظيفة جديدة") + (company ? ` • ${company}` : "");
    const messages = tokens.map((to)=>({
        to,
        sound: "default",
        channelId: "listings",
        title,
        body: messageBody,
        data: {
          kind,
          id
        }
      }));
    // 5) Send in chunks (100)
    const batches = chunk(messages, 100);
    let sentOk = 0;
    let sentErr = 0;
    for (const batch of batches){
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...EXPO_ACCESS_TOKEN ? {
            Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`
          } : {}
        },
        body: JSON.stringify(batch)
      });
      const txt = await res.text().catch(()=>"");
      if (!res.ok) {
        // stop fast (you can change to continue if you prefer)
        return json(502, {
          error: `Expo push failed: ${res.status}`,
          details: txt
        });
      }
      // Expo returns { data: [{ status: 'ok'|'error', ...}, ...] }
      try {
        const parsed = txt ? JSON.parse(txt) : {};
        const tickets = Array.isArray(parsed?.data) ? parsed.data : [];
        for (const t of tickets){
          if (t?.status === "ok") sentOk++;
          else sentErr++;
        }
      } catch  {
        // If parse fails, assume sent count = batch length (better than crashing)
        sentOk += batch.length;
      }
    }
    return json(200, {
      ok: true,
      tokens: tokens.length,
      sent_ok: sentOk,
      sent_err: sentErr
    });
  } catch (e) {
    return json(500, {
      ok: false,
      error: e?.message ?? String(e)
    });
  }
});
