import { supabase } from "@lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Helper
const handleError = (error: any): never => {
  if (error?.message) throw new Error(error.message);
  throw new Error("Something went wrong");
};

// ✅ Categories (optional)
export const CATEGORIES = [
  "بيتزا",
  "كريب",
  "سندوتشات",
  "وجبات",
  "وجبات أخرى",
  "مكرونة",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ProductSizeRow = {
  size: "S" | "M" | "L" | "XL";
  price: number;
};

export type ProductRow = {
  id: number;
  name: string;
  image: string | null;
  price: number | null;
  category: string | null;
  created_at: string;

  // ✅ joined from product_sizes (when requested)
  product_sizes?: ProductSizeRow[];
};

// ✅ Insert payload
export type InsertProductInput = {
  name: string;
  image: string | null;
  price: number;
  category: Category | string;
};

// ✅ Update payload
export type UpdateProductInput = {
  id: number;
  name: string;
  image: string | null;
  price: number;
  category: Category | string;
};

// ✅ Fetch all products (list) — no sizes (lighter)
export const useProductList = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,image,price,category,created_at")
        .order("created_at", { ascending: false });

      if (error) handleError(error);
      return (data ?? []) as ProductRow[];
    },
    retry: 3,
    refetchOnWindowFocus: false,
  });
};

// ✅ Fetch one product (NO sizes)
export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ["products", id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,image,price,category,created_at")
        .eq("id", id)
        .single();

      if (error) handleError(error);
      return data as ProductRow;
    },
    retry: 3,
    refetchOnWindowFocus: false,
  });
};

// ✅ Fetch one product WITH sizes (JOIN product_sizes)
export const useProductWithSizes = (id: number) => {
  return useQuery({
    queryKey: ["products", id, "with-sizes"],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,name,image,price,category,created_at,
          product_sizes(size,price)
        `
        )
        .eq("id", id)
        .single();

      if (error) handleError(error);

      // ✅ normalize sizes just in case
      const normalized = {
        ...(data as any),
        product_sizes: Array.isArray((data as any)?.product_sizes)
          ? (data as any).product_sizes.map((r: any) => ({
              size: String(r.size).trim().toUpperCase(),
              price: Number(r.price ?? 0),
            }))
          : [],
      };

      return normalized as ProductRow;
    },
    retry: 3,
    refetchOnWindowFocus: false,
  });
};

// ✅ Insert product
export const useInsertProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InsertProductInput) => {
      const { error, data: newProduct } = await supabase
        .from("products")
        .insert({
          name: payload.name,
          image: payload.image,
          price: payload.price,
          category: payload.category,
        })
        .select("id,name,image,price,category,created_at")
        .single();

      if (error) handleError(error);
      return newProduct as ProductRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error("Insert Product Error:", error);
    },
  });
};

// ✅ Update product
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProductInput) => {
      const { error, data: updatedProduct } = await supabase
        .from("products")
        .update({
          name: payload.name,
          image: payload.image,
          price: payload.price,
          category: payload.category,
        })
        .eq("id", payload.id)
        .select("id,name,image,price,category,created_at")
        .single();

      if (error) handleError(error);
      return updatedProduct as ProductRow;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", id] });
      queryClient.invalidateQueries({ queryKey: ["products", id, "with-sizes"] }); // ✅ important
      queryClient.invalidateQueries({ queryKey: ["product_sizes", id] }); // لو عندك query قديمة
    },
    onError: (error) => {
      console.error("Update Product Error:", error);
    },
  });
};

// ✅ Delete product
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) handleError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error("Delete Product Error:", error);
    },
  });
};
