/**
 * Firestore data access for words and friends.
 *
 * In demo mode (EXPO_PUBLIC_DEMO_MODE=true) every function delegates to the
 * in-memory `demo` store so the app runs without Firebase config.
 *
 * Schema (real mode):
 *   users/{uid}                          → UserProfile
 *   users/{uid}/savedWords/{cardId}      → WordCard (mirror, post-save)
 *   usernames/{handle}                   → { uid }
 *   cards/{cardId}                       → WordCard (in-flight + history)
 *   groups/{groupId}                     → Group
 *   joinCodes/{code}                     → { groupId, groupName, ownerUid }
 */
import { collections, firestore } from './firebase';
import { Friend, Group, UserProfile, WordCard } from './types';
import { DEMO_MODE, demo } from './demo';

function generateJoinCode(): string {
  // Unambiguous alphanumeric: no 0/O, 1/I/L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function findFriendByUsername(handle: string): Promise<Friend | null> {
  if (DEMO_MODE) return demo.findFriendByUsername(handle);
  const cleaned = handle.trim().toLowerCase().replace(/^@/, '');
  if (!cleaned) return null;
  const snap = await collections.usernames().doc(cleaned).get();
  if (!snap.exists()) return null;
  const { uid } = snap.data() as { uid: string };
  const userSnap = await collections.users().doc(uid).get();
  const u = userSnap.data() as UserProfile | undefined;
  if (!u) return null;
  return { uid: u.uid, username: u.username, displayName: u.displayName };
}

export async function sendWord(params: {
  word: string;
  note?: string;
  from: { uid: string; username: string };
  to: { uid: string };
}): Promise<string> {
  if (DEMO_MODE) {
    const id = demo.newCardId();
    demo.sendWord({
      id,
      word: params.word.trim(),
      note: params.note?.trim() || null,
      fromUid: params.from.uid,
      fromUsername: params.from.username,
      toUid: params.to.uid,
      status: 'pending',
      createdAt: Date.now(),
      decidedAt: null,
    });
    return id;
  }

  const ref = collections.cards().doc();
  const card: WordCard = {
    id: ref.id,
    word: params.word.trim(),
    note: params.note?.trim() || null,
    fromUid: params.from.uid,
    fromUsername: params.from.username,
    toUid: params.to.uid,
    status: 'pending',
    createdAt: Date.now(),
    decidedAt: null,
  };
  await ref.set(card);
  return ref.id;
}

export async function decideCard(cardId: string, status: 'saved' | 'discarded') {
  if (DEMO_MODE) {
    demo.decide(cardId, status);
    return;
  }

  const ref = collections.cards().doc(cardId);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error('Card not found');
  const card = snap.data() as WordCard;
  const updates = { status, decidedAt: Date.now() };
  await ref.update(updates);
  if (status === 'saved') {
    await collections
      .savedWords(card.toUid)
      .doc(cardId)
      .set({ ...card, ...updates });
  }
}

export function subscribeToBank(
  uid: string,
  onChange: (words: WordCard[]) => void,
  onError?: (e: Error) => void,
) {
  if (DEMO_MODE) return demo.subscribeBank(onChange);
  return collections
    .savedWords(uid)
    .orderBy('decidedAt', 'desc')
    .onSnapshot(
      (snap: any) => {
        if (!snap) return;
        onChange(snap.docs.map((d: any) => d.data() as WordCard));
      },
      (e: Error) => onError?.(e),
    );
}

export function subscribeToInbox(
  uid: string,
  onChange: (cards: WordCard[]) => void,
  onError?: (e: Error) => void,
) {
  if (DEMO_MODE) return demo.subscribeInbox(onChange);
  return collections
    .cards()
    .where('toUid', '==', uid)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snap: any) => {
        if (!snap) return;
        onChange(snap.docs.map((d: any) => d.data() as WordCard));
      },
      (e: Error) => onError?.(e),
    );
}

export async function deleteFromBank(uid: string, cardId: string): Promise<void> {
  if (DEMO_MODE) return;
  await collections.savedWords(uid).doc(cardId).delete();
}

export async function getCard(cardId: string): Promise<WordCard | null> {
  if (DEMO_MODE) return demo.getCard(cardId);
  const snap = await collections.cards().doc(cardId).get();
  return snap.exists() ? (snap.data() as WordCard) : null;
}

export async function recordRecentRecipient(senderUid: string, friend: Friend) {
  if (DEMO_MODE) {
    demo.recordRecent(friend);
    return;
  }
  await collections
    .users()
    .doc(senderUid)
    .collection('recents')
    .doc(friend.uid)
    .set({ ...friend, lastSentAt: Date.now() }, { merge: true });
}

export async function getRecentRecipients(senderUid: string): Promise<Friend[]> {
  if (DEMO_MODE) return demo.getRecents();
  const snap = await collections
    .users()
    .doc(senderUid)
    .collection('recents')
    .orderBy('lastSentAt', 'desc')
    .limit(3)
    .get();
  return snap.docs.map((d: any) => {
    const { uid, username, displayName } = d.data() as Friend;
    return { uid, username, displayName };
  });
}

