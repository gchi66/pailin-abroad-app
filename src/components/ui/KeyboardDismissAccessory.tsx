import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

export const DEFAULT_KEYBOARD_DISMISS_ACCESSORY_ID = 'pailin-keyboard-dismiss-accessory';

type KeyboardDismissAccessoryProps = {
  nativeID?: string;
};

export function KeyboardDismissAccessory({
  nativeID = DEFAULT_KEYBOARD_DISMISS_ACCESSORY_ID,
}: KeyboardDismissAccessoryProps) {
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <View style={styles.spacer} />
        <Pressable
          accessibilityLabel="Dismiss keyboard"
          accessibilityRole="button"
          hitSlop={8}
          onPress={Keyboard.dismiss}
          style={styles.button}>
          <MaterialIcons name="check" size={20} color="#1A2332" />
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#D7E0E8',
    backgroundColor: '#F7FAFD',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  spacer: {
    flex: 1,
  },
  button: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
