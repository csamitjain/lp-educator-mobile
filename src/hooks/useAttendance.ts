import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys } from '@/lib/constants';
import type { AttendanceRecord, EducatorProfile, RoleInstance } from '@/types/database';
import type { AttendanceStatus } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceRow {
  childId: string;
  name: string;
  nameHi: string | null;
  avatarUrl: string | null;
  classId: string | null;
  className: string | null;
  status: AttendanceStatus | null; // null = not yet marked
  recordId: string | null;
  note: string | null;
}

export interface UpsertAttendancePayload {
  educatorId: string;
  roleInstanceId: string;
  childId: string;
  classId: string | null;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAttendance(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null,
  date: string,       // YYYY-MM-DD
  classId: string | null = null
) {
  return useQuery({
    queryKey: QueryKeys.attendance(profile?.id ?? '', activeRole?.id ?? '', date),
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!profile || !activeRole) return [];

      // 1. Get approved students for this role (optionally filtered by class)
      let studentsQuery = supabase
        .from('educator_students')
        .select(`
          child_id,
          class_id,
          children ( pet_name, pet_name_hi, avatar_url ),
          educator_classes ( name )
        `)
        .eq('educator_id', profile.id)
        .eq('role_instance_id', activeRole.id)
        .eq('approval_status', 'approved');

      if (classId) {
        studentsQuery = studentsQuery.eq('class_id', classId);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw new Error(studentsError.message);
      if (!students?.length) return [];

      // 2. Get existing attendance records for this date
      const childIds = students.map((s: any) => s.child_id);
      const { data: records } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('educator_id', profile.id)
        .eq('role_instance_id', activeRole.id)
        .eq('date', date)
        .in('child_id', childIds);

      const recordMap = new Map<string, AttendanceRecord>(
        (records ?? []).map((r) => [r.child_id, r])
      );

      // 3. Merge
      return students.map((s: any) => {
        const record = recordMap.get(s.child_id) ?? null;
        return {
          childId: s.child_id,
          name: s.children?.pet_name ?? 'Unknown',
          nameHi: s.children?.pet_name_hi ?? null,
          avatarUrl: s.children?.avatar_url ?? null,
          classId: s.class_id ?? null,
          className: s.educator_classes?.name ?? null,
          status: record?.status ?? null,
          recordId: record?.id ?? null,
          note: record?.note ?? null,
        };
      });
    },
    enabled: !!profile && !!activeRole && !!date,
    staleTime: 60 * 1000,
  });
}

// ─── Upsert single attendance record ─────────────────────────────────────────

export function useUpsertAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertAttendancePayload) => {
      const { error } = await supabase
        .from('attendance_records')
        .upsert(
          {
            educator_id: payload.educatorId,
            role_instance_id: payload.roleInstanceId,
            child_id: payload.childId,
            class_id: payload.classId,
            date: payload.date,
            status: payload.status,
            note: payload.note ?? null,
          },
          {
            onConflict: 'educator_id,child_id,date',
            ignoreDuplicates: false,
          }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.attendance(
          variables.educatorId,
          variables.roleInstanceId,
          variables.date
        ),
      });
      // Also refresh dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}

// ─── Bulk upsert ──────────────────────────────────────────────────────────────

export function useBulkUpsertAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      records,
      educatorId,
      roleInstanceId,
      date,
    }: {
      records: Omit<UpsertAttendancePayload, 'educatorId' | 'roleInstanceId' | 'date'>[];
      educatorId: string;
      roleInstanceId: string;
      date: string;
    }) => {
      const rows = records.map((r) => ({
        educator_id: educatorId,
        role_instance_id: roleInstanceId,
        child_id: r.childId,
        class_id: r.classId,
        date,
        status: r.status,
        note: r.note ?? null,
      }));

      const { error } = await supabase
        .from('attendance_records')
        .upsert(rows, {
          onConflict: 'educator_id,child_id,date',
          ignoreDuplicates: false,
        });

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.attendance(
          variables.educatorId,
          variables.roleInstanceId,
          variables.date
        ),
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}
