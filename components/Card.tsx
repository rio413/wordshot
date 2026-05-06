import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radii, shadows, space } from '@/constants/theme';

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.card,
    ...shadows.card,
  },
  padded: {
    padding: space.s4,
  },
});
