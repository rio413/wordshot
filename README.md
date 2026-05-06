# wordshot

A mobile-first, notification-driven social vocabulary app. Friends send each
other useful words; the receiver gets a push, opens the card, and saves or
discards it. Saved words accumulate into a personal bank.

**Non-negotiable**: sending a word must take under 10 seconds.

Stack: Expo (React Native) + TypeScript + Expo Router · Firebase Auth /
Firestore / FCM · Apple + Google sign-in · Inter as a SoDoSans substitute ·
Starbucks-inspired design system (see `DESIGN.md`).

---

## Prerequisites

- Node 20+ and npm
- Xcode 15+ (for iOS — local builds via `expo run:ios` use Xcode directly, no EAS quota needed)
- Android Studio + JDK 17 (for Android local builds)
- CocoaPods (`brew install cocoapods`)
- An Apple Developer account ($99/yr) for Apple Sign-In and TestFlight (only needed when shipping)
- A Google Cloud / Firebase project (free tier is fine, only needed to leave demo mode)

## 1. Install

```bash
cd /Users/ryomainoue/Projects/wordshot
npm install
```

## Demo mode (default)

The repo ships with `EXPO_PUBLIC_DEMO_MODE=true` in `.env`. In demo mode, the
app uses an in-memory mock backend — no Firebase config required. You can:

- Sign in with any email + password (no validation)
- See seeded "friends" (`@mira`, `@sora`, `@leo`) in the recent-recipient row
- Send a word and it persists for the current session
- Open seeded incoming cards in the inbox flow
- Save / discard them and see them stack into the bank

Switch off demo mode by setting `EXPO_PUBLIC_DEMO_MODE=false` and following the
Firebase setup section below.

## Run on iOS simulator (no EAS, free)

```bash
npx expo prebuild --platform ios     # generate ios/ project
npx expo run:ios                     # build with Xcode + launch simulator
```

First build takes 3–5 min. Subsequent builds are incremental (~30s).

## Run on Android emulator

```bash
npx expo prebuild --platform android
npx expo run:android
```

## 2. Firebase setup

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Enable **Authentication** → providers: **Email/Password**, **Apple**,
   **Google**.
3. Enable **Cloud Firestore** in production mode (rules below).
4. Add an iOS app:
   - Bundle ID: `com.ryomainoue.wordshot` (or change in `app.json`).
   - Download **GoogleService-Info.plist** → place at the project root.
5. Add an Android app:
   - Package: `com.ryomainoue.wordshot`.
   - Download **google-services.json** → place at the project root.
   - Add the SHA-1 fingerprint from `eas credentials` for Google Sign-In.
6. Enable **Cloud Messaging** (FCM) — automatic when you add the apps above.
7. (Optional but recommended) Set up the Cloud Function below to dispatch push
   notifications when a card is created.

### Suggested Firestore rules (starting point — tighten before launch)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
      match /savedWords/{cardId} {
        allow read, write: if request.auth.uid == uid;
      }
      match /recents/{friendUid} {
        allow read, write: if request.auth.uid == uid;
      }
    }
    match /usernames/{handle} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
    }
    match /cards/{cardId} {
      allow read: if request.auth != null
        && (resource.data.fromUid == request.auth.uid
            || resource.data.toUid == request.auth.uid);
      allow create: if request.auth != null
        && request.resource.data.fromUid == request.auth.uid;
      allow update: if request.auth != null
        && resource.data.toUid == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['status', 'decidedAt']);
    }
  }
}
```

### Push-on-create Cloud Function (sketch)

Drop this into a `functions/` directory of your Firebase project:

```ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();

