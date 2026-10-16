import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import airplaneImage from '@/assets/images/app-opening/app-download-airplane.png';
import backgroundImage from '@/assets/images/app-opening/app-download-page.webp';
import palmsForegroundImage from '@/assets/images/app-opening/app-download-palms-foreground.png';
import fullLogoImage from '@/assets/images/pailin-abroad-full-logo.png';
import { AppText } from '@/src/components/ui/AppText';
import { MotionPressable as Pressable } from '@/src/components/ui/MotionPressable';
import { useOpeningScreen } from '@/src/context/opening-screen-context';

type OpeningScreenProps = {
  preview?: boolean;
};

export function OpeningScreen({ preview = false }: OpeningScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { completeOpeningScreen } = useOpeningScreen();
  const [isContinuing, setIsContinuing] = useState(false);
  const flightProgress = useSharedValue(reduceMotion ? 0.58 : 0);
  const flightBob = useSharedValue(0);
  const contentWidth = Math.min(width, 560);
  const contentHeight = Math.max(560, height - insets.top);
  const compact = contentHeight < 720;

  useEffect(() => {
    if (reduceMotion) {
      flightProgress.value = 0.58;
      flightBob.value = 0;
      return;
    }

    flightProgress.value = 0;
    flightProgress.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.linear }),
      -1,
      false
    );
    flightBob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(flightProgress);
      cancelAnimation(flightBob);
    };
  }, [flightBob, flightProgress, reduceMotion]);

  const flightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -125 + flightProgress.value * (contentWidth + 150) },
      { translateY: flightBob.value },
    ],
  }));

  const handleContinue = async () => {
    if (isContinuing) return;
    if (preview) {
      router.back();
      return;
    }

    setIsContinuing(true);
    try {
      await completeOpeningScreen();
      router.replace('/(tabs)');
    } catch (error) {
      console.warn('[opening-screen] Could not save completion state', error);
      Alert.alert('ลองอีกครั้ง', 'ยังบันทึกไม่ได้ กรุณาลองอีกครั้ง');
      setIsContinuing(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#ADEFFF" />
      <View style={[styles.page, { width: contentWidth }]}>
        <Image source={backgroundImage} contentFit="fill" style={StyleSheet.absoluteFill} />

        <Image
          source={fullLogoImage}
          contentFit="contain"
          style={[styles.logo, { top: contentHeight * 0.028, width: Math.min(contentWidth * 0.43, 210) }]}
        />

        <View style={[styles.headingGroup, { top: contentHeight * (compact ? 0.105 : 0.115) }]}>
          <AppText
            language="th"
            variant="title"
            style={[styles.title, { fontSize: Math.min(compact ? 38 : 44, contentWidth * 0.105) }]}>
            อังกฤษติดปาก
          </AppText>
          <AppText language="th" variant="body" style={[styles.subtitle, compact ? styles.subtitleCompact : null]}>
            ฝึกภาษาอังกฤษจากบทสนทนา{`\n`}ในชีวิตจริง!
          </AppText>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.flight, { top: contentHeight * (compact ? 0.255 : 0.28) }, flightStyle]}>
          <View style={styles.airplaneCrop}>
            <Image source={airplaneImage} contentFit="contain" style={styles.airplane} />
          </View>
        </Animated.View>

        <Image
          pointerEvents="none"
          source={palmsForegroundImage}
          contentFit="fill"
          style={StyleSheet.absoluteFill}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ลุยกันเลย"
          disabled={isContinuing}
          onPress={() => void handleContinue()}
          style={[styles.continueButton, { bottom: Math.max(18, insets.bottom + 10) }]}>
          <AppText language="th" variant="caption" style={styles.continueButtonLabel}>
            ลุยกันเลย!
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ADEFFF',
  },
  page: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#ADEFFF',
  },
  logo: {
    position: 'absolute',
    alignSelf: 'center',
    height: 36,
  },
  headingGroup: {
    position: 'absolute',
    left: 18,
    right: 18,
    alignItems: 'center',
  },
  title: {
    color: '#171717',
    fontWeight: '700',
    lineHeight: 54,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: '#171717',
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitleCompact: {
    marginTop: 2,
    fontSize: 17,
    lineHeight: 24,
  },
  flight: {
    position: 'absolute',
    left: 0,
    width: 79,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airplaneCrop: {
    width: 79,
    height: 48,
    overflow: 'hidden',
  },
  airplane: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 145,
    height: 48,
  },
  continueButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: '#14213B',
    borderRadius: 28,
    backgroundColor: '#2F6EEA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    boxShadow: '4px 4px 0px #14213B',
  },
  continueButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    textAlign: 'center',
  },
});
