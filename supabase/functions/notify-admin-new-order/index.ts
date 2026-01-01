import { createClient } from "npm:@supabase/supabase-js@2";

type WebhookPayload<T> = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: T;
  old_record: T | null;
};

type OrderRow = {
  id: number;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
};

const supabase = createClient(
  Deno.env.get("SB_URL")!,
  Deno.env.get("SB_SERVICE_ROLE_KEY")!
);

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  const payload = (await req.json()) as WebhookPayload<OrderRow>;

  // Only handle INSERT (new orders)
  if (payload.type !== "INSERT") {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const order = payload.record;

  // Get ALL admin push tokens
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("role", "ADMIN")
    .not("expo_push_token", "is", null);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  const tokens = (admins ?? [])
    .map((a) => a.expo_push_token as string | null)
    .filter((t): t is string => !!t);

  if (!tokens.length) {
    return new Response(JSON.stringify({ ok: true, reason: "no_admin_tokens" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ✅ Arabic push
  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: "طلب جديد ✅",
    body: `🔔 رقم الطلب #${order.id} • الإجمالي: ${order.total}`,
    data: { type: "new_order", orderId: order.id },
  }));

  // Expo Push API (batch 100)
  const results: unknown[] = [];
  for (const batch of chunk(messages, 100)) {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    results.push(await res.json());
  }

  return new Response(JSON.stringify({ ok: true, sent: tokens.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
