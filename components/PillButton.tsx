import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { palette, radii, theme, type } from '@/constants/theme';
import { Text } from './Text';

type Variant =
  | 'primary'      // Green Accent filled, white text — the default CTA
  | 'outlined'     // Transparent, Green Accent border + text
  | 'inverted'     // White filled with green text (used on dark green surfaces)
  | 'dark'         // Black filled, white text
  | 'darkOutlined' // Transparent with dark border + text
  | 'destructive'; // Red border + text — for Discard

export type PillButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'default' | 'large';
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  style?: ViewStyle;
  testID?: string;
};

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth,
  size = 'default',
  iconLeft,
  iconRight,
  style,
  testID,
}: PillButtonProps) {
  const v = variants[variant];
  return (
    <Pressable
      onPress={loading || disabled ? undefined : onPress}
      disabled={disabled || loading}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'large' ? styles.large : styles.default,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && { transform: [{ scale: theme.activeScale }] },
        style,
      ]}
      android_ripple={null}
    >
      <View style={styles.row}>
        {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <Text variant="buttonLabel" color={v.fg} style={type.buttonLabel as any}>
            {label}
          </Text>
        )}
        {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
      </View>
    </Pressable>
  );
}

const variants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: palette.greenAccent, fg: palette.white, border: palette.greenAccent },
  outlined: { bg: 'transparent', fg: palette.greenAccent, border: palette.greenAccent },
  inverted: { bg: palette.white, fg: palette.greenAccent, border: palette.white },
  dark: { bg: palette.black, fg: palette.white, border: palette.black },
  darkOutlined: { bg: 'transparent', fg: palette.textBlack, border: palette.textBlack },
  destructive: { bg: 'transparent', fg: palette.red, border: palette.red },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  default: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
  iconLeft: { marginRight: 4 },
  iconRight: { marginLeft: 4 },
});
