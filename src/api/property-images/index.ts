import { supabase } from "@lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

const toNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ===========================
// Types
// ===========================
export type PropertyImageRow = {
  id: string;
  property_id: string;
  url: string;
  sort_order: number;
  created_at: string;
};

const normalizeRow = (r: any): PropertyImageRow => ({
  id: String(r?.id),
  property_id: String(r?.property_id),
  url: String(r?.url),
  sort_order: toNum(r?.sort_order, 0),
  created_at: String(r?.created_at),
});

// ===========================
// Queries
// ===========================
export const usePropertyImages = (propertyId: string) => {
  return useQuery({
    queryKey: ["property-images", propertyId],
    enabled: !!propertyId,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_images")
        .select("id, property_id, url, sort_order, created_at")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw toThrowingError(error as any);

      return (data ?? []).map(normalizeRow) as PropertyImageRow[];
    },

    refetchOnWindowFocus: false,
    retry: 2,
    staleTime: 30_000,
  });
};

// ===========================
// Admin helpers (RLS: admin/owner only)
// ===========================
export type InsertPropertyImageInput = {
  property_id: string;
  url: string;
  sort_order?: number;
};

export const useInsertPropertyImage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InsertPropertyImageInput) => {
      if (!payload?.property_id) throw new Error("property_id مطلوب");
      if (!payload?.url) throw new Error("url مطلوب");

      const { data, error } = await supabase
        .from("property_images")
        .insert({
          property_id: payload.property_id,
          url: payload.url,
          sort_order: payload.sort_order ?? 0,
        })
        .select("id, property_id, url, sort_order, created_at")
        .single();

      if (error) throw toThrowingError(error as any);
      return normalizeRow(data);
    },

    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["properties", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["properties", vars.property_id, "with-images"] });
    },
  });
};

export const useDeletePropertyImage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; property_id: string }) => {
      if (!payload?.id) throw new Error("id مطلوب");
      if (!payload?.property_id) throw new Error("property_id مطلوب");

      const { error } = await supabase
        .from("property_images")
        .delete()
        .eq("id", payload.id);

      if (error) throw toThrowingError(error as any);
      return true;
    },

    onSuccess: (_ok, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["properties", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["properties", vars.property_id, "with-images"] });
    },
  });
};

export const useUpdatePropertyImageOrder = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      property_id: string;
      sort_order: number;
    }) => {
      if (!payload?.id) throw new Error("id مطلوب");
      if (!payload?.property_id) throw new Error("property_id مطلوب");

      const { data, error } = await supabase
        .from("property_images")
        .update({ sort_order: payload.sort_order })
        .eq("id", payload.id)
        .select("id, property_id, url, sort_order, created_at")
        .single();

      if (error) throw toThrowingError(error as any);
      return normalizeRow(data);
    },

    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["property-images", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["properties", vars.property_id] });
      qc.invalidateQueries({ queryKey: ["properties", vars.property_id, "with-images"] });
    },
  });
};
