/**
 * wordshot Cloud Functions.
 *
 * dispatchCardPush — fans out an FCM push to the recipient when a new card
 * lands in cards/{cardId}. The client (lib/notifications.ts) writes its FCM
 * tokens into users/{uid}.pushTokens; we read those here and multicast.
 *
 * Deploy:
 *   firebase login
 *   firebase use <your-project-id>
 *   cd functions && npm install && npm run deploy
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();

type WordCard = {
  id: string;
  word: string;
  note?: string | null;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  status: 'pending' | 'saved' | 'discarded';
  createdAt: number;
};

export const dispatchCardPush = onDocumentCreated(
  { document: 'cards/{cardId}', region: 'us-central1' },
  async (event) => {
    const cardId = event.params.cardId;
    const card = event.data?.data() as WordCard | undefined;
    if (!card) {
      logger.warn('No card data for', cardId);
      return;
    }

    const recipientRef = getFirestore().doc(`users/${card.toUid}`);
    const recipientSnap = await recipientRef.get();
    const tokens: string[] = (recipientSnap.data()?.pushTokens as string[]) ?? [];
    if (tokens.length === 0) {
      logger.info('Recipient has no push tokens', { uid: card.toUid });
      return;
    }

    const truncatedNote =
      card.note && card.note.length > 80 ? card.note.slice(0, 79) + '…' : card.note;

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `@${card.fromUsername} sent you a word`,
        body: truncatedNote ? `${card.word} — ${truncatedNote}` : card.word,
      },
      data: { cardId, fromUid: card.fromUid, type: 'new_card' },
      apns: {
        payload: {
          aps: { sound: 'default', 'mutable-content': 1 },
        },
      },
      android: {
        priority: 'high',
        notification: { channelId: 'wordshot-cards' },
      },
    });

    // Prune dead tokens — clients that uninstalled or revoked permission.
    const dead: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success && r.error) {
        const code = r.error.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          dead.push(tokens[i]);
        }
      }
    });
    if (dead.length > 0) {
      await recipientRef.update({ pushTokens: FieldValue.arrayRemove(...dead) });
      logger.info('Pruned dead tokens', { count: dead.length });
    }

    logger.info('Dispatched card push', {
      cardId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  },
);
