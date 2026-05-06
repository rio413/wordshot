import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/constants/theme';

type Tone = 'cream' | 'white' | 'darkGreen';

const surfaces: Record<Tone, string> = {
  cream: palette.neutralWarm,
  white: palette.white,
  darkGreen: palette.houseGreen,
};

export function Screen({
  children,
  tone = 'cream',
  style,
  padded = true,
}: {
  children: ReactNode;
  tone?: Tone;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: surfaces[tone] }]} edges={['top']}>
      <View style={[styles.fill, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

export function useBottomPadding(extra = 0) {
  const insets = useSafeAreaInsets();
  return insets.bottom + extra;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: { paddingHorizontal: 16 },
});
