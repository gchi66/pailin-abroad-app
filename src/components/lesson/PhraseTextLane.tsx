import React, { useState } from 'react';
import { Platform, View, ViewProps } from 'react-native';

// iOS can measure text at a fractional width, then draw it at a rounded-up
// width. A sentence near a wrap boundary can consequently reserve two lines
// while drawing only one. Use the same whole-point width for both passes.
export function PhraseTextLane({ children, style, ...props }: ViewProps) {
  const [width, setWidth] = useState<number>();

  if (Platform.OS !== 'ios') {
    return <View {...props} style={style}>{children}</View>;
  }

  return (
    <View
      style={{ alignSelf: 'stretch', minWidth: 0 }}
      onLayout={(event) => {
        const nextWidth = Math.ceil(event.nativeEvent.layout.width);
        if (nextWidth > 0) setWidth(nextWidth);
      }}>
      <View {...props} style={[style, width === undefined ? null : { width }]}>
        {children}
      </View>
    </View>
  );
}
