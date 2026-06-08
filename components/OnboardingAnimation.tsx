import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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

// When typing finishes: 800 + (10-1)*130 + 350 + (10-1)*110 = 3310ms
const JP_END_MS = 800 + (WORD.length - 1) * 130 + 350 + (JP_MEANING.length - 1) * 110;

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
  const [tapTarget, setTapTarget] = useState<'friend' | 'share' | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Step 0 — word intro
  const wordOpacity = useSharedValue(0);
  const wordScale   = useSharedValue(0.75);

  // Step 1 — mock app slides up
  const mockSlideY = useSharedValue(FRAME_H);

  // Step 2 — recipient chip pops in
  const chipOpacity = useSharedValue(0);
  const chipScale   = useSharedValue(0.5);

  // Step 3 — word card launches + confirm appears
  const cardY          = useSharedValue(0);
  const cardScale      = useSharedValue(1);
  const cardOpacity    = useSharedValue(1);
  const confirmOpacity = useSharedValue(0);
  const confirmY       = useSharedValue(14);

  // Tap ripple indicator
  const tapRippleOpacity = useSharedValue(0);
  const tapRippleScale   = useSharedValue(0.6);

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

  const tapRippleAnimStyle = useAnimatedStyle(() => ({
    opacity: tapRippleOpacity.value,
    transform: [{ scale: tapRippleScale.value }],
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

  // ── Tap ripple: appear → expand + fade → callback ─────────────────────────

  const showTapThen = (target: 'friend' | 'share', holdMs: number, cb: () => void) => {
    setTapTarget(target);
    tapRippleOpacity.value = 0;
    tapRippleScale.value   = 0.6;
    tapRippleOpacity.value = withTiming(0.8, { duration: 180 });
    tapRippleScale.value   = withTiming(1, { duration: 180 });
    after(holdMs - 280, () => {
      tapRippleScale.value   = withTiming(1.5, { duration: 260, easing: Easing.out(Easing.ease) });
      tapRippleOpacity.value = withTiming(0, { duration: 280 });
    });
    after(holdMs, () => { setTapTarget(null); cb(); });
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

    // Show tap hint 350ms after all typing ends, then advance
    after(JP_END_MS + 350, () => showTapThen('friend', 600, runStep2));
  };

  const runStep2 = () => {
    setTypedWord(WORD);
    setTypedMeaning(JP_MEANING); // finalise if Next was tapped before typing finished
    setStep(2);
    chipOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    chipScale.value   = withSpring(1, { damping: 10, stiffness: 300 });
    after(2200, () => showTapThen('share', 600, runStep3));
  };

  const runStep3 = () => {
    setStep(3);
    setTapTarget(null);
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
    setTapTarget(null);
    tapRippleOpacity.value = 0;
    tapRippleScale.value   = 0.6;
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
      setTapTarget(null);
      wordOpacity.value      = 0;
      wordScale.value        = 0.75;
      mockSlideY.value       = FRAME_H;
      chipOpacity.value      = 0;
      chipScale.value        = 0.5;
      cardY.value            = 0;
      cardScale.value        = 1;
      cardOpacity.value      = 1;
      confirmOpacity.value   = 0;
      confirmY.value         = 14;
      tapRippleOpacity.value = 0;
      tapRippleScale.value   = 0.6;
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

        {/* Step 0: illustration — user excited about a new word */}
        {step === 0 && (
          <Animated.View style={[styles.frameCenter, wordAnimStyle]}>
            <Image
              source={require('@/assets/images/wordillustration.png')}
              style={styles.illustration}
              resizeMode="contain"
            />
            <Text
              variant="uppercaseLabel"
              color={palette.textBlackSoft}
              align="center"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ marginTop: space.s2 }}
            >
              a word you can't wait to share
            </Text>
          </Animated.View>
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

            {/* Bottom: word card + Share button — animate as one unit in step 3 */}
            <View style={styles.mockBottom}>
              <Animated.View style={[styles.mockBottomInner, cardAnimStyle]}>
                <View style={styles.mockWordCard}>
                  <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
                    Word
                  </Text>
                  <Text variant="h2" style={{ marginTop: space.s1 }}>
                    {typedWord}{typedWord.length < WORD.length ? '|' : ''}
                  </Text>
                  {/* Always rendered so card height stays constant during typing */}
                  <Text variant="small" color={palette.textBlackSoft} style={{ marginTop: space.s1 }}>
                    {typedMeaning}
                    {typedMeaning.length > 0 && typedMeaning.length < JP_MEANING.length ? '|' : null}
                  </Text>
                </View>
                <View style={styles.mockShareBtn}>
                  <Text variant="smallStrong" color={palette.white}>↑  Share</Text>
                </View>
              </Animated.View>
            </View>

            {/* Tap ripple — positioned over the target element */}
            {tapTarget === 'friend' && (
              <Animated.View style={[styles.tapRipple, styles.tapFriend, tapRippleAnimStyle]} />
            )}
            {tapTarget === 'share' && (
              <Animated.View style={[styles.tapRipple, styles.tapShare, tapRippleAnimStyle]} />
            )}

            {/* Step 3: "Shared!" large text */}
            {step === 3 && (
              <Animated.View style={[styles.confirmOuter, confirmAnimStyle]}>
                <Text variant="hero" color={palette.greenAccent} align="center">
                  Shared!
                </Text>
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

      {/* Skip + Next (Skip hidden on final step so Done gets full width) */}
      <View style={styles.buttonRow}>
        {step < 3 && (
          <View style={styles.buttonWrap}>
            <PillButton
              label="Skip"
              variant="darkOutlined"
              fullWidth
              onPress={() => { cancelAll(); onDone(); }}
            />
          </View>
        )}
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
    paddingHorizontal: space.s3,
    paddingBottom: space.s2,
  },
  illustration: {
    width: FRAME_W,
    height: 430,
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

  // ── Bottom: word card + Share button
  mockBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.s3,
    paddingBottom: space.s3,
  },
  mockBottomInner: {
    gap: space.s2,
  },
  mockWordCard: {
    borderRadius: radii.card,
    backgroundColor: palette.white,
    padding: space.s3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mockShareBtn: {
    borderRadius: radii.pill,
    backgroundColor: palette.greenAccent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tap ripple
  tapRipple: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 10,
  },
  tapFriend: { top: 88, left: 46 },
  tapShare:  { bottom: 19, left: 130 },

  // ── Confirmation text (step 3) — centered in the frame
  confirmOuter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
