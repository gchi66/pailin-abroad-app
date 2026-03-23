import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack as RouterStack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { fetchResolvedLesson } from '@/src/api/lessons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { env } from '@/src/config/env';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { ResolvedLessonPayload, ResolvedLessonSection } from '@/src/types/lesson';

type UiLanguage = 'en' | 'th';
type LessonTab = {
  id: string;
  type: string;
  section: ResolvedLessonSection | null;
};

const MASTER_ORDER = [
  'comprehension',
  'transcript',
  'apply',
  'understand',
  'extra_tip',
  'common_mistake',
  'phrases_verbs',
  'culture_note',
  'practice',
] as const;

const SECTION_TYPE_LABELS: Record<string, { en: string; th: string }> = {
  comprehension: { en: 'Comprehension', th: 'คำถามความเข้าใจ' },
  transcript: { en: 'Transcript', th: 'บทถอดเสียง' },
  conversation: { en: 'Conversation', th: 'บทสนทนา' },
  apply: { en: 'Apply', th: 'นำไปใช้' },
  understand: { en: 'Understand', th: 'ทำความเข้าใจ' },
  extra_tip: { en: 'Extra Tip', th: 'เกร็ดเพิ่มเติม' },
  common_mistake: { en: 'Common Mistake', th: 'ข้อผิดพลาดที่พบบ่อย' },
  phrases_verbs: { en: 'Phrases & Verbs', th: 'วลีและคำกริยา' },
  culture_note: { en: 'Culture Note', th: 'เกร็ดวัฒนธรรม' },
  practice: { en: 'Practice', th: 'ฝึกฝน' },
};

const getResolvedSectionType = (section: ResolvedLessonSection) => section.type ?? section.section_type ?? null;

const hasLessonPhrases = (phrases: ResolvedLessonPayload['phrases']) =>
  (phrases ?? []).some((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const content = 'content' in item && typeof item.content === 'string' ? item.content.trim() : '';
    const contentMd = 'content_md' in item && typeof item.content_md === 'string' ? item.content_md.trim() : '';
    return Boolean(content || contentMd);
  });

const buildLessonTabs = (lesson: ResolvedLessonPayload | null): LessonTab[] => {
  if (!lesson) {
    return [];
  }

  const sections = (lesson.sections ?? []).map((section, index) => ({
    ...section,
    id: getSectionId(section, index),
  }));

  const tabs: (LessonTab | null)[] = MASTER_ORDER.map((type) => {
    if (type === 'comprehension') {
      return (lesson.questions?.length ?? 0) > 0 ? { id: 'comprehension', type, section: null } : null;
    }
    if (type === 'transcript') {
      return (lesson.transcript?.length ?? 0) > 0 ? { id: 'transcript', type, section: null } : null;
    }
    if (type === 'practice') {
      return (lesson.practice_exercises?.length ?? 0) > 0 ? { id: 'practice', type, section: null } : null;
    }
    if (type === 'phrases_verbs') {
      return hasLessonPhrases(lesson.phrases) ? { id: 'phrases_verbs', type, section: null } : null;
    }

    const section = sections.find((item) => getResolvedSectionType(item) === type) ?? null;
    return section ? { id: section.id ?? type, type, section } : null;
  });

  return tabs.filter((item): item is LessonTab => item !== null);
};

const getSectionId = (section: ResolvedLessonSection, index: number) =>
  typeof section.id === 'string' && section.id.trim().length > 0 ? section.id : `section-${index + 1}`;

const getSectionLabel = (uiLanguage: UiLanguage, sectionType: string | null | undefined) => {
  if (!sectionType) {
    return uiLanguage === 'th' ? 'บทเรียน' : 'Lesson section';
  }
  return SECTION_TYPE_LABELS[sectionType]?.[uiLanguage] ?? sectionType.replace(/_/g, ' ');
};

const getSectionTitle = (uiLanguage: UiLanguage, sectionType: string | null | undefined, index: number) => {
  return getSectionLabel(uiLanguage, sectionType) || `${uiLanguage === 'th' ? 'ส่วนที่' : 'Section'} ${index + 1}`;
};

