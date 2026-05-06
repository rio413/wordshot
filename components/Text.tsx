import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { type } from '@/constants/theme';

type Variant = keyof typeof type;

export type TextProps = RNTextProps & {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', color, align, style, ...rest }: TextProps) {
  const base = type[variant];
  return (
    <RNText
      {...rest}
      style={[
        base,
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
