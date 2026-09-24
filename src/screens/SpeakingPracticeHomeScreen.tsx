import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import pailinImage from '@/assets/images/speaking-coach/pailin-time-to-speak.webp';
import { getLessonsIndex } from '@/src/api/lessons';
import { fetchAvailableSpeakingCoachLessons } from '@/src/api/speaking-coach';
import { getLessonIconSource } from '@/src/assets/lesson-icons';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { LibraryStageLevelSelector } from '@/src/components/lesson/LibraryStageLevelSelector';
import { ResourcePageHeader } from '@/src/components/resources/ResourcePageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { getLessonLibrarySelection, hydrateLessonLibrarySelection } from '@/src/lib/lesson-library-selection';
import { LIBRARY_STAGES, LibraryStage, lessonNumber, shortLessonFocus } from '@/src/lib/library-pathway';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';
import { SpeakingCoachLessonSummary } from '@/src/types/speaking-coach';

const levelOf = (lessonId: string) => Number(lessonId.split('.')[0]) || 0;
const stageOf = (level: number): LibraryStage => LIBRARY_STAGES[Math.min(3, Math.floor((Math.max(1, level) - 1) / 4))];
const lessonSort = (a: SpeakingCoachLessonSummary, b: SpeakingCoachLessonSummary) => {
  const [aLevel, aNumber] = a.lesson_external_id.split('.').map(Number);
  const [bLevel, bNumber] = b.lesson_external_id.split('.').map(Number);
  return (aLevel || 0) - (bLevel || 0) || (aNumber || 999) - (bNumber || 999);
};

