import { supabase } from "@lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * ✅ Admin/User: listen for new requests (INSERT)
 * - refresh admin lists + user lists
 */
export const useInsertRequestSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("requests-insert-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests" },
        () => {
          // ✅ invalidate ALL admin-requests variants (status filters)
          queryClient.invalidateQueries({ queryKey: ["admin-requests"] });

          // ✅ invalidate ALL my-requests variants (per userId)
          queryClient.invalidateQueries({ queryKey: ["my-requests"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

/**
 * ✅ Listen for updates to a specific request (UPDATE)
 * - useful for details screen (admin or user)
 */
export const useUpdateRequestSubscription = (id: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`requests-update-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["request", id] });
          queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
          queryClient.invalidateQueries({ queryKey: ["my-requests"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);
};

/**
 * ✅ Optional: Listen for delete (DELETE)
 * - لو admin بيمسح requests
 */
export const useDeleteRequestSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("requests-delete-channel")
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
          queryClient.invalidateQueries({ queryKey: ["my-requests"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
