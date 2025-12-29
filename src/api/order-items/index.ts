import { supabase } from "@lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InsertTables } from "../../types/types";

const handleError = (error: any) => {
  if (error.message) {
    throw new Error(error.message);
  }
  throw new Error("Something went wrong");
};

export const useInsertOrderItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: InsertTables<"order_items">[]) => {
      const { error, data: newProduct } = await supabase
        .from("order_items")
        .insert(items)
        .select()

      if (error) handleError(error);
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error("Insert Order Error:", error);
    },
  });
};
