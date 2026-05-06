import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radii, theme } from '@/constants/theme';
import { Text } from './Text';

export function Chip({
  label,
  selected,
  onPress,
  style,
  iconLeft,
  iconRight,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        pressed && { transform: [{ scale: theme.activeScale }] },
        style,
      ]}
    >
      {iconLeft ? <View style={styles.iconSlot}>{iconLeft}</View> : null}
      <Text
        variant="smallStrong"
        color={selected ? palette.white : palette.greenAccent}
      >
        {label}
      </Text>
      {iconRight ? <View style={styles.iconSlot}>{iconRight}</View> : null}
    </Pressable>
  );
}

export function ChipRow({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  idle: {
    backgroundColor: 'transparent',
    borderColor: palette.greenAccent,
  },
  selected: {
    backgroundColor: palette.greenAccent,
    borderColor: palette.greenAccent,
  },
  iconSlot: {
    marginHorizontal: 4,
  },
});
