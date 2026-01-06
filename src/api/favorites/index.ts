import { supabase } from "@lib/supabase";
import { useAuth } from "@providers/AuthProvider";
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

export type FavoriteRow = {
  user_id: string;
  property_id: string;
  created_at: string;
};

export type FavoritePropertyRow = FavoriteRow & {
  property: {
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
    property_type: string | null;
    status: string;
    cover_image: string | null;
    created_at: string;
  };
};

// ---------------------------
// ✅ Query Keys (IMPORTANT)
// ---------------------------
const favKeys = {
  all: ["favorites"] as const,
  mine: (userId: string) => ["favorites", "mine", userId] as const,
  ids: (userId: string) => ["favorites", "ids", userId] as const,
  is: (userId: string, propertyId: string) =>
    ["favorites", "is", userId, propertyId] as const,
};

// ---------------------------
// ✅ Favorite IDs (lightweight)
// ---------------------------
export const useFavoriteIds = () => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";

  return useQuery({
    queryKey: favKeys.ids(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", userId);

      if (error) throw toThrowingError(error as any);

      return (data ?? []).map((r: any) => String(r.property_id));
    },
    retry: 1,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
};

// ---------------------------
// ✅ Is Favorite (single item)
// (useful in details page)
// ---------------------------
export const useIsFavorite = (propertyId: string) => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";

  const pid = String(propertyId ?? "").trim();

  return useQuery({
    queryKey: favKeys.is(userId, pid),
    enabled: !!userId && !!pid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("user_id,property_id")
        .eq("user_id", userId)
        .eq("property_id", pid)
        .maybeSingle();

      if (error) throw toThrowingError(error as any);
      return Boolean(data);
    },
    retry: 1,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
};

// ---------------------------
// ✅ My Favorites (with join)
// ---------------------------
export const useMyFavorites = () => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";

  return useQuery({
    queryKey: favKeys.mine(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          user_id, property_id, created_at,
          property:properties(
            id,title,description,price,currency,city,address,
            bedrooms,bathrooms,area_sqm,property_type,status,cover_image,created_at
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw toThrowingError(error as any);

      const rows = (data ?? []).map((r: any) => ({
        user_id: String(r.user_id),
        property_id: String(r.property_id),
        created_at: String(r.created_at),
        property: r.property
          ? {
              id: String(r.property.id ?? ""),
              title: String(r.property.title ?? ""),
              description: r.property.description ?? null,
              price: Number(r.property.price ?? 0),
              currency: r.property.currency ?? null,
              city: r.property.city ?? null,
              address: r.property.address ?? null,
              bedrooms:
                r.property.bedrooms == null ? null : Number(r.property.bedrooms),
              bathrooms:
                r.property.bathrooms == null ? null : Number(r.property.bathrooms),
              area_sqm:
                r.property.area_sqm == null ? null : Number(r.property.area_sqm),
              property_type: r.property.property_type ?? null,
              status: String(r.property.status ?? "available"),
              cover_image: r.property.cover_image ?? null,
              created_at: String(r.property.created_at ?? ""),
            }
          : null,
      })) as Array<FavoritePropertyRow | any>;

      return rows.filter((x) => x.property?.id);
    },
    retry: 2,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
};

// ---------------------------
// ✅ Toggle Favorite (Optimistic)
// ---------------------------
export const useToggleFavorite = () => {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";

  return useMutation({
    mutationFn: async (payload: { propertyId: string; next: boolean }) => {
      const propertyId = String(payload.propertyId ?? "").trim();
      const next = Boolean(payload.next);

      if (!userId) throw new Error("لازم تسجل دخول");
      if (!propertyId) throw new Error("propertyId مطلوب");

      if (next) {
        const { error } = await supabase.from("favorites").upsert(
          { user_id: userId, property_id: propertyId },
          { onConflict: "user_id,property_id", ignoreDuplicates: true }
        );
        if (error) throw toThrowingError(error as any);
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("property_id", propertyId);

        if (error) throw toThrowingError(error as any);
      }

      return { propertyId, next };
    },

    // ✅ instant UI update
    onMutate: async ({ propertyId, next }) => {
      if (!userId) return;

      const pid = String(propertyId);
      await qc.cancelQueries({ queryKey: favKeys.ids(userId) });

      const prevIds = qc.getQueryData<string[]>(favKeys.ids(userId)) ?? [];

      qc.setQueryData<string[]>(favKeys.ids(userId), (old = []) => {
        const set = new Set(old.map(String));
        if (next) set.add(pid);
        else set.delete(pid);
        return Array.from(set);
      });

      // also update is-favorite cache if it's used anywhere
      qc.setQueryData<boolean>(favKeys.is(userId, pid), next);

      return { prevIds, pid };
    },

    onError: (_err, _vars, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(favKeys.ids(userId), ctx.prevIds);
      qc.setQueryData(favKeys.is(userId, ctx.pid), ctx.prevIds.includes(ctx.pid));
    },

    onSettled: (_res, _err, vars) => {
      if (!userId) return;

      const pid = String(vars?.propertyId ?? "");
      qc.invalidateQueries({ queryKey: favKeys.ids(userId) });
      qc.invalidateQueries({ queryKey: favKeys.mine(userId) });
      qc.invalidateQueries({ queryKey: favKeys.is(userId, pid) });
    },
  });
};
