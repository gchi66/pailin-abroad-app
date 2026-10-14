import React, { forwardRef, useId } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import {
  KeyboardDismissAccessory,
  KEYBOARD_DISMISS_ACCESSORY_ID,
} from '@/src/components/ui/KeyboardDismissAccessory';
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
  const reactID = useId();
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
  const usesDefaultAccessory = Platform.OS === 'ios' && inputAccessoryViewID == null;
  const resolvedAccessoryID = usesDefaultAccessory
    ? `${KEYBOARD_DISMISS_ACCESSORY_ID}-${reactID}`
    : inputAccessoryViewID;

  return (
    <>
      <TextInput
        {...props}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputAccessoryViewID={resolvedAccessoryID}
        enterKeyHint={resolvedEnterKeyHint}
        returnKeyType={returnKeyType ?? (multiline ? 'default' : 'done')}
        submitBehavior={submitBehavior ?? (multiline ? 'newline' : 'blurAndSubmit')}
        multiline={multiline}
        onChangeText={onChangeText}
        style={[style, { fontFamily }]}
      />
      {usesDefaultAccessory && resolvedAccessoryID ? (
        <KeyboardDismissAccessory nativeID={resolvedAccessoryID} />
      ) : null}
    </>
  );
});
