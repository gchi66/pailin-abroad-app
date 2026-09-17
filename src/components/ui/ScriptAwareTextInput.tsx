import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { containsThaiGlyphs } from '@/src/lib/script-aware-text';
import { resolveScriptFontFamily } from '@/src/theme/typography';

export const ScriptAwareTextInput = forwardRef<TextInput, TextInputProps>(function ScriptAwareTextInput(
  { style, value, defaultValue, placeholder, onChangeText, ...props },
  ref
) {
  const [lastInputHasThai, setLastInputHasThai] = useState(containsThaiGlyphs(defaultValue));

  useEffect(() => {
    if (value !== undefined) setLastInputHasThai(containsThaiGlyphs(value));
  }, [value]);

  const hasThai = lastInputHasThai || containsThaiGlyphs(value) || containsThaiGlyphs(placeholder);
  const flattenedStyle = StyleSheet.flatten(style);

  return (
    <TextInput
      {...props}
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
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
