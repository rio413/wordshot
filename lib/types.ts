export type WordCardStatus = 'pending' | 'saved' | 'discarded';

export type Friend = {
  uid: string;
  username: string;
  displayName?: string | null;
};

export type WordCard = {
  id: string;
  word: string;
  note?: string | null;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  status: WordCardStatus;
  createdAt: number; // ms epoch
  decidedAt?: number | null;
};

export type UserProfile = {
  uid: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  pushTokens: string[];
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  ownerUid: string;
  mode: 'private' | 'broadcast' | 'community';
  isPublic: boolean;
  memberUids: string[];
  members: Friend[];
  createdAt: number;
};

export type RecipientChoice =
  | { kind: 'friend'; value: Friend }
  | { kind: 'group'; value: Group };
