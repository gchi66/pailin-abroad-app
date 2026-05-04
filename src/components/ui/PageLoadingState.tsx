import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { membershipImages } from '@/src/assets/app-images';
import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

type PageLoadingStateProps = {
  language?: UiLanguage;
  errorTitle?: string | null;
  errorBody?: string | null;
};

export function PageLoadingState({
  language = 'en',
  errorTitle = null,
  errorBody = null,
}: PageLoadingStateProps) {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;
  const hasError = Boolean(errorTitle || errorBody);

  useEffect(() => {
    if (hasError) {
      scale.stopAnimation();
      opacity.stopAnimation();
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.95,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.85,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [hasError, opacity, scale]);

  const animatedImageStyle = {
    opacity,
    transform: [{ scale }],
  };

  return (
    <View style={styles.page}>
      <View style={[styles.inner, hasError ? styles.innerError : null]}>
        <Animated.Image
          source={membershipImages.state}
          resizeMode="contain"
          style={[styles.image, animatedImageStyle]}
        />

        {hasError ? (
          <View style={styles.errorTextBlock}>
            {errorTitle ? (
              <AppText language={language} variant="title" style={styles.errorTitle}>
                {errorTitle}
              </AppText>
            ) : null}
            {errorBody ? (
              <AppText language={language} variant="body" style={styles.errorBody}>
                {errorBody}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 420,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  innerError: {
    gap: theme.spacing.lg,
  },
  image: {
    width: 140,
    height: 140,
  },
  errorTextBlock: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorTitle: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
  },
  errorBody: {
    textAlign: 'center',
    color: theme.colors.mutedText,
    maxWidth: 320,
  },
});
