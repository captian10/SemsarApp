import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Job = {
  id: string;
  created_at: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
};

const JOB_SELECT =
  "id,created_at,title,company,location,salary,description,is_active,created_by";

/** =========================
 *  USER
 *  ========================= */

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Job[];
    },
  });
}

export function useJob(id?: string) {
  return useQuery({
    queryKey: ["jobs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("JOB_NOT_FOUND");
      return data as Job;
    },
  });
}

/** =========================
 *  ADMIN
 *  ========================= */

export function useAdminJobs() {
  return useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Job[];
    },
  });
}

export type JobUpsertInput = {
  title: string;
  company?: string | null;
  location?: string | null;
  salary?: string | null;
  description?: string | null;
  is_active?: boolean;
};

export function useCreateJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: JobUpsertInput) => {
      const insertPayload = {
        title: payload.title.trim(),
        company: payload.company?.trim() || null,
        location: payload.location?.trim() || null,
        salary: payload.salary?.trim() || null,
        description: payload.description?.trim() || null,
        is_active: payload.is_active ?? true,
      };

      const { data, error } = await supabase
        .from("jobs")
        .insert(insertPayload)
        .select(JOB_SELECT)
        .single();

      if (error) throw error;
      return data as Job;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      await qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string } & JobUpsertInput) => {
      const updatePayload = {
        title: payload.title.trim(),
        company: payload.company?.trim() || null,
        location: payload.location?.trim() || null,
        salary: payload.salary?.trim() || null,
        description: payload.description?.trim() || null,
        is_active: payload.is_active,
      };

      const { data, error } = await supabase
        .from("jobs")
        .update(updatePayload)
        .eq("id", payload.id)
        .select(JOB_SELECT)
        .single();

      if (error) throw error;
      return data as Job;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      await qc.invalidateQueries({ queryKey: ["jobs"] });
      await qc.invalidateQueries({ queryKey: ["jobs", vars.id] });
    },
  });
}

export function useToggleJobActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("jobs")
        .update({ is_active: payload.is_active })
        .eq("id", payload.id);

      if (error) throw error;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      await qc.invalidateQueries({ queryKey: ["jobs"] });
      await qc.invalidateQueries({ queryKey: ["jobs", vars.id] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string }) => {
      const { error } = await supabase.from("jobs").delete().eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      await qc.invalidateQueries({ queryKey: ["jobs"] });
      await qc.invalidateQueries({ queryKey: ["jobs", vars.id] });
    },
  });
}
