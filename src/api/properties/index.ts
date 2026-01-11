// src/api/properties.ts
import { THEME } from "@constants/Colors";
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

export const PROPERTY_TYPES = [
  "شقة",
  "محل",
  "مخزن",
  "أرض",
  "سكن طلبة",
  "غير ذلك",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// ✅ DB status values (ENGLISH)
export const PROPERTY_STATUS = ["available", "sold", "rented"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUS)[number];

// ✅ UI labels (AR) — For display only (legacy)
export const STATUS_AR: Record<PropertyStatus, string> = {
  available: "متاح",
  sold: "بيع تمليك",
  rented: "ايجار",
};

// ✅ Useful for dropdowns/filters in UI (legacy)
export const STATUS_OPTIONS: Array<{ label: string; value: PropertyStatus }> = [
  { label: "متاح", value: "available" },
  { label: "بيع تمليك", value: "sold" },
  { label: "ايجار", value: "rented" },
];

// ✅ Safe label (handles unknown values) — legacy
export const statusLabel = (s: unknown) => {
  const v = String(s ?? "").trim().toLowerCase();
  if (v === "available") return "متاح";
  if (v === "sold") return "بيع تمليك";
  if (v === "rented") return "ايجار";
  return "—";
};

// ✅ Label exactly as you want in [id]
export const statusLabelAr = (s: unknown) => {
  const v = String(s ?? "").trim().toLowerCase();
  if (v === "available") return "متاح";
  if (v === "rented") return "للإيجار";
  if (v === "sold") return "للبيع";
  return "—";
};

// ✅ Color exactly as you want in [id]
export const statusColor = (s: unknown) => {
  const v = String(s ?? "").trim().toLowerCase();
  if (v === "available") return THEME.primary; // متاح
  if (v === "rented") return "#EF4444"; // للإيجار
  if (v === "sold") return "#22C55E"; // للبيع
  return THEME.gray?.[100] ?? "#64748B";
};

// ✅ Joined image row
export type PropertyImageRow = {
  id: string;
  property_id: string;
  url: string;
  sort_order: number | null;
  created_at: string;
};

// ✅ Main property row
export type PropertyRow = {
  id: string;
  title: string;
  description: string | null;

  price: number;
  currency: string | null;

  city: string | null;
  address: string | null;

  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;

  property_type: PropertyType | string | null;

  // ✅ keep flexible if DB has older values
  status: PropertyStatus | (string & {});

  cover_image: string | null;
  created_at: string;

  // joined
  images?: PropertyImageRow[];
};

export type InsertPropertyInput = {
  title: string;
  description?: string | null;

  price: number;
  currency?: string | null;

  city?: string | null;
  address?: string | null;

  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;

  property_type?: PropertyType | string | null;
  status?: PropertyStatus; // ✅ send EN to DB

  cover_image?: string | null;
};

export type UpdatePropertyInput = InsertPropertyInput & { id: string };

export type PropertyListFilters = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  type?: PropertyType | string;
  status?: PropertyStatus; // ✅ filter using EN
};

// ===========================
// SELECT FIELDS (consistent)
// ===========================
const PROPERTY_FIELDS =
  "id,title,description,price,currency,city,address,bedrooms,bathrooms,area_sqm,property_type,status,cover_image,created_at";

// ✅ freeze filters for queryKey stability
const freezeFilters = (f?: PropertyListFilters) => ({
  city: f?.city ?? null,
  minPrice: typeof f?.minPrice === "number" ? f.minPrice : null,
  maxPrice: typeof f?.maxPrice === "number" ? f.maxPrice : null,
  type: f?.type ?? null,
  status: f?.status ?? null,
});

