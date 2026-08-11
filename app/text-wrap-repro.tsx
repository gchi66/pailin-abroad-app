import React, { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  PixelRatio,
  StyleSheet,
  Text,
  TextLayoutEventData,
  View,
} from 'react-native';

import { AppText } from '@/src/components/ui/AppText';

const REPRO_WIDTH = 354;
const BAND_WIDTH = 402;

type LayoutSize = {
  width: number;
  height: number;
};

type LineMeasurement = {
  text: string;
  width: number;
  height: number;
  x: number;
  y: number;
};

const round = (value: number) => Math.round(value * 1000) / 1000;

export default function TextWrapReproScreen() {
  const fontScale = PixelRatio.getFontScale();
  const [textLayout, setTextLayout] = useState<LayoutSize | null>(null);
  const [lines, setLines] = useState<LineMeasurement[]>([]);
  const previousLayoutKey = useRef('');
  const previousLinesKey = useRef('');

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextLayout = {
        width: round(event.nativeEvent.layout.width),
        height: round(event.nativeEvent.layout.height),
      };
      const nextKey = JSON.stringify(nextLayout);

      if (nextKey === previousLayoutKey.current) {
        return;
      }

      previousLayoutKey.current = nextKey;
      setTextLayout(nextLayout);
      console.info('[text-wrap-repro] onLayout', {
        fontScale,
        containerWidth: REPRO_WIDTH,
        textLayout: nextLayout,
      });
    },
    [fontScale],
  );

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const nextLines = event.nativeEvent.lines.map((line) => ({
        text: line.text,
        width: round(line.width),
        height: round(line.height),
        x: round(line.x),
        y: round(line.y),
      }));
      const nextKey = JSON.stringify(nextLines);

      if (nextKey === previousLinesKey.current) {
        return;
      }

      previousLinesKey.current = nextKey;
      setLines(nextLines);
      console.info('[text-wrap-repro] onTextLayout', {
        fontScale,
        containerWidth: REPRO_WIDTH,
        lines: nextLines,
      });
    },
    [fontScale],
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Native Text wrap reproduction</Text>
      <Text style={styles.instructions}>
        Production band geometry test: width 402 with 24-point horizontal padding. The rich text width is derived
        by Yoga rather than fixed directly.
      </Text>

      <View style={styles.reproContainer}>
        <AppText
          language="en"
          variant="body"
          style={styles.reproText}
          onLayout={handleLayout}
          onTextLayout={handleTextLayout}>
          <Text style={styles.richInlineText}>
            <Text style={styles.richInlineText}>It suggests that something is </Text>
          </Text>
          <Text style={styles.richInlineText}>
            <Text style={styles.richInlineItalic}>beyond</Text>
          </Text>
          <Text style={styles.richInlineText}>
            <Text style={styles.richInlineText}> a desirable or acceptable limit.</Text>
          </Text>
        </AppText>
      </View>

      <View style={styles.diagnostics}>
        <Text selectable style={styles.diagnosticText}>
          {`fontScale: ${fontScale}\ncontainerWidth: ${REPRO_WIDTH}\ntextLayout: ${JSON.stringify(textLayout)}\nlineCount: ${lines.length}\nlines:\n${JSON.stringify(lines, null, 2)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    backgroundColor: '#FFFFFF',
  },
  title: {
    width: REPRO_WIDTH,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  instructions: {
    width: REPRO_WIDTH,
    marginBottom: 24,
    fontSize: 12,
  },
  reproContainer: {
    width: BAND_WIDTH,
    paddingHorizontal: 24,
    backgroundColor: '#F5F9FD',
  },
  reproText: {
    fontFamily: 'Poppins',
    fontSize: 14,
    lineHeight: 23,
  },
  richInlineText: {
    fontFamily: 'Poppins',
    fontSize: 15,
    lineHeight: 25,
  },
  richInlineItalic: {
    fontFamily: 'Poppins-Italic',
    fontSize: 15,
    lineHeight: 25,
  },
  diagnostics: {
    width: REPRO_WIDTH,
    marginTop: 24,
    padding: 12,
    backgroundColor: '#F2F2F2',
  },
  diagnosticText: {
    fontSize: 11,
    fontFamily: 'Courier',
  },
});
