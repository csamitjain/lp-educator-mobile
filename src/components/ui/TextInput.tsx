import React, { forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  required?: boolean;
}

const TextInput = forwardRef<RNTextInput, Props>(
  ({ label, error, hint, prefix, required, style, ...rest }, ref) => {
    return (
      <View style={styles.wrapper}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        <View style={[styles.inputRow, error ? styles.inputError : styles.inputNormal]}>
          {prefix && <Text style={styles.prefix}>{prefix}</Text>}
          <RNTextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={Colors.inkFaint}
            {...rest}
          />
        </View>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hintText}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';
export default TextInput;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.ink,
    marginBottom: Spacing[1],
  },
  required: {
    color: Colors.terra,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing[3],
    height: 50,
  },
  inputNormal: {
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: Colors.terra,
  },
  prefix: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.ink,
    marginRight: Spacing[2],
    paddingRight: Spacing[2],
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
    color: Colors.ink,
    height: '100%',
  },
  errorText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.terra,
    marginTop: Spacing[1],
  },
  hintText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.inkFaint,
    marginTop: Spacing[1],
  },
});
