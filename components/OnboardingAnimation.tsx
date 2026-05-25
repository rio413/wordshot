import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette, radii, space } from '@/constants/theme';
import { Text } from './Text';
import { PillButton } from './PillButton';

const FRAME_H = 520;
const FRAME_W = 300;
const WORD = 'astringent';
const JP_MEANING = '渋い・収れん性のある';

type Step = 0 | 1 | 2 | 3;

const STEP_LABELS = ['Spot a word', 'Open Word Share', 'Pick a friend', 'Share it'];

type Props = {
  visible: boolean;
  onDone: () => void;
};

export function OnboardingAnimation({ visible, onDone }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [typedWord, setTypedWord] = useState('');
  const [typedMeaning, setTypedMeaning] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Step 0 — word intro
  const wordOpacity = useSharedValue(0);
  const wordScale  = useSharedValue(0.75);

  // Step 1 — mock app slides up
  const mockSlideY = useSharedValue(FRAME_H);

  // Step 2 — recipient chip pops in
  const chipOpacity = useSharedValue(0);
  const chipScale   = useSharedValue(0.5);

  // Step 3 — word card launches + confirm appears
  const cardY      = useSharedValue(0);
  const cardScale  = useSharedValue(1);
  const cardOpacity   = useSharedValue(1);
  const confirmOpacity = useSharedValue(0);
  const confirmY       = useSharedValue(14);

  // ── Animated styles ────────────────────────────────────────────────────────

  const wordAnimStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ scale: wordScale.value }],
  }));

  const mockAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mockSlideY.value }],
  }));

  const chipAnimStyle = useAnimatedStyle(() => ({
    opacity: chipOpacity.value,
    transform: [{ scale: chipScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }, { scale: cardScale.value }],
  }));

  const confirmAnimStyle = useAnimatedStyle(() => ({
    opacity: confirmOpacity.value,
    transform: [{ translateY: confirmY.value }],
  }));

  // ── Timer helpers ──────────────────────────────────────────────────────────

  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  const cancelAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // ── Per-step runners (called by auto-sequence and by Next button) ──────────

  const runStep1 = () => {
    setStep(1);
    setTypedWord('');
    setTypedMeaning('');
    mockSlideY.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) });

    // English: starts 800ms in (after slide settles), 130ms per char
    WORD.split('').forEach((_, i) => {
      after(800 + i * 130, () => setTypedWord(WORD.slice(0, i + 1)));
    });

    // Japanese: starts 350ms after English finishes
    const jpStart = 800 + (WORD.length - 1) * 130 + 350;
    JP_MEANING.split('').forEach((_, i) => {
      after(jpStart + i * 110, () => setTypedMeaning(JP_MEANING.slice(0, i + 1)));
    });

    after(4800, runStep2);
  };

  const runStep2 = () => {
    setTypedWord(WORD);
    setTypedMeaning(JP_MEANING); // finalise if Next was tapped before typing finished
    setStep(2);
    chipOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    chipScale.value   = withSpring(1, { damping: 10, stiffness: 300 });
    after(3200, runStep3);
  };

  const runStep3 = () => {
    setStep(3);
    cardY.value       = withTiming(-FRAME_H * 1.2, { duration: 520, easing: Easing.in(Easing.ease) });
    cardScale.value   = withTiming(0.45, { duration: 520, easing: Easing.in(Easing.ease) });
    cardOpacity.value = withTiming(0, { duration: 520 });
    confirmOpacity.value = withDelay(
      420,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }),
    );
    confirmY.value = withDelay(
      420,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.6)) }),
    );
    after(3500, onDone);
  };

  const runSequence = () => {
    setStep(0);
    wordOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    wordScale.value   = withSpring(1, { damping: 13, stiffness: 180 });
    after(3500, runStep1);
  };

  const onNext = () => {
    cancelAll();
    if (step === 0) runStep1();
    else if (step === 1) runStep2();
    else if (step === 2) runStep3();
    else onDone();
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      cancelAll();
      setTypedWord('');
      setTypedMeaning('');
      wordOpacity.value    = 0;
      wordScale.value      = 0.75;
      mockSlideY.value     = FRAME_H;
      chipOpacity.value    = 0;
      chipScale.value      = 0.5;
      cardY.value          = 0;
      cardScale.value      = 1;
      cardOpacity.value    = 1;
      confirmOpacity.value = 0;
      confirmY.value       = 14;
      setStep(0);
      return;
    }
    after(200, runSequence);
    return cancelAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Step label */}
      <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
        {STEP_LABELS[step]}
      </Text>

      {/* ── Phone frame ──────────────────────────────────────────────────── */}
      <View style={styles.frame}>

        {/* Step 0: spotted word */}
        {step === 0 && (
          <View style={styles.frameCenter}>
            <Animated.View style={[styles.wordCard, wordAnimStyle]}>
              <Text variant="h2" align="center">
                astringent
              </Text>
              <Text variant="body" align="center" style={{ marginTop: space.s1 }}>
                渋い・収れん性のある
              </Text>
              <Text
                variant="uppercaseLabel"
                color={palette.textBlackSoft}
                align="center"
                style={{ marginTop: space.s2 }}
              >
                a word you just learned
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Steps 1-3: mock Share screen */}
        {step >= 1 && (
          <Animated.View style={[styles.mockApp, mockAnimStyle]}>

            {/* Mock header */}
            <View style={styles.mockHeader}>
              <Text variant="h1">Share a word</Text>
            </View>

            {/* Mock recipient section */}
            <View style={styles.mockSection}>
              <Text
                variant="uppercaseLabel"
                color={palette.textBlackSoft}
                style={{ marginBottom: space.s2 }}
              >
                Share to
              </Text>

              {step === 1 ? (
                <View style={styles.chipPlaceholder}>
                  <Text variant="small" color={palette.textBlackSoft}>
                    Add a friend…
                  </Text>
                </View>
              ) : (
                <Animated.View style={[styles.chipSelected, chipAnimStyle]}>
                  <Text variant="smallStrong" color={palette.white}>
                    @rio
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Mock word card — anchored at bottom, launches in step 3 */}
            <Animated.View style={[styles.mockWordCard, cardAnimStyle]}>
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
                Word
              </Text>
              <Text variant="h2" style={{ marginTop: space.s1 }}>
                {typedWord}{typedWord.length < WORD.length ? '|' : ''}
              </Text>
              {typedWord.length === WORD.length && (
                <Text variant="small" color={palette.textBlackSoft} style={{ marginTop: space.s1 }}>
                  {typedMeaning}{typedMeaning.length < JP_MEANING.length ? '|' : ''}
                </Text>
              )}
            </Animated.View>

            {/* Step 3: "Shared!" confirmation pill */}
            {step === 3 && (
              <Animated.View style={[styles.confirmOuter, confirmAnimStyle]}>
                <View style={styles.confirmPill}>
                  <Text variant="smallStrong" color={palette.white}>
                    Shared!
                  </Text>
                </View>
              </Animated.View>
            )}

          </Animated.View>
        )}
      </View>

      {/* ── Step indicator dots ──────────────────────────────────────────── */}
      <View style={styles.indicators}>
        {([0, 1, 2, 3] as const).map((i) => (
          <View
            key={i}
            style={[styles.dot, i === step ? styles.dotActive : styles.dotIdle]}
          />
        ))}
      </View>

      {/* Skip + Next */}
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrap}>
          <PillButton
            label="Skip"
            variant="darkOutlined"
            fullWidth
            onPress={() => { cancelAll(); onDone(); }}
          />
        </View>
        <View style={styles.buttonWrap}>
          <PillButton
            label={step === 3 ? 'Done' : 'Next'}
            variant="primary"
            fullWidth
            onPress={onNext}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: palette.neutralWarm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s3,
  },

  // ── Phone frame
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.ceramic,
    overflow: 'hidden',
    backgroundColor: palette.neutralWarm,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  frameCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s4,
  },

  // ── Step 0: word card
  wordCard: {
    borderRadius: radii.card,
    backgroundColor: palette.white,
    padding: space.s4,
    alignItems: 'center',
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Mock app (steps 1-3)
  mockApp: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: palette.neutralWarm,
  },
  mockHeader: {
    paddingHorizontal: space.s3,
    paddingTop: space.s3,
    paddingBottom: space.s2,
  },
  mockSection: {
    paddingHorizontal: space.s3,
    paddingTop: space.s2,
  },

  // ── Recipient chips
  chipPlaceholder: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  chipSelected: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: palette.greenAccent,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },

  // ── Mock word card (bottom of mock app)
  mockWordCard: {
    position: 'absolute',
    bottom: space.s3,
    left: space.s3,
    right: space.s3,
    borderRadius: radii.card,
    backgroundColor: palette.white,
    padding: space.s3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Confirmation pill (step 3) — above the word card, left-aligned (matches real sentBanner)
  confirmOuter: {
    position: 'absolute',
    bottom: 128,
    left: space.s3,
    right: space.s3,
    alignItems: 'flex-start',
  },
  confirmPill: {
    borderRadius: radii.pill,
    backgroundColor: palette.greenAccent,
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // ── Step indicator dots
  indicators: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: palette.greenAccent },
  dotIdle:   { backgroundColor: palette.ceramic },

  // ── Bottom button row
  buttonRow: {
    flexDirection: 'row',
    gap: space.s2,
    width: FRAME_W,
  },
  buttonWrap: {
    flex: 1,
  },
});