// ===========================
// LIST
// ===========================
export const usePropertyList = (filters?: PropertyListFilters) => {
  const keyFilters = freezeFilters(filters);

  return useQuery({
    queryKey: ["properties", "list", keyFilters],

    queryFn: async () => {
      let q = supabase
        .from("properties")
        .select(PROPERTY_FIELDS)
        .order("created_at", { ascending: false });

      if (keyFilters.city) q = q.ilike("city", `%${keyFilters.city}%`);
      if (typeof keyFilters.minPrice === "number")
        q = q.gte("price", keyFilters.minPrice);
      if (typeof keyFilters.maxPrice === "number")
        q = q.lte("price", keyFilters.maxPrice);
      if (keyFilters.type) q = q.eq("property_type", keyFilters.type);
      if (keyFilters.status) q = q.eq("status", keyFilters.status);

      const { data, error } = await q;
      if (error) throw toThrowingError(error as any);

      return (data ?? []) as PropertyRow[];
    },

    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
};

// ===========================
// SINGLE (no images)
// ===========================
export const useProperty = (id: string) => {
  return useQuery({
    queryKey: ["properties", id],
    enabled: !!id,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(PROPERTY_FIELDS)
        .eq("id", id)
        .single();

      if (error) throw toThrowingError(error as any);
      return data as PropertyRow;
    },

    retry: 2,
    refetchOnWindowFocus: false,
  });
};

// ===========================
// SINGLE (with images)
// ===========================
export const usePropertyWithImages = (id: string) => {
  return useQuery({
    queryKey: ["properties", id, "with-images"],
    enabled: !!id,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          ${PROPERTY_FIELDS},
          images:property_images(id,property_id,url,sort_order,created_at)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw toThrowingError(error as any);

      const images = Array.isArray((data as any)?.images)
        ? (data as any).images
            .map((r: any) => ({
              id: String(r.id),
              property_id: String(r.property_id),
              url: String(r.url),
              sort_order: r.sort_order ?? 0,
              created_at: String(r.created_at),
            }))
            .sort(
              (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            )
        : [];

      const normalized: PropertyRow = {
        ...(data as any),
        images,
      };

      // ✅ if no cover, use first image url
      if (!normalized.cover_image && images.length > 0) {
        normalized.cover_image = images[0].url;
      }

      return normalized;
    },

    retry: 2,
    refetchOnWindowFocus: false,
  });
};

// ===========================
// INSERT
// ===========================
export const useInsertProperty = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InsertPropertyInput) => {
      if (!payload?.title) throw new Error("title مطلوب");
      if (!Number.isFinite(Number(payload.price))) throw new Error("price مطلوب");

      const { data, error } = await supabase
        .from("properties")
        .insert({
          title: payload.title,
          description: payload.description ?? null,

          price: payload.price,
          currency: payload.currency ?? "EGP",

          city: payload.city ?? null,
          address: payload.address ?? null,

          bedrooms: payload.bedrooms ?? null,
          bathrooms: payload.bathrooms ?? null,
          area_sqm: payload.area_sqm ?? null,

          property_type: payload.property_type ?? null,
          status: payload.status ?? "available", // ✅ default EN

          cover_image: payload.cover_image ?? null,
        })
        .select(PROPERTY_FIELDS)
        .single();

      if (error) throw toThrowingError(error as any);
      return data as PropertyRow;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
};

// ===========================
// UPDATE
// ===========================
export const useUpdateProperty = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePropertyInput) => {
      if (!payload?.id) throw new Error("id مطلوب");

      const { data, error } = await supabase
        .from("properties")
        .update({
          title: payload.title,
          description: payload.description ?? null,

          price: payload.price,
          currency: payload.currency ?? "EGP",

          city: payload.city ?? null,
          address: payload.address ?? null,

          bedrooms: payload.bedrooms ?? null,
          bathrooms: payload.bathrooms ?? null,
          area_sqm: payload.area_sqm ?? null,

          property_type: payload.property_type ?? null,
          status: payload.status ?? "available", // ✅ keep EN

          cover_image: payload.cover_image ?? null,
        })
        .eq("id", payload.id)
        .select(PROPERTY_FIELDS)
        .single();

      if (error) throw toThrowingError(error as any);
      return data as PropertyRow;
    },

    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["properties", vars.id] });
      qc.invalidateQueries({ queryKey: ["properties", vars.id, "with-images"] });
    },
  });
};

// ===========================
// DELETE
// ===========================
export const useDeleteProperty = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!id) throw new Error("id مطلوب");

      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw toThrowingError(error as any);

      return true;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
};
