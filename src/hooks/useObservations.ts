import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys } from '@/lib/constants';
import type { Observation, EducatorProfile, RoleInstance } from '@/types/database';

export interface ObservationRow extends Observation {
  childName: string;
  childNameHi: string | null;
  childAvatarUrl: string | null;
}

export function useObservations(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null
) {
  return useQuery({
    queryKey: QueryKeys.observations(profile?.id ?? '', activeRole?.id ?? ''),
    queryFn: async (): Promise<ObservationRow[]> => {
      if (!profile || !activeRole) return [];

      const { data, error } = await supabase
        .from('educator_observations')
        .select(`
          *,
          children ( pet_name, pet_name_hi, avatar_url )
        `)
        .eq('educator_id', profile.id)
        .eq('role_instance_id', activeRole.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any) => ({
        ...row,
        childName: row.children?.pet_name ?? 'Unknown',
        childNameHi: row.children?.pet_name_hi ?? null,
        childAvatarUrl: row.children?.avatar_url ?? null,
      }));
    },
    enabled: !!profile && !!activeRole,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAddObservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      educatorId,
      roleInstanceId,
      childId,
      note,
      category,
    }: {
      educatorId: string;
      roleInstanceId: string;
      childId: string;
      note: string;
      category: string | null;
    }) => {
      const { error } = await supabase.from('educator_observations').insert({
        educator_id: educatorId,
        role_instance_id: roleInstanceId,
        child_id: childId,
        note,
        category,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent_activity'] });
    },
  });
}