const getSectionNotes = (uiLanguage: UiLanguage, section: ResolvedLessonSection) => {
  const notes: string[] = [];
  const richNodes =
    (Array.isArray(section.content_jsonb) ? section.content_jsonb.length : 0) +
    (Array.isArray(section.content_jsonb_th) ? section.content_jsonb_th.length : 0);

  if (richNodes > 0) {
    notes.push(
      uiLanguage === 'th'
        ? 'โหลด rich lesson blocks สำหรับ section นี้แล้ว'
        : 'Rich lesson blocks are loaded for this section.'
    );
  }

  if (section.audio_url || section.conversation_audio_url) {
    notes.push(
      uiLanguage === 'th'
        ? 'section นี้มีข้อมูลเสียงที่สามารถต่อเข้ากับ player ได้'
        : 'This section includes audio-linked data that can be wired into the player.'
    );
  }

  notes.push(
      uiLanguage === 'th'
      ? `ชนิดของ section: ${getSectionLabel(uiLanguage, getResolvedSectionType(section))}`
      : `Section type: ${getSectionLabel(uiLanguage, getResolvedSectionType(section))}`
  );

  return notes;
};

const hasSectionAudio = (section: ResolvedLessonSection) => Boolean(section.audio_url || section.conversation_audio_url);

