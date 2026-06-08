/**
 * Auth context.
 *
 * Stage 1: email/password real Firebase. Apple + Google still stubbed.
 * Demo mode (EXPO_PUBLIC_DEMO_MODE=true) bypasses Firebase entirely.
 */
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { auth, firestore, collections } from './firebase';
import { UserProfile } from './types';
import { DEMO_MODE, demo } from './demo';

type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  providers: string[];
} | null;

type AuthState = {
  user: AuthUser;
  profile: UserProfile | null;
  ready: boolean;
  isEmailUser: boolean;
};

type AuthAPI = AuthState & {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
};

const AuthContext = createContext<AuthAPI | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setReady(true);
      return;
    }

    const unsubscribe = auth().onAuthStateChanged(async (u) => {
      if (!u) {
        setUser(null);
        setProfile(null);
        setReady(true);
        return;
      }
      setUser({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        providers: u.providerData.map((p) => p.providerId),
      });
      try {
        const snap = await collections.users().doc(u.uid).get();
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      } catch {
        setProfile(null);
      }
      setReady(true);
    });
    return unsubscribe;
  }, []);

  const api = useMemo<AuthAPI>(
    () => ({
      user,
      profile,
      ready,
      isEmailUser: user?.providers?.includes('password') ?? false,

      async signInWithEmail(email, password) {
        if (DEMO_MODE) return enterDemo(setUser, setProfile, email);
        try {
          await auth().signInWithEmailAndPassword(email.trim(), password);
        } catch (e: any) {
          throw new Error(authErrorMessage(e));
        }
      },

      async signUpWithEmail(email, password, username) {
        if (DEMO_MODE) return enterDemo(setUser, setProfile, email, username);

        const handle = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{2,20}$/.test(handle)) {
          throw new Error('Username must be 2–20 chars: a–z, 0–9, _');
        }

        const taken = await collections.usernames().doc(handle).get();
        if (taken.exists()) throw new Error('That username is taken.');

        let cred;
        try {
          cred = await auth().createUserWithEmailAndPassword(email.trim(), password);
        } catch (e: any) {
          throw new Error(authErrorMessage(e));
        }
        const u = cred.user;

        try {
          await u.updateProfile({ displayName: handle });

          const profileDoc: UserProfile = {
            uid: u.uid,
            username: handle,
            displayName: handle,
            email: u.email,
            photoURL: null,
            pushTokens: [],
            createdAt: Date.now(),
          };

          const batch = firestore().batch();
          batch.set(collections.users().doc(u.uid), profileDoc);
          batch.set(collections.usernames().doc(handle), { uid: u.uid });
          await batch.commit();
          setProfile(profileDoc);
        } catch (e: any) {
          await u.delete().catch(() => {});
          if (e?.code === 'firestore/permission-denied') {
            throw new Error('That username was just claimed. Try another.');
          }
          throw new Error(e?.message ?? 'Signup failed. Please try again.');
        }
      },

      async signInWithApple() {
        if (DEMO_MODE) return enterDemo(setUser, setProfile, 'apple@wordshot.local');

        // Generate nonce — Apple requires SHA256 hash sent in the request,
        // raw nonce is passed to Firebase so it can verify the token.
        const rawNonce = Array.from(
          { length: 20 },
          () => Math.floor(Math.random() * 36).toString(36),
        ).join('');
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          rawNonce,
        );

        const appleCredential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });

        const { identityToken, fullName, email: appleEmail } = appleCredential;
        if (!identityToken) throw new Error('Apple Sign-In failed — no identity token.');

        const provider = new auth.OAuthProvider('apple.com');
        const credential = provider.credential({ idToken: identityToken, rawNonce });
        const result = await auth().signInWithCredential(credential);
        const u = result.user;

        // Create Firestore profile for first-time users.
        const snap = await collections.users().doc(u.uid).get();
        if (!snap.exists()) {
          const raw = (
            fullName?.givenName?.toLowerCase() ||
            (appleEmail || u.email || '').split('@')[0].toLowerCase()
          ).replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'user';

          let username = raw;
          let attempt = 1;
          while ((await collections.usernames().doc(username).get()).exists()) {
            username = `${raw}${attempt++}`;
          }

          const profileDoc: UserProfile = {
            uid: u.uid,
            username,
            displayName: fullName?.givenName || username,
            email: appleEmail || u.email,
            photoURL: null,
            pushTokens: [],
            createdAt: Date.now(),
          };
          const batch = firestore().batch();
          batch.set(collections.users().doc(u.uid), profileDoc);
          batch.set(collections.usernames().doc(username), { uid: u.uid });
          await batch.commit();
          setProfile(profileDoc);
        }
      },

      async forgotPassword(email: string) {
        if (DEMO_MODE) return;
        try {
          await auth().sendPasswordResetEmail(email.trim());
        } catch (e: any) {
          throw new Error(authErrorMessage(e));
        }
      },

      async signOut() {
        if (DEMO_MODE) {
          demo.signOut();
          setUser(null);
          setProfile(null);
          return;
        }
        await auth().signOut();
      },

      async changePassword(currentPassword, newPassword) {
        if (DEMO_MODE) return;
        const currentUser = auth().currentUser;
        if (!currentUser?.email) throw new Error('Change password requires email sign-in.');
        const credential = auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
        try {
          await currentUser.reauthenticateWithCredential(credential);
        } catch {
          throw new Error('Current password is incorrect.');
        }
        try {
          await currentUser.updatePassword(newPassword);
        } catch (e: any) {
          throw new Error(authErrorMessage(e));
        }
      },

      async deleteAccount(password?) {
        if (DEMO_MODE) {
          demo.signOut();
          setUser(null);
          setProfile(null);
          return;
        }
        const currentUser = auth().currentUser;
        if (!currentUser) throw new Error('Not signed in.');

        // Re-authenticate email/password users before destructive action.
        const isEmail = currentUser.providerData.some((p) => p.providerId === 'password');
        if (isEmail) {
          if (!password) throw new Error('Enter your password to confirm.');
          const credential = auth.EmailAuthProvider.credential(currentUser.email!, password);
          try {
            await currentUser.reauthenticateWithCredential(credential);
          } catch {
            throw new Error('Incorrect password.');
          }
        }

        // Delete Firestore records. savedWords subcollection is cleaned server-side.
        try {
          const batch = firestore().batch();
          batch.delete(collections.users().doc(currentUser.uid));
          if (profile?.username) {
            batch.delete(collections.usernames().doc(profile.username));
          }
          await batch.commit();
        } catch {
          // Best-effort; proceed to auth deletion regardless.
        }

        await currentUser.delete();
      },
    }),
    [user, profile, ready],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}

function enterDemo(
  setUser: (u: AuthUser) => void,
  setProfile: (p: UserProfile | null) => void,
  email: string,
  username?: string,
) {
  demo.signIn();
  const me = demo.getUser()!;
  if (username) me.username = username.trim().toLowerCase();
  me.email = email;
  setUser({ uid: me.uid, email, displayName: me.displayName ?? null, providers: ['password'] });
  setProfile(me);
}

function authErrorMessage(e: any): string {
  switch (e?.code) {
    case 'auth/invalid-email':
      return 'That email looks invalid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in.';
    case 'auth/weak-password':
      return 'Password is too weak (min 6 characters).';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    default:
      return e?.message ?? 'Sign-in failed. Please try again.';
  }
}
