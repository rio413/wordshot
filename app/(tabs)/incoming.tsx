import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { decideCard, subscribeToInbox } from '@/lib/db';
import { WordCard } from '@/lib/types';
import { palette, space } from '@/constants/theme';

// Animation phases.
// Save path:    P_IDLE → P_SAVE_SLIDE → P_SAVE_COMPRESS → P_SAVE_FLY → P_SAVE_DONE
// Discard path: P_IDLE → P_DISC_SLIDE → P_DISC_SHATTER  → P_DISC_FADE → P_DISC_DONE
const P_IDLE = 0;
const P_SAVE_SLIDE = 1;
const P_SAVE_COMPRESS = 2;
const P_SAVE_FLY = 3;
const P_SAVE_DONE = 4;
const P_DISC_SLIDE = -1;
const P_DISC_SHATTER = -2;
const P_DISC_FADE = -3;
const P_DISC_DONE = -4;

// Frame hold durations (ms) — same stop-motion philosophy as ShootableCard.
const HOLD_SLIDE = 55;
const HOLD_COMPRESS = 60;
const HOLD_FLY = 150;
const HOLD_SHATTER = 75;
const HOLD_FADE = 75;

export default function IncomingScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<WordCard[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToInbox(user.uid, setCards);
  }, [user]);

  const simulateIncoming = () => {
    const words = ['ephemeral', 'luminary', 'vellichor', 'hiraeth', 'monachopsis', 'kenopsia'];
    const senders = ['mira', 'sora', 'leo'];
    const notes: (string | null)[] = [
      'lasting for only a short time',
      'a person who inspires others',
      'the strange wistfulness of used bookshops',
      'a longing for a home that never was',
      'the unsettling awareness of being out of place',
      null,
    ];
    const idx = Math.floor(Math.random() * words.length);
    const fake: WordCard = {
      id: `sim-${Date.now()}`,
      word: words[idx],
      note: notes[idx],
      fromUid: `demo-${senders[idx % senders.length]}`,
      fromUsername: senders[idx % senders.length],
      toUid: user?.uid ?? 'sim',
      status: 'pending',
      createdAt: Date.now(),
      decidedAt: null,
    };
    setCards((prev) => [fake, ...prev]);
  };

  const handleSave = (card: WordCard) => {
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    decideCard(card.id, 'saved').catch(console.error);
  };

  const handleDiscard = (card: WordCard) => {
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    decideCard(card.id, 'discarded').catch(console.error);
  };

  return (
    <Screen tone="cream" padded={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="h1">Incoming</Text>
            <Text variant="micro" style={{ marginTop: 4 }}>
              {cards.length === 0
                ? 'All clear'
                : `${cards.length} new ${cards.length === 1 ? 'shot' : 'shots'}`}
            </Text>
          </View>
          {__DEV__ ? (
            <Pressable style={styles.simButton} onPress={simulateIncoming}>
              <Text variant="micro" color={palette.textBlackSoft}>+ Simulate</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        renderItem={({ item, index }) => (
          <SwipeableWordRow
            word={item}
            onSave={() => handleSave(item)}
            onDiscard={() => handleDiscard(item)}
            isFirst={index === 0}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.s2 }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
      />
    </Screen>
  );
}

function SwipeableWordRow({
  word,
  onSave,
  onDiscard,
  isFirst,
}: {
  word: WordCard;
  onSave: () => void;
  onDiscard: () => void;
  isFirst?: boolean;
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const phase = useSharedValue(P_IDLE);
  const dragX = useSharedValue(0);

  const triggerSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    dragX.value = 0;
    phase.value = withSequence(
      withTiming(P_SAVE_SLIDE, { duration: 0 }),
      withDelay(HOLD_SLIDE, withTiming(P_SAVE_COMPRESS, { duration: 0 })),
      withDelay(
        HOLD_COMPRESS,
        withTiming(P_SAVE_FLY, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) runOnJS(onSave)();
        }),
      ),
      withDelay(HOLD_FLY, withTiming(P_SAVE_DONE, { duration: 0 })),
    );
  };

  const triggerDiscard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dragX.value = 0;
    phase.value = withSequence(
      withTiming(P_DISC_SLIDE, { duration: 0 }),
      withDelay(HOLD_SLIDE, withTiming(P_DISC_SHATTER, { duration: 0 })),
      withDelay(HOLD_SHATTER, withTiming(P_DISC_FADE, { duration: 0 })),
      withDelay(
        HOLD_FADE,
        withTiming(P_DISC_DONE, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) runOnJS(onDiscard)();
        }),
      ),
    );
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (phase.value !== P_IDLE) return;
      dragX.value = Math.max(-120, Math.min(120, e.translationX));
    })
    .onEnd((e) => {
      if (phase.value !== P_IDLE) return;
      const toSave = e.translationX > 60 || e.velocityX > 800;
      const toDiscard = e.translationX < -60 || e.velocityX < -800;
      if (toSave) {
        runOnJS(triggerSave)();
      } else if (toDiscard) {
        runOnJS(triggerDiscard)();
      } else {
        dragX.value = withTiming(0, { duration: 120 });
      }
    });

  // Main card container: handles position, scale, and opacity for both sequences.
  const containerStyle = useAnimatedStyle(() => {
    const p = phase.value;
    let tx = 0;
    let ty = 0;
    let sx = 1;
    let sy = 1;
    let opacity = 1;

    if (p === P_IDLE) {
      tx = dragX.value;
      const t = dragX.value / 120;
      sx = 1 + Math.abs(t) * 0.015;
      sy = 1 - Math.abs(t) * 0.025;
    } else if (p === P_SAVE_SLIDE) {
      tx = screenW * 0.42;
    } else if (p === P_SAVE_COMPRESS) {
      tx = screenW * 0.52;
      sx = 0.22;
      sy = 0.22;
    } else if (p === P_SAVE_FLY) {
      // Tiny square arcs toward Bank tab (bottom of screen, near center).
      tx = screenW * 0.08;
      ty = screenH * 0.5;
      sx = 0.07;
      sy = 0.07;
    } else if (p === P_SAVE_DONE) {
      opacity = 0;
    } else if (p === P_DISC_SLIDE) {
      tx = -screenW * 0.38;
    } else if (p <= P_DISC_SHATTER) {
      // Card invisible; fragments take over.
      opacity = 0;
    }

    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scaleX: sx }, { scaleY: sy }],
      opacity,
    };
  });

  // Word/meta content: hidden when the bullet shape is showing (save compress/fly).
  const cardSkinStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      opacity: p === P_SAVE_COMPRESS || p === P_SAVE_FLY || p === P_SAVE_DONE ? 0 : 1,
    };
  });

  // Angular black square that appears during save compression → fly.
  const bulletStyle = useAnimatedStyle(() => {
    const p = phase.value;
    return { opacity: p === P_SAVE_COMPRESS || p === P_SAVE_FLY ? 1 : 0 };
  });

  // Shatter fragments — visible only during P_DISC_SHATTER and P_DISC_FADE.
  // They originate near the card's slid position (baseX = -screenW * 0.35) then scatter.
  const frag1Style = useAnimatedStyle(() => {
    const p = phase.value;
    if (p >= P_DISC_SLIDE || p === P_DISC_DONE) {
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] };
    }
    const baseX = -screenW * 0.35;
    const addX = p === P_DISC_SHATTER ? -18 : -54;
    const addY = p === P_DISC_SHATTER ? -12 : -42;
    const rot = p === P_DISC_SHATTER ? -20 : -38;
    return {
      opacity: p === P_DISC_SHATTER ? 1 : 0.3,
      transform: [{ translateX: baseX + addX }, { translateY: addY }, { rotate: `${rot}deg` }],
    };
  });

  const frag2Style = useAnimatedStyle(() => {
    const p = phase.value;
    if (p >= P_DISC_SLIDE || p === P_DISC_DONE) {
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] };
    }
    const baseX = -screenW * 0.35;
    const addX = p === P_DISC_SHATTER ? 30 : 72;
    const addY = p === P_DISC_SHATTER ? -16 : -38;
    const rot = p === P_DISC_SHATTER ? 14 : 26;
    return {
      opacity: p === P_DISC_SHATTER ? 1 : 0.3,
      transform: [{ translateX: baseX + addX }, { translateY: addY }, { rotate: `${rot}deg` }],
    };
  });

  const frag3Style = useAnimatedStyle(() => {
    const p = phase.value;
    if (p >= P_DISC_SLIDE || p === P_DISC_DONE) {
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] };
    }
    const baseX = -screenW * 0.35;
    const addX = p === P_DISC_SHATTER ? 6 : -18;
    const addY = p === P_DISC_SHATTER ? 20 : 54;
    const rot = p === P_DISC_SHATTER ? 8 : 18;
    return {
      opacity: p === P_DISC_SHATTER ? 1 : 0.3,
      transform: [{ translateX: baseX + addX }, { translateY: addY }, { rotate: `${rot}deg` }],
    };
  });

  // Swipe-direction hints that fade in behind the card as the user drags.
  const saveHintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(dragX.value, 0) / 80, 1),
  }));

  const discardHintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(-dragX.value, 0) / 80, 1),
  }));

  const swipeNudgeStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - Math.abs(dragX.value) / 40) * (phase.value === P_IDLE ? 1 : 0),
  }));

  return (
    <View style={styles.rowWrap}>
      {/* Swipe-direction affordances rendered behind the card */}
      <Animated.View style={[styles.saveHint, saveHintStyle]} pointerEvents="none">
        <Ionicons name="bookmark" size={16} color={palette.greenAccent} />
        <Text variant="uppercaseLabel" color={palette.greenAccent}>
          Save
        </Text>
      </Animated.View>
      <Animated.View style={[styles.discardHint, discardHintStyle]} pointerEvents="none">
        <Text variant="uppercaseLabel" color={palette.red}>
          Discard
        </Text>
        <Ionicons name="close" size={16} color={palette.red} />
      </Animated.View>

      {/* Animated card */}
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.card, containerStyle]}>
          <Animated.View style={cardSkinStyle}>
            <Text variant="bodyMedium">{word.word}</Text>
            {word.note ? (
              <Text variant="small" color={palette.textBlackSoft} style={{ marginTop: 4 }}>
                "{word.note}"
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <Ionicons name="person-circle-outline" size={14} color={palette.textBlackSoft} />
              <Text variant="micro">@{word.fromUsername}</Text>
            </View>
          </Animated.View>

          {/* Angular black square shown when card compresses into a bullet */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, styles.bulletWrap, bulletStyle]}
            pointerEvents="none"
          >
            <View style={styles.bulletSquare} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {isFirst ? (
        <Animated.View style={[styles.swipeNudge, swipeNudgeStyle]} pointerEvents="none">
          <Text variant="uppercaseLabel" color={palette.textBlackSoft}>← Discard</Text>
          <Text variant="uppercaseLabel" color={palette.textBlackSoft}>Save →</Text>
        </Animated.View>
      ) : null}

      {/* Discard shatter fragments — absolutely positioned within rowWrap */}
      <Animated.View style={[styles.fragBase, frag1Style]} pointerEvents="none">
        <View style={[styles.fragPiece, { width: 52, height: 30, transform: [{ skewX: '-8deg' }] }]} />
      </Animated.View>
      <Animated.View style={[styles.fragBase, frag2Style]} pointerEvents="none">
        <View style={[styles.fragPiece, { width: 44, height: 26, transform: [{ skewX: '6deg' }] }]} />
      </Animated.View>
      <Animated.View style={[styles.fragBase, frag3Style]} pointerEvents="none">
        <View style={[styles.fragPiece, { width: 60, height: 22, transform: [{ skewX: '-4deg' }] }]} />
      </Animated.View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Ionicons name="arrow-down-circle-outline" size={36} color={palette.textBlackSoft} style={{ alignSelf: 'center', marginBottom: space.s3 }} />
      <Text variant="bodyLarge" align="center" color={palette.textBlackSoft}>
        No new shots.
      </Text>
      <Text variant="small" align="center" color={palette.textBlackSoft} style={{ marginTop: 8 }}>
        Ask a friend to send you a word.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.s3,
    paddingTop: space.s4,
    paddingBottom: space.s3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  simButton: {
    borderWidth: 1,
    borderColor: palette.black14,
    borderRadius: 0,
    paddingHorizontal: space.s2,
    paddingVertical: 4,
    marginBottom: 2,
  },
  list: {
    paddingHorizontal: space.s3,
    paddingBottom: space.s8,
  },
  rowWrap: {
    position: 'relative',
  },
  saveHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: space.s3,
    gap: 6,
  },
  discardHint: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: space.s3,
    gap: 6,
  },
  card: {
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
    padding: space.s3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  bulletWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletSquare: {
    width: 28,
    height: 28,
    backgroundColor: palette.black,
    borderRadius: 0,
  },
  fragBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragPiece: {
    backgroundColor: palette.black,
    borderRadius: 0,
  },
  empty: {
    paddingTop: space.s9,
    paddingHorizontal: space.s4,
  },
  swipeNudge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.s2,
    paddingTop: space.s1,
  },
});
