import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys } from '@/lib/constants';
import type {
  AttendanceRecord,
  Observation,
  MilestoneRecord,
  AcademicRecord,
  Child,
} from '@/types/database';

export interface StudentDetailData {
  child: Child | null;
  attendance: AttendanceRecord[];
  observations: Observation[];
  milestoneRecords: (MilestoneRecord & { milestone_title?: string })[];
  academicRecords: AcademicRecord[];
  attendanceRate: number; // 0–100
}

export function useStudentDetail(
  childId: string | null,
  educatorId: string | null,
  roleInstanceId: string | null
) {
  return useQuery({
    queryKey: QueryKeys.studentDetail(childId ?? ''),
    queryFn: async (): Promise<StudentDetailData> => {
      if (!childId || !educatorId || !roleInstanceId) return emptyDetail();

      const [child, attendance, observations, milestoneRecords, academicRecords] =
        await Promise.all([
          // Child profile
          supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .maybeSingle(),

          // Last 90 days attendance
          supabase
            .from('attendance_records')
            .select('*')
            .eq('educator_id', educatorId)
            .eq('role_instance_id', roleInstanceId)
            .eq('child_id', childId)
            .order('date', { ascending: false })
            .limit(90),

          // Observations
          supabase
            .from('educator_observations')
            .select('*')
            .eq('educator_id', educatorId)
            .eq('role_instance_id', roleInstanceId)
            .eq('child_id', childId)
            .order('created_at', { ascending: false }),

          // Milestone records with title
          supabase
            .from('educator_milestone_records')
            .select(`
              *,
              educator_milestones ( title, title_hi )
            `)
            .eq('educator_id', educatorId)
            .eq('child_id', childId)
            .order('created_at', { ascending: false }),

          // Academic records
          supabase
            .from('academic_records')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false }),
        ]);

      const attendanceData = attendance.data ?? [];
      const presentCount = attendanceData.filter((a) => a.status === 'present').length;
      const attendanceRate =
        attendanceData.length > 0
          ? Math.round((presentCount / attendanceData.length) * 100)
          : 0;

      const milestones = (milestoneRecords.data ?? []).map((m: any) => ({
        ...m,
        milestone_title: m.educator_milestones?.title ?? '',
      }));

      return {
        child: child.data ?? null,
        attendance: attendanceData,
        observations: observations.data ?? [],
        milestoneRecords: milestones,
        academicRecords: academicRecords.data ?? [],
        attendanceRate,
      };
    },
    enabled: !!childId && !!educatorId && !!roleInstanceId,
    staleTime: 2 * 60 * 1000,
  });
}

function emptyDetail(): StudentDetailData {
  return {
    child: null,
    attendance: [],
    observations: [],
    milestoneRecords: [],
    academicRecords: [],
    attendanceRate: 0,
  };
}
