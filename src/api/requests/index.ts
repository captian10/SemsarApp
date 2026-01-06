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

/**
 * ✅ Status values:
 * DB default عندك = 'new'
 * وخليها مرنة لأي قيم لاحقًا
 */
export type RequestStatus = "new" | "answered" | "closed" | (string & {});

export type RequestRow = {
  id: string;
  property_id: string;
  user_id: string | null;
  message: string | null;
  phone: string | null;
  status: RequestStatus;
  created_at: string;

  // optional join later
  property?: {
    title?: string | null;
    city?: string | null;
  } | null;
};

export type CreateRequestInput = {
  property_id: string;
  message?: string | null;
  phone?: string | null;
};

/**
 * ✅ My Requests (User)
 * - enabled فقط عند وجود userId
 * - فلترة صريحة على user_id
 */
export const useMyRequests = () => {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  return useQuery({
    queryKey: ["my-requests", { userId }],
    enabled: !!userId,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(
          `
          id,property_id,user_id,message,phone,status,created_at
        `
        )
        .eq("user_id", userId as string)
        .order("created_at", { ascending: false });

      if (error) throw toThrowingError(error as any);
      return (data ?? []) as RequestRow[];
    },

    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
};

/**
 * ✅ Single Request (User/Admin)
 * RLS هيتكفل بالتصريح
 */
export const useRequest = (id: string) => {
  return useQuery({
    queryKey: ["request", id],
    enabled: Boolean(id),

    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(
          `
          id,property_id,user_id,message,phone,status,created_at
        `
        )
        .eq("id", id)
        .single();

      if (error) throw toThrowingError(error as any);
      return data as RequestRow;
    },

    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * ✅ Admin list
 * - خلي status يقبل "all" رسميًا
 * - RLS: لو مش admin هيرجع error/empty حسب إعداداتك
 */
export const useAdminRequests = (status: RequestStatus | "all" = "all") => {
  return useQuery({
    queryKey: ["admin-requests", { status }],

    queryFn: async () => {
      let q = supabase
        .from("requests")
        .select(
          `
          id,property_id,user_id,message,phone,status,created_at
        `
        )
        .order("created_at", { ascending: false });

      if (status !== "all") q = q.eq("status", status);

      const { data, error } = await q;
      if (error) throw toThrowingError(error as any);

      return (data ?? []) as RequestRow[];
    },

    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });
};

export const useCreateRequest = () => {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  return useMutation({
    mutationFn: async (payload: CreateRequestInput) => {
      if (!payload?.property_id) throw new Error("property_id مطلوب لإنشاء الطلب");
      if (!userId) throw new Error("لازم تسجل دخول قبل إنشاء طلب");

      const { data, error } = await supabase
        .from("requests")
        .insert({
          property_id: payload.property_id,
          user_id: userId,
          message: payload.message ?? null,
          phone: payload.phone ?? null,
          // status default = 'new'
        })
        .select("id,property_id,user_id,message,phone,status,created_at")
        .single();

      if (error) throw toThrowingError(error as any);
      return data as RequestRow;
    },

    onSuccess: (_row) => {
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },

    onError: (error: any) => {
      console.error("Create Request Error:", {
        message: error?.message ?? String(error),
        code: error?.code,
        hint: error?.hint,
        details: error?.details,
      });
    },
  });
};

/**
 * ✅ Admin فقط (لتغيير الحالة)
 */
export const useUpdateRequestStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; status: RequestStatus }) => {
      if (!payload?.id) throw new Error("id مطلوب");
      if (!payload?.status) throw new Error("status مطلوب");

      const { data, error } = await supabase
        .from("requests")
        .update({ status: payload.status })
        .eq("id", payload.id)
        .select("id,property_id,user_id,message,phone,status,created_at")
        .single();

      if (error) throw toThrowingError(error as any);
      return data as RequestRow;
    },

    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["request", vars.id] });
    },

    onError: (error: any) => {
      console.error("Update Request Status Error:", {
        message: error?.message ?? String(error),
        code: error?.code,
        hint: error?.hint,
        details: error?.details,
      });
    },
  });
};
