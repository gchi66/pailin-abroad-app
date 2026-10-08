import React, { forwardRef, useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { containsThaiGlyphs } from '@/src/lib/script-aware-text';
import { resolveScriptFontFamily } from '@/src/theme/typography';
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
  const [lastInputHasThai, setLastInputHasThai] = useState(containsThaiGlyphs(defaultValue));

  useEffect(() => {
    if (value !== undefined) setLastInputHasThai(containsThaiGlyphs(value));
  }, [value]);

  const hasThai = lastInputHasThai || containsThaiGlyphs(value) || containsThaiGlyphs(placeholder);
  const flattenedStyle = StyleSheet.flatten(style);
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
      onChangeText={(text) => {
        setLastInputHasThai(containsThaiGlyphs(text));
        onChangeText?.(text);
      }}
      style={[
        style,
        hasThai
          ? {
              fontFamily: resolveScriptFontFamily('th', {
                explicitFontFamily: flattenedStyle?.fontFamily,
                weight: flattenedStyle?.fontWeight,
                italic: flattenedStyle?.fontStyle === 'italic',
              }),
            }
          : null,
      ]}
    />
  );
});
