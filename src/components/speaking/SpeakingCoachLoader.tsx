import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import pailinGoodJobImage from '@/assets/images/speaking-coach/pailin-good-job.webp';

type SpeakingCoachLoaderProps = {
  accessibilityLabel?: string;
};

export function SpeakingCoachLoader({
  accessibilityLabel = 'Loading speaking practice',
}: SpeakingCoachLoaderProps) {
  const orbitRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => animation.stop();
  }, [orbitRotation]);

  const rotate = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loader} accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}>
      <View style={styles.graphic}>
        <Image source={pailinGoodJobImage} contentFit="contain" style={styles.pailin} />
        <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]}>
          <View style={[styles.orbitDot, styles.orbitDotTop]} />
          <View style={[styles.orbitDot, styles.orbitDotLeft]} />
          <View style={[styles.orbitSparkle, styles.orbitSparkleRight]}>
            <Text style={styles.orbitSparkleText}>✦</Text>
          </View>
          <View style={[styles.orbitSparkle, styles.orbitSparkleBottom]}>
            <Text style={styles.orbitSparkleText}>✦</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  graphic: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pailin: { width: 174, height: 174 },
  orbit: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 7,
    borderColor: '#2F6EEA',
  },
  orbitDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  orbitDotTop: { top: -14, left: 64 },
  orbitDotLeft: { top: 96, left: -14 },
  orbitSparkle: {
    position: 'absolute',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8FC',
  },
  orbitSparkleRight: { top: 34, right: -8 },
  orbitSparkleBottom: { bottom: -15, left: 91 },
  orbitSparkleText: { color: '#F5D21F', fontSize: 39, lineHeight: 42 },
});
