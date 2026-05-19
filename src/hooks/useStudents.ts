import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys } from '@/lib/constants';
import type { EducatorProfile, RoleInstance } from '@/types/database';

export interface StudentRow {
  id: string;                  // educator_students.id
  childId: string;
  name: string;
  nameHi: string | null;
  avatarUrl: string | null;
  dob: string | null;
  gender: string | null;
  classId: string | null;
  className: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  parentUserId: string;
  createdAt: string;
}

export function useStudents(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null
) {
  return useQuery({
    queryKey: QueryKeys.students(profile?.id ?? '', activeRole?.id ?? ''),
    queryFn: async (): Promise<StudentRow[]> => {
      if (!profile || !activeRole) return [];

      const { data, error } = await supabase
        .from('educator_students')
        .select(`
          id,
          child_id,
          class_id,
          approval_status,
          created_at,
          children (
            id,
            pet_name,
            pet_name_hi,
            avatar_url,
            dob,
            gender,
            parent_user_id
          ),
          educator_classes (
            id,
            name
          )
        `)
        .eq('educator_id', profile.id)
        .eq('role_instance_id', activeRole.id)
        .neq('approval_status', 'rejected')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any) => ({
        id: row.id,
        childId: row.child_id,
        name: row.children?.pet_name ?? 'Unknown',
        nameHi: row.children?.pet_name_hi ?? null,
        avatarUrl: row.children?.avatar_url ?? null,
        dob: row.children?.dob ?? null,
        gender: row.children?.gender ?? null,
        classId: row.class_id,
        className: row.educator_classes?.name ?? null,
        approvalStatus: row.approval_status,
        parentUserId: row.children?.parent_user_id ?? '',
        createdAt: row.created_at,
      }));
    },
    enabled: !!profile && !!activeRole,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Approve / Reject ─────────────────────────────────────────────────────────

export function useUpdateApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      educatorStudentId,
      status,
    }: {
      educatorStudentId: string;
      status: 'approved' | 'rejected';
    }) => {
      const { error } = await supabase
        .from('educator_students')
        .update({ approval_status: status })
        .eq('id', educatorStudentId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

// ─── Search child by phone or LP code ─────────────────────────────────────────

export interface ChildSearchResult {
  childId: string;
  name: string;
  nameHi: string | null;
  avatarUrl: string | null;
  parentUserId: string;
  parentPhone: string | null;
}

export async function searchChildByPhone(phone: string): Promise<ChildSearchResult | null> {
  // Normalize phone
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('91') ? digits : `91${digits}`;

  // Find parent profile by phone
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('phone', normalized)
    .maybeSingle();

  if (!profile) return null;

  // Get their children
  const { data: children } = await supabase
    .from('children')
    .select('id, pet_name, pet_name_hi, avatar_url, parent_user_id')
    .eq('parent_user_id', profile.id)
    .limit(1)
    .maybeSingle();

  if (!children) return null;

  return {
    childId: children.id,
    name: children.pet_name ?? 'Unknown',
    nameHi: children.pet_name_hi ?? null,
    avatarUrl: children.avatar_url ?? null,
    parentUserId: profile.id,
    parentPhone: profile.phone,
  };
}
