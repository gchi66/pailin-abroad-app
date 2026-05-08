import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';

type LessonProgressCircleProps = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
};

const FILL_COLOR = '#91CAFF';
const STROKE_COLOR = '#1E1E1E';

export function LessonProgressCircle({
  percent,
  size = 20,
  strokeWidth = 3.8,
  showLabel = true,
}: LessonProgressCircleProps) {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 30;
  const inset = radius + strokeWidth;
  const viewBoxSize = inset * 2;

  const piePath = useMemo(() => {
    if (clampedPercent <= 0 || clampedPercent >= 100) {
      return null;
    }

    const angle = (clampedPercent / 100) * 360;
    const radians = ((angle - 90) * Math.PI) / 180;
    const x = radius * Math.cos(radians);
    const y = radius * Math.sin(radians);
    const largeArc = angle > 180 ? 1 : 0;

    return `M0,0 L0,-${radius} A${radius},${radius} 0 ${largeArc},1 ${x.toFixed(2)},${y.toFixed(2)} Z`;
  }, [clampedPercent]);

  return (
    <View style={styles.wrap}>
      {showLabel ? (
        <AppText language="en" variant="caption" style={styles.label}>
          {`${clampedPercent}%`}
        </AppText>
      ) : null}

      <Svg
        width={size}
        height={size}
        viewBox={`${-inset} ${-inset} ${viewBoxSize} ${viewBoxSize}`}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Circle
          r={radius}
          fill={clampedPercent >= 100 ? FILL_COLOR : theme.colors.surface}
          stroke={STROKE_COLOR}
          strokeWidth={strokeWidth}
        />
        {piePath ? <Path d={piePath} fill={FILL_COLOR} /> : null}
        {clampedPercent > 0 && clampedPercent < 100 ? (
          <Circle
            r={radius}
            fill="none"
            stroke={STROKE_COLOR}
            strokeWidth={strokeWidth}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 2,
  },
  label: {
    color: '#1E1E1E',
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    lineHeight: 11,
  },
});
