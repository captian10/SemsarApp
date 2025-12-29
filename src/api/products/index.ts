import { supabase } from "@lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Helper function for handling errors more consistently
const handleError = (error: any) => {
  if (error.message) {
    throw new Error(error.message);
  }
  throw new Error("Something went wrong");
};

// Fetch all products
export const useProductList = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) handleError(error);
      return data;
    },
    retry: 3, // Automatically retry failed requests up to 3 times
    refetchOnWindowFocus: false, // Prevent refetch when window is focused
  });
};

// Fetch a single product by ID
export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) handleError(error);
      return data;
    },
    retry: 3, // Automatically retry failed requests up to 3 times
    refetchOnWindowFocus: false, // Prevent refetch when window is focused
  });
};

// Insert a new product
export const useInsertProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const { error, data: newProduct } = await supabase
        .from("products")
        .insert({
          name: data.name,
          image: data.image,
          price: data.price,
        })
        .single();

      if (error) handleError(error);
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error("Insert Product Error:", error);
    },
  });
};

// Update an existing product
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const { error, data: updatedProduct } = await supabase
        .from("products")
        .update({
          name: data.name,
          image: data.image,
          price: data.price,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) handleError(error);
      return updatedProduct;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", id] });
    },
    onError: (error) => {
      console.error("Update Product Error:", error);
    },
  });
};

// Delete a product
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
