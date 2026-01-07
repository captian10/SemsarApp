// src/api/property-contacts.ts
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

export type PropertyContactRow = {
  property_id: string;
  owner_name: string | null;
  owner_phone: string | null;
  created_at?: string;
  updated_at?: string;
};

export const usePropertyContact = (propertyId: string) => {
  return useQuery({
    queryKey: ["property-contacts", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_contacts")
        .select("property_id,owner_name,owner_phone,created_at,updated_at")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (error) throw toThrowingError(error as any);
      return (data ?? null) as PropertyContactRow | null;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useUpsertPropertyContact = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      property_id: string;
      owner_name?: string | null;
      owner_phone?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("property_contacts")
        .upsert(
          {
            property_id: payload.property_id,
            owner_name: payload.owner_name ?? null,
            owner_phone: payload.owner_phone ?? null,
          },
          { onConflict: "property_id" }
        )
        .select("property_id,owner_name,owner_phone,created_at,updated_at")
        .single();

      if (error) throw toThrowingError(error as any);
      return data as PropertyContactRow;
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["property-contacts", vars.property_id] });
    },
  });
};
