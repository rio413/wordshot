/**
 * The "Frap" floating circular CTA — Starbucks' signature elevation element.
 * Per DESIGN.md: 56px circle, Green Accent fill, layered shadow, scale(0.95) press.
 */
import { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { palette, radii, shadows, theme } from '@/constants/theme';

export function FrapFAB({
  onPress,
  children,
  size = 56,
  bottom = 24,
  right = 24,
}: {
  onPress: () => void;
  children: ReactNode;
  size?: number;
  bottom?: number;
  right?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.fab,
        {
          width: size,
          height: size,
          borderRadius: radii.circle,
          bottom,
          right,
        },
        pressed && { transform: [{ scale: theme.activeScale }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    backgroundColor: palette.greenAccent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.frap,
  },
});
