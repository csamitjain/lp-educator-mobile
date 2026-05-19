import { calculateUnreadCount, groupMessagesByDate, formatThreadTime } from '../src/lib/chat-types';
import type { ChatMessage } from '../src/types/database';

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    thread_id: 'thread-1',
    sender_user_id: 'user-1',
    sender_role: 'parent',
    body: 'Hello',
    image_path: null,
    deleted_at: null,
    created_at: '2025-06-15T10:00:00Z',
    ...overrides,
  };
}

// ─── calculateUnreadCount ─────────────────────────────────────────────────────

describe('calculateUnreadCount', () => {
  it('returns 0 for empty messages', () => {
    expect(calculateUnreadCount([], null)).toBe(0);
  });

  it('returns 0 when all messages are from educator', () => {
    const messages = [
      makeMsg({ sender_role: 'educator', created_at: '2025-06-15T10:00:00Z' }),
      makeMsg({ sender_role: 'educator', created_at: '2025-06-15T11:00:00Z' }),
    ];
    expect(calculateUnreadCount(messages, null)).toBe(2 - 2); // 0
  });

  it('counts all parent messages when lastReadAt is null', () => {
    const messages = [
      makeMsg({ sender_role: 'parent', created_at: '2025-06-15T08:00:00Z' }),
      makeMsg({ id: 'msg-2', sender_role: 'parent', created_at: '2025-06-15T09:00:00Z' }),
      makeMsg({ id: 'msg-3', sender_role: 'educator', created_at: '2025-06-15T09:30:00Z' }),
    ];
    expect(calculateUnreadCount(messages, null)).toBe(2);
  });

  it('only counts messages after lastReadAt', () => {
    const lastRead = '2025-06-15T10:00:00Z';
    const messages = [
      makeMsg({ sender_role: 'parent', created_at: '2025-06-15T09:00:00Z' }), // before
      makeMsg({ id: 'msg-2', sender_role: 'parent', created_at: '2025-06-15T11:00:00Z' }), // after
      makeMsg({ id: 'msg-3', sender_role: 'parent', created_at: '2025-06-15T12:00:00Z' }), // after
    ];
    expect(calculateUnreadCount(messages, lastRead)).toBe(2);
  });

  it('excludes deleted messages', () => {
    const messages = [
      makeMsg({
        sender_role: 'parent',
        created_at: '2025-06-15T11:00:00Z',
        deleted_at: '2025-06-15T11:30:00Z',
      }),
      makeMsg({ id: 'msg-2', sender_role: 'parent', created_at: '2025-06-15T12:00:00Z' }),
    ];
    expect(calculateUnreadCount(messages, '2025-06-15T10:00:00Z')).toBe(1);
  });

  it('does not count educator messages even when after lastReadAt', () => {
    const messages = [
      makeMsg({ sender_role: 'educator', created_at: '2025-06-15T11:00:00Z' }),
      makeMsg({ id: 'msg-2', sender_role: 'parent', created_at: '2025-06-15T11:30:00Z' }),
    ];
    expect(calculateUnreadCount(messages, '2025-06-15T10:00:00Z')).toBe(1);
  });

  it('returns 0 when all parent messages are before lastReadAt', () => {
    const messages = [
      makeMsg({ sender_role: 'parent', created_at: '2025-06-15T08:00:00Z' }),
      makeMsg({ id: 'msg-2', sender_role: 'parent', created_at: '2025-06-15T09:00:00Z' }),
    ];
    expect(calculateUnreadCount(messages, '2025-06-15T10:00:00Z')).toBe(0);
  });
});

// ─── groupMessagesByDate ──────────────────────────────────────────────────────

describe('groupMessagesByDate', () => {
  it('returns empty for no messages', () => {
    expect(groupMessagesByDate([])).toHaveLength(0);
  });

  it('groups messages on same day together', () => {
    const { mapMessageToVM } = require('../src/lib/chat-types');
    const msgs = [
      mapMessageToVM(makeMsg({ id: 'a', created_at: '2025-06-15T08:00:00Z' })),
      mapMessageToVM(makeMsg({ id: 'b', created_at: '2025-06-15T10:00:00Z' })),
      mapMessageToVM(makeMsg({ id: 'c', created_at: '2025-06-16T09:00:00Z' })),
    ];

    const groups = groupMessagesByDate(msgs);
    expect(groups).toHaveLength(2);
    expect(groups[0].dateKey).toBe('2025-06-15');
    expect(groups[0].messages).toHaveLength(2);
    expect(groups[1].dateKey).toBe('2025-06-16');
    expect(groups[1].messages).toHaveLength(1);
  });

  it('sorts groups by date ascending', () => {
    const { mapMessageToVM } = require('../src/lib/chat-types');
    const msgs = [
      mapMessageToVM(makeMsg({ id: 'a', created_at: '2025-06-17T08:00:00Z' })),
      mapMessageToVM(makeMsg({ id: 'b', created_at: '2025-06-15T08:00:00Z' })),
      mapMessageToVM(makeMsg({ id: 'c', created_at: '2025-06-16T08:00:00Z' })),
    ];

    const groups = groupMessagesByDate(msgs);
    expect(groups[0].dateKey).toBe('2025-06-15');
    expect(groups[1].dateKey).toBe('2025-06-16');
    expect(groups[2].dateKey).toBe('2025-06-17');
  });
});

// ─── formatThreadTime ─────────────────────────────────────────────────────────

describe('formatThreadTime', () => {
  it('returns empty string for null', () => {
    expect(formatThreadTime(null)).toBe('');
  });

  it('returns time format for today', () => {
    const todayIso = new Date().toISOString();
    const result = formatThreadTime(todayIso);
    // Should be a time like "10:30 AM" not a date
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns weekday for recent messages', () => {
    // 3 days ago
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const result = formatThreadTime(d.toISOString());
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    expect(weekdays.some((day) => result.includes(day))).toBe(true);
  });
});
