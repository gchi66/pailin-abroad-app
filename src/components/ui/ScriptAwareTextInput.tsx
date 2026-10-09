import React, { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { fontWeightFromFamily, resolveFontFamily } from '@/src/theme/typography';
import { DEFAULT_KEYBOARD_DISMISS_ACCESSORY_ID } from './KeyboardDismissAccessory';

export const ScriptAwareTextInput = forwardRef<TextInput, TextInputProps>(function ScriptAwareTextInput(
  {
    style,
    value,
    defaultValue,
    placeholder,
    onChangeText,
    inputAccessoryViewID,
    enterKeyHint,
    returnKeyType,
    submitBehavior,
    ...props
  },
  ref
) {
  const flattenedStyle = StyleSheet.flatten(style);
  const fontFamily = resolveFontFamily('en', {
    weight: flattenedStyle?.fontWeight ?? fontWeightFromFamily(flattenedStyle?.fontFamily),
    italic: flattenedStyle?.fontStyle === 'italic' || /Italic/i.test(flattenedStyle?.fontFamily ?? ''),
  });
  const resolvedEnterKeyHint =
    enterKeyHint ??
    (returnKeyType === 'go' ||
    returnKeyType === 'next' ||
    returnKeyType === 'search' ||
    returnKeyType === 'send'
      ? returnKeyType
      : 'done');

  return (
    <TextInput
      {...props}
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      inputAccessoryViewID={
        inputAccessoryViewID ?? (Platform.OS === 'ios' ? DEFAULT_KEYBOARD_DISMISS_ACCESSORY_ID : undefined)
      }
      enterKeyHint={resolvedEnterKeyHint}
      returnKeyType={returnKeyType ?? 'done'}
      submitBehavior={submitBehavior ?? 'blurAndSubmit'}
      onChangeText={onChangeText}
      style={[style, { fontFamily }]}
    />
  );
});
