/**
 * Demo backend — in-memory mock used when EXPO_PUBLIC_DEMO_MODE=true.
 *
 * Lets the app boot and run on a simulator without any Firebase config:
 * fake user is auto-signed-in, sends/saves persist in module-level state for
 * the session, and pre-seeded "friends" appear in the recent-recipient row.
 *
 * Switch off in `.env` once GoogleService-Info.plist + google-services.json
 * are in place.
 */
import { Friend, Group, UserProfile, WordCard } from './types';

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const me: UserProfile = {
  uid: 'demo-me',
  username: 'you',
  displayName: 'You',
  email: 'you@wordshot.local',
  photoURL: null,
  pushTokens: [],
  createdAt: Date.now(),
};

const seedFriends: Friend[] = [
  { uid: 'demo-mira', username: 'mira', displayName: 'Mira' },
  { uid: 'demo-sora', username: 'sora', displayName: 'Sora' },
  { uid: 'demo-leo', username: 'leo', displayName: 'Leo' },
];

const state = {
  user: null as UserProfile | null,
  recents: [...seedFriends],
  cards: [] as WordCard[],
  saved: [] as WordCard[],
  groups: [] as Group[],
  bankSubs: new Set<(words: WordCard[]) => void>(),
  inboxSubs: new Set<(cards: WordCard[]) => void>(),
  groupSubs: new Set<(groups: Group[]) => void>(),
};

// Pre-seed a couple of incoming cards so the inbox isn't empty on first run.
state.cards.push(
  {
    id: 'demo-card-1',
    word: 'sonder',
    note: 'the realisation that everyone has a story as vivid as your own',
    fromUid: 'demo-mira',
    fromUsername: 'mira',
    toUid: me.uid,
    status: 'pending',
    createdAt: Date.now() - 1000 * 60 * 5,
    decidedAt: null,
  },
  {
    id: 'demo-card-2',
    word: 'petrichor',
    note: 'that smell after rain',
    fromUid: 'demo-leo',
    fromUsername: 'leo',
    toUid: me.uid,
    status: 'pending',
    createdAt: Date.now() - 1000 * 60 * 60,
    decidedAt: null,
  },
);

function notifyBank() {
  for (const fn of state.bankSubs) fn([...state.saved]);
}
function notifyInbox() {
  for (const fn of state.inboxSubs) fn(state.cards.filter((c) => c.status === 'pending'));
}
function notifyGroups() {
  for (const fn of state.groupSubs) fn([...state.groups]);
}

export const demo = {
  // ---- Auth ----
  getUser: () => state.user,
  signIn() {
    state.user = me;
  },
  signOut() {
    state.user = null;
  },

  // ---- Friends / recents ----
  findFriendByUsername(handle: string): Friend | null {
    const cleaned = handle.trim().toLowerCase().replace(/^@/, '');
    return state.recents.find((f) => f.username === cleaned) ?? null;
  },
  getRecents(): Friend[] {
    return state.recents.slice(0, 3);
  },
  recordRecent(friend: Friend) {
    state.recents = [friend, ...state.recents.filter((f) => f.uid !== friend.uid)];
  },

  // ---- Words ----
  sendWord(card: WordCard) {
    state.cards.unshift(card);
    notifyInbox();
  },
  getCard(id: string) {
    return state.cards.find((c) => c.id === id) ?? null;
  },
  decide(cardId: string, status: 'saved' | 'discarded') {
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return;
    card.status = status;
    card.decidedAt = Date.now();
    if (status === 'saved') {
      state.saved = [card, ...state.saved];
      notifyBank();
    }
    notifyInbox();
  },
  subscribeBank(fn: (w: WordCard[]) => void) {
    state.bankSubs.add(fn);
    fn([...state.saved]);
    return () => {
      state.bankSubs.delete(fn);
    };
  },
  subscribeInbox(fn: (c: WordCard[]) => void) {
    state.inboxSubs.add(fn);
    fn(state.cards.filter((c) => c.status === 'pending'));
    return () => {
      state.inboxSubs.delete(fn);
    };
  },

  newCardId(): string {
    return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  },

  // ---- Groups ----
  createGroup(params: { ownerUid: string; name: string; members: Friend[] }): Group {
    const group: Group = {
      id: `demo-group-${Date.now().toString(36)}`,
      name: params.name.trim(),
      ownerUid: params.ownerUid,
      mode: 'private',
      isPublic: false,
      memberUids: params.members.map((m) => m.uid),
      members: params.members,
      createdAt: Date.now(),
    };
    state.groups.unshift(group);
    notifyGroups();
    return group;
  },
  updateGroup(groupId: string, updates: { name?: string; members?: Friend[] }) {
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;
    if (updates.name !== undefined) group.name = updates.name.trim();
    if (updates.members !== undefined) {
      group.members = updates.members;
      group.memberUids = updates.members.map((m) => m.uid);
    }
    notifyGroups();
  },
  deleteGroup(groupId: string) {
    state.groups = state.groups.filter((g) => g.id !== groupId);
    notifyGroups();
  },
  subscribeGroups(fn: (groups: Group[]) => void) {
    state.groupSubs.add(fn);
    fn([...state.groups]);
    return () => {
      state.groupSubs.delete(fn);
    };
  },
  sendWordToGroup(params: {
    word: string;
    note?: string;
    from: { uid: string; username: string };
    group: Group;
  }) {
    const now = Date.now();
    for (const memberUid of params.group.memberUids) {
      const card: WordCard = {
        id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        word: params.word.trim(),
        note: params.note?.trim() || null,
        fromUid: params.from.uid,
        fromUsername: params.from.username,
        toUid: memberUid,
        status: 'pending',
        createdAt: now,
        decidedAt: null,
      };
      state.cards.unshift(card);
    }
    notifyInbox();
  },
} as const;
