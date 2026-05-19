/**
 * LP Educator Hub — Supabase Database Types
 *
 * Manually typed from the schema spec. These mirror the live Supabase schema.
 * DO NOT add migrations — schema changes happen on the backend.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type EducatorRole = 'teacher' | 'tutor' | 'principal' | 'counselor' | 'subject_teacher';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type MilestoneStatus = 'pending' | 'in_progress' | 'achieved';
export type FeeCycle = 'monthly' | 'quarterly';
export type SenderRole = 'parent' | 'educator';
export type UserType = 'parent' | 'educator' | 'admin';

// ─── Tables ──────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          user_type: UserType | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };

      educator_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          city: string | null;
          avatar_url: string | null;
          school_name: string | null;
          educator_roles: EducatorRole[];
          is_verified: boolean;
          push_token: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educator_profiles']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['educator_profiles']['Row']>;
      };

      educator_role_instances: {
        Row: {
          id: string;
          educator_id: string;
          role: EducatorRole;
          institution_name: string | null;
          institution_id_code: string | null;
          subjects: string[];
          grades: string[];
          schedule: Json | null;
          is_primary: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educator_role_instances']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['educator_role_instances']['Row']>;
      };

      children: {
        Row: {
          id: string;
          pet_name: string | null;
          pet_name_hi: string | null;
          dob: string | null;
          gender: string | null;
          avatar_url: string | null;
          parent_user_id: string;
        };
        Insert: never; // read-only for educators
        Update: never;
      };

      guardian_children: {
        Row: {
          guardian_user_id: string;
          child_id: string;
          relation: string | null;
        };
        Insert: never;
        Update: never;
      };

      educator_students: {
        Row: {
          id: string;
          educator_id: string;
          role_instance_id: string;
          child_id: string;
          class_id: string | null;
          approval_status: ApprovalStatus;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educator_students']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['educator_students']['Row']>;
      };

      child_teacher_links: {
        Row: {
          id: string;
          educator_id: string;
          child_id: string;
          parent_user_id: string;
          approval_status: ApprovalStatus;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['child_teacher_links']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['child_teacher_links']['Row']>;
      };

      educator_classes: {
        Row: {
          id: string;
          educator_id: string;
          role_instance_id: string;
          name: string;
          subject: string | null;
          grade: string | null;
          schedule: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educator_classes']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['educator_classes']['Row']>;
      };

      attendance_records: {
        Row: {
          id: string;
          educator_id: string;
          role_instance_id: string;
          child_id: string;
          class_id: string | null;
          date: string; // YYYY-MM-DD
          status: AttendanceStatus;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_records']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attendance_records']['Row']>;
      };

      educator_observations: {
        Row: {
          id: string;
          educator_id: string;
          role_instance_id: string;
          child_id: string;
          note: string;
          category: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educator_observations']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['educator_observations']['Row']>;
      };

      educator_milestones: {
        Row: {
          id: string;
          educator_id: string;
          title: string;
          title_hi: string | null;
          description: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educator_milestones']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['educator_milestones']['Row']>;
      };

      educator_milestone_records: {
        Row: {
          id: string;
          educator_id: string;
          child_id: string;
          milestone_id: string;
          status: MilestoneStatus;
          achieved_at: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educator_milestone_records']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['educator_milestone_records']['Row']>;
      };

      academic_records: {
        Row: {
          id: string;
          child_id: string;
          term: string | null;
          subject: string | null;
          score: number | null;
          max_score: number | null;
          created_at: string;
        };
        Insert: never; // read-only
        Update: never;
      };

      fee_plans: {
        Row: {
          id: string;
          educator_id: string;
          role_instance_id: string;
          child_id: string;
          amount: number;
          cycle: FeeCycle;
          start_month: string; // YYYY-MM
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fee_plans']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fee_plans']['Row']>;
      };

      fee_payments: {
        Row: {
          id: string;
          educator_id: string;
          child_id: string;
          plan_id: string;
          amount: number;
          for_month: string; // YYYY-MM
          paid_on: string;
          method: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fee_payments']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fee_payments']['Row']>;
      };

      chat_threads: {
        Row: {
          id: string;
          child_id: string;
          teacher_link_id: string;
          parent_user_id: string;
          educator_user_id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_threads']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_threads']['Row']>;
      };

      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_user_id: string;
          sender_role: SenderRole;
          body: string | null;
          image_path: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>;
      };

      chat_thread_reads: {
        Row: {
          thread_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: Database['public']['Tables']['chat_thread_reads']['Row'];
        Update: Partial<Database['public']['Tables']['chat_thread_reads']['Row']>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };

      // ─── i18n translations table (future — backend team adds) ─────────────
      // Schema: { lang, key, value }  — no namespace; key is the full dot path
      // e.g. { lang: 'hi', key: 'auth.login.title', value: 'वापस स्वागत है' }
      translations: {
        Row: {
          id: string;
          lang: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['translations']['Row'], 'id' | 'updated_at'> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['translations']['Row']>;
      };
    };
  };
}

// ─── Convenience Row Types ────────────────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type EducatorProfile = Database['public']['Tables']['educator_profiles']['Row'];
export type RoleInstance = Database['public']['Tables']['educator_role_instances']['Row'];
export type Child = Database['public']['Tables']['children']['Row'];
export type EducatorStudent = Database['public']['Tables']['educator_students']['Row'];
export type ChildTeacherLink = Database['public']['Tables']['child_teacher_links']['Row'];
export type EducatorClass = Database['public']['Tables']['educator_classes']['Row'];
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
export type Observation = Database['public']['Tables']['educator_observations']['Row'];
export type Milestone = Database['public']['Tables']['educator_milestones']['Row'];
export type MilestoneRecord = Database['public']['Tables']['educator_milestone_records']['Row'];
export type AcademicRecord = Database['public']['Tables']['academic_records']['Row'];
export type FeePlan = Database['public']['Tables']['fee_plans']['Row'];
export type FeePayment = Database['public']['Tables']['fee_payments']['Row'];
export type ChatThread = Database['public']['Tables']['chat_threads']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type ChatThreadRead = Database['public']['Tables']['chat_thread_reads']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Translation = Database['public']['Tables']['translations']['Row'];

// ─── Enriched / Joined Types ──────────────────────────────────────────────────

/** educator_students row joined with children data */
export interface StudentWithChild extends EducatorStudent {
  child: Child;
}

/** chat_threads row joined with child + parent profile */
export interface ThreadWithDetails extends ChatThread {
  child: Pick<Child, 'id' | 'pet_name' | 'pet_name_hi' | 'avatar_url'>;
  parent_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  unread_count?: number;
}

/** Normalized role — maps subject_teacher → teacher for display */
export function normalizeRole(role: EducatorRole): Exclude<EducatorRole, 'subject_teacher'> {
  return role === 'subject_teacher' ? 'teacher' : role;
}
