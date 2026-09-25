import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { resourceCardImages } from '@/src/assets/resource-images';
import { getLessonIconSource } from '@/src/assets/lesson-icons';
import { getConversationLibrary } from '@/src/api/lessons';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { LibraryStageLevelSelector } from '@/src/components/lesson/LibraryStageLevelSelector';
import { ResourcePageHeader } from '@/src/components/resources/ResourcePageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { getLessonLibrarySelection, hydrateLessonLibrarySelection } from '@/src/lib/lesson-library-selection';
import { LIBRARY_STAGES, LibraryStage, lessonNumber } from '@/src/lib/library-pathway';
import { theme } from '@/src/theme/theme';
import type { ConversationLibraryLesson } from '@/src/types/lesson';

const levelOf = (lesson: ConversationLibraryLesson) => lesson.level ?? (Number(lesson.lesson_external_id?.split('.')[0]) || 0);
const stageOf = (level: number): LibraryStage => LIBRARY_STAGES[Math.min(3, Math.floor((Math.max(1, level) - 1) / 4))];
const lessonSort = (a: ConversationLibraryLesson, b: ConversationLibraryLesson) =>
  (a.level ?? 0) - (b.level ?? 0) || (a.lesson_order ?? 999) - (b.lesson_order ?? 999);

export function ConversationLibraryScreen() {
  const router = useRouter();
  const { hasMembership, isLoading: sessionLoading } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const savedSelection = getLessonLibrarySelection();
  const [lessons, setLessons] = useState<ConversationLibraryLesson[]>([]);
  const [selection, setSelection] = useState<{ stage: LibraryStage; level: number | null }>({ stage: savedSelection.stage, level: savedSelection.level });
  const [stageOpen, setStageOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLibrarySelection = useRef<{ stage: LibraryStage; level: number | null } | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([getConversationLibrary(), hydrateLessonLibrarySelection()])
      .then(([rows, saved]) => {
        if (!active) return;
        const ordered = [...rows].sort(lessonSort);
        setLessons(ordered);
        const availableLevels = new Set(ordered.map(levelOf));
        const libraryLevelChanged = lastLibrarySelection.current === null
          || lastLibrarySelection.current.stage !== saved.stage
          || lastLibrarySelection.current.level !== saved.level;
        lastLibrarySelection.current = { stage: saved.stage, level: saved.level };
        setSelection((current) => {
          const savedLevel = saved.level !== null && availableLevels.has(saved.level) ? saved.level : null;
          const currentLevel = current.level !== null && availableLevels.has(current.level) ? current.level : null;
          const level = (libraryLevelChanged ? savedLevel : null) ?? currentLevel ?? savedLevel ?? levelOf(ordered[0]);
          return { stage: stageOf(level), level };
        });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load conversations.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const stages = useMemo(() => LIBRARY_STAGES.filter((stage) => lessons.some((lesson) => stageOf(levelOf(lesson)) === stage)), [lessons]);
  const levels = useMemo(() => [...new Set(lessons.filter((lesson) => stageOf(levelOf(lesson)) === selection.stage).map(levelOf))].filter(Boolean).sort((a, b) => a - b), [lessons, selection.stage]);
  const visibleLessons = useMemo(() => lessons.filter((lesson) => levelOf(lesson) === selection.level), [lessons, selection.level]);

  if (!sessionLoading && !hasMembership) return <Redirect href="/(tabs)/account/membership" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ResponsivePageShell>
        <View style={styles.page}>
          <ResourcePageHeader
            language={uiLanguage}
            title={uiLanguage === 'th' ? 'คลังบทสนทนา' : 'Conversation Library'}
            subtitle={uiLanguage === 'th'
              ? 'ฟังบทสนทนาของแต่ละบทเรียนตั้งแต่ต้นจนจบ เลือกเลเวลเพื่อเริ่มได้เลย!'
              : 'Listen to the conversations from each lesson from start to finish. Choose a level below to get started!'}
            onBackPress={() => router.push('/(tabs)/resources')}
            illustration={<Image source={resourceCardImages.conversations} contentFit="contain" style={styles.illustration} />}
          />

          {loading ? <ActivityIndicator style={styles.loading} color={theme.colors.accent} /> : null}
          {error ? <AppText variant="body" style={styles.error}>{error}</AppText> : null}
          {!loading && !error && lessons.length === 0 ? <AppText variant="body" style={styles.empty}>No conversations are available yet.</AppText> : null}

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
                const first = lessons.find((lesson) => stageOf(levelOf(lesson)) === stage);
                setSelection({ stage, level: first ? levelOf(first) : null });
              }}
              onSelectLevel={(level) => setSelection({ stage: selection.stage, level })}
            />
          ) : null}

          {!loading && !error ? (
            <View style={styles.lessonList}>
              {visibleLessons.map((lesson) => {
                const title = (uiLanguage === 'th' ? lesson.title_th ?? lesson.title : lesson.title) ?? '';
                const number = lesson.lesson_external_id ?? `${lesson.level}.${lesson.lesson_order}`;
                const isCheckpoint = number.toLowerCase().endsWith('.chp');
                const iconSource = getLessonIconSource(lessonNumber(lesson));
                return (
                  <Pressable
                    key={lesson.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${number} ${title}`}
                    onPress={() => router.push({ pathname: '/conversations/[id]', params: { id: lesson.id } })}
                    style={styles.lessonRow}>
                    <AppText
                      variant="caption"
                      numberOfLines={1}
                      style={[styles.lessonNumber, isCheckpoint ? styles.checkpointLessonNumber : null]}>
                      {number}
                    </AppText>
                    {iconSource ? <Image source={iconSource} contentFit="contain" style={styles.lessonIcon} /> : null}
                    <AppText language={uiLanguage} variant="body" numberOfLines={2} style={styles.lessonTitle}>{title}</AppText>
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
  illustration: { position: 'absolute', right: 4, bottom: -12, width: 112, height: 86 },
  loading: { marginTop: 50 },
  error: { marginTop: 28, color: theme.colors.error },
  empty: { marginTop: 28 },
  lessonList: { marginTop: 6, marginHorizontal: 14 },
  lessonRow: { minHeight: 39, borderBottomWidth: 1, borderBottomColor: '#E1E6EC', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 3 },
  lessonNumber: { width: 32, fontSize: 12, fontWeight: '700' },
  checkpointLessonNumber: { fontSize: 10, lineHeight: 15 },
  lessonIcon: { width: 34, height: 34, flexShrink: 0 },
  lessonTitle: { flex: 1, fontSize: 13, lineHeight: 19 },
});
