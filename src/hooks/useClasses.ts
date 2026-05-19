import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys } from '@/lib/constants';
import type { EducatorClass, EducatorProfile, RoleInstance } from '@/types/database';

// ─── List ─────────────────────────────────────────────────────────────────────

export function useClasses(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null
) {
  return useQuery({
    queryKey: QueryKeys.classes(profile?.id ?? '', activeRole?.id ?? ''),
    queryFn: async (): Promise<EducatorClass[]> => {
      if (!profile || !activeRole) return [];
      const { data, error } = await supabase
        .from('educator_classes')
        .select('*')
        .eq('educator_id', profile.id)
        .eq('role_instance_id', activeRole.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!profile && !!activeRole,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Roster (students in a class) ────────────────────────────────────────────

export interface RosterRow {
  childId: string;
  name: string;
  nameHi: string | null;
  avatarUrl: string | null;
}

export function useClassRoster(
  classId: string | null,
  educatorId: string | null
) {
  return useQuery({
    queryKey: ['class_roster', classId ?? ''],
    queryFn: async (): Promise<RosterRow[]> => {
      if (!classId || !educatorId) return [];
      const { data, error } = await supabase
        .from('educator_students')
        .select(`
          child_id,
          children ( pet_name, pet_name_hi, avatar_url )
        `)
        .eq('class_id', classId)
        .eq('educator_id', educatorId)
        .eq('approval_status', 'approved');
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        childId: row.child_id,
        name: row.children?.pet_name ?? 'Unknown',
        nameHi: row.children?.pet_name_hi ?? null,
        avatarUrl: row.children?.avatar_url ?? null,
      }));
    },
    enabled: !!classId && !!educatorId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      educatorId,
      roleInstanceId,
      name,
      subject,
      grade,
      schedule,
    }: {
      educatorId: string;
      roleInstanceId: string;
      name: string;
      subject: string | null;
      grade: string | null;
      schedule: string | null;
    }) => {
      const { error } = await supabase.from('educator_classes').insert({
        educator_id: educatorId,
        role_instance_id: roleInstanceId,
        name,
        subject,
        grade,
        schedule,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      name,
      subject,
      grade,
      schedule,
    }: {
      classId: string;
      name: string;
      subject: string | null;
      grade: string | null;
      schedule: string | null;
    }) => {
      const { error } = await supabase
        .from('educator_classes')
        .update({ name, subject, grade, schedule })
        .eq('id', classId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('educator_classes')
        .delete()
        .eq('id', classId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}
