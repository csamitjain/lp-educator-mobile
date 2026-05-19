/**
 * Chat Types & Mappers
 *
 * Centralised chat domain types used across:
 *   - hooks/useChatThreads
 *   - hooks/useChatMessages
 *   - hooks/useChatUnread
 *   - components/chat/*
 */

import type { ChatMessage, ChatThread, Child, Profile, SenderRole } from '@/types/database';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface ChatThreadVM {
  id: string;
  childId: string;
  childName: string;
  childNameHi: string | null;
  childAvatarUrl: string | null;
  parentUserId: string;
  educatorUserId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  teacherLinkId: string;
}

export interface ChatMessageVM {
  id: string;
  threadId: string;
  senderUserId: string;
  senderRole: SenderRole;
  /** isMine is determined by sender_role === 'educator', NOT by user ID */
  isMine: boolean;
  body: string | null;
  imagePath: string | null;
  /** Signed URL — fetched lazily and cached by chatStorage */
  imageUrl?: string;
  deletedAt: string | null;
  createdAt: string;
  /** Date string for day divider grouping: YYYY-MM-DD */
  dateKey: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/**
 * Map a raw chat_threads row + joined data → ChatThreadVM.
 */
export function mapThreadToVM(
  thread: ChatThread,
  child: Pick<Child, 'id' | 'pet_name' | 'pet_name_hi' | 'avatar_url'>,
  _parentProfile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null,
  unreadCount: number
): ChatThreadVM {
  return {
    id: thread.id,
    childId: child.id,
    childName: child.pet_name ?? 'Unknown',
    childNameHi: child.pet_name_hi ?? null,
    childAvatarUrl: child.avatar_url ?? null,
    parentUserId: thread.parent_user_id,
    educatorUserId: thread.educator_user_id,
    lastMessageAt: thread.last_message_at ?? null,
    lastMessagePreview: thread.last_message_preview ?? null,
    unreadCount,
    teacherLinkId: thread.teacher_link_id,
  };
}

/**
 * Map a raw chat_messages row → ChatMessageVM.
 * Rule: isMine = sender_role === 'educator' (NOT by user ID — see spec §9)
 */
export function mapMessageToVM(msg: ChatMessage): ChatMessageVM {
  return {
    id: msg.id,
    threadId: msg.thread_id,
    senderUserId: msg.sender_user_id,
    senderRole: msg.sender_role,
    isMine: msg.sender_role === 'educator',
    body: msg.body ?? null,
    imagePath: msg.image_path ?? null,
    deletedAt: msg.deleted_at ?? null,
    createdAt: msg.created_at,
    dateKey: msg.created_at.split('T')[0],
  };
}

// ─── Unread Count Math ────────────────────────────────────────────────────────

/**
 * Calculate unread count for a thread.
 *
 * A message is unread if:
 *   - created_at > last_read_at (or last_read_at is null → all unread)
 *   - AND sender_role !== 'educator' (don't count own messages)
 *
 * @param messages   - Raw chat_messages for the thread
 * @param lastReadAt - The educator's last_read_at from chat_thread_reads (or null)
 */
export function calculateUnreadCount(
  messages: Pick<ChatMessage, 'created_at' | 'sender_role' | 'deleted_at'>[],
  lastReadAt: string | null
): number {
  return messages.filter((msg) => {
    if (msg.deleted_at) return false;
    if (msg.sender_role === 'educator') return false;
    if (!lastReadAt) return true;
    return new Date(msg.created_at) > new Date(lastReadAt);
  }).length;
}

/**
 * Group messages by their date key (YYYY-MM-DD) for day dividers.
 */
export function groupMessagesByDate(
  messages: ChatMessageVM[]
): Array<{ dateKey: string; messages: ChatMessageVM[] }> {
  const groups: Map<string, ChatMessageVM[]> = new Map();

  for (const msg of messages) {
    const existing = groups.get(msg.dateKey) ?? [];
    existing.push(msg);
    groups.set(msg.dateKey, existing);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, msgs]) => ({ dateKey, messages: msgs }));
}

/**
 * Format a message timestamp for display in the thread list.
 * - Today → "10:35 AM"
 * - This week → "Mon"
 * - Older → "12 Jan"
 */
export function formatThreadTime(isoString: string | null): string {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
  }

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Format a day divider label.
 * - Today → "Today"
 * - Yesterday → "Yesterday"
 * - Older → "12 January 2025"
 */
export function formatDayDivider(dateKey: string, todayKey: string, yesterdayKey: string): string {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  const date = new Date(dateKey);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
