import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { usePostHog } from 'posthog-react-native';

import { AppLessonProgressSummary } from '@/src/api/app-lesson-progress';
import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import { fetchUserLessonEngagements } from '@/src/api/user';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { LessonProgressCircle } from '@/src/components/lesson/LessonProgressCircle';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { clearLessonLibraryAnchor, getLessonLibrarySelection, hydrateLessonLibrarySelection, setLessonLibrarySelection } from '@/src/lib/lesson-library-selection';
import { loadLessonProgressSummariesProgressively } from '@/src/lib/lesson-library-progress';
import { freeLibraryIds, LIBRARY_STAGES, LibraryStage, lessonMarker, lessonNumber, matchesLessonSearch, shortLessonFocus } from '@/src/lib/library-pathway';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

export function LibraryPathwayScreen({ freeOnly = false }: { freeOnly?: boolean }) {
  const router = useRouter();
  const posthog = usePostHog();
  const { uiLanguage: language } = useUiLanguage();
  const { hasAccount, hasMembership, user } = useAppSession();
  const initial = getLessonLibrarySelection();
  const [items, setItems] = useState<LessonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [stage, setStage] = useState<LibraryStage>(initial.stage);
  const [level, setLevel] = useState<number | null>(initial.level);
  const [stageOpen, setStageOpen] = useState(false);
  const [libraryMenu, setLibraryMenu] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recentId, setRecentId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, AppLessonProgressSummary>>({});
  const [refresh, setRefresh] = useState(0);
  const [anchor, setAnchor] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);
  const offsets = useRef<Record<string, number>>({});
  const listTop = useRef(0);
  const scrollY = useRef(0);
  const beforeSearchY = useRef(0);
  const searching = query.trim().length > 0;
  const libraryRoute = freeOnly ? 'free-library' : 'library';
  const th = language === 'th';
  const stageLabel = (value: LibraryStage) => th ? ({ Beginner: 'เริ่มต้น', Intermediate: 'ระดับกลาง', Advanced: 'ขั้นสูง', Expert: 'เชี่ยวชาญ' }[value]) : value.toUpperCase();
  const localized = (en: string | null, thai: string | null) => (th ? thai?.trim() || en?.trim() : en?.trim() || thai?.trim()) || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void getLessonsIndex().then((rows) => { if (active) setItems(rows); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const selection = getLessonLibrarySelection();
    setStage(selection.stage);
    setLevel(selection.level);
    setAnchor(selection.lessonId ?? null);
    setRefresh((value) => value + 1);
    void hydrateLessonLibrarySelection().then((saved) => {
      if (!active) return;
      setStage(saved.stage);
      setLevel(saved.level);
      setHydrated(true);
    });
    if (hasAccount) {
      void fetchUserLessonEngagements().then((engagements) => {
        if (active) setRecentId(engagements.slice().sort((a, b) => Date.parse(b.last_visited_at || '') - Date.parse(a.last_visited_at || ''))[0]?.lesson_id ?? null);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [hasAccount]));

  useEffect(() => { setProgress({}); setSelectedId(null); setRecentId(null); }, [user?.id]);
  const freeIds = useMemo(() => freeLibraryIds(items), [items]);
  const stages = useMemo(() => LIBRARY_STAGES.filter((value) => items.some((lesson) => lesson.stage === value)), [items]);
  const levels = useMemo(() => [...new Set(items.filter((lesson) => lesson.stage === stage).map((lesson) => lesson.level).filter((value): value is number => value != null))].sort((a, b) => a - b), [items, stage]);
  useEffect(() => {
    if (!hydrated || loading || !items.length) return;
    if (!stages.includes(stage)) { setStage(stages[0] ?? 'Beginner'); return; }
    if (level == null || !levels.includes(level)) { setLevel(levels[0] ?? null); return; }
    setLessonLibrarySelection({ stage, level, route: libraryRoute });
  }, [hydrated, items.length, level, levels, libraryRoute, loading, stage, stages]);

  const lessons = useMemo(() => items.filter((lesson) => {
    if (freeOnly && !freeIds.has(lesson.id)) return false;
    return searching ? matchesLessonSearch(lesson, query) : lesson.stage === stage && (freeOnly || lesson.level === level);
  }).sort((a, b) => LIBRARY_STAGES.indexOf(a.stage as LibraryStage) - LIBRARY_STAGES.indexOf(b.stage as LibraryStage)
    || (a.level ?? 0) - (b.level ?? 0) || (a.lesson_order ?? 0) - (b.lesson_order ?? 0)), [freeIds, freeOnly, items, level, query, searching, stage]);
  const visibleIds = useMemo(() => lessons.map((lesson) => lesson.id), [lessons]);
  useEffect(() => {
    if (!hasAccount) return;
    let active = true;
    void loadLessonProgressSummariesProgressively({ lessonIds: visibleIds, isCancelled: () => !active,
      onPartial: (next) => { if (active) setProgress((previous) => ({ ...previous, ...next })); } });
    return () => { active = false; };
  }, [hasAccount, refresh, user?.id, visibleIds]);

  const activeId = [selectedId, recentId].find((id) => id && visibleIds.includes(id))
    ?? lessons.find((lesson) => progress[lesson.id]?.has_started && !progress[lesson.id]?.is_completed && (hasMembership || freeIds.has(lesson.id)))?.id
    ?? lessons.find((lesson) => !progress[lesson.id]?.is_completed && (hasMembership || freeIds.has(lesson.id)))?.id;
  const selectedIndex = lessons.findIndex((lesson) => lesson.id === activeId);
  // Until level-story content is provided, preview the opening lesson's existing backstory.
  const firstLesson = items.filter((lesson) => lesson.stage === stage && lesson.level === level).sort((a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0))[0];
  const story = firstLesson ? localized(firstLesson.backstory, firstLesson.backstory_th) : '';

  const restoreAnchor = useCallback(() => {
    if (!anchor || offsets.current[anchor] == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, listTop.current + offsets.current[anchor] - 16), animated: false });
    clearLessonLibraryAnchor();
    setAnchor(null);
  }, [anchor]);
  useEffect(() => { const frame = requestAnimationFrame(restoreAnchor); return () => cancelAnimationFrame(frame); }, [restoreAnchor, lessons]);

  const closeSearch = () => {
    setQuery(''); setSearchOpen(false); searchRef.current?.blur();
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: beforeSearchY.current, animated: false }));
  };
  const chooseStage = (next: LibraryStage) => {
    setStage(next); setStoryOpen(false); setSelectedId(null);
    setLevel(items.filter((lesson) => lesson.stage === next).map((lesson) => lesson.level).filter((value): value is number => value != null).sort((a, b) => a - b)[0] ?? null);
  };

  if (loading) return <PageLoadingState language={language} />;
  const title = freeOnly ? (th ? 'คลังบทเรียนฟรี' : 'Free lesson library') : (th ? 'คลังบทเรียน' : 'Lesson Library');
  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      onScroll={({ nativeEvent }) => { scrollY.current = nativeEvent.contentOffset.y; }} scrollEventThrottle={32}>
      <ResponsivePageShell>
        <View style={styles.header}>
          <Pressable disabled={hasMembership} onPress={() => setLibraryMenu((value) => !value)} accessibilityRole={hasMembership ? 'header' : 'button'} accessibilityState={!hasMembership ? { expanded: libraryMenu } : undefined} style={styles.headerTitleTouch}>
            <AppText language={language} variant="title" style={[styles.headerTitle, { fontFamily: theme.typography.fontFaces[language].bold }]}>{title}{!hasMembership ? ' ▾' : ''}</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? (th ? 'ปิดการค้นหา' : 'Close search') : (th ? 'ค้นหาบทเรียน' : 'Search lessons')}
            style={styles.searchButton} onPress={() => {
              if (searchOpen) closeSearch();
              else { beforeSearchY.current = scrollY.current; setSearchOpen(true); }
            }}><MaterialIcons name={searchOpen ? 'close' : 'search'} size={25} color={theme.colors.text} /></Pressable>
        </View>
        {libraryMenu ? <View style={styles.libraryMenu}>{[false, true].map((free) => (
          <Pressable key={String(free)} style={styles.menuChoice} onPress={() => { setLibraryMenu(false); router.replace(free ? '/(tabs)/lessons/free-library' : '/(tabs)/lessons/library'); }}>
            <AppText language={language}>{free ? (th ? 'คลังบทเรียนฟรี' : 'Free lesson library') : (th ? 'คลังบทเรียนทั้งหมด' : 'Full lesson library')}</AppText>
          </Pressable>
        ))}</View> : null}
        {searchOpen ? (
          <TextInput ref={searchRef} autoFocus value={query} onChangeText={setQuery} style={styles.searchInput}
            accessibilityLabel={th ? 'ค้นหาบทเรียนภาษาไทยหรืออังกฤษ' : 'Search lessons in English or Thai'}
            placeholder={th ? 'ค้นหาชื่อ หัวข้อ หรือเลขบทเรียน' : 'Search titles, topics or lesson numbers'}
            placeholderTextColor="#777777" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
        ) : null}
        {!searching ? (
          <View style={styles.navigationShadow}><View style={styles.navigation}>
            {!freeOnly ? <Pressable accessibilityRole="button" accessibilityLabel={th ? 'เลือกช่วงการเรียน' : 'Choose stage'} accessibilityState={{ expanded: stageOpen }} onPress={() => setStageOpen((value) => !value)} style={styles.stageHeader}>
              <View style={styles.stageHeading}><View style={styles.stageDot} /><AppText language={language} variant="caption" style={styles.stageName}>{stageLabel(stage)}</AppText></View>
              <MaterialIcons name={stageOpen ? 'remove' : 'add'} size={17} color={theme.colors.text} />
            </Pressable> : null}
            {stageOpen || freeOnly ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stages}>
                {stages.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === stage }} onPress={() => chooseStage(value)} style={styles.stageTouch}>
                  <View style={[styles.stagePill, value === stage ? styles.activeStage : null]}><AppText language={language} variant="caption" style={[styles.stageName, value === stage ? styles.activeStageText : null]}>{stageLabel(value)}</AppText></View>
                </Pressable>)}
              </ScrollView>
            ) : null}
            {!freeOnly ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levels}>
              {levels.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === level }}
                onPress={() => { setLevel(value); setStoryOpen(false); setSelectedId(null); }} style={[styles.level, value === level ? styles.activeLevel : null]}>
                <AppText language={language} variant="caption" style={[styles.levelText, value === level ? { fontFamily: theme.typography.fontFaces[language].bold } : null]}>{th ? 'เลเวล' : 'LEVEL'} {value}</AppText>
              </Pressable>)}
            </ScrollView> : null}
          </View></View>
        ) : <AppText language={language} variant="caption" style={styles.resultsLabel}>{th ? `พบ ${lessons.length} บทเรียน` : `${lessons.length} lessons found`}</AppText>}

        {!hasMembership && !searching ? <View style={styles.upgrade}>
          <AppText language={language} variant="title" style={styles.upgradeTitle}>{th ? 'ปลดล็อกคอร์สทั้งหมด' : 'UNLOCK THE FULL COURSE'}</AppText>
          <AppText language={language} variant="muted">{th ? `คุณสามารถเรียนฟรีได้ ${freeIds.size} บทเรียน` : `You have access to ${freeIds.size} free lessons.`}</AppText>
          <Button language={language} title={th ? 'ดูแพ็กเกจ →' : 'VIEW PLANS →'} style={styles.upgradeButton} textStyle={styles.upgradeButtonText}
            onPress={() => { prefetchPricing(); router.push('/(tabs)/account/membership'); }} />
        </View> : null}

        {!searching && !freeOnly && story ? <View style={styles.storyShadow}><View style={styles.story}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: storyOpen }} onPress={() => setStoryOpen((value) => !value)} style={styles.storyHeader}>
            <AppText language={language} variant="caption" style={styles.storyLabel}>{th ? 'เรื่องราวของไพลิน' : "PAILIN’S STORY"}</AppText>
            <MaterialIcons name={storyOpen ? 'remove' : 'add'} size={19} color={theme.colors.text} />
          </Pressable>
          {storyOpen ? <AppText language={language} variant="muted" style={styles.storyBody}>{story}</AppText> : null}
        </View></View> : null}

        {failed ? <View style={styles.empty}><AppText language={language}>{th ? 'โหลดบทเรียนไม่สำเร็จ' : 'Could not load lessons.'}</AppText><Button title={th ? 'ลองอีกครั้ง' : 'Try again'} language={language} onPress={() => setRetry((value) => value + 1)} /></View> : null}
        <View onLayout={({ nativeEvent }) => { listTop.current = nativeEvent.layout.y; restoreAnchor(); }} style={styles.lessonList}>
          {lessons.map((lesson, index) => {
            const selected = lesson.id === activeId;
            const locked = !hasMembership && !freeIds.has(lesson.id);
            const marker = lessonMarker(selected, progress[lesson.id]);
            const done = !!progress[lesson.id]?.is_completed;
            const strong = selected || done || !!progress[lesson.id]?.has_started;
            const lessonTitle = localized(lesson.title, lesson.title_th) || (th ? 'ไม่มีชื่อบทเรียน' : 'Untitled lesson');
            const status = selected ? (th ? 'เลือกอยู่' : 'Selected') : marker.kind === 'complete' ? (th ? 'เรียนจบแล้ว' : 'Completed') : marker.kind === 'progress' ? `${marker.percent}%` : (th ? 'ยังไม่เริ่ม' : 'Not started');
            return <View key={lesson.id} style={styles.lessonRow} onLayout={({ nativeEvent }) => { offsets.current[lesson.id] = nativeEvent.layout.y; if (anchor === lesson.id) restoreAnchor(); }}>
              {!searching && index < lessons.length - 1 ? <View pointerEvents="none" style={[styles.connector, index < selectedIndex ? styles.connectorActive : null]} /> : null}
              <View style={[styles.cardShadow, strong ? styles.strongShadow : null]}>
                <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${lessonNumber(lesson)} ${lessonTitle}. ${status}${locked ? (th ? ' ล็อกอยู่' : '. Locked') : ''}`}
                  style={[styles.card, strong ? styles.strongCard : null, selected ? styles.selectedCard : null]}
                  onPressIn={() => { if (!locked) prefetchResolvedLesson(lesson.id, 'en'); }}
                  onPress={() => {
                    setSelectedId(lesson.id);
                    posthog.capture('lesson_opened', { lesson_id: lesson.id, lesson_title: lesson.title, stage: lesson.stage, level: lesson.level, has_membership: hasMembership });
                    // Keep the browsing selection while the preview is open; it clears the anchor on dismissal.
                    setLessonLibrarySelection({ stage, level, route: libraryRoute });
                    router.push({ pathname: '/lesson-preview/[id]', params: { id: lesson.id, libraryRoute, locked: locked ? '1' : '0' } });
                  }}>
                  {searching ? <AppText language={language} variant="caption" style={styles.searchContext}>{stageLabel(lesson.stage as LibraryStage)} · {th ? 'เลเวล' : 'LEVEL'} {lesson.level}</AppText> : null}
                  <View style={styles.cardMeta}>
                    <AppText language={language} variant="caption" style={styles.lessonNumber}>{lessonNumber(lesson)}</AppText>
                    <AppText language={language} variant="muted" numberOfLines={1} ellipsizeMode="tail" style={styles.topic}>{shortLessonFocus(lesson, language)}</AppText>
                    {locked ? <MaterialIcons name="lock-outline" size={14} color="#777777" /> : null}
                  </View>
                  <AppText language={language} style={[styles.lessonTitle, locked ? styles.lockedTitle : null]}>{lessonTitle}</AppText>
                </Pressable>
              </View>
              {marker.kind === 'progress' ? (
                <View pointerEvents="none" style={styles.progressMarker}>
                  <AppText language="en" variant="caption" style={styles.progressLabel}>{marker.percent}%</AppText>
                  <LessonProgressCircle percent={marker.percent} showLabel={false} />
                </View>
              ) : (
                <View pointerEvents="none" style={[styles.marker, marker.kind === 'selected' ? styles.selectedMarker : marker.kind === 'complete' ? styles.completeMarker : null]}>
                  {marker.kind === 'complete' ? <MaterialIcons name="check" size={14} color="#222222" /> : null}
                </View>
              )}
            </View>;
          })}
          {!failed && !lessons.length ? <AppText language={language} variant="muted" style={styles.empty}>{searching ? (th ? 'ไม่พบบทเรียน ลองค้นหาด้วยคำอื่น' : 'No matching lessons. Try another search.') : (th ? 'ยังไม่มีบทเรียนในเลเวลนี้' : 'No lessons in this level yet.')}</AppText> : null}
        </View>
      </ResponsivePageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FAFD' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  headerTitleTouch: { flex: 1 }, headerTitle: { fontSize: 20, lineHeight: 28 }, searchButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchInput: { borderWidth: 1, borderColor: '#BBBBBB', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 14, color: '#222222' },
  libraryMenu: { borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8, backgroundColor: '#FFFFFF', marginBottom: 12 }, menuChoice: { padding: 12 },
  navigationShadow: { backgroundColor: '#222222', borderRadius: 10, marginBottom: 24, marginRight: -3, marginLeft: 3 },
  navigation: { transform: [{ translateX: -3 }, { translateY: -3 }], borderWidth: 1, borderColor: '#222222', borderRadius: 10, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  stageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, minHeight: 27 }, stageHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#BCE574' }, stageName: { fontSize: 11, lineHeight: 17, letterSpacing: 0.65, textTransform: 'uppercase' },
  stages: { flexGrow: 1, justifyContent: 'space-between', gap: 4, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 4 }, stageTouch: { padding: 4, justifyContent: 'center', minHeight: 32 },
  stagePill: { borderRadius: 4, backgroundColor: '#EEEEEE', paddingHorizontal: 5, paddingVertical: 2 }, activeStage: { backgroundColor: '#2860F0' }, activeStageText: { color: '#FFFFFF' },
  levels: { flexGrow: 1 }, level: { flex: 1, minWidth: 72, minHeight: 36, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, borderTopWidth: 1, borderRightWidth: 1, borderColor: '#333333' }, activeLevel: { backgroundColor: '#BFEDFC' }, levelText: { fontSize: 12, lineHeight: 18 },
  storyShadow: { backgroundColor: '#222222', borderRadius: 10, marginHorizontal: 26, marginBottom: 22 }, story: { backgroundColor: '#FFFCE5', borderWidth: 1, borderColor: '#222222', borderRadius: 10, transform: [{ translateX: -2 }, { translateY: -2 }] },
  storyHeader: { minHeight: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 }, storyLabel: { fontSize: 9, lineHeight: 15, letterSpacing: 0.65 }, storyBody: { fontSize: 12, lineHeight: 19, paddingHorizontal: 12, paddingBottom: 12 },
  lessonList: { marginHorizontal: 26 }, lessonRow: { paddingBottom: 22, position: 'relative' },
  connector: { position: 'absolute', left: 22, top: 20, bottom: -1, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#DDDDDD' }, connectorActive: { borderStyle: 'solid', borderColor: '#2860F0' },
  cardShadow: { borderRadius: 10 }, strongShadow: { backgroundColor: '#222222' },
  card: { paddingVertical: 14, paddingLeft: 30, paddingRight: 14, borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 10, backgroundColor: '#FFFFFF', gap: 4, minHeight: 68 },
  strongCard: { borderColor: '#222222', transform: [{ translateX: -1 }, { translateY: -2 }] }, selectedCard: { backgroundColor: '#BFEDFC' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 }, lessonNumber: { fontSize: 11, lineHeight: 17, fontFamily: theme.typography.fontFaces.en.bold }, topic: { flex: 1, fontSize: 11, lineHeight: 17, color: '#666666' },
  lessonTitle: { fontSize: 13, lineHeight: 21, color: '#222222' }, lockedTitle: { color: '#777777' },
  marker: { position: 'absolute', left: -9, top: '50%', marginTop: -20, width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#C6C6C6', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  selectedMarker: { backgroundColor: '#3CA0FE', borderColor: '#222222' }, completeMarker: { backgroundColor: '#BCE574', borderColor: '#222222' },
  progressMarker: { position: 'absolute', width: 20, height: 22, left: -10, top: '50%', marginTop: -23, alignItems: 'center' },
  progressLabel: { position: 'absolute', right: 24, top: 5, width: 26, fontSize: 10, lineHeight: 14, textAlign: 'right', color: '#222222' },
  resultsLabel: { marginBottom: 18, color: '#666666' }, searchContext: { fontSize: 9, lineHeight: 15, color: '#777777' }, empty: { paddingVertical: 24, textAlign: 'center', gap: 12 },
  upgrade: { borderWidth: 1, borderColor: '#EDC743', borderRadius: 10, backgroundColor: '#FFFCE5', padding: 16, gap: 8, marginBottom: 24 }, upgradeTitle: { fontSize: 15, lineHeight: 21 }, upgradeButton: { backgroundColor: '#F9DA60', alignSelf: 'flex-start', minHeight: 32 }, upgradeButtonText: { fontSize: 11, lineHeight: 17, color: '#222222' },
});
