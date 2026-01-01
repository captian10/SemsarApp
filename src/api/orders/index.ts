import { supabase } from "@lib/supabase";
import { useAuth } from "@providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InsertTables, UpdateTables } from "../../types/types";

const handleError = (error: any): never => {
  console.log("[supabase error]", JSON.stringify(error, null, 2));
  if (error?.message) throw new Error(error.message);
  throw new Error("Something went wrong");
};

// ✅ Admin status lists
export const ADMIN_CURRENT_STATUSES = ["New", "Cooking", "Delivering"] as const;
export const ADMIN_ARCHIVED_STATUSES = ["Delivered", "Canceled"] as const;

// ✅ Admin select (join profiles) - NOW uses email instead of full_name
export const ADMIN_ORDERS_SELECT = `
  id, created_at, status, total, user_id,
  profile:profiles!orders_user_id_fkey(email, phone, role)
`;

const MY_ORDERS_SELECT = `id, created_at, status, total, user_id`;

export const useAdminOrderList = ({ archived = false }: { archived?: boolean }) => {
  const statuses = archived ? ADMIN_ARCHIVED_STATUSES : ADMIN_CURRENT_STATUSES;

  return useQuery({
    queryKey: ["admin-orders", { archived }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ADMIN_ORDERS_SELECT)
        .in("status", [...statuses])
        .order("created_at", { ascending: false });

      if (error) handleError(error);
      return data ?? [];
    },
    retry: 3,
    refetchOnWindowFocus: false,
  });
};

export const useMyOrderList = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["my-orders", { userId }],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(MY_ORDERS_SELECT)
        .eq("user_id", userId as string)
        .order("created_at", { ascending: false });

      if (error) handleError(error);
      return data ?? [];
    },
    retry: 3,
    refetchOnWindowFocus: false,
  });
};

export const useOrderDetails = (id: number) => {
  return useQuery({
    queryKey: ["order-details", id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, created_at, status, total, user_id,
          profile:profiles!orders_user_id_fkey(email, phone, role),
          order_items(
            id, created_at, order_id, product_id, size, quantity, unit_price,
            products(*)
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) handleError(error);
      return data;
    },
    retry: 3,
    refetchOnWindowFocus: false,
  });
};

export const useInsertOrder = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;

  // ✅ input بدون user_id (هنضيفه من session)
  type InsertOrderInput = Omit<InsertTables<"orders">, "user_id">;

  return useMutation({
    mutationFn: async (payload: InsertOrderInput) => {
      if (!userId) throw new Error("Not authenticated");

      const insertPayload: InsertTables<"orders"> = {
        ...payload,
        user_id: userId,
      };

      const { data, error } = await supabase
        .from("orders")
        .insert(insertPayload)
        .select("id, created_at, status, total, user_id")
        .single();

      if (error) handleError(error);
      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-details"] });
    },

    onError: (error: any) => {
      console.error("Insert Order Error:", error?.message ?? error);
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updatedFields,
    }: {
      id: number;
      updatedFields: UpdateTables<"orders">;
    }) => {
      const { data, error } = await supabase
        .from("orders")
        .update(updatedFields)
        .eq("id", id)
        .select("id, created_at, status, total, user_id")
        .single();

      if (error) handleError(error);
      return data;
    },

    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-details", id] });
    },

    onError: (error: any) => {
      console.error("Update Order Error:", error?.message ?? error);
    },
  });
};
