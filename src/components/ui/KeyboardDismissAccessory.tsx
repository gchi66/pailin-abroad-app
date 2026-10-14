import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';

export const KEYBOARD_DISMISS_ACCESSORY_ID = 'keyboard-dismiss-accessory';

const KEYBOARD_DISMISS_ACCESSORY_HEIGHT = 44;

type KeyboardDismissAccessoryProps = {
  nativeID?: string;
};

export function KeyboardDismissAccessory({
  nativeID = KEYBOARD_DISMISS_ACCESSORY_ID,
}: KeyboardDismissAccessoryProps) {
  const colorScheme = useColorScheme();

  if (Platform.OS !== 'ios') {
    return null;
  }

  const isDark = colorScheme === 'dark';
  const supportsLiquidGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  return (
    <InputAccessoryView
      nativeID={nativeID}
      backgroundColor="transparent">
      <View style={styles.accessory}>
        <Pressable
          accessibilityLabel="Dismiss keyboard"
          accessibilityRole="button"
          hitSlop={8}
          onPress={Keyboard.dismiss}
          style={styles.button}>
          {supportsLiquidGlass ? (
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              style={styles.buttonSurface}>
              <SymbolView
                name="checkmark"
                size={19}
                tintColor={isDark ? '#0A84FF' : '#007AFF'}
                weight="semibold"
              />
            </GlassView>
          ) : (
            <View
              style={[
                styles.buttonSurface,
                styles.fallbackSurface,
                isDark ? styles.fallbackSurfaceDark : styles.fallbackSurfaceLight,
              ]}>
              <SymbolView
                name="checkmark"
                size={19}
                tintColor={isDark ? '#0A84FF' : '#007AFF'}
                weight="semibold"
              />
            </View>
          )}
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  button: {
    width: 44,
    height: KEYBOARD_DISMISS_ACCESSORY_HEIGHT,
    borderRadius: 22,
  },
  buttonSurface: {
    width: 44,
    height: KEYBOARD_DISMISS_ACCESSORY_HEIGHT,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackSurface: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  fallbackSurfaceLight: {
    backgroundColor: 'rgba(242, 242, 247, 0.88)',
    borderColor: 'rgba(60, 60, 67, 0.18)',
  },
  fallbackSurfaceDark: {
    backgroundColor: 'rgba(44, 44, 46, 0.88)',
    borderColor: 'rgba(235, 235, 245, 0.22)',
  },
});
