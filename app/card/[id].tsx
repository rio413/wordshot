/**
 * Receive-card screen — opened from a push notification or in-app inbox.
 *
 * Layout: large word at top of a white card on the cream canvas, sender
 * attribution beneath, optional note below, and two big pill buttons
 * (Save / Discard) bottom-anchored. Decision is one tap.
 */
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { PillButton } from '@/components/PillButton';
import { decideCard, getCard } from '@/lib/db';
import { WordCard } from '@/lib/types';
import { palette, space } from '@/constants/theme';

export default function ReceiveCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<WordCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchCard = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getCard(id)
      .then((c) => { setCard(c); setLoading(false); })
      .catch((e: any) => { setError(e?.message ?? 'Failed to load word.'); setLoading(false); });
  };

  useEffect(fetchCard, [id]);

  const decide = async (status: 'saved' | 'discarded') => {
    if (!card) return;
    Haptics.impactAsync(
      status === 'saved'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
    setBusy(true);
    try {
      await decideCard(card.id, status);
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't update", e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tone="cream">
      <View style={styles.topRow}>
        <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
          New word
        </Text>
        <Ionicons
          name="close"
          size={24}
          color={palette.textBlackSoft}
          onPress={() => router.back()}
          suppressHighlighting
        />
      </View>

      <Card style={styles.card}>
        {loading ? (
          <Text variant="body" align="center" color={palette.textBlackSoft}>
            Loading…
          </Text>
        ) : error ? (
          <View style={styles.errorState}>
            <Text variant="body" align="center" color={palette.textBlackSoft}>
              {error}
            </Text>
            <PillButton
              label="Retry"
              variant="outlined"
              onPress={fetchCard}
              style={{ marginTop: space.s3 }}
            />
          </View>
        ) : card ? (
          <>
            <Text variant="display" color={palette.starbucksGreen} align="center">
              {card.word}
            </Text>
            <View style={styles.fromRow}>
              <Ionicons name="person-circle" size={18} color={palette.greenAccent} />
              <Text variant="smallStrong" color={palette.greenAccent}>
                @{card.fromUsername}
              </Text>
            </View>
            {card.note ? (
              <Text
                variant="bodyLarge"
                align="center"
                color={palette.textBlackSoft}
                style={{ marginTop: space.s4 }}
              >
                {card.note}
              </Text>
            ) : null}
          </>
        ) : (
          <Text variant="body" align="center" color={palette.textBlackSoft}>
            Word not found.
          </Text>
        )}
      </Card>

      <View style={styles.actions}>
        <PillButton
          label="Discard"
          variant="destructive"
          onPress={() => decide('discarded')}
          disabled={busy || !card || loading}
          fullWidth
          size="large"
        />
        <PillButton
          label="Save"
          onPress={() => decide('saved')}
          loading={busy}
          disabled={!card || loading}
          fullWidth
          size="large"
          iconLeft={<Ionicons name="bookmark" size={18} color={palette.white} />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.s3,
  },
  card: {
    flex: 1,
    marginTop: space.s5,
    paddingVertical: space.s8,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
  },
  fromRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: space.s3,
  },
  actions: {
    gap: space.s3,
    paddingVertical: space.s4,
  },
  errorState: {
    alignItems: 'center',
  },
});