const normalizeHeaderImagePath = (rawValue: string | null) => {
  if (!rawValue) return null;
  let value = rawValue.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  value = value.replace(/^lesson-images\//i, '');
  value = value.replace(/^\/+/, '');
  value = value.split(/[?#]/)[0];
  if (!/^headers\//i.test(value) && !value.includes('/')) {
    value = `headers/${value}`;
  }
  if (!/\.[a-z0-9]+$/i.test(value)) {
    value = `${value}.webp`;
  }
  return value;
};

const resolveHeaderImageUrl = (rawValue: string | null) => {
  const normalized = normalizeHeaderImagePath(rawValue);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (!env.supabaseUrl) {
    return null;
  }
  return `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/lesson-images/${normalized}`;
};

export default function LessonDetailShellScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { height: windowHeight } = useWindowDimensions();

  const [lesson, setLesson] = useState<ResolvedLessonPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasStartedLesson, setHasStartedLesson] = useState(false);
  const [isBackstoryExpanded, setIsBackstoryExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!lessonId) {
        setErrorMessage(uiLanguage === 'th' ? 'ไม่พบ lesson id' : 'Missing lesson id.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const row = await fetchResolvedLesson(lessonId, uiLanguage);
        if (!isMounted) {
          return;
        }
        setLesson(row);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load lesson.';
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [lessonId, uiLanguage]);

  useEffect(() => {
    setActiveSectionIndex(0);
    setIsMenuOpen(false);
    setHasStartedLesson(false);
    setIsBackstoryExpanded(false);
  }, [lessonId]);

  const englishTitle = useMemo(() => {
    if (!lesson) return null;
    return lesson.title_en?.trim() || lesson.title?.trim() || lesson.title_th?.trim() || null;
  }, [lesson]);

  const thaiTitle = useMemo(() => {
    if (!lesson) return null;
    return lesson.title_th?.trim() || null;
  }, [lesson]);

  const resolvedFocus = useMemo(() => {
    if (!lesson) return null;
    return uiLanguage === 'th' ? lesson.focus_th || lesson.focus : lesson.focus || lesson.focus_th;
  }, [lesson, uiLanguage]);

  const resolvedBackstory = useMemo(() => {
    if (!lesson) return null;
    return (
      (uiLanguage === 'th'
        ? lesson.backstory_th || lesson.backstory || lesson.backstory_en
        : lesson.backstory_en || lesson.backstory || lesson.backstory_th) ?? null
    );
  }, [lesson, uiLanguage]);

  const headerImageUrl = useMemo(
    () => lesson?.header_image_url ?? resolveHeaderImageUrl(lesson?.header_image_path ?? lesson?.header_img ?? null),
    [lesson?.header_image_path, lesson?.header_image_url, lesson?.header_img]
  );
  const lessonTabs = useMemo(() => buildLessonTabs(lesson), [lesson]);
  const activeTab = lessonTabs[activeSectionIndex] ?? null;
  const activeSection = activeTab?.section ?? null;
  const activeSectionTitle = useMemo(
    () => (activeTab ? getSectionTitle(uiLanguage, activeTab.type, activeSectionIndex) : null),
    [activeSectionIndex, activeTab, uiLanguage]
  );
  const activeSectionNotes = useMemo(
    () => (activeSection ? getSectionNotes(uiLanguage, activeSection) : []),
    [activeSection, uiLanguage]
  );
  const activeSectionEyebrow = useMemo(
    () =>
      uiLanguage === 'th'
        ? `ส่วนที่ ${activeSectionIndex + 1}`
        : `Section ${activeSectionIndex + 1}`,
    [activeSectionIndex, uiLanguage]
  );
  const activeSectionTypeLabel = useMemo(
    () => (activeTab ? getSectionLabel(uiLanguage, activeTab.type) : null),
    [activeTab, uiLanguage]
  );
  const sectionCount = lessonTabs.length;
  const progressRatio = sectionCount > 0 ? (activeSectionIndex + 1) / sectionCount : 0;
  const progressWidthStyle = useMemo(() => ({ width: `${progressRatio * 100}%` as const }), [progressRatio]);
  const isLastSection = activeSectionIndex >= sectionCount - 1;
  const primaryActionLabel =
    sectionCount === 0
      ? uiLanguage === 'th'
        ? 'กลับไปหน้าปกบทเรียน'
        : 'Back to lesson cover'
      : uiLanguage === 'th'
        ? isLastSection
          ? 'กลับไปหน้าปกบทเรียน'
          : 'ไปยังส่วนถัดไป'
        : isLastSection
          ? 'Back to lesson cover'
          : 'Next Section';
  const sectionCounterLabel =
    sectionCount === 0
      ? uiLanguage === 'th'
        ? 'ยังไม่มี sections'
        : 'No sections yet'
      : uiLanguage === 'th'
        ? `${activeSectionIndex + 1} จาก ${sectionCount} ส่วน`
        : `${activeSectionIndex + 1} of ${sectionCount} sections`;
  const sectionMenuLabel = uiLanguage === 'th' ? 'สารบัญบทเรียน' : 'Lesson sections';
  const startLessonLabel = uiLanguage === 'th' ? 'เริ่มบทเรียน' : 'Start lesson';
  const coverMinHeight = Math.max(windowHeight || 0, 720);
  const backToLibraryLabel = uiLanguage === 'th' ? 'กลับไปคลังบทเรียน' : 'Back to lesson library';
  const backstoryToggleLabel = isBackstoryExpanded
    ? uiLanguage === 'th'
      ? 'ซ่อน backstory'
      : 'Hide backstory'
    : uiLanguage === 'th'
      ? 'ดู backstory'
      : 'Show backstory';
  const richContentBlockCount = activeSection
    ? Math.max(
        Array.isArray(activeSection.content_jsonb) ? activeSection.content_jsonb.length : 0,
        Array.isArray(activeSection.content_jsonb_th) ? activeSection.content_jsonb_th.length : 0
      )
    : 0;

  return (
    <View style={styles.screen}>
      <RouterStack.Screen options={{ headerShown: false }} />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : null}

      {!isLoading && errorMessage ? (
        <View style={styles.errorWrap}>
          <Card padding="md" radius="md">
            <AppText language={uiLanguage} variant="body" style={styles.errorText}>
              {errorMessage}
            </AppText>
          </Card>
        </View>
      ) : null}

      {!isLoading && !errorMessage && lesson ? (
        <View style={styles.lessonContainer}>
          {!hasStartedLesson ? (
            <View style={[styles.fullScreenCover, { minHeight: coverMinHeight }]}>
              <View style={styles.coverImage}>
                {headerImageUrl ? (
                  <Image
                    source={{ uri: headerImageUrl }}
                    contentFit="contain"
                    contentPosition="center"
                    style={styles.coverRemoteImage}
                  />
                ) : null}

                <View style={styles.coverFallbackArt}>
                  {!headerImageUrl ? (
                    <>
                      <View style={styles.coverFallbackFill} />
                      <View style={styles.coverArtCircleLarge} />
                      <View style={styles.coverArtCircleSmall} />
                      <View style={styles.coverArtCircleMedium} />
                    </>
                  ) : null}
                </View>

                <View style={styles.coverOverlay} />

                <View style={styles.coverContent}>
                    <View style={styles.coverTopMetaRow}>
                    <View style={styles.coverTopBar}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={backToLibraryLabel}
                        onPress={() => router.push('/lessons')}
                        style={styles.backButton}>
                        <AppText language={uiLanguage} variant="body" style={styles.backButtonText}>
                          ←
                        </AppText>
                      </Pressable>

                      <View style={styles.heroMetaGroup}>
                        <AppText language={uiLanguage} variant="caption" style={styles.metaText}>
                          {uiLanguage === 'th' ? 'บทเรียน' : 'Lesson'} {lesson.lesson_order ?? '-'}
                        </AppText>
                        <AppText language={uiLanguage} variant="caption" style={styles.stagePill}>
                          {sectionCount} {uiLanguage === 'th' ? 'ส่วนของบทเรียน' : 'lesson sections'}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.coverBottomPanel}>
                    <Stack gap="sm">
                      {lesson.stage ? (
                        <AppText language={uiLanguage} variant="caption" style={styles.coverStageLabel}>
                          {lesson.stage}
                        </AppText>
                      ) : null}

                      <AppText language="en" variant="title" style={styles.coverTitle}>
                        {englishTitle ?? 'Untitled lesson'}
                      </AppText>

                      {thaiTitle ? (
                        <AppText language="th" variant="body" style={styles.coverThaiTitle}>
                          {thaiTitle}
                        </AppText>
                      ) : null}

                      {resolvedBackstory ? (
                        <View style={styles.coverBackstoryBlock}>
                          <AppText
                            language={uiLanguage}
                            variant="muted"
                            style={styles.coverBackstory}
                            numberOfLines={isBackstoryExpanded ? undefined : 2}>
                            {resolvedBackstory}
                          </AppText>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setIsBackstoryExpanded((prev) => !prev)}
                            style={styles.backstoryToggle}>
                            <AppText language={uiLanguage} variant="caption" style={styles.backstoryToggleText}>
                              {`${backstoryToggleLabel} ${isBackstoryExpanded ? '▴' : '▾'}`}
                            </AppText>
                          </Pressable>
                        </View>
                      ) : null}
                    </Stack>

                    {resolvedFocus ? (
                      <View style={styles.coverFocusBlock}>
                        <AppText language={uiLanguage} variant="caption" style={styles.coverFocusEyebrow}>
                          {uiLanguage === 'th' ? 'Lesson Focus' : 'Lesson Focus'}
                        </AppText>
                        <AppText language={uiLanguage} variant="body" style={styles.coverFocusText}>
                          {resolvedFocus}
                        </AppText>
                      </View>
                    ) : null}

                    <Button
                      language={uiLanguage}
                      title={startLessonLabel}
                      onPress={() => setHasStartedLesson(true)}
                      style={styles.coverStartButton}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.stepperScreen}>
              <ScrollView
                contentContainerStyle={styles.stepperScrollContent}
                showsVerticalScrollIndicator={false}
                style={styles.stepperScrollView}>
                <View style={styles.stepperInner}>
                <View style={styles.stepperTopBar}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsMenuOpen(true)}
                    style={styles.stepperMenuButton}>
                    <AppText language={uiLanguage} variant="body" style={styles.menuButtonText}>
                      ≡
                    </AppText>
                  </Pressable>

                  <View style={styles.stepperProgressBlock}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, progressWidthStyle]} />
                    </View>
                    <View style={styles.progressRow}>
                      <AppText language={uiLanguage} variant="caption" style={styles.progressLabel}>
                        {sectionCounterLabel}
                      </AppText>
                      <AppText language={uiLanguage} variant="caption" style={styles.progressLabel}>
                        {activeSectionTypeLabel ?? sectionMenuLabel}
                      </AppText>
                    </View>
                  </View>
                </View>

                <Card padding="lg" radius="lg" style={styles.sectionCard}>
                  <Stack gap="md">
                    <View style={styles.sectionCardHeader}>
                      <View style={styles.sectionEyebrow}>
                        <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrowText}>
                          {activeSection ? activeSectionEyebrow : sectionMenuLabel}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.audioFlag,
                          activeSection && hasSectionAudio(activeSection) ? styles.audioFlagActive : styles.audioFlagMuted,
                        ]}>
                        <AppText language={uiLanguage} variant="caption" style={styles.audioFlagText}>
                          {activeTab
                            ? activeSection && hasSectionAudio(activeSection)
                              ? uiLanguage === 'th'
                                ? 'มีเสียง'
                                : 'Audio ready'
                              : uiLanguage === 'th'
                                ? 'ยังไม่มีเสียง'
                                : 'No audio yet'
                            : uiLanguage === 'th'
                              ? 'ยังไม่มี section'
                              : 'No section yet'}
                        </AppText>
                      </View>
                    </View>

                    <Stack gap="sm">
                      <AppText language={uiLanguage} variant="title" style={styles.sectionTitle}>
                        {activeSectionTitle ??
                          (uiLanguage === 'th' ? 'ยังไม่มี section ให้แสดง' : 'No lesson section is available yet')}
                      </AppText>
                      <AppText language={uiLanguage} variant="body" style={styles.sectionBody}>
                        {activeSection
                          ? uiLanguage === 'th'
                            ? 'เราโหลดข้อมูลของ section นี้แล้ว แต่จะยังไม่แสดง raw content หรือ content_jsonb ตรงนี้จนกว่าจะมี native renderer ที่เหมาะสม'
                            : 'This section is loaded, but we are intentionally not rendering raw content or content_jsonb here until the native renderer is ready.'
                          : uiLanguage === 'th'
                            ? 'ส่วนนี้มีข้อมูลใน resolved lesson payload แล้ว แต่ยังต้องมี renderer เฉพาะทางสำหรับแสดงผล'
                            : 'This lesson tab exists in the resolved lesson payload, but it still needs a dedicated native renderer.'}
                      </AppText>
                    </Stack>

                    <Stack gap="sm">
                      {activeSectionNotes.map((note) => (
                        <View key={note} style={styles.noteRow}>
                          <View style={styles.noteBullet} />
                          <AppText language={uiLanguage} variant="body" style={styles.noteText}>
                            {note}
                          </AppText>
                        </View>
                      ))}
                    </Stack>

                    <View style={styles.placeholderBox}>
                      <Stack gap="xs">
                        <AppText language={uiLanguage} variant="caption" style={styles.placeholderEyebrow}>
                          {uiLanguage === 'th' ? 'renderer ถัดไป' : 'Renderer Next'}
                        </AppText>
                        <AppText language={uiLanguage} variant="body" style={styles.placeholderTitle}>
                          {activeSectionTypeLabel
                            ? uiLanguage === 'th'
                              ? `${activeSectionTypeLabel} พร้อมต่อเข้ากับ native rich renderer`
                              : `${activeSectionTypeLabel} is ready for native rich rendering`
                            : uiLanguage === 'th'
                              ? 'section renderer จะเข้ามาที่พื้นที่นี้'
                              : 'The section renderer will land in this study area.'}
                        </AppText>
                        <AppText language={uiLanguage} variant="muted" style={styles.placeholderBody}>
                          {activeSection
                            ? uiLanguage === 'th'
                              ? `โหลด rich nodes แล้วสูงสุด ${richContentBlockCount} block สำหรับ section นี้ ตอนนี้เหลือแค่แปล block เหล่านั้นเป็น native components`
                              : `The resolved payload is loaded for this section with up to ${richContentBlockCount} rich blocks. The remaining work is translating those blocks into native components.`
                            : activeTab
                              ? uiLanguage === 'th'
                                ? `${activeSectionTitle} มีข้อมูลพร้อมแล้วจาก resolved lesson payload แต่ renderer แบบ native สำหรับส่วนนี้ยังไม่ได้ต่อเข้ามา`
                              : `${activeSectionTitle} is already present in the resolved lesson payload, but the native renderer for this section is not wired in yet.`
                              : uiLanguage === 'th'
                                ? 'เมื่อ lesson มี sections จริงแล้ว พื้นที่นี้จะใช้แสดง rich content แบบ native'
                                : 'As soon as the lesson exposes section data, this area will host the native rich content flow.'}
                        </AppText>
                      </Stack>
                    </View>
                  </Stack>
                </Card>

                <View style={styles.footerButtonWrap}>
                  <Button
                    language={uiLanguage}
                    title={primaryActionLabel}
                    onPress={() => {
                      if (sectionCount === 0 || isLastSection) {
                        setHasStartedLesson(false);
                      } else {
                        setActiveSectionIndex((prev) => Math.min(prev + 1, sectionCount - 1));
                      }
                    }}
                    disabled={!activeTab && sectionCount === 0}
                    style={styles.footerButton}
                  />
                </View>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      ) : null}

      {!isLoading && !errorMessage && lesson && hasStartedLesson && isMenuOpen ? (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.menuBackdrop} onPress={() => setIsMenuOpen(false)} />
          <Card padding="md" radius="lg" style={styles.menuSheet}>
            <Stack gap="sm">
              <View style={styles.menuHeader}>
                <AppText language={uiLanguage} variant="body" style={styles.menuTitle}>
                  {sectionMenuLabel}
                </AppText>
                <Pressable accessibilityRole="button" onPress={() => setIsMenuOpen(false)} style={styles.menuCloseButton}>
                  <AppText language={uiLanguage} variant="body" style={styles.menuCloseButtonText}>
                    ×
                  </AppText>
                </Pressable>
              </View>

              {lessonTabs.map((tab, index) => {
                const isActive = index === activeSectionIndex;
                return (
                  <Pressable
                    key={tab.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setActiveSectionIndex(index);
                      setIsMenuOpen(false);
                    }}
                    style={[styles.menuItem, isActive ? styles.menuItemActive : null]}>
                    <View style={styles.menuItemIndex}>
                      <AppText language={uiLanguage} variant="caption" style={styles.menuItemIndexText}>
                        {index + 1}
                      </AppText>
                    </View>
                    <View style={styles.menuItemContent}>
                      <AppText language={uiLanguage} variant="body" style={styles.menuItemTitle}>
                        {getSectionTitle(uiLanguage, tab.type, index)}
                      </AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.menuItemMeta}>
                        {tab.section && hasSectionAudio(tab.section)
                          ? uiLanguage === 'th'
                            ? 'มีเสียง'
                            : 'Audio ready'
                          : getSectionLabel(uiLanguage, tab.type)}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </Stack>
          </Card>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  lessonContainer: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.primary,
  },
  fullScreenCover: {
    flex: 1,
    backgroundColor: theme.colors.text,
  },
  coverImage: {
    flex: 1,
    backgroundColor: '#D8DDE5',
  },
  coverRemoteImage: {
    position: 'absolute',
    top: 14,
    left: 18,
    right: 18,
    bottom: 360,
  },
  coverFallbackArt: {
    ...StyleSheet.absoluteFillObject,
  },
  coverFallbackFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DCEEFF',
  },
  coverArtCircleLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: theme.colors.accentMuted,
    right: -76,
    top: -14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverArtCircleSmall: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: '#BFDFFF',
    left: -30,
    bottom: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverArtCircleMedium: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFFFFF',
    right: 26,
    bottom: 220,
    borderWidth: 1,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 21, 31, 0.34)',
  },
  coverContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  coverTopMetaRow: {
    alignItems: 'flex-start',
  },
  coverTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  heroMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  stagePill: {
    color: theme.colors.surface,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surface,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backButtonText: {
    color: theme.colors.surface,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
  },
  coverBottomPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  coverStageLabel: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.semibold,
  },
  coverTitle: {
    color: theme.colors.text,
  },
  coverThaiTitle: {
    color: '#54565C',
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.md,
  },
  coverBackstoryBlock: {
    gap: theme.spacing.xs,
  },
  coverBackstory: {
    color: theme.colors.mutedText,
  },
  backstoryToggle: {
    alignSelf: 'flex-end',
    paddingTop: 2,
  },
  backstoryToggleText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    textDecorationLine: 'underline',
  },
  coverFocusBlock: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  coverFocusEyebrow: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
  },
  coverFocusText: {
    fontWeight: theme.typography.weights.medium,
  },
  coverStartButton: {
    minHeight: 56,
  },
  stepperScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stepperScrollView: {
    flex: 1,
  },
  stepperScrollContent: {
    flexGrow: 1,
  },
  stepperInner: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  stepperTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepperMenuButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
  },
  stepperProgressBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  progressLabel: {
    color: theme.colors.mutedText,
  },
  progressTrack: {
    height: 12,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.accentMuted,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
  },
  sectionCard: {
    minHeight: 520,
    justifyContent: 'space-between',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionEyebrow: {
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.warningSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  sectionEyebrowText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  audioFlag: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  audioFlagActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.border,
  },
  audioFlagMuted: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.border,
  },
  audioFlagText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  sectionTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  sectionBody: {
    color: theme.colors.text,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  noteBullet: {
    width: 10,
    height: 10,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
  },
  placeholderBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  placeholderEyebrow: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  placeholderTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  placeholderBody: {
    color: theme.colors.mutedText,
  },
  footerButtonWrap: {
    paddingTop: theme.spacing.xs,
  },
  footerButton: {
    minHeight: 56,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.18)',
  },
  menuSheet: {
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  menuTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  menuCloseButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  menuCloseButtonText: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.md,
    fontWeight: theme.typography.weights.semibold,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  menuItemActive: {
    backgroundColor: theme.colors.accentSurface,
  },
  menuItemIndex: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  menuItemIndexText: {
    fontWeight: theme.typography.weights.semibold,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  menuItemMeta: {
    color: theme.colors.mutedText,
  },
});
