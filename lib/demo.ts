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
  memberGroupSubs: new Set<(groups: Group[]) => void>(),
};

// Pre-seed incoming cards so inbox isn't empty on first run.
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

// Pre-seed a group the user is a member of (but not owner).
state.groups.push({
  id: 'demo-group-seed',
  name: 'Book Club',
  ownerUid: 'demo-mira',
  mode: 'private',
  isPublic: false,
  joinCode: 'BOOK01',
  memberUids: ['demo-me'],
  members: [{ uid: 'demo-me', username: 'you', displayName: 'You' }],
  createdAt: Date.now() - 1000 * 60 * 60 * 24,
});

function notifyBank() {
  for (const fn of state.bankSubs) fn([...state.saved]);
}
function notifyInbox() {
  for (const fn of state.inboxSubs) fn(state.cards.filter((c) => c.status === 'pending'));
}
function notifyGroups() {
  const owned = state.groups.filter((g) => g.ownerUid === me.uid);
  for (const fn of state.groupSubs) fn([...owned]);
  const joined = state.groups.filter((g) => g.ownerUid !== me.uid && g.memberUids.includes(me.uid));
  for (const fn of state.memberGroupSubs) fn([...joined]);
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
  createGroup(params: { ownerUid: string; name: string; members: Friend[]; isPublic?: boolean }): Group {
    const id = `demo-group-${Date.now().toString(36)}`;
    const joinCode = id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
    const group: Group = {
      id,
      name: params.name.trim(),
      ownerUid: params.ownerUid,
      mode: 'private',
      isPublic: params.isPublic ?? false,
      joinCode,
      memberUids: params.members.map((m) => m.uid),
      members: params.members,
      createdAt: Date.now(),
    };
    state.groups.unshift(group);
    notifyGroups();
    return group;
  },
  updateGroup(groupId: string, updates: { name?: string; members?: Friend[]; isPublic?: boolean }) {
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;
    if (updates.name !== undefined) group.name = updates.name.trim();
    if (updates.isPublic !== undefined) group.isPublic = updates.isPublic;
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
    fn(state.groups.filter((g) => g.ownerUid === me.uid));
    return () => {
      state.groupSubs.delete(fn);
    };
  },
  subscribeMemberGroups(fn: (groups: Group[]) => void) {
    state.memberGroupSubs.add(fn);
    fn(state.groups.filter((g) => g.ownerUid !== me.uid && g.memberUids.includes(me.uid)));
    return () => {
      state.memberGroupSubs.delete(fn);
    };
  },
  findGroupByCode(code: string): { groupId: string; groupName: string } | null {
    const cleaned = code.trim().toUpperCase();
    const group = state.groups.find((g) => g.joinCode === cleaned);
    if (!group) return null;
    return { groupId: group.id, groupName: group.name };
  },
  joinGroup(groupId: string, user: Friend) {
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) throw new Error('Group not found');
    if (group.memberUids.includes(user.uid)) throw new Error('Already a member of this group');
    if (group.memberUids.length >= 25) throw new Error('This group is full');
    group.memberUids.push(user.uid);
    group.members.push({ uid: user.uid, username: user.username, displayName: user.displayName ?? null });
    notifyGroups();
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
