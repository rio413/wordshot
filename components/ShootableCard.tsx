/**
 * ShootableCard — Brutalist input card that fires upward as an angular bullet.
 *
 * Designed to live in the bottom thumb zone. The bullet starts at the card's
 * resting position (lower third of the screen) and travels upward across the
 * full viewport, exiting past the top edge.
 *
 * Animation is intentionally stop-motion: every frame snaps in zero ms with
 * `withTiming(value, { duration: 0 })`, then `withDelay` holds it. No easing,
 * no interpolation between frames — the card jerks through discrete poses.
 *
 * Frames (translateY values scale to `useWindowDimensions().height`):
 *   0 idle        — neutral, follows finger drag
 *   1 chambering  — squash (compress vertically, bulge horizontally)
 *   2 transform   — collapse to a small black bullet silhouette  ← onShoot fires here
 *   3 shot leap 1 — y ≈ -30% screenH
 *   4 shot leap 2 — y ≈ -65% screenH
 *   5 shot leap 3 — y ≈ -95% screenH (bullet at the top edge)
 *   6 exit        — y ≈ -130% screenH (bullet past the top), then reset
 */
import { ReactNode, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
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
import { palette, space } from '@/constants/theme';

const FRAME_HOLD_CHAMBER = 80;
const FRAME_HOLD_TRANSFORM = 60;
const FRAME_HOLD_SHOT = 60;
const FRAME_HOLD_EXIT = 80;

const FRAME_IDLE = 0;
const FRAME_CHAMBER = 1;
const FRAME_TRANSFORM = 2;
const FRAME_SHOT_1 = 3;
const FRAME_SHOT_2 = 4;
const FRAME_SHOT_3 = 5;
const FRAME_EXIT = 6;

export type ShootableCardHandle = {
  fire: () => void;
  reset: () => void;
};

type Props = {
  children: ReactNode;
  onShoot: () => void;
  canShoot: boolean;
  onRejected?: () => void;
  style?: ViewStyle;
};

export const ShootableCard = forwardRef<ShootableCardHandle, Props>(
  ({ children, onShoot, canShoot, onRejected, style }, ref) => {
    const { height: screenH } = useWindowDimensions();
    const phase = useSharedValue<number>(FRAME_IDLE);
    const dragY = useSharedValue<number>(0);

    const reset = () => {
      phase.value = FRAME_IDLE;
      dragY.value = 0;
    };

    const fire = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      dragY.value = 0;
      phase.value = withSequence(
        withTiming(FRAME_CHAMBER, { duration: 0 }),
        withDelay(
          FRAME_HOLD_CHAMBER,
          withTiming(FRAME_TRANSFORM, { duration: 0 }, (finished) => {
            'worklet';
            if (finished) runOnJS(onShoot)();
          }),
        ),
        withDelay(FRAME_HOLD_TRANSFORM, withTiming(FRAME_SHOT_1, { duration: 0 })),
        withDelay(FRAME_HOLD_SHOT, withTiming(FRAME_SHOT_2, { duration: 0 })),
        withDelay(FRAME_HOLD_SHOT, withTiming(FRAME_SHOT_3, { duration: 0 })),
        withDelay(
          FRAME_HOLD_SHOT,
          withTiming(FRAME_EXIT, { duration: 0 }, (finished) => {
            'worklet';
            if (finished) runOnJS(reset)();
          }),
        ),
        withDelay(FRAME_HOLD_EXIT, withTiming(FRAME_EXIT, { duration: 0 })),
      );
    };

    useImperativeHandle(ref, () => ({ fire, reset }));

    const swipe = Gesture.Pan()
      .activeOffsetY([-15, 999])
      .failOffsetX([-30, 30])
      .onUpdate((e) => {
        if (phase.value !== FRAME_IDLE) return;
        if (e.translationY < 0) dragY.value = Math.max(e.translationY, -120);
      })
      .onEnd((e) => {
        if (phase.value !== FRAME_IDLE) return;
        const triggered = e.translationY < -60 || e.velocityY < -800;
        if (triggered) {
          if (canShoot) {
            runOnJS(fire)();
          } else {
            dragY.value = withTiming(0, { duration: 120 });
            if (onRejected) runOnJS(onRejected)();
          }
        } else {
          dragY.value = withTiming(0, { duration: 120 });
        }
      });

    const containerStyle = useAnimatedStyle(() => {
      const p = phase.value;
      let translateY = 0;
      let scaleX = 1;
      let scaleY = 1;

      if (p === FRAME_IDLE) {
        translateY = dragY.value;
        const drag = Math.max(-1, Math.min(0, dragY.value / 120));
        scaleX = 1 + drag * 0.04;
        scaleY = 1 + drag * -0.06;
      } else if (p === FRAME_CHAMBER) {
        scaleX = 1.06;
        scaleY = 0.84;
        translateY = 6;
      } else if (p === FRAME_TRANSFORM) {
        scaleX = 0.18;
        scaleY = 0.46;
        translateY = -20;
      } else if (p === FRAME_SHOT_1) {
        scaleX = 0.16;
        scaleY = 0.40;
        translateY = -screenH * 0.30;
      } else if (p === FRAME_SHOT_2) {
        scaleX = 0.14;
        scaleY = 0.32;
        translateY = -screenH * 0.65;
      } else if (p === FRAME_SHOT_3) {
        scaleX = 0.12;
        scaleY = 0.26;
        translateY = -screenH * 0.95;
      } else {
        scaleX = 0.08;
        scaleY = 0.16;
        translateY = -screenH * 1.30;
      }

      return { transform: [{ translateY }, { scaleX }, { scaleY }] };
    });

    const cardSkinStyle = useAnimatedStyle(() => ({
      opacity: phase.value <= FRAME_CHAMBER ? 1 : 0,
    }));

    const bulletSkinStyle = useAnimatedStyle(() => ({
      opacity: phase.value >= FRAME_TRANSFORM ? 1 : 0,
    }));

    return (
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.outer, containerStyle, style]}>
          <Animated.View style={[styles.cardSkin, cardSkinStyle]}>{children}</Animated.View>

          <Animated.View style={[styles.bulletWrap, bulletSkinStyle]} pointerEvents="none">
            <View style={styles.bulletTipCap} />
            <View style={styles.bulletBody} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

ShootableCard.displayName = 'ShootableCard';

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
  },
  cardSkin: {
    backgroundColor: palette.white,
    borderColor: palette.black,
    borderWidth: 2,
    borderRadius: 0,
    padding: space.s4,
  },
  bulletWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Diamond cap whose lower half overlaps the body, leaving a pointed top edge.
  bulletTipCap: {
    width: '60%',
    aspectRatio: 1,
    backgroundColor: palette.black,
    transform: [{ rotate: '45deg' }],
    marginBottom: '-30%',
  },
  bulletBody: {
    width: '70%',
    height: '60%',
    backgroundColor: palette.black,
  },
});
