import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EducatorProfile, RoleInstance } from '@/types/database';

export interface ActivityItem {
  id: string;
  type: 'attendance' | 'observation' | 'milestone';
  childName: string;
  description: string;
  createdAt: string;
}

export function useRecentActivity(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null
) {
  return useQuery({
    queryKey: ['recent_activity', profile?.id ?? '', activeRole?.id ?? ''],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!profile || !activeRole) return [];

      const [attendance, observations, milestones] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('id, child_id, status, date, created_at, children(pet_name, pet_name_hi)')
          .eq('educator_id', profile.id)
          .eq('role_instance_id', activeRole.id)
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('educator_observations')
          .select('id, child_id, note, category, created_at, children(pet_name, pet_name_hi)')
          .eq('educator_id', profile.id)
          .eq('role_instance_id', activeRole.id)
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('educator_milestone_records')
          .select('id, child_id, status, created_at, children(pet_name, pet_name_hi), educator_milestones(title)')
          .eq('educator_id', profile.id)
          .eq('status', 'achieved')
          .order('created_at', { ascending: false })
          .limit(2),
      ]);

      const items: ActivityItem[] = [];

      for (const a of attendance.data ?? []) {
        const child = (a as any).children;
        items.push({
          id: `att-${a.id}`,
          type: 'attendance',
          childName: child?.pet_name ?? 'Student',
          description: a.status,
          createdAt: a.created_at,
        });
      }

      for (const o of observations.data ?? []) {
        const child = (o as any).children;
        items.push({
          id: `obs-${o.id}`,
          type: 'observation',
          childName: child?.pet_name ?? 'Student',
          description: o.note?.slice(0, 60) ?? '',
          createdAt: o.created_at,
        });
      }

      for (const m of milestones.data ?? []) {
        const child = (m as any).children;
        const milestone = (m as any).educator_milestones;
        items.push({
          id: `mil-${m.id}`,
          type: 'milestone',
          childName: child?.pet_name ?? 'Student',
          description: milestone?.title ?? '',
          createdAt: m.created_at,
        });
      }

      // Sort all by createdAt desc and take top 5
      return items
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    },
    enabled: !!profile && !!activeRole,
    staleTime: 60 * 1000,
  });
}
