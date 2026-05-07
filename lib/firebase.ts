import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

export { auth, firestore, messaging };
export type { FirebaseAuthTypes };

export const collections = {
  users: () => firestore().collection('users'),
  usernames: () => firestore().collection('usernames'),
  cards: () => firestore().collection('cards'),
  savedWords: (uid: string) =>
    firestore().collection('users').doc(uid).collection('savedWords'),
  groups: () => firestore().collection('groups'),
  joinCodes: () => firestore().collection('joinCodes'),
};
