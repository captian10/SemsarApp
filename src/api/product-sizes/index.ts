import { supabase } from "@lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type PizzaSize = "S" | "M" | "L" | "XL";

export type ProductSizeRow = {
  id: number;
  product_id: number;
  size: PizzaSize;
  price: number;
};

const SIZE_ORDER: PizzaSize[] = ["S", "M", "L", "XL"];

const normSize = (v: unknown): PizzaSize | null => {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "S" || s === "M" || s === "L" || s === "XL") return s;
  return null;
};

export const useProductSizes = (productId: number) => {
  return useQuery({
    queryKey: ["product_sizes", productId],
    enabled: Number.isFinite(productId) && productId > 0,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_sizes")
        .select("id, product_id, size, price")
        .eq("product_id", productId);

      if (error) throw new Error(error.message);

      const cleaned: ProductSizeRow[] = (data ?? [])
        .map((r: any) => {
          const size = normSize(r.size);
          if (!size) return null;
          return {
            id: Number(r.id),
            product_id: Number(r.product_id),
            size,
            price: Number(r.price ?? 0),
          } as ProductSizeRow;
        })
        .filter(Boolean) as ProductSizeRow[];

      // ✅ sort S, M, L, XL
      cleaned.sort(
        (a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)
      );

      return cleaned;
    },

    // ✅ recommended settings
    refetchOnWindowFocus: false,
    retry: 2,
    staleTime: 30_000,
  });
};
