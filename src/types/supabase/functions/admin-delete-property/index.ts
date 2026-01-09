// supabase/functions/admin-delete-property/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "property-images";

// Keep this ONLY for legacy cleanup (if you previously stored under properties/<id>/...)
const LEGACY_STORAGE_PREFIX = "properties";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function removeInBatches(
  supabaseAdmin: ReturnType<typeof createClient>,
  paths: string[],
  batchSize = 1000
) {
  let deleted = 0;

  for (let i = 0; i < paths.length; i += batchSize) {
    const chunk = paths.slice(i, i + batchSize);
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove(chunk);
    if (error) throw error;
    deleted += chunk.length;
  }

  return deleted;
}

function safeString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Accepts:
 * - object key stored in DB: "abc.jpg" OR "properties/<id>/abc.jpg" (legacy)
 * - full public URL: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
 * - signed URL:     https://<ref>.supabase.co/storage/v1/object/sign/<bucket>/<key>?token=...
 *
 * Returns the bucket object key (path) or null.
 */
function extractObjectKeyFromValue(value: string): string | null {
  const v = safeString(value);
  if (!v) return null;
  if (v.startsWith("file://")) return null;

  // If it's already a relative storage path/key
  if (!v.startsWith("http://") && !v.startsWith("https://")) {
    return v.replace(/^\/+/, "");
  }

  // Parse Supabase storage URLs
  try {
    const u = new URL(v);
    const parts = u.pathname.split("/").filter(Boolean);

    // Expected patterns include:
    // storage/v1/object/public/<bucket>/<key...>
    // storage/v1/object/sign/<bucket>/<key...>
    const objIdx = parts.findIndex((p) => p === "object");
    if (objIdx >= 0) {
      const access = parts[objIdx + 1]; // "public" | "sign" | ...
      const bucket = parts[objIdx + 2];
      const keyParts = parts.slice(objIdx + 3);

      if ((access === "public" || access === "sign") && bucket === BUCKET && keyParts.length) {
        return keyParts.join("/");
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function collectPathsFromAny(value: unknown, out: Set<string>, depth = 0) {
  if (depth > 5) return;

  if (typeof value === "string") {
    const key = extractObjectKeyFromValue(value);
    if (key) out.add(key);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectPathsFromAny(item, out, depth + 1);
    return;
  }

  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectPathsFromAny(v, out, depth + 1);
    }
  }
}

async function listLegacyFolderObjects(
  supabaseAdmin: ReturnType<typeof createClient>,
  propertyId: string
) {
  const folderPrefix = `${LEGACY_STORAGE_PREFIX}/${propertyId}/`;

  const { data: objects, error: objErr } = await supabaseAdmin
    .from("storage.objects")
    .select("name")
    .eq("bucket_id", BUCKET)
    .like("name", `${folderPrefix}%`);

  if (objErr) throw objErr;

  const paths = (objects ?? [])
    .map((o: any) => o?.name)
    .filter((n: any) => typeof n === "string" && n.length > 0)
    .filter((n: string) => !n.endsWith("/") && !n.includes(".emptyFolderPlaceholder"));

  return { folderPrefix, paths };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { ok: false, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
    }
    if (!SERVICE_ROLE) {
      return json(500, {
        ok: false,
        error: "Missing service role key (SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY)",
      });
    }

    // ✅ be flexible with header casing
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";

    // ✅ User client (JWT validation)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();

    if (userErr || !userData?.user) {
      return json(401, {
        ok: false,
        code: 401,
        message: userErr?.message ?? "Invalid JWT",
      });
    }

    // ✅ Verify admin from profiles
    const { data: prof, error: profErr } = await supabaseUser
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profErr) return json(500, { ok: false, error: profErr.message, step: "profiles" });

    if (!prof || String(prof.role).toLowerCase() !== "admin") {
      return json(403, { ok: false, error: "Forbidden (admin only)" });
    }

    const body = await req.json().catch(() => ({}));
    const property_id = String(body?.property_id ?? "").trim();
    if (!property_id) return json(400, { ok: false, error: "property_id is required" });

    // ✅ Admin client (service role)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // ------------------------------------------------------------
    // 1) Collect image paths from DB (root keys مثل "abc.jpg" أو legacy keys)
    // ------------------------------------------------------------
    const pathsSet = new Set<string>();

    // properties row (scan all fields for possible paths/urls)
    const { data: propRow, error: propErr } = await supabaseAdmin
      .from("properties")
      .select("*")
      .eq("id", property_id)
      .maybeSingle();

    if (propErr) {
      return json(500, { ok: false, error: propErr.message, step: "read properties" });
    }
    if (propRow) {
      collectPathsFromAny(propRow, pathsSet);
    }

    // property_images (scan all columns for possible paths/urls)
    const { data: propImgs, error: imgsErr } = await supabaseAdmin
      .from("property_images")
      .select("*")
      .eq("property_id", property_id);

    if (imgsErr) {
      return json(500, { ok: false, error: imgsErr.message, step: "read property_images" });
    }
    for (const row of propImgs ?? []) collectPathsFromAny(row, pathsSet);

    // ------------------------------------------------------------
    // 2) ALSO collect legacy folder objects (if you used properties/<id>/...)
    // ------------------------------------------------------------
    let legacy_folderPrefix: string | null = null;
    let legacy_found = 0;
    try {
      const legacy = await listLegacyFolderObjects(supabaseAdmin, property_id);
      legacy_folderPrefix = legacy.folderPrefix;
      legacy_found = legacy.paths.length;
      for (const p of legacy.paths) pathsSet.add(p);
    } catch {
      // ignore legacy listing errors (best effort)
    }

    const paths = Array.from(pathsSet).filter(Boolean);

    // ------------------------------------------------------------
    // 3) Delete dependent tables first
    // ------------------------------------------------------------
    const dep1 = await supabaseAdmin.from("favorites").delete().eq("property_id", property_id);
    if (dep1.error) return json(500, { ok: false, error: dep1.error.message, step: "delete favorites" });

    const dep2 = await supabaseAdmin.from("requests").delete().eq("property_id", property_id);
    if (dep2.error) return json(500, { ok: false, error: dep2.error.message, step: "delete requests" });

    const dep3 = await supabaseAdmin.from("property_images").delete().eq("property_id", property_id);
    if (dep3.error) return json(500, { ok: false, error: dep3.error.message, step: "delete property_images" });

    // ------------------------------------------------------------
    // 4) Delete storage files (best effort)
    // ------------------------------------------------------------
    let deleted_files = 0;
    let storage_warning: string | null = null;

    if (paths.length) {
      try {
        deleted_files = await removeInBatches(supabaseAdmin, paths, 1000);
      } catch (e: any) {
        storage_warning = String(e?.message ?? e);
        // continue
      }
    }

    // ------------------------------------------------------------
    // 5) Delete property row
    // ------------------------------------------------------------
    const { data: deletedRows, error: delErr } = await supabaseAdmin
      .from("properties")
      .delete()
      .eq("id", property_id)
      .select("id");

    if (delErr) {
      return json(500, {
        ok: false,
        error: delErr.message,
        step: "delete properties",
        property_id,
        deleted_files,
        files_found: paths.length,
        storage_warning,
      });
    }

    return json(200, {
      ok: true,
      property_id,
      deleted_property: (deletedRows?.length ?? 0) > 0,
      files_found: paths.length,
      deleted_files,
      storage_warning,
      legacy_folderPrefix,
      legacy_found,
      sample_paths: paths.slice(0, 10),
    });
  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message ?? e) });
  }
});