export function SpeakingPracticeHomeScreen() {
  const router = useRouter();
  const { hasMembership, isLoading: sessionLoading } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const librarySelection = getLessonLibrarySelection();
  const [lessons, setLessons] = useState<SpeakingCoachLessonSummary[]>([]);
  const [libraryLessons, setLibraryLessons] = useState<LessonListItem[]>([]);
  const [selection, setSelection] = useState<{ stage: LibraryStage; level: number | null }>({ stage: librarySelection.stage, level: librarySelection.level });
  const [stageOpen, setStageOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLibrarySelection = useRef<{ stage: LibraryStage; level: number | null } | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([fetchAvailableSpeakingCoachLessons(), hydrateLessonLibrarySelection(), getLessonsIndex().catch(() => [])])
      .then(([rows, saved, indexedLessons]) => {
        if (!active) return;
        const ordered = [...rows].sort(lessonSort);
        setLessons(ordered);
        setLibraryLessons(indexedLessons);
        const availableLevels = new Set(ordered.map((row) => levelOf(row.lesson_external_id)));
        const libraryLevelChanged = lastLibrarySelection.current === null
          || lastLibrarySelection.current.stage !== saved.stage
          || lastLibrarySelection.current.level !== saved.level;
        lastLibrarySelection.current = { stage: saved.stage, level: saved.level };
        setSelection((current) => {
          const savedLevel = saved.level !== null && availableLevels.has(saved.level) ? saved.level : null;
          const currentLevel = current.level !== null && availableLevels.has(current.level) ? current.level : null;
          const level = (libraryLevelChanged ? savedLevel : null)
            ?? currentLevel
            ?? savedLevel
            ?? levelOf(ordered.find((row) => !row.is_completed)?.lesson_external_id ?? ordered[0]?.lesson_external_id ?? '0');
          return { stage: stageOf(level), level };
        });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load speaking lessons.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []));

  const stages = useMemo(() => LIBRARY_STAGES.filter((stage) => lessons.some((lesson) => stageOf(levelOf(lesson.lesson_external_id)) === stage)), [lessons]);
  const levels = useMemo(() => [...new Set(lessons.filter((lesson) => stageOf(levelOf(lesson.lesson_external_id)) === selection.stage).map((lesson) => levelOf(lesson.lesson_external_id)))].filter(Boolean).sort((a, b) => a - b), [lessons, selection.stage]);
  const visibleLessons = useMemo(() => lessons.filter((lesson) => levelOf(lesson.lesson_external_id) === selection.level), [lessons, selection.level]);
  const libraryLessonsById = useMemo(() => new Map(libraryLessons.map((lesson) => [lesson.id, lesson])), [libraryLessons]);
  const lessonLabel = (lesson: SpeakingCoachLessonSummary) => {
    const libraryLesson = libraryLessonsById.get(lesson.id);
    return (libraryLesson ? shortLessonFocus(libraryLesson, uiLanguage) : '')
      || (uiLanguage === 'th' ? lesson.title_th ?? lesson.title : lesson.title)
      || '';
  };

  if (!sessionLoading && !hasMembership) return <Redirect href="/(tabs)/account/membership" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ResponsivePageShell>
        <View style={styles.page}>
          <ResourcePageHeader
            language={uiLanguage}
            title={uiLanguage === 'th' ? 'ฝึกพูด' : 'Speaking Practice'}
            subtitle={uiLanguage === 'th'
              ? 'ฝึกการออกเสียงและการพูด Pailin จะให้คำแนะนำที่เป็นประโยชน์!'
              : 'Work on your pronunciation and speaking. Our AI checker will give you valuable feedback!'}
            onBackPress={() => router.push('/(tabs)/resources')}
            illustration={<Image source={pailinImage} contentFit="cover" style={styles.pailin} />}
          />

          {loading ? <ActivityIndicator style={styles.loading} color={theme.colors.accent} /> : null}
          {error ? <AppText variant="body" style={styles.error}>{error}</AppText> : null}
          {!loading && !error && lessons.length === 0 ? (
            <AppText variant="body" style={styles.empty}>No speaking lessons are available yet.</AppText>
          ) : null}

          {!loading && !error && stages.length > 0 ? (
            <LibraryStageLevelSelector
              language={uiLanguage}
              stage={selection.stage}
              stages={stages}
              level={selection.level}
              levels={levels}
              stageOpen={stageOpen}
              bottomMargin={9}
              onToggleStage={() => setStageOpen((value) => !value)}
              onSelectStage={(stage) => {
                const firstLevel = lessons.find((lesson) => stageOf(levelOf(lesson.lesson_external_id)) === stage);
                setSelection({ stage, level: firstLevel ? levelOf(firstLevel.lesson_external_id) : null });
              }}
              onSelectLevel={(level) => setSelection({ stage: selection.stage, level })}
            />
          ) : null}

          {!loading && !error ? (
            <View style={styles.lessonList}>
              {visibleLessons.map((lesson) => {
                const libraryLesson = libraryLessonsById.get(lesson.id);
                const iconSource = getLessonIconSource(libraryLesson ? lessonNumber(libraryLesson) : lesson.lesson_external_id);
                return (
                  <Pressable
                    key={lesson.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${lesson.lesson_external_id} ${lessonLabel(lesson)}`}
                    onPress={() => router.push({ pathname: '/speaking-coach', params: { lesson: lesson.lesson_external_id, entry: 'resources' } })}
                    style={styles.lessonRow}>
                    <AppText variant="caption" style={styles.lessonNumber}>{lesson.lesson_external_id}</AppText>
                    {iconSource ? <Image source={iconSource} contentFit="contain" style={styles.lessonIcon} /> : null}
                    <AppText variant="body" numberOfLines={1} style={styles.lessonTitle}>{lessonLabel(lesson)}</AppText>
                    {lesson.is_completed ? (
                      <View style={styles.completedBadge}><MaterialIcons name="check" size={14} color={theme.colors.text} /></View>
                    ) : null}
                    <MaterialIcons name="chevron-right" size={21} color={theme.colors.text} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </ResponsivePageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FBFF' },
  content: { paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING },
  page: { paddingHorizontal: 18, paddingTop: 12 },
  pailin: { position: 'absolute', right: 0, bottom: -12, width: 118, height: 92, transform: [{ scaleX: -1 }] },
  loading: { marginTop: 50 },
  error: { marginTop: 28, color: theme.colors.error },
  empty: { marginTop: 28 },
  lessonList: { marginTop: 6, marginHorizontal: 14 },
  lessonRow: { minHeight: 39, borderBottomWidth: 1, borderBottomColor: '#E1E6EC', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  lessonNumber: { width: 36, fontSize: 12, fontWeight: '700' },
  lessonIcon: { width: 34, height: 34, flexShrink: 0 },
  lessonTitle: { flex: 1, fontSize: 13 },
  completedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ADE66E', borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
});
