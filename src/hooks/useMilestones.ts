import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys } from '@/lib/constants';
import type {
  Milestone,
  MilestoneRecord,
  EducatorProfile,
  MilestoneStatus,
} from '@/types/database';

// ─── Milestone templates ──────────────────────────────────────────────────────

export function useMilestones(profile: EducatorProfile | null) {
  return useQuery({
    queryKey: QueryKeys.milestones(profile?.id ?? ''),
    queryFn: async (): Promise<Milestone[]> => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from('educator_milestones')
        .select('*')
        .eq('educator_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!profile,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      educatorId,
      title,
      titleHi,
      description,
      category,
    }: {
      educatorId: string;
      title: string;
      titleHi: string | null;
      description: string | null;
      category: string | null;
    }) => {
      const { error } = await supabase.from('educator_milestones').insert({
        educator_id: educatorId,
        title,
        title_hi: titleHi,
        description,
        category,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones'] }),
  });
}

// ─── Milestone records (per-student) ─────────────────────────────────────────

export interface MilestoneRecordRow extends MilestoneRecord {
  milestoneTitle: string;
  milestoneTitleHi: string | null;
  childName: string;
  childNameHi: string | null;
}

export function useMilestoneRecords(
  profile: EducatorProfile | null,
  childId?: string | null
) {
  return useQuery({
    queryKey: QueryKeys.milestoneRecords(profile?.id ?? '', childId ?? undefined),
    queryFn: async (): Promise<MilestoneRecordRow[]> => {
      if (!profile) return [];

      let query = supabase
        .from('educator_milestone_records')
        .select(`
          *,
          educator_milestones ( title, title_hi ),
          children ( pet_name, pet_name_hi )
        `)
        .eq('educator_id', profile.id)
        .order('created_at', { ascending: false });

      if (childId) query = query.eq('child_id', childId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any) => ({
        ...row,
        milestoneTitle: row.educator_milestones?.title ?? '',
        milestoneTitleHi: row.educator_milestones?.title_hi ?? null,
        childName: row.children?.pet_name ?? 'Unknown',
        childNameHi: row.children?.pet_name_hi ?? null,
      }));
    },
    enabled: !!profile,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Upsert single milestone record ──────────────────────────────────────────

export function useUpsertMilestoneRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      educatorId,
      childId,
      milestoneId,
      status,
      note,
    }: {
      educatorId: string;
      childId: string;
      milestoneId: string;
      status: MilestoneStatus;
      note: string | null;
    }) => {
      const { error } = await supabase
        .from('educator_milestone_records')
        .upsert(
          {
            educator_id: educatorId,
            child_id: childId,
            milestone_id: milestoneId,
            status,
            note,
            achieved_at: status === 'achieved' ? new Date().toISOString() : null,
          },
          { onConflict: 'educator_id,child_id,milestone_id' }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone_records'] });
      queryClient.invalidateQueries({ queryKey: ['recent_activity'] });
    },
  });
}

// ─── Bulk upsert milestone records ───────────────────────────────────────────

export function useBulkUpsertMilestoneRecords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      educatorId,
      milestoneId,
      childIds,
      status,
      note,
    }: {
      educatorId: string;
      milestoneId: string;
      childIds: string[];
      status: MilestoneStatus;
      note: string | null;
    }) => {
      const rows = childIds.map((childId) => ({
        educator_id: educatorId,
        child_id: childId,
        milestone_id: milestoneId,
        status,
        note,
        achieved_at: status === 'achieved' ? new Date().toISOString() : null,
      }));

      const { error } = await supabase
        .from('educator_milestone_records')
        .upsert(rows, { onConflict: 'educator_id,child_id,milestone_id' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone_records'] });
      queryClient.invalidateQueries({ queryKey: ['recent_activity'] });
    },
  });
}
