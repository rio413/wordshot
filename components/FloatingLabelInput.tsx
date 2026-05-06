/**
 * Floating-label input matching DESIGN.md spec:
 * - Label sits inside the field at idle, floats up + shrinks on focus/value.
 * - Border tints based on validity state.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { palette, radii, type } from '@/constants/theme';

export type FloatingLabelInputProps = TextInputProps & {
  label: string;
  error?: string;
  valid?: boolean;
};

export const FloatingLabelInput = forwardRef<TextInput, FloatingLabelInputProps>(
  function FloatingLabelInput(
    { label, error, valid, value, onFocus, onBlur, style, ...rest },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const hasValue = !!value && value.length > 0;
    const lifted = focused || hasValue;
    const anim = useRef(new Animated.Value(lifted ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: lifted ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }, [lifted, anim]);

    const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
    const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });

    const borderColor = error
      ? palette.red
      : focused
        ? palette.greenAccent
        : valid
          ? palette.greenAccent
          : palette.inputBorder;

    const bg = error ? palette.redTint : valid ? palette.greenLightWash : palette.white;

    return (
      <View>
        <View style={[styles.container, { borderColor, backgroundColor: bg }]}>
          <Animated.Text
            style={[
              styles.label,
              { top: labelTop, fontSize: labelSize as any, color: palette.textBlackSoft },
            ]}
            pointerEvents="none"
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={ref}
            value={value}
            placeholderTextColor={palette.textBlackSoft}
            {...rest}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.input, style]}
          />
        </View>
        {error ? <Animated.Text style={styles.errorText}>{error}</Animated.Text> : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radii.field,
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 8,
    minHeight: 56,
    justifyContent: 'flex-end',
  },
  label: {
    position: 'absolute',
    left: 12,
  },
  input: {
    ...type.body,
    padding: 0,
    margin: 0,
  },
  errorText: {
    ...type.micro,
    color: palette.red,
    marginTop: 4,
    marginLeft: 12,
  },
});
