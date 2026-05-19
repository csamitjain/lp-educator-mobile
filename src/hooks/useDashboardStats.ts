/**
 * useDashboardStats
 * Fetches all 4 stat card values in parallel for the active role.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys, roleHasFee } from '@/lib/constants';
import { currentYearMonth } from '@/lib/fee-utils';
import type { RoleInstance, EducatorProfile } from '@/types/database';

interface DashboardStats {
  studentCount: number;
  presentToday: number;
  classCount: number;
  feePending: number;
  observationCount: number;
}

export function useDashboardStats(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null
) {
  return useQuery({
    queryKey: QueryKeys.dashboardStats(profile?.id ?? '', activeRole?.id ?? ''),
    queryFn: async (): Promise<DashboardStats> => {
      if (!profile || !activeRole) return defaultStats();

      const today = new Date().toISOString().split('T')[0];
      const month = currentYearMonth();

      const [students, attendance, classes, observations, feePlans, feePayments] =
        await Promise.all([
          // Approved students
          supabase
            .from('educator_students')
            .select('id', { count: 'exact', head: true })
            .eq('educator_id', profile.id)
            .eq('role_instance_id', activeRole.id)
            .eq('approval_status', 'approved'),

          // Present today
          supabase
            .from('attendance_records')
            .select('id', { count: 'exact', head: true })
            .eq('educator_id', profile.id)
            .eq('role_instance_id', activeRole.id)
            .eq('date', today)
            .eq('status', 'present'),

          // Classes
          supabase
            .from('educator_classes')
            .select('id', { count: 'exact', head: true })
            .eq('educator_id', profile.id)
            .eq('role_instance_id', activeRole.id),

          // Observations
          supabase
            .from('educator_observations')
            .select('id', { count: 'exact', head: true })
            .eq('educator_id', profile.id)
            .eq('role_instance_id', activeRole.id),

          // Fee plans (only for tutor/counselor)
          roleHasFee(activeRole.role)
            ? supabase
                .from('fee_plans')
                .select('child_id')
                .eq('educator_id', profile.id)
                .eq('role_instance_id', activeRole.id)
                .eq('is_active', true)
            : Promise.resolve({ data: [], error: null }),

          // Fee payments this month
          roleHasFee(activeRole.role)
            ? supabase
                .from('fee_payments')
                .select('child_id')
                .eq('educator_id', profile.id)
                .eq('for_month', month)
            : Promise.resolve({ data: [], error: null }),
        ]);

      // Calculate fee pending
      const planChildIds = new Set((feePlans.data ?? []).map((p) => p.child_id));
      const paidChildIds = new Set((feePayments.data ?? []).map((p) => p.child_id));
      let feePending = 0;
      for (const id of planChildIds) {
        if (!paidChildIds.has(id)) feePending++;
      }

      return {
        studentCount: students.count ?? 0,
        presentToday: attendance.count ?? 0,
        classCount: classes.count ?? 0,
        feePending,
        observationCount: observations.count ?? 0,
      };
    },
    enabled: !!profile && !!activeRole,
    staleTime: 60 * 1000, // 1 min
  });
}

function defaultStats(): DashboardStats {
  return {
    studentCount: 0,
    presentToday: 0,
    classCount: 0,
    feePending: 0,
    observationCount: 0,
  };
}
