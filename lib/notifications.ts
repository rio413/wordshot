/**
 * Push notifications via RNFB messaging.
 *
 * registerForPush  — requests permission, gets the FCM token, persists it
 *                    to users/{uid}.pushTokens so dispatchCardPush can read it.
 * onForegroundCard — fires while the app is open; we route directly to the card.
 * onNotificationOpened — fires when the user taps a notification from background.
 * getInitialCardId — fires when the user taps a notification that cold-starts the app.
 *
 * Demo mode: every entrypoint is a no-op.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { collections } from './firebase';
import { DEMO_MODE } from './demo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPush(uid: string): Promise<string | null> {
  if (DEMO_MODE) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('wordshot-cards', {
      name: 'New words',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const authStatus = await messaging().requestPermission();
  const granted =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  if (!granted) return null;

  const token = await messaging().getToken();

  await collections
    .users()
    .doc(uid)
    .update({ pushTokens: firestore.FieldValue.arrayUnion(token) });

  // Keep token fresh — FCM rotates tokens occasionally.
  messaging().onTokenRefresh(async (newToken) => {
    await collections
      .users()
      .doc(uid)
      .update({ pushTokens: firestore.FieldValue.arrayUnion(newToken) });
  });

  return token;
}

export function onForegroundCard(handler: (cardId: string) => void): () => void {
  return messaging().onMessage(async (msg) => {
    const cardId = msg.data?.cardId as string | undefined;
    if (cardId) handler(cardId);
  });
}

export function onNotificationOpened(handler: (cardId: string) => void): () => void {
  return messaging().onNotificationOpenedApp((msg) => {
    const cardId = msg.data?.cardId as string | undefined;
    if (cardId) handler(cardId);
  });
}

export async function getInitialCardId(): Promise<string | null> {
  const msg = await messaging().getInitialNotification();
  return (msg?.data?.cardId as string) ?? null;
}
