import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { fontWeightFromFamily, resolveFontFamily } from '@/src/theme/typography';

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
    multiline,
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
    (multiline && returnKeyType == null
      ? 'enter'
      : returnKeyType === 'go' ||
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
      inputAccessoryViewID={inputAccessoryViewID}
      enterKeyHint={resolvedEnterKeyHint}
      returnKeyType={returnKeyType ?? (multiline ? 'default' : 'done')}
      submitBehavior={submitBehavior ?? (multiline ? 'newline' : 'blurAndSubmit')}
      multiline={multiline}
      onChangeText={onChangeText}
      style={[style, { fontFamily }]}
    />
  );
});
