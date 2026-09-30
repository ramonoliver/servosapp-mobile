import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { color, font, hitSize, radius, space } from "@/theme/tokens";
import { Text } from "./Text";

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

/** Campo com rótulo visível (não só placeholder) e erro compreensível (§48). */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, style, multiline, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="label" color="foregroundSecondary" nativeID={`${label}-label`}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityLabelledBy={`${label}-label`}
        placeholderTextColor={color.disabled}
        maxFontSizeMultiplier={1.6}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          { borderColor: error ? color.danger : focused ? color.primary : color.borderStrong },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="mutedForeground">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  input: {
    minHeight: hitSize + 4,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    backgroundColor: color.surface,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.foreground,
  },
  multiline: { minHeight: 96, paddingTop: space[3], textAlignVertical: "top" },
});
