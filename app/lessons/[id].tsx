import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack as RouterStack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { getLessonById } from '@/src/api/lessons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { env } from '@/src/config/env';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type LessonPreviewSection = {
  id: string;
  title: {
    en: string;
    th: string;
  };
  eyebrow: {
    en: string;
    th: string;
  };
  body: {
    en: string;
    th: string;
  };
  notes: {
    en: string[];
    th: string[];
  };
  hasAudio: boolean;
};

const PREVIEW_SECTIONS: LessonPreviewSection[] = [
  {
    id: 'listen',
    title: { en: 'Conversation', th: 'บทสนทนา' },
    eyebrow: { en: 'Section 1', th: 'ส่วนที่ 1' },
    body: {
      en: 'This first study screen would open with the real conversation section, but now it can do so after a dedicated cover moment instead of competing with a permanent oversized header.',
      th: 'หน้าศึกษาจริงหน้าแรกจะเริ่มด้วยบทสนทนาจริง แต่ตอนนี้มันทำได้หลังจากมีหน้าปกเฉพาะของตัวเอง แทนที่จะต้องแข่งขันกับ header ใหญ่ที่ติดค้างอยู่ตลอด',
    },
    notes: {
      en: ['Cleaner first impression', 'The cover does the branding work', 'Study mode can stay focused'],
      th: ['ความประทับใจแรกดูสะอาดขึ้น', 'หน้าปกรับหน้าที่ด้านแบรนด์แทน', 'โหมดเรียนจึงคงความโฟกัสได้'],
    },
    hasAudio: true,
  },
  {
    id: 'understand',
    title: { en: 'Understand', th: 'ทำความเข้าใจ' },
    eyebrow: { en: 'Section 2', th: 'ส่วนที่ 2' },
    body: {
      en: 'This is still the best proving ground for the native rich renderer. Real content_jsonb blocks would land here next, with much more vertical room than the old shell had.',
      th: 'ส่วนนี้ยังคงเป็นพื้นที่ที่ดีที่สุดสำหรับพิสูจน์ renderer แบบ native โดยตรง เพราะ content_jsonb จริงจะถูกใส่ที่นี่เป็นลำดับถัดไป และมีพื้นที่แนวตั้งมากกว่าหน้า shell เดิมอย่างชัดเจน',
    },
    notes: {
      en: ['More room for rich text', 'Progress stays small and clear', 'Perfect place to test real spacing'],
      th: ['มีพื้นที่มากขึ้นสำหรับ rich text', 'progress ยังเล็กและชัด', 'เหมาะมากกับการทดสอบระยะห่างจริง'],
    },
    hasAudio: true,
  },
  {
    id: 'phrases',
    title: { en: 'Phrases & Verbs', th: 'วลีและคำกริยา' },
    eyebrow: { en: 'Section 3', th: 'ส่วนที่ 3' },
    body: {
      en: 'The section menu can still jump here, but the lesson now feels like a guided session first and a document second, which is much closer to the product you want.',
      th: 'เมนูส่วนต่าง ๆ ยังสามารถพาผู้เรียนกระโดดมาที่นี่ได้ แต่ตอนนี้บทเรียนให้ความรู้สึกเหมือน session ที่มีคนนำทางก่อน และค่อยเป็นเอกสารทีหลัง ซึ่งใกล้กับภาพผลิตภัณฑ์ที่คุณต้องการมากกว่า',
    },
    notes: {
      en: ['Still flexible for power users', 'Much better for momentum', 'Less visual clutter at the top'],
      th: ['ยังยืดหยุ่นสำหรับผู้ใช้ที่เก่งแล้ว', 'ดีกว่ามากในแง่ momentum', 'ความรกทางสายตาด้านบนน้อยลง'],
    },
    hasAudio: true,
  },
  {
    id: 'practice',
    title: { en: 'Practice', th: 'ฝึกฝน' },
    eyebrow: { en: 'Section 4', th: 'ส่วนที่ 4' },
    body: {
      en: 'Quizzes and practice blocks can now feel like proper steps in the journey instead of being squeezed beneath a large reusable banner.',
      th: 'ควิซและแบบฝึกหัดสามารถกลายเป็น step ที่ชัดเจนในเส้นทางการเรียน แทนที่จะถูกบีบให้อยู่ใต้ banner ใหญ่ที่ใช้ซ้ำตลอดทั้งหน้า',
    },
    notes: {
      en: ['Better vertical rhythm', 'Cleaner CTA behavior', 'Easier to adapt section by section'],
      th: ['จังหวะแนวตั้งดีขึ้น', 'พฤติกรรมของปุ่ม CTA ชัดขึ้น', 'ปรับตามแต่ละ section ได้ง่ายกว่า'],
    },
    hasAudio: false,
  },
];

