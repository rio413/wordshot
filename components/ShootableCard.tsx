import { ReactNode, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { palette, space } from '@/constants/theme';

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
    const dragY = useSharedValue(0);

    const reset = () => {
      dragY.value = withTiming(0, { duration: 150 });
    };

    const fire = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      runOnJS(onShoot)();
      dragY.value = withTiming(0, { duration: 150 });
    };

    useImperativeHandle(ref, () => ({ fire, reset }));

    const swipe = Gesture.Pan()
      .activeOffsetY([-15, 999])
      .failOffsetX([-30, 30])
      .onUpdate((e) => {
        if (e.translationY < 0) dragY.value = Math.max(e.translationY, -40);
      })
      .onEnd((e) => {
        const triggered = e.translationY < -60 || e.velocityY < -800;
        if (triggered) {
          if (canShoot) {
            runOnJS(fire)();
          } else {
            dragY.value = withTiming(0, { duration: 150 });
            if (onRejected) runOnJS(onRejected)();
          }
        } else {
          dragY.value = withTiming(0, { duration: 150 });
        }
      });

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: dragY.value }],
    }));

    return (
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.card, animStyle, style]}>
          {children}
        </Animated.View>
      </GestureDetector>
    );
  },
);

ShootableCard.displayName = 'ShootableCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: space.s4,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
