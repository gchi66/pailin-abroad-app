import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export function UnlockArtwork({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 120 120">
        <Circle cx="59" cy="64" r="46" fill="#FFF3C5" />
        <G rotation={-16} origin="60,65" stroke="#333333" strokeWidth={1.5} strokeLinejoin="round">
          <Path d="M39 58V34a21 21 0 0 1 42 0" fill="none" strokeWidth={7} strokeLinecap="round" />
          <Path d="M39 58V34a21 21 0 0 1 42 0" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
          <Rect x="28" y="55" width="64" height="48" fill="#F8D469" />
          <Path d="M60 68a6 6 0 0 0-3 11v10h6V79a6 6 0 0 0-3-11Z" fill="#BCA35C" />
        </G>
        <Path d="m100 29 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM15 75l2 4 5 1-4 3 1 5-4-3-4 2 1-5-3-3 5-1Z" fill="#F8D469" stroke="#333333" strokeWidth={1.2} />
      </Svg>
    </View>
  );
}
