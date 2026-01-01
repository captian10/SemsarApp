import { supabase } from "@lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type PgErrorLike = {
  message?: string;
  code?: string;
  hint?: string | null;
  details?: string | null;
};

const toThrowingError = (e: PgErrorLike): Error => {
  const err = new Error(e?.message ?? "Supabase error");
  (err as any).code = e?.code;
  (err as any).hint = e?.hint;
  (err as any).details = e?.details;
  return err;
};

const chunk = <T,>(arr: T[], size = 50) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

type OrderItemInsert = {
  order_id: number;
  product_id: number;
  quantity: number;
  size: string;      // "S" | "M" | "L" | "XL" (لكن نخليها string هنا)
  unit_price: number;
};

const normalizeSize = (s: unknown) => {
  const v = String(s ?? "M").trim().toUpperCase();
  return v === "S" || v === "M" || v === "L" || v === "XL" ? v : "M";
};

const normalizeItems = (items: any[]): OrderItemInsert[] => {
  const payload: OrderItemInsert[] = items.map((it) => {
    const order_id = Number(it?.order_id);
    const product_id = Number(it?.product_id);

    const quantityRaw = it?.quantity;
    const quantity =
      typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw ?? 1);

    const size = normalizeSize(it?.size);

    // ✅ supports: unit_price OR unitPrice OR price
    const unitPriceRaw =
      it?.unit_price ?? it?.unitPrice ?? it?.price ?? 0;

    const unit_price =
      typeof unitPriceRaw === "number" ? unitPriceRaw : Number(unitPriceRaw ?? 0);

    return {
      order_id,
      product_id,
      quantity,
      size,
      unit_price: round2(unit_price),
    };
  });

  for (const it of payload) {
    if (!it.order_id || !it.product_id) {
      throw new Error("بيانات order_items ناقصة: لازم order_id و product_id");
    }
    if (!Number.isFinite(it.order_id) || !Number.isFinite(it.product_id)) {
      throw new Error("order_id / product_id لازم يكونوا أرقام صحيحة");
    }
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      throw new Error("quantity لازم يكون رقم أكبر من صفر");
    }
    if (!Number.isFinite(it.unit_price) || it.unit_price < 0) {
      throw new Error("unit_price لازم يكون رقم صحيح (0 أو أكبر)");
    }
  }

  return payload;
};

export const useInsertOrderItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // ✅ خليه any[] عشان يستقبل اللي بتبعتُه من الكارت بسهولة
    mutationFn: async (items: any[]) => {
      if (!Array.isArray(items) || items.length === 0) return true;

      const payload = normalizeItems(items);

      // ✅ عندك UNIQUE (product_id, size, order_id)
      // لو ممكن تتكرر عناصر لنفس الطلب، استخدم UPSERT
      const USE_UPSERT = false as const;
      const ON_CONFLICT = "order_id,product_id,size";

      const batches = chunk(payload, 50);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const q = supabase.from("order_items");

        const { error } = USE_UPSERT
          ? await q.upsert(batch, {
              onConflict: ON_CONFLICT,
              ignoreDuplicates: false,
            })
          : await q.insert(batch);

        if (error) {
          console.log("[supabase error][order_items]", {
            batchIndex: i,
            message: (error as any).message,
            code: (error as any).code,
            hint: (error as any).hint,
            details: (error as any).details,
          });
          throw toThrowingError(error as any);
        }
      }

      return true;
    },

    onSuccess: (_ok, variables) => {
      const orderIdRaw = (variables as any)?.[0]?.order_id;
      const orderId = orderIdRaw ? Number(orderIdRaw) : null;

      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-details"] });
      queryClient.invalidateQueries({ queryKey: ["order_items"] });

      if (orderId && Number.isFinite(orderId)) {
        queryClient.invalidateQueries({ queryKey: ["order-details", orderId] });
      }
    },

    onError: (error: any) => {
      console.error("Insert Order Items Error:", {
        message: error?.message ?? String(error),
        code: error?.code,
        hint: error?.hint,
        details: error?.details,
      });
    },
  });
};
