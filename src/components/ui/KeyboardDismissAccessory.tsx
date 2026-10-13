import { MotionPressable as Pressable } from '@/src/components/ui/MotionPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  type KeyboardEvent,
} from 'react-native';

export const KEYBOARD_DISMISS_ACCESSORY_HEIGHT = 44;

export function KeyboardDismissAccessory() {
  const colorScheme = useColorScheme();
  const translateY = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  const moveToKeyboard = useCallback((event: KeyboardEvent) => {
    const keyboardHeight = Math.max(0, event.endCoordinates.height);
    if (keyboardHeight > 0) {
      setIsVisible(true);
    }

    Animated.timing(translateY, {
      duration: event.duration || 250,
      toValue: -keyboardHeight,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const hideWithKeyboard = useCallback((event: KeyboardEvent) => {
    Animated.timing(translateY, {
      duration: event.duration || 250,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsVisible(false);
    });
  }, [translateY]);

  const hideImmediately = useCallback(() => {
    translateY.setValue(0);
    setIsVisible(false);
  }, [translateY]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const willShowSubscription = Keyboard.addListener('keyboardWillShow', moveToKeyboard);
    const didShowSubscription = Keyboard.addListener('keyboardDidShow', moveToKeyboard);
    const willHideSubscription = Keyboard.addListener('keyboardWillHide', hideWithKeyboard);
    const didHideSubscription = Keyboard.addListener('keyboardDidHide', hideImmediately);

    return () => {
      willShowSubscription.remove();
      didShowSubscription.remove();
      willHideSubscription.remove();
      didHideSubscription.remove();
    };
  }, [hideImmediately, hideWithKeyboard, moveToKeyboard]);

  if (Platform.OS !== 'ios') {
    return null;
  }

  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[
        styles.overlay,
        { opacity: isVisible ? 1 : 0, transform: [{ translateY }] },
      ]}>
      <View style={[styles.bar, isDark ? styles.barDark : styles.barLight]}>
        <View style={styles.spacer} />
        <Pressable
          accessibilityLabel="Dismiss keyboard"
          accessibilityRole="button"
          hitSlop={8}
          onPress={Keyboard.dismiss}
          style={styles.button}>
          <MaterialIcons name="check" size={25} color={isDark ? '#FFFFFF' : '#1A1A1A'} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  bar: {
    height: KEYBOARD_DISMISS_ACCESSORY_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  barLight: {
    borderColor: '#C8C8CC',
    backgroundColor: '#F2F2F7',
  },
  barDark: {
    borderColor: '#3A3A3C',
    backgroundColor: '#1C1C1E',
  },
  spacer: {
    flex: 1,
  },
  button: {
    width: 44,
    height: KEYBOARD_DISMISS_ACCESSORY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
