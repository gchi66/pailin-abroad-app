import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchExerciseBankSection } from '@/src/api/exercise-bank';
import { ExerciseBankPager } from '@/src/components/exercise-bank/ExerciseBankPager';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { ExerciseBankSectionDetail } from '@/src/types/exercise-bank';

type UiLanguage = 'en' | 'th';

const getCopy = (language: UiLanguage) =>
  language === 'th'
    ? {
        loading: 'กำลังโหลดแบบฝึกหัด...',
        errorTitle: 'ไม่สามารถโหลดหัวข้อนี้ได้',
        backToBank: 'กลับไปคลังแบบฝึกหัด',
      }
    : {
        loading: 'Loading exercises...',
        errorTitle: 'We could not load this section',
        backToBank: 'Back to exercise bank',
      };

export function ExerciseBankSectionScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const params = useLocalSearchParams<{ categorySlug?: string | string[]; sectionSlug?: string | string[] }>();
  const categorySlug = typeof params.categorySlug === 'string' ? params.categorySlug : Array.isArray(params.categorySlug) ? params.categorySlug[0] : '';
  const sectionSlug = typeof params.sectionSlug === 'string' ? params.sectionSlug : Array.isArray(params.sectionSlug) ? params.sectionSlug[0] : '';
  const [section, setSection] = useState<ExerciseBankSectionDetail | null>(null);
  const [contentLang, setContentLang] = useState<'en' | 'th'>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!categorySlug || !sectionSlug) {
        setErrorMessage('Missing exercise section.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const nextSection = await fetchExerciseBankSection({ categorySlug, sectionSlug });
        if (isMounted) {
          setSection(nextSection);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : copy.errorTitle);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [categorySlug, copy.errorTitle, sectionSlug]);

  const sectionTitle = useMemo(() => {
    if (!section) {
      return '';
    }
    return contentLang === 'th' ? section.section_th || section.section || '' : section.section || section.section_th || '';
  }, [contentLang, section]);

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <View style={styles.screen}>
      {errorMessage ? (
        <View style={styles.centeredState}>
          <Card padding="lg" radius="lg" style={styles.errorCard}>
            <Stack gap="md">
              <AppText language={uiLanguage} variant="body" style={styles.errorTitle}>
                {copy.errorTitle}
              </AppText>
              <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                {errorMessage}
              </AppText>
              <Button language={uiLanguage} title={copy.backToBank} onPress={() => router.push('/(tabs)/resources/exercise-bank')} />
            </Stack>
          </Card>
        </View>
      ) : null}

      {!errorMessage && section ? (
        <ExerciseBankPager
          language={uiLanguage}
          contentLang={contentLang}
          sectionTitle={sectionTitle}
          categoryLabel={section.category_label || section.category || ''}
          exercises={Array.isArray(section.exercises) ? section.exercises : []}
          onSetContentLang={setContentLang}
          onBack={() => router.back()}
          onDone={() => router.push('/(tabs)/resources/exercise-bank')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  stateText: {
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  errorCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorTitle: {
    color: theme.colors.text,
    textAlign: 'center',
  },
});
