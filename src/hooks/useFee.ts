import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys } from '@/lib/constants';
import { currentYearMonth, buildFeeStatusList, type FeeStatus } from '@/lib/fee-utils';
import type { FeePlan, FeePayment, EducatorProfile, RoleInstance } from '@/types/database';

// ─── Fee plans ────────────────────────────────────────────────────────────────

export function useFeePlans(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null
) {
  return useQuery({
    queryKey: QueryKeys.feePlans(profile?.id ?? '', activeRole?.id ?? ''),
    queryFn: async (): Promise<FeePlan[]> => {
      if (!profile || !activeRole) return [];
      const { data, error } = await supabase
        .from('fee_plans')
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

// ─── Fee payments (current month) ────────────────────────────────────────────

export function useFeePayments(
  profile: EducatorProfile | null,
  month: string = currentYearMonth()
) {
  return useQuery({
    queryKey: QueryKeys.feePayments(profile?.id ?? '', month),
    queryFn: async (): Promise<FeePayment[]> => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('educator_id', profile.id)
        .eq('for_month', month)
        .order('paid_on', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!profile,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Enriched fee status list (joined with child names) ──────────────────────

export interface EnrichedFeeStatus extends FeeStatus {
  childName: string;
  childNameHi: string | null;
  childAvatarUrl: string | null;
  planAmount: number;
  planCycle: string;
}

export function useEnrichedFeeStatus(
  profile: EducatorProfile | null,
  activeRole: RoleInstance | null,
  month: string = currentYearMonth()
) {
  const { data: plans = [] } = useFeePlans(profile, activeRole);
  const { data: payments = [] } = useFeePayments(profile, month);

  return useQuery({
    queryKey: ['fee_status_enriched', profile?.id ?? '', activeRole?.id ?? '', month],
    queryFn: async (): Promise<EnrichedFeeStatus[]> => {
      if (!profile || !activeRole || !plans.length) return [];

      const statusList = buildFeeStatusList(plans, payments, month);
      const childIds = statusList.map((s) => s.childId);

      // Fetch child details
      const { data: children } = await supabase
        .from('children')
        .select('id, pet_name, pet_name_hi, avatar_url')
        .in('id', childIds);

      const childMap = new Map(
        (children ?? []).map((c) => [c.id, c])
      );

      return statusList.map((status) => {
        const child = childMap.get(status.childId);
        const plan = plans.find((p) => p.id === status.planId);
        return {
          ...status,
          childName: child?.pet_name ?? 'Unknown',
          childNameHi: child?.pet_name_hi ?? null,
          childAvatarUrl: child?.avatar_url ?? null,
          planAmount: plan?.amount ?? 0,
          planCycle: plan?.cycle ?? 'monthly',
        };
      });
    },
    enabled: !!profile && !!activeRole && plans.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Create fee plan ──────────────────────────────────────────────────────────

export function useCreateFeePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      educatorId,
      roleInstanceId,
      childId,
      amount,
      cycle,
      startMonth,
    }: {
      educatorId: string;
      roleInstanceId: string;
      childId: string;
      amount: number;
      cycle: 'monthly' | 'quarterly';
      startMonth: string;
    }) => {
      const { error } = await supabase.from('fee_plans').insert({
        educator_id: educatorId,
        role_instance_id: roleInstanceId,
        child_id: childId,
        amount,
        cycle,
        start_month: startMonth,
        is_active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee_plans'] });
      queryClient.invalidateQueries({ queryKey: ['fee_status_enriched'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}

// ─── Toggle plan active/inactive ─────────────────────────────────────────────

export function useToggleFeePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('fee_plans')
        .update({ is_active: isActive })
        .eq('id', planId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee_plans'] });
      queryClient.invalidateQueries({ queryKey: ['fee_status_enriched'] });
    },
  });
}

// ─── Collect fee (insert payment) ────────────────────────────────────────────

export function useCollectFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      educatorId,
      childId,
      planId,
      amount,
      forMonth,
      method,
      note,
    }: {
      educatorId: string;
      childId: string;
      planId: string;
      amount: number;
      forMonth: string;
      method: string | null;
      note: string | null;
    }) => {
      const { error } = await supabase.from('fee_payments').insert({
        educator_id: educatorId,
        child_id: childId,
        plan_id: planId,
        amount,
        for_month: forMonth,
        paid_on: new Date().toISOString().split('T')[0],
        method,
        note,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['fee_status_enriched'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}
