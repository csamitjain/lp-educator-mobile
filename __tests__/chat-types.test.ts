import {
  mapMessageToVM,
  mapThreadToVM,
  calculateUnreadCount,
  groupMessagesByDate,
  formatThreadTime,
  formatDayDivider,
} from '../src/lib/chat-types';
import type { ChatMessage, ChatThread, Child, Profile } from '../src/types/database';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    thread_id: 'thread-1',
    sender_user_id: 'user-parent-1',
    sender_role: 'parent',
    body: 'Hello',
    image_path: null,
    deleted_at: null,
    created_at: '2025-06-15T10:30:00Z',
    ...overrides,
  };
}

function makeThread(overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    id: 'thread-1',
    child_id: 'child-1',
    teacher_link_id: 'link-1',
    parent_user_id: 'parent-1',
    educator_user_id: 'edu-1',
    last_message_at: '2025-06-15T10:30:00Z',
    last_message_preview: 'Hello',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeChild(): Pick<Child, 'id' | 'pet_name' | 'pet_name_hi' | 'avatar_url'> {
  return { id: 'child-1', pet_name: 'Aarav', pet_name_hi: 'आरव', avatar_url: null };
}

// ─── mapMessageToVM ───────────────────────────────────────────────────────────

describe('mapMessageToVM', () => {
  it('sets isMine=true for educator sender', () => {
    const vm = mapMessageToVM(makeMessage({ sender_role: 'educator' }));
    expect(vm.isMine).toBe(true);
  });

  it('sets isMine=false for parent sender', () => {
    const vm = mapMessageToVM(makeMessage({ sender_role: 'parent' }));
    expect(vm.isMine).toBe(false);
  });

  it('extracts dateKey as YYYY-MM-DD from ISO string', () => {
    const vm = mapMessageToVM(makeMessage({ created_at: '2025-06-15T10:30:00Z' }));
    expect(vm.dateKey).toBe('2025-06-15');
  });

  it('maps body and imagePath correctly', () => {
    const vm = mapMessageToVM(makeMessage({ body: 'Test', image_path: 'path/to/img.jpg' }));
    expect(vm.body).toBe('Test');
    expect(vm.imagePath).toBe('path/to/img.jpg');
  });

  it('handles null body', () => {
    const vm = mapMessageToVM(makeMessage({ body: null }));
    expect(vm.body).toBeNull();
  });
});

// ─── mapThreadToVM ────────────────────────────────────────────────────────────

describe('mapThreadToVM', () => {
  it('maps child name correctly', () => {
    const vm = mapThreadToVM(makeThread(), makeChild(), null, 0);
    expect(vm.childName).toBe('Aarav');
    expect(vm.childNameHi).toBe('आरव');
  });

  it('includes unread count', () => {
    const vm = mapThreadToVM(makeThread(), makeChild(), null, 5);
    expect(vm.unreadCount).toBe(5);
  });

  it('handles missing child name', () => {
    const child = { ...makeChild(), pet_name: null };
    const vm = mapThreadToVM(makeThread(), child, null, 0);
    expect(vm.childName).toBe('Unknown');
  });
});

// ─── calculateUnreadCount ─────────────────────────────────────────────────────

describe('calculateUnreadCount', () => {
  const BASE_TIME = '2025-06-15T10:00:00Z';

  it('returns 0 for empty messages', () => {
    expect(calculateUnreadCount([], null)).toBe(0);
  });

  it('counts all parent messages as unread when lastReadAt is null', () => {
    const messages = [
      makeMessage({ sender_role: 'parent', created_at: '2025-06-15T08:00:00Z' }),
      makeMessage({ sender_role: 'parent', created_at: '2025-06-15T09:00:00Z' }),
    ];
    expect(calculateUnreadCount(messages, null)).toBe(2);
  });

  it('does not count educator messages as unread', () => {
    const messages = [
      makeMessage({ sender_role: 'educator', created_at: '2025-06-15T08:00:00Z' }),
      makeMessage({ sender_role: 'parent', created_at: '2025-06-15T09:00:00Z' }),
    ];
    expect(calculateUnreadCount(messages, null)).toBe(1);
  });

  it('counts only messages after lastReadAt', () => {
    const messages = [
      makeMessage({ sender_role: 'parent', created_at: '2025-06-15T08:00:00Z' }), // before
      makeMessage({ sender_role: 'parent', created_at: '2025-06-15T11:00:00Z' }), // after
      makeMessage({ sender_role: 'parent', created_at: '2025-06-15T12:00:00Z' }), // after
    ];
    expect(calculateUnreadCount(messages, BASE_TIME)).toBe(2);
  });

  it('excludes deleted messages from unread count', () => {
    const messages = [
      makeMessage({
        sender_role: 'parent',
        created_at: '2025-06-15T11:00:00Z',
        deleted_at: '2025-06-15T11:30:00Z',
      }),
    ];
    expect(calculateUnreadCount(messages, BASE_TIME)).toBe(0);
  });
});

// ─── groupMessagesByDate ──────────────────────────────────────────────────────

describe('groupMessagesByDate', () => {
  it('groups messages by dateKey', () => {
    const vms = [
      { ...mapMessageToVM(makeMessage({ created_at: '2025-06-15T08:00:00Z' })), id: 'a' },
      { ...mapMessageToVM(makeMessage({ created_at: '2025-06-15T09:00:00Z' })), id: 'b' },
      { ...mapMessageToVM(makeMessage({ created_at: '2025-06-16T08:00:00Z' })), id: 'c' },
    ];

    const groups = groupMessagesByDate(vms);
    expect(groups).toHaveLength(2);
    expect(groups[0].dateKey).toBe('2025-06-15');
    expect(groups[0].messages).toHaveLength(2);
    expect(groups[1].dateKey).toBe('2025-06-16');
    expect(groups[1].messages).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(groupMessagesByDate([])).toHaveLength(0);
  });
});

// ─── formatDayDivider ─────────────────────────────────────────────────────────

describe('formatDayDivider', () => {
  it('returns "Today" for today', () => {
    const today = '2025-06-15';
    expect(formatDayDivider(today, today, '2025-06-14')).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = '2025-06-14';
    expect(formatDayDivider(yesterday, '2025-06-15', yesterday)).toBe('Yesterday');
  });

  it('returns formatted date for older messages', () => {
    const result = formatDayDivider('2025-06-10', '2025-06-15', '2025-06-14');
    expect(result).toContain('2025');
    expect(result).toContain('June');
  });
});
