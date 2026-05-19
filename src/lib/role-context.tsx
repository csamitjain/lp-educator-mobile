/**
 * RoleContext
 *
 * Manages which educator_role_instance is currently "active".
 * Most queries (students, attendance, observations, etc.) are scoped
 * to BOTH educator_id AND role_instance_id.
 *
 * Persisted in AsyncStorage so the user's last-used role is remembered.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { QueryKeys, StorageKeys, roleHasFee } from './constants';
import { useEducator } from './educator-context';
import type { RoleInstance, EducatorRole } from '@/types/database';
import { normalizeRole } from '@/types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoleContextValue {
  /** All active role instances for this educator */
  roleInstances: RoleInstance[];
  /** The currently selected role instance */
  activeRole: RoleInstance | null;
  /** Set the active role (persists to AsyncStorage) */
  setActiveRole: (roleId: string) => void;
  /** True while role instances are loading */
  isLoading: boolean;
  /** Whether active role has fee management */
  hasFee: boolean;
  /** Display-safe role name (maps subject_teacher → teacher) */
  displayRole: Exclude<EducatorRole, 'subject_teacher'> | null;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const RoleContext = createContext<RoleContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useEducator();
  const educatorId = profile?.id ?? null;

  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);

  // Load persisted active role id on mount
  useEffect(() => {
    AsyncStorage.getItem(StorageKeys.activeRoleId)
      .then((stored) => {
        if (stored) setActiveRoleId(stored);
      })
      .finally(() => setStorageLoaded(true));
  }, []);

  // Fetch all role instances for this educator
  const { data: roleInstances = [], isLoading } = useQuery({
    queryKey: QueryKeys.roleInstances(educatorId ?? ''),
    queryFn: async () => {
      if (!educatorId) return [];

      const { data, error } = await supabase
        .from('educator_role_instances')
        .select('*')
        .eq('educator_id', educatorId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as RoleInstance[];
    },
    enabled: !!educatorId && storageLoaded,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select primary role if no stored preference or stored id not found
  useEffect(() => {
    if (!roleInstances.length) return;

    const found = activeRoleId
      ? roleInstances.find((r) => r.id === activeRoleId)
      : null;

    if (!found) {
      const primary = roleInstances.find((r) => r.is_primary) ?? roleInstances[0];
      setActiveRoleId(primary.id);
      AsyncStorage.setItem(StorageKeys.activeRoleId, primary.id).catch(() => {});
    }
  }, [roleInstances, activeRoleId]);

  const setActiveRole = useCallback(
    (roleId: string) => {
      setActiveRoleId(roleId);
      AsyncStorage.setItem(StorageKeys.activeRoleId, roleId).catch(() => {});
    },
    []
  );

  const activeRole = roleInstances.find((r) => r.id === activeRoleId) ?? null;
  const hasFee = activeRole ? roleHasFee(activeRole.role) : false;
  const displayRole = activeRole ? normalizeRole(activeRole.role) : null;

  return (
    <RoleContext.Provider
      value={{
        roleInstances,
        activeRole,
        setActiveRole,
        isLoading,
        hasFee,
        displayRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used inside <RoleProvider>');
  }
  return ctx;
}

/** Convenience hook — throws if no active role */
export function useActiveRole(): RoleInstance {
  const { activeRole } = useRole();
  if (!activeRole) {
    throw new Error('useActiveRole: no active role loaded');
  }
  return activeRole;
}