const pickLocalizedText = <T,>(uiLanguage: 'en' | 'th', values: { en: T; th: T }) =>
  uiLanguage === 'th' ? values.th : values.en;

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

  const [lesson, setLesson] = useState<LessonListItem | null>(null);
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
        const row = await getLessonById(lessonId);
        if (!isMounted) {
          return;
        }
        if (!row) {
          setErrorMessage(uiLanguage === 'th' ? 'ไม่พบบทเรียน' : 'Lesson not found.');
        } else {
          setLesson(row);
        }
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
    return lesson.title?.trim() || lesson.title_th?.trim() || null;
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
    return uiLanguage === 'th' ? lesson.backstory_th || lesson.backstory : lesson.backstory || lesson.backstory_th;
  }, [lesson, uiLanguage]);

  const headerImageUrl = useMemo(() => resolveHeaderImageUrl(lesson?.header_img ?? null), [lesson?.header_img]);
  const activeSection = PREVIEW_SECTIONS[activeSectionIndex] ?? PREVIEW_SECTIONS[0];
  const sectionCount = PREVIEW_SECTIONS.length;
  const progressRatio = sectionCount > 0 ? (activeSectionIndex + 1) / sectionCount : 0;
  const progressWidthStyle = useMemo(() => ({ width: `${progressRatio * 100}%` as const }), [progressRatio]);
  const isLastSection = activeSectionIndex >= sectionCount - 1;
  const primaryActionLabel =
    uiLanguage === 'th'
      ? isLastSection
        ? 'จบบทเรียนตัวอย่าง'
        : 'ไปยังส่วนถัดไป'
      : isLastSection
        ? 'Finish Preview'
        : 'Next Section';
  const sectionCounterLabel =
    uiLanguage === 'th'
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
                          {sectionCount} {uiLanguage === 'th' ? 'ส่วน' : 'sections'}
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
                        {pickLocalizedText(uiLanguage, activeSection.eyebrow)}
                      </AppText>
                    </View>
                  </View>
                </View>

                <Card padding="lg" radius="lg" style={styles.sectionCard}>
                  <Stack gap="md">
                    <View style={styles.sectionCardHeader}>
                      <View style={styles.sectionEyebrow}>
                        <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrowText}>
                          {pickLocalizedText(uiLanguage, activeSection.eyebrow)}
                        </AppText>
                      </View>
                      <View
                        style={[styles.audioFlag, activeSection.hasAudio ? styles.audioFlagActive : styles.audioFlagMuted]}>
                        <AppText language={uiLanguage} variant="caption" style={styles.audioFlagText}>
                          {activeSection.hasAudio ? 'Audio' : 'No audio'}
                        </AppText>
                      </View>
                    </View>

                    <Stack gap="sm">
                      <AppText language={uiLanguage} variant="title" style={styles.sectionTitle}>
                        {pickLocalizedText(uiLanguage, activeSection.title)}
                      </AppText>
                      <AppText language={uiLanguage} variant="body" style={styles.sectionBody}>
                        {pickLocalizedText(uiLanguage, activeSection.body)}
                      </AppText>
                    </Stack>

                    <Stack gap="sm">
                      {pickLocalizedText(uiLanguage, activeSection.notes).map((note) => (
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
                          {uiLanguage === 'th' ? 'ขั้นถัดไป' : 'Next Build Step'}
                        </AppText>
                        <AppText language={uiLanguage} variant="body" style={styles.placeholderTitle}>
                          {uiLanguage === 'th'
                            ? 'ตรงนี้จะใส่ rich section จริงจาก resolved payload'
                            : 'This block will host the first real rich section from the resolved payload.'}
                        </AppText>
                        <AppText language={uiLanguage} variant="muted" style={styles.placeholderBody}>
                          {uiLanguage === 'th'
                            ? 'ตอนนี้เราใช้ layout เต็มหน้าจอของ intro page ก่อน แล้วค่อยย้ายไปทำ renderer จริงในพื้นที่นี้'
                            : 'We are locking in the full-screen intro first, then we will move into real resolved content rendering in this study area.'}
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
                      if (!isLastSection) {
                        setActiveSectionIndex((prev) => Math.min(prev + 1, sectionCount - 1));
                      }
                    }}
                    style={styles.footerButton}
                  />
                </View>
              </View>
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

              {PREVIEW_SECTIONS.map((section, index) => {
                const isActive = index === activeSectionIndex;
                return (
                  <Pressable
                    key={section.id}
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
                        {pickLocalizedText(uiLanguage, section.title)}
                      </AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.menuItemMeta}>
                        {section.hasAudio
                          ? uiLanguage === 'th'
                            ? 'มีเสียงประกอบ'
                            : 'Includes audio'
                          : uiLanguage === 'th'
                            ? 'เนื้อหาแบบฝึก'
                            : 'Practice-focused'}
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
  stepperInner: {
    flex: 1,
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
