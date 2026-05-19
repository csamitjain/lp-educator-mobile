import type { EducatorRole } from '@/types/database';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const StorageKeys = {
  language: 'lp-educator-lang',
  activeRoleId: 'lp-educator-active-role',
  queryCache: 'lp-educator-query-cache',
  pushToken: 'lp-educator-push-token',
} as const;

// ─── Default Language ─────────────────────────────────────────────────────────

export const DEFAULT_LANGUAGE = 'hi';
export const SUPPORTED_LANGUAGES = ['hi', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ─── Role Options ─────────────────────────────────────────────────────────────

export interface RoleOption {
  role: EducatorRole;
  labelKey: string;       // i18n key in 'common' namespace
  descriptionKey: string; // i18n key
  emoji: string;
  showFee: boolean;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'teacher',
    labelKey: 'roles.teacher',
    descriptionKey: 'roles.teacher_desc',
    emoji: '🏫',
    showFee: false,
  },
  {
    role: 'tutor',
    labelKey: 'roles.tutor',
    descriptionKey: 'roles.tutor_desc',
    emoji: '📚',
    showFee: true,
  },
  {
    role: 'principal',
    labelKey: 'roles.principal',
    descriptionKey: 'roles.principal_desc',
    emoji: '🏛️',
    showFee: false,
  },
  {
    role: 'counselor',
    labelKey: 'roles.counselor',
    descriptionKey: 'roles.counselor_desc',
    emoji: '💛',
    showFee: true,
  },
];

/** Roles that have fee management features */
export const FEE_ROLES: EducatorRole[] = ['tutor', 'counselor'];

/** Check if a role should show fee tab */
export const roleHasFee = (role: EducatorRole): boolean => FEE_ROLES.includes(role);

// ─── Subjects ────────────────────────────────────────────────────────────────

export const SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Hindi',
  'Social Studies',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Computer Science',
  'Sanskrit',
  'Art',
  'Physical Education',
  'Music',
  'Drawing',
  'EVS',
] as const;

export type Subject = (typeof SUBJECTS)[number];

// ─── Grades / Classes ─────────────────────────────────────────────────────────

export const GRADES = [
  'Nursery',
  'LKG',
  'UKG',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
] as const;

export type Grade = (typeof GRADES)[number];

// ─── Attendance Statuses ──────────────────────────────────────────────────────

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

/** Cycle through attendance statuses on tap */
export function cycleAttendanceStatus(current: AttendanceStatusValue): AttendanceStatusValue {
  const idx = ATTENDANCE_STATUSES.indexOf(current);
  return ATTENDANCE_STATUSES[(idx + 1) % ATTENDANCE_STATUSES.length];
}

// ─── Observation Categories ────────────────────────────────────────────────────

export const OBSERVATION_CATEGORIES = [
  'academic',
  'behavioral',
  'social',
  'physical',
  'emotional',
  'creative',
  'general',
] as const;

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];

// ─── Milestone Categories ──────────────────────────────────────────────────────

export const MILESTONE_CATEGORIES = [
  'academic',
  'behavioral',
  'social',
  'physical',
  'cognitive',
  'language',
  'creative',
  'general',
] as const;

export type MilestoneCategory = (typeof MILESTONE_CATEGORIES)[number];

// ─── Fee Methods ──────────────────────────────────────────────────────────────

export const FEE_METHODS = [
  'cash',
  'upi',
  'bank_transfer',
  'cheque',
  'other',
] as const;

export type FeeMethod = (typeof FEE_METHODS)[number];

// ─── LP Institution Code Pattern ──────────────────────────────────────────────

export const LP_SCHOOL_CODE_REGEX = /^LP-S-[A-Z0-9]{4,8}$/;

export function isValidLPCode(code: string): boolean {
  return LP_SCHOOL_CODE_REGEX.test(code.trim().toUpperCase());
}

// ─── Image Config ─────────────────────────────────────────────────────────────

export const ImageConfig = {
  maxDimensionPx: 1600,
  jpegQuality: 0.82, // 0–1
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  chatAttachmentPath: (threadId: string, uuid: string) => `${threadId}/${uuid}.jpg`,
} as const;

// ─── Query Keys ───────────────────────────────────────────────────────────────
// Centralized to avoid typos and enable precise invalidation.

export const QueryKeys = {
  educatorProfile: (userId: string) => ['educator_profile', userId] as const,
  roleInstances: (educatorId: string) => ['role_instances', educatorId] as const,
  students: (educatorId: string, roleId: string) => ['students', educatorId, roleId] as const,
  studentDetail: (childId: string) => ['student_detail', childId] as const,
  attendance: (educatorId: string, roleId: string, date: string) =>
    ['attendance', educatorId, roleId, date] as const,
  observations: (educatorId: string, roleId: string) =>
    ['observations', educatorId, roleId] as const,
  milestones: (educatorId: string) => ['milestones', educatorId] as const,
  milestoneRecords: (educatorId: string, childId?: string) =>
    ['milestone_records', educatorId, childId] as const,
  classes: (educatorId: string, roleId: string) => ['classes', educatorId, roleId] as const,
  feePlans: (educatorId: string, roleId: string) => ['fee_plans', educatorId, roleId] as const,
  feePayments: (educatorId: string, month: string) =>
    ['fee_payments', educatorId, month] as const,
  chatThreads: (educatorUserId: string) => ['chat_threads', educatorUserId] as const,
  chatMessages: (threadId: string) => ['chat_messages', threadId] as const,
  dashboardStats: (educatorId: string, roleId: string) =>
    ['dashboard_stats', educatorId, roleId] as const,
  translations: (lang: string) => ['translations', lang] as const,
} as const;

// ─── Realtime Channel Names ───────────────────────────────────────────────────

export const RealtimeChannels = {
  chatThread: (threadId: string) => `chat_thread_${threadId}`,
  chatInbox: (educatorUserId: string) => `chat_inbox_${educatorUserId}`,
} as const;
