import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import placementTestPailinThumbsUp from '@/assets/images/placement-test-pailin-thumbs-up.webp';
import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { theme } from '@/src/theme/theme';

const VALID_LEVELS = new Set([1, 2, 5, 6, 9]);

const getLevelStageLabel = (level: number) => {
  if (level <= 4) return 'ระดับเริ่มต้น';
  if (level <= 8) return 'ระดับกลาง';
  return 'ระดับสูง';
};

export function ChooseLevelResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ level?: string | string[] }>();
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPressed, setIsPressed] = useState(false);

  const level = useMemo(() => {
    const rawLevel = Array.isArray(params.level) ? params.level[0] : params.level;
    const parsedLevel = Number(rawLevel);
    return VALID_LEVELS.has(parsedLevel) ? parsedLevel : 1;
  }, [params.level]);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    getLessonsIndex()
      .then((lessons) => {
        if (!isActive) return;
        const firstLesson = lessons.find(
          (lesson) => lesson.level === level && lesson.lesson_order === 1
        );
        setLessonId(firstLesson?.id ?? null);
        if (firstLesson?.id) {
          prefetchResolvedLesson(firstLesson.id, 'th');
        }
      })
      .catch(() => {
        if (isActive) setLessonId(null);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [level]);

  const openLesson = () => {
    if (!lessonId) return;
    router.replace({
      pathname: '/lessons/[id]',
      params: { id: lessonId, locked: '0' },
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <ResponsivePageShell style={styles.pageShell}>
          <View style={styles.cardWrap}>
            <View pointerEvents="none" style={styles.cardShadow} />
            <View style={styles.card}>
              <Image source={placementTestPailinThumbsUp} style={styles.pailinImage} resizeMode="contain" />

              <AppText language="th" variant="muted" style={styles.eyebrow}>
                จุดเริ่มต้นของคุณ
              </AppText>
              <AppText language="th" variant="title" style={styles.levelTitle}>
                ระดับ {level}
              </AppText>
              <AppText language="th" variant="body" style={styles.levelSubtitle}>
                {getLevelStageLabel(level)}
              </AppText>

              <AppText language="th" variant="body" style={styles.primer}>
                {'ไพลินเพิ่งย้ายจากกรุงเทพฯ มาอยู่อินล็อก\nที่สวอนสวรรค์! ตอนนี้เธออยู่ที่งานปฐมนิเทศ\nของโรงเรียน ซึ่งเป็นสถานที่ที่เธอจะได้\nเจอเพื่อนนักเรียนแลกเปลี่ยนมากมาย!'}
              </AppText>

              <View style={styles.buttonWrap}>
                <View pointerEvents="none" style={[styles.buttonShadow, isPressed ? styles.shadowPressed : null]} />
                <Button
                  language="th"
                  title={isLoading ? 'กำลังโหลด...' : 'เริ่มบทเรียนแรกของคุณ!'}
                  disabled={isLoading || !lessonId}
                  disabledStyle={styles.buttonDisabledOpacity}
                  onPress={openLesson}
                  onPressIn={() => setIsPressed(true)}
                  onPressOut={() => setIsPressed(false)}
                  style={[
                    styles.button,
                    isPressed ? styles.buttonPressed : null,
                    isLoading || !lessonId ? styles.buttonDisabled : null,
                  ]}
                  textStyle={styles.buttonText}
                />
              </View>

              {!isLoading && !lessonId ? (
                <AppText language="th" variant="muted" style={styles.errorText}>
                  ไม่พบบทเรียน กรุณาลองอีกครั้ง
                </AppText>
              ) : null}
            </View>
          </View>
        </ResponsivePageShell>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  pageShell: {
    width: '100%',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    position: 'relative',
  },
  cardShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 5 }],
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.shadow,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 28,
    paddingBottom: 30,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  pailinImage: {
    width: 112,
    height: 112,
  },
  eyebrow: {
    marginTop: 8,
    color: '#747474',
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  levelTitle: {
    marginTop: 2,
    color: '#8AC832',
    fontSize: 40,
    lineHeight: 50,
    fontFamily: theme.typography.fontFaces.th.bold,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  levelSubtitle: {
    color: '#8AC832',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primer: {
    marginTop: 22,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  buttonWrap: {
    width: '100%',
    marginTop: 26,
    position: 'relative',
  },
  buttonShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 4 }, { translateY: 5 }],
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.shadow,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.accent,
  },
  buttonPressed: {
    transform: [{ translateX: 4 }, { translateY: 5 }],
  },
  buttonDisabled: {
    backgroundColor: '#CFCFCF',
  },
  buttonDisabledOpacity: { opacity: 1 },
  buttonText: {
    color: theme.colors.surface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.medium,
  },
  shadowPressed: {
    opacity: 0,
  },
  errorText: {
    marginTop: 12,
    color: theme.colors.primary,
    textAlign: 'center',
  },
});