export const dispatchCardPush = onDocumentCreated(
  'cards/{cardId}',
  async (event) => {
    const card = event.data?.data();
    if (!card) return;
    const recipient = await getFirestore()
      .doc(`users/${card.toUid}`)
      .get();
    const tokens: string[] = recipient.data()?.pushTokens ?? [];
    if (tokens.length === 0) return;
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `@${card.fromUsername} sent you a word`,
        body: card.word,
      },
      data: { cardId: event.params.cardId },
    });
  },
);
```

## 3. Apple Sign-In

In <https://developer.apple.com>:

- Identifiers → your app id → enable **Sign in with Apple**.
- In Firebase: Authentication → Sign-in method → Apple → enable, paste the
  Services ID and key.

## 4. Google Sign-In

- In Firebase: Authentication → Sign-in method → Google → enable.
- For iOS, copy the **REVERSED_CLIENT_ID** from `GoogleService-Info.plist` —
  the `@react-native-google-signin/google-signin` Expo plugin reads it from
  the Info.plist automatically once `GoogleService-Info.plist` is in place.
- For Android, you'll need a SHA-1 fingerprint from your dev keystore. Run
  `eas credentials` → Android → manage build credentials.

> **Note**: `expo-google-fonts/inter` provides our Inter typeface (SoDoSans
> substitute per `DESIGN.md`). It loads at runtime — no native config needed.

## 5. Switch off demo mode → real Firebase

Once Firebase is configured (steps 2–4 above) and the config files are in the
project root:

1. Edit `.env`: `EXPO_PUBLIC_DEMO_MODE=false`
2. Add the Firebase plugins back to `app.json` plugins array:
   ```json
   "@react-native-firebase/app",
   "@react-native-firebase/auth",
   "@react-native-google-signin/google-signin"
   ```
3. Add `googleServicesFile` references to `app.json`:
   ```json
   "ios":     { "googleServicesFile": "./GoogleService-Info.plist", ... }
   "android": { "googleServicesFile": "./google-services.json",     ... }
   ```
4. `npx expo prebuild --clean --platform ios` (regenerate native projects)
5. `npx expo run:ios`

## 6. Cloud Function — push-on-card-create

The function lives in `functions/src/index.ts` and fires whenever a new card
lands in `cards/{cardId}`. To deploy:

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>     # or edit .firebaserc
cd functions && npm install
cd .. && firebase deploy --only functions
```

You'll also want to deploy the Firestore rules + indexes:

```bash
firebase deploy --only firestore
```

## Project layout

```
app/
  _layout.tsx              # font loading, auth gate, push wiring
  (auth)/
    _layout.tsx
    login.tsx              # email/password + Apple + Google
  (tabs)/
    _layout.tsx            # Send / Bank / Profile
    index.tsx              # ◀ Send screen — auto-focused word input
    bank.tsx               # saved words + search
    profile.tsx            # account + sign out
  card/[id].tsx            # receive-card modal (push lands here)
components/
  Text, PillButton, Card, FrapFAB, Chip, FloatingLabelInput, Screen
constants/
  theme.ts                 # all Starbucks tokens — single source of truth
lib/
  firebase.ts              # SDK barrel + collection refs
  auth.tsx                 # AuthProvider context (Apple/Google/email)
  db.ts                    # Firestore reads/writes for words + friends
  notifications.ts         # FCM token register + handlers
  types.ts                 # WordCard, UserProfile, Friend
DESIGN.md                  # Starbucks design spec — read before changing UI
```

## The 10-second send invariant

The send screen (`app/(tabs)/index.tsx`) is engineered to land a word in
under 10 seconds. If you change anything there, re-validate:

1. Open app → word input is auto-focused, keyboard up. *(0–1s)*
2. Type word. *(2–4s, normal typing)*
3. Tap a recent-recipient chip. *(1 tap, 0–1s)*
4. Tap Send. *(1 tap, 0–1s)*

Total: ~4–7 seconds for a known recipient. Adding a note is a deliberate
detour and never blocks the send button. Don't introduce required steps
(modals, confirmations, recipient confirmation) on the happy path.

## Roadmap

- **v0.1 (this scaffold)**: 1:1 sends, save/discard, word bank, push, demo
  mode for instant simulator runs.
- **v0.2**: small groups, native iOS share extension (`expo-share-extension`),
  Android share intent.
- **v0.3**: AdMob (free tier) + RevenueCat (Pro: unlimited groups, themed
  bank). Packages aren't installed yet; add when monetization starts.

### Share-affordance shipped in v0.1

The send screen accepts deep-link prefill via `wordshot://send?word=...&note=...`
so Shortcuts, Safari "Open in…", and a future share extension can all hand
off to the same screen. To wire a real iOS share extension later:

```bash
npm install expo-share-extension
# Add to app.json plugins with an app-group identifier,
# e.g. "group.com.ryomainoue.wordshot"
npx expo prebuild --clean
```

The extension code reads the shared text and opens the host app via the
`wordshot://send?word=...` URL we already handle.

## Useful commands

```bash
npx expo start --dev-client   # bundler for the dev build
npx tsc --noEmit              # type-check
npm run lint                  # eslint
eas build --profile preview   # internal-distribution build
eas submit                    # TestFlight / Play Console
```
