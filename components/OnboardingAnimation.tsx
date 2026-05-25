import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette, space } from '@/constants/theme';
import { Text } from './Text';
import { PillButton } from './PillButton';

const FRAME_H = 460;
const FRAME_W = 260;

type Step = 0 | 1 | 2 | 3;

type Props = {
  visible: boolean;
  onDone: () => void;
};

export function OnboardingAnimation({ visible, onDone }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [playing, setPlaying] = useState(false);

  // Step 0 — word intro
  const wordOpacity = useSharedValue(0);
  const wordScale = useSharedValue(0.6);

  // Step 1 — mock app slide up
  const mockSlideY = useSharedValue(FRAME_H);

  // Step 2 — chip snap + rattle
  const chipScale = useSharedValue(0);
  const chipX = useSharedValue(-40);

  // Step 3 — bullet trajectory
  const bulletY = useSharedValue(0);
  const bulletScaleX = useSharedValue(1);
  const bulletScaleY = useSharedValue(1);
  const confirmOpacity = useSharedValue(0);

  const wordAnimStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ scale: wordScale.value }],
  }));

  const mockAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mockSlideY.value }],
  }));

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: chipScale.value },
      { scaleY: chipScale.value },
      { translateX: chipX.value },
    ],
  }));

  const bulletAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bulletY.value },
      { scaleX: bulletScaleX.value },
      { scaleY: bulletScaleY.value },
    ],
  }));

  const confirmAnimStyle = useAnimatedStyle(() => ({
    opacity: confirmOpacity.value,
  }));

  const playStep = (s: Step) => {
    setPlaying(true);

    if (s === 0) {
      wordOpacity.value = withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(80, withTiming(1, { duration: 0 })),
      );
      wordScale.value = withSequence(
        withTiming(0.6, { duration: 0 }),
        withDelay(80, withTiming(1.0, { duration: 0 })),
        withDelay(80, withTiming(1.0, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) runOnJS(setPlaying)(false);
        })),
      );
    } else if (s === 1) {
      mockSlideY.value = withSequence(
        withTiming(FRAME_H, { duration: 0 }),
        withDelay(60, withTiming(280, { duration: 0 })),
        withDelay(60, withTiming(80, { duration: 0 })),
        withDelay(60, withTiming(0, { duration: 0 })),
        withDelay(80, withTiming(0, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) runOnJS(setPlaying)(false);
        })),
      );
    } else if (s === 2) {
      chipScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(80, withTiming(1, { duration: 0 })),
      );
      chipX.value = withSequence(
        withTiming(-40, { duration: 0 }),
        withDelay(80, withTiming(0, { duration: 0 })),
        withDelay(40, withTiming(-6, { duration: 0 })),
        withDelay(40, withTiming(6, { duration: 0 })),
        withDelay(40, withTiming(-3, { duration: 0 })),
        withDelay(40, withTiming(0, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) runOnJS(setPlaying)(false);
        })),
      );
    } else {
      // Step 3 — bullet fire. All four sequences start synchronously.
      bulletY.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(6, { duration: 0 }),                                      // squash
        withDelay(80, withTiming(-20, { duration: 0 })),                     // collapse to bullet
        withDelay(60, withTiming(-0.30 * FRAME_H, { duration: 0 })),
        withDelay(60, withTiming(-0.65 * FRAME_H, { duration: 0 })),
        withDelay(60, withTiming(-0.95 * FRAME_H, { duration: 0 })),
        withDelay(80, withTiming(-1.30 * FRAME_H, { duration: 0 })),
      );
      bulletScaleX.value = withSequence(
        withTiming(1.0, { duration: 0 }),
        withTiming(1.06, { duration: 0 }),
        withDelay(80, withTiming(0.18, { duration: 0 })),
        withDelay(60, withTiming(0.16, { duration: 0 })),
        withDelay(60, withTiming(0.14, { duration: 0 })),
        withDelay(60, withTiming(0.12, { duration: 0 })),
        withDelay(80, withTiming(0.08, { duration: 0 })),
      );
      bulletScaleY.value = withSequence(
        withTiming(1.0, { duration: 0 }),
        withTiming(0.84, { duration: 0 }),
        withDelay(80, withTiming(0.46, { duration: 0 })),
        withDelay(60, withTiming(0.40, { duration: 0 })),
        withDelay(60, withTiming(0.32, { duration: 0 })),
        withDelay(60, withTiming(0.26, { duration: 0 })),
        withDelay(80, withTiming(0.16, { duration: 0 })),
      );
      // confirm appears after bullet exits frame, then auto-advances
      confirmOpacity.value = withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(200, withTiming(1, { duration: 0 })),
        withDelay(600, withTiming(1, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) runOnJS(onDone)();
        })),
      );
    }
  };

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => playStep(0), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onNext = () => {
    if (playing) return;
    if (step === 3) { onDone(); return; }
    const next = (step + 1) as Step;
    setStep(next);
    playStep(next);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Step indicator squares */}
      <View style={styles.indicators}>
        {([0, 1, 2, 3] as const).map((i) => (
          <View key={i} style={[styles.dot, i === step ? styles.dotActive : styles.dotIdle]} />
        ))}
      </View>

      {/* Phone frame — overflow:hidden clips bullet trajectory */}
      <View style={styles.frame}>
        {step === 0 ? (
          <View style={styles.frameCenter}>
            <Animated.View style={[styles.wordBox, wordAnimStyle]}>
              <Text variant="h2" color={palette.textBlack} align="center">
                ephemeral
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
        ) : (
          <Animated.View style={[styles.mockApp, mockAnimStyle]}>
            <View style={styles.mockHeaderRow}>
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
                Share a word
              </Text>
            </View>

            <View style={styles.mockInputBox}>
              <Text variant="h2" color={palette.textBlack}>
                ephemeral
              </Text>
            </View>

            <View style={styles.mockRecipientRow}>
              <Text variant="uppercaseLabel" color={palette.textBlackSoft}>
                Share to:
              </Text>
              <Animated.View style={[styles.mockChip, chipAnimStyle]}>
                <Text variant="smallStrong" color={palette.white}>
                  @rio
                </Text>
              </Animated.View>
            </View>

            {step === 3 && (
              <>
                <Animated.View style={[styles.bulletCard, bulletAnimStyle]}>
                  <Text variant="h2" color={palette.textBlack} align="center">
                    ephemeral
                  </Text>
                </Animated.View>
                <Animated.View style={[styles.confirmOuter, confirmAnimStyle]}>
                  <View style={styles.confirmInner}>
                    <Text variant="smallStrong" color={palette.white}>
                      Shared!
                    </Text>
                  </View>
                </Animated.View>
              </>
            )}
          </Animated.View>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.controls}>
        <PillButton
          label="Skip"
          variant="darkOutlined"
          onPress={onDone}
          style={styles.controlBtn}
        />
        <PillButton
          label={step === 3 ? 'Got it' : 'Next →'}
          variant="primary"
          onPress={onNext}
          disabled={playing}
          style={styles.controlBtn}
        />
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
    gap: space.s4,
  },
  indicators: {
    flexDirection: 'row',
    gap: space.s2,
  },
  dot: {
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
  },
  dotActive: { backgroundColor: palette.black },
  dotIdle:   { backgroundColor: palette.white },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: palette.neutralWarm,
  },
  frameCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s3,
  },
  wordBox: {
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
    backgroundColor: palette.white,
    padding: space.s3,
    alignItems: 'center',
    alignSelf: 'stretch',
    shadowOpacity: 0,
    elevation: 0,
  },
  mockApp: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: palette.neutralWarm,
    borderTopWidth: 2,
    borderTopColor: palette.black,
  },
  mockHeaderRow: {
    marginTop: space.s3,
    marginHorizontal: space.s3,
    marginBottom: space.s2,
  },
  mockInputBox: {
    marginHorizontal: space.s3,
    height: 48,
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
    backgroundColor: palette.white,
    paddingHorizontal: space.s2,
    justifyContent: 'center',
    marginBottom: space.s3,
    shadowOpacity: 0,
    elevation: 0,
  },
  mockRecipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    marginHorizontal: space.s3,
  },
  mockChip: {
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: palette.black,
  },
  bulletCard: {
    position: 'absolute',
    bottom: space.s3,
    left: space.s3,
    right: space.s3,
    height: 64,
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmOuter: {
    position: 'absolute',
    top: space.s4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  confirmInner: {
    backgroundColor: palette.greenAccent,
    borderWidth: 2,
    borderColor: palette.black,
    borderRadius: 0,
    paddingVertical: space.s2,
    paddingHorizontal: space.s3,
  },
  controls: {
    flexDirection: 'row',
    gap: space.s3,
  },
  controlBtn: {
    minWidth: 100,
  },
});