export async function createGroup(params: {
  ownerUid: string;
  name: string;
  members: Friend[];
  isPublic?: boolean;
}): Promise<Group> {
  if (DEMO_MODE) return demo.createGroup(params);
  const ref = collections.groups().doc();
  const joinCode = generateJoinCode();
  const sanitizedMembers = params.members.map((m) => ({
    uid: m.uid,
    username: m.username,
    displayName: m.displayName ?? null,
  }));
  const group: Group = {
    id: ref.id,
    name: params.name.trim(),
    ownerUid: params.ownerUid,
    mode: 'private',
    isPublic: params.isPublic ?? false,
    joinCode,
    memberUids: sanitizedMembers.map((m) => m.uid),
    members: sanitizedMembers,
    createdAt: Date.now(),
  };
  const batch = firestore().batch();
  batch.set(ref, group);
  batch.set(collections.joinCodes().doc(joinCode), {
    groupId: ref.id,
    groupName: group.name,
    ownerUid: params.ownerUid,
  });
  await batch.commit();
  return group;
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string; members?: Friend[]; isPublic?: boolean },
): Promise<void> {
  if (DEMO_MODE) {
    demo.updateGroup(groupId, updates);
    return;
  }
  const patch: Partial<Group> = {};
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.isPublic !== undefined) patch.isPublic = updates.isPublic;
  if (updates.members !== undefined) {
    const sanitized = updates.members.map((m) => ({
      uid: m.uid,
      username: m.username,
      displayName: m.displayName ?? null,
    }));
    patch.members = sanitized;
    patch.memberUids = sanitized.map((m) => m.uid);
  }
  await collections.groups().doc(groupId).update(patch);
}

export async function deleteGroup(groupId: string): Promise<void> {
  if (DEMO_MODE) {
    demo.deleteGroup(groupId);
    return;
  }
  const snap = await collections.groups().doc(groupId).get();
  const group = snap.exists() ? (snap.data() as Group) : null;
  const batch = firestore().batch();
  batch.delete(collections.groups().doc(groupId));
  if (group?.joinCode) {
    batch.delete(collections.joinCodes().doc(group.joinCode));
  }
  await batch.commit();
}

export function subscribeToGroups(
  ownerUid: string,
  onChange: (groups: Group[]) => void,
): () => void {
  if (DEMO_MODE) return demo.subscribeGroups(onChange);
  return collections
    .groups()
    .where('ownerUid', '==', ownerUid)
    .onSnapshot(
      (snap: any) => {
        if (!snap) return;
        onChange(snap.docs.map((d: any) => d.data() as Group));
      },
      () => {},
    );
}

export function subscribeToMemberGroups(
  uid: string,
  onChange: (groups: Group[]) => void,
): () => void {
  if (DEMO_MODE) return demo.subscribeMemberGroups(onChange);
  return collections
    .groups()
    .where('memberUids', 'array-contains', uid)
    .onSnapshot(
      (snap: any) => {
        if (!snap) return;
        onChange(snap.docs.map((d: any) => d.data() as Group));
      },
      () => {},
    );
}

export async function findGroupByCode(
  code: string,
): Promise<{ groupId: string; groupName: string } | null> {
  if (DEMO_MODE) return demo.findGroupByCode(code);
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return null;
  const snap = await collections.joinCodes().doc(cleaned).get();
  if (!snap.exists()) return null;
  const { groupId, groupName } = snap.data() as { groupId: string; groupName: string };
  return { groupId, groupName };
}

export async function joinGroup(groupId: string, user: Friend): Promise<void> {
  if (DEMO_MODE) {
    demo.joinGroup(groupId, user);
    return;
  }
  const ref = collections.groups().doc(groupId);
  await firestore().runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Group not found');
    const group = snap.data() as Group;
    if (group.memberUids.includes(user.uid)) throw new Error('Already a member of this group');
    if (group.memberUids.length >= 25) throw new Error('This group is full');
    tx.update(ref, {
      memberUids: [...group.memberUids, user.uid],
      members: [
        ...group.members,
        { uid: user.uid, username: user.username, displayName: user.displayName ?? null },
      ],
    });
  });
}

export async function sendWordToGroup(params: {
  word: string;
  note?: string;
  from: { uid: string; username: string };
  group: Group;
}): Promise<void> {
  if (DEMO_MODE) {
    demo.sendWordToGroup(params);
    return;
  }
  const batch = firestore().batch();
  const now = Date.now();
  for (const memberUid of params.group.memberUids) {
    const ref = collections.cards().doc();
    const card: WordCard = {
      id: ref.id,
      word: params.word.trim(),
      note: params.note?.trim() || null,
      fromUid: params.from.uid,
      fromUsername: params.from.username,
      toUid: memberUid,
      status: 'pending',
      createdAt: now,
      decidedAt: null,
    };
    batch.set(ref, card);
  }
  await batch.commit();
}
