import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Image, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import fallbackImage from '@/assets/images/characters/pailin_blue_circle_right.webp';
import lockBlackImage from '@/assets/images/lock-black.png';
import {
  lessonHeaderBlueBlob,
  resolveLocalLessonHeaderImage,
} from '@/src/assets/lesson-header-images';
import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { env } from '@/src/config/env';
import { clearLessonLibraryAnchor } from '@/src/lib/lesson-library-selection';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

function headerImageUrl(raw: string | null) {
  let path = raw?.trim() || '';
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  path = path.replace(/^\/+/, '').replace(/^lesson-images\//i, '').split(/[?#]/)[0];
  if (!path.includes('/')) path = `headers/${path}`;
  if (!/\.[a-z0-9]+$/i.test(path)) path += '.webp';
  return env.supabaseUrl ? `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/lesson-images/${path}` : null;
}

export default function LessonPreviewScreen() {
  const params = useLocalSearchParams<{ id: string; libraryRoute?: string }>();
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership } = useAppSession();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [lesson, setLesson] = useState<LessonListItem | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const closing = useRef(false);
  const libraryRoute = params.libraryRoute === 'free-library' ? 'free-library' : 'library';
  const locked = !hasMembership && !isFree;
  const copy = uiLanguage === 'th' ? {
    lesson: 'บทเรียน', backstory: 'เรื่องราวเบื้องหลัง', start: 'เริ่มบทเรียน', upgrade: 'อัปเกรดเพื่อปลดล็อก!',
    dismiss: 'ปิดตัวอย่างบทเรียน', expand: 'อ่านเรื่องราวเพิ่มเติม', collapse: 'ย่อเรื่องราว',
    error: 'โหลดตัวอย่างบทเรียนไม่สำเร็จ', retry: 'ลองอีกครั้ง', untitled: 'ไม่มีชื่อบทเรียน',
  } : {
    lesson: 'Lesson', backstory: 'Backstory', start: 'Start lesson', upgrade: 'Upgrade to unlock!',
    dismiss: 'Dismiss lesson preview', expand: 'Read full backstory', collapse: 'Collapse backstory',
    error: 'Could not load this lesson preview.', retry: 'Try again', untitled: 'Untitled lesson',
  };
  const localized = (en: string | null, th: string | null) =>
    (uiLanguage === 'th' ? th?.trim() || en?.trim() : en?.trim() || th?.trim()) || '';
  const title = lesson ? localized(lesson.title, lesson.title_th) || copy.untitled : '';
  const focus = lesson ? localized(lesson.focus, lesson.focus_th) : '';
  const backstory = lesson ? localized(lesson.backstory, lesson.backstory_th) : '';
  const localHeaderImage = resolveLocalLessonHeaderImage(lesson?.header_img);
  const imageUrl = headerImageUrl(lesson?.header_img ?? null);
  const checkpoint = [lesson?.title, lesson?.title_th].some((value) => value?.toLowerCase().includes('checkpoint'));
  const number = lesson?.level != null ? `${lesson.level}.${checkpoint ? 'chp' : lesson.lesson_order ?? '–'}` : '–';

  useEffect(() => {
    let active = true;
    setLesson(null);
    setLoadError(false);
    setImageFailed(false);
    setExpanded(false);
    setCanExpand(false);
    void getLessonsIndex().then((lessons) => {
      if (!active) return;
      const selected = lessons.find((item) => item.id === params.id);
      if (!selected) throw new Error('Lesson not found');
      const first = lessons.filter((item) => item.stage === selected.stage && item.level === selected.level)
        .sort((a, b) => (a.lesson_order ?? Infinity) - (b.lesson_order ?? Infinity))[0];
      const free = first?.id === selected.id;
      setIsFree(free);
      setLesson(selected);
      if (hasMembership || free) prefetchResolvedLesson(selected.id, 'en');
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [params.id, retry, hasMembership]);

  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220, mass: 1 }).start();
  }, [translateY]);

  const leave = useCallback((action?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) { closing.current = false; return; }
      if (action) {
        action();
      } else {
        // The library is still mounted; don't scroll the tapped card to the top on dismissal.
        clearLessonLibraryAnchor();
        if (router.canGoBack()) router.back();
        else router.replace(libraryRoute === 'free-library' ? '/(tabs)/lessons/free-library' : '/(tabs)/lessons/library');
      }
    });
  }, [height, libraryRoute, router, translateY]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { leave(); return true; });
    return () => subscription.remove();
  }, [leave]);

  const drag = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => { if (!closing.current) translateY.setValue(Math.max(0, gesture.dy)); },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 70 || gesture.vy > 0.7) leave();
      else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start(),
  }), [leave, translateY]);

  return (
    <View style={styles.screen} accessibilityViewIsModal onAccessibilityEscape={() => leave()}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: translateY.interpolate({ inputRange: [0, height], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.dismiss} onPress={() => leave()} style={styles.backdrop} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { maxHeight: height - insets.top - 16, transform: [{ translateY }] }]}>
        <View {...drag.panHandlers} style={styles.grabberArea}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.dismiss} onPress={() => leave()} hitSlop={10} style={styles.grabberTouch}>
            <View style={styles.grabber} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical
          onScrollEndDrag={({ nativeEvent }) => { if (nativeEvent.contentOffset.y < -65) leave(); }}>
          {!lesson ? (
            <View style={styles.loading}>
              {loadError ? (
                <>
                  <AppText language={uiLanguage}>{copy.error}</AppText>
                  <Button language={uiLanguage} title={copy.retry} onPress={() => setRetry((value) => value + 1)} style={styles.startButton} />
                </>
              ) : <ActivityIndicator color="#2860E8" />}
            </View>
          ) : (
            <>
              <View style={styles.artworkArea}>
                <View style={[styles.artworkComposition, { height: Math.min(190, height * 0.23, width * 0.48) }]}>
                  {localHeaderImage ? (
                    <Image
                      source={lessonHeaderBlueBlob}
                      resizeMode="contain"
                      style={styles.artworkLayer}
                      accessible={false}
                    />
                  ) : null}
                  <Image
                    source={localHeaderImage ?? (imageUrl && !imageFailed ? { uri: imageUrl } : fallbackImage)}
                    resizeMode="contain"
                    onError={() => setImageFailed(true)}
                    style={styles.artworkLayer}
                    accessible={false}
                  />
                </View>
                {locked ? <Image source={lockBlackImage} resizeMode="contain" style={styles.lock} accessibilityLabel={copy.upgrade} /> : null}
              </View>
              <View style={styles.lessonCopy}>
                <AppText language={uiLanguage} variant="caption" style={styles.eyebrow}>{copy.lesson} {number}</AppText>
                <AppText language={uiLanguage} variant="title" style={[styles.title, { fontFamily: theme.typography.fontFaces[uiLanguage].bold }]}>{title}</AppText>
                {focus ? <AppText language={uiLanguage} variant="muted" style={styles.focus}>{focus}</AppText> : null}
              </View>
              {backstory ? (
                <View style={[styles.backstory, locked ? styles.lockedBackstory : null]}>
                  <Pressable disabled={!canExpand} accessibilityRole={canExpand ? 'button' : undefined}
                    accessibilityLabel={canExpand ? (expanded ? copy.collapse : copy.expand) : copy.backstory}
                    accessibilityState={canExpand ? { expanded } : undefined}
                    onPress={() => setExpanded((value) => !value)} style={styles.backstoryHeader}>
                    <AppText language={uiLanguage} variant="caption" style={[styles.eyebrow, styles.backstoryLabel]}>{copy.backstory}</AppText>
                    {canExpand ? <MaterialIcons name={expanded ? 'remove' : 'add'} size={20} color={theme.colors.text} /> : null}
                  </Pressable>
                  <View>
                    <AppText key={`${backstory}-${width}`} language={uiLanguage} variant="muted" accessible={false}
                      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                      style={[styles.storyText, styles.measurement]} onTextLayout={({ nativeEvent }) => setCanExpand(nativeEvent.lines.length > 3)}>{backstory}</AppText>
                    <AppText language={uiLanguage} variant="muted" numberOfLines={expanded ? undefined : 3} ellipsizeMode="tail" style={styles.storyText}>{backstory}</AppText>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
        {lesson ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Button language={uiLanguage} title={locked ? copy.upgrade : copy.start}
              style={[styles.startButton, locked ? styles.upgradeButton : null]}
              textStyle={[styles.buttonText, locked ? styles.upgradeText : null]}
              onPress={() => {
                if (locked) {
                  prefetchPricing();
                  leave(() => router.replace('/(tabs)/account/membership'));
                } else {
                  leave(() => router.replace({ pathname: '/lessons/[id]', params: { id: lesson.id, libraryRoute, overview: '1' } }));
                }
              }} />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { width: '100%', maxWidth: 680, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  grabberArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  grabberTouch: { minHeight: 28, minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 64, height: 4, borderRadius: 2, backgroundColor: '#D9D9D9' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 8, gap: 18 },
  loading: { minHeight: 220, justifyContent: 'center', alignItems: 'center', gap: 16 },
  artworkArea: { position: 'relative', paddingHorizontal: 16 },
  artworkComposition: { position: 'relative', width: '100%' },
  artworkLayer: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  lock: { position: 'absolute', top: 0, left: 8, width: 30, height: 30 },
  lessonCopy: { gap: 6, paddingHorizontal: 12 },
  eyebrow: { fontSize: 10, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 24, lineHeight: 30 },
  focus: { fontSize: 14, lineHeight: 21, color: '#666666' },
  backstory: { backgroundColor: '#FFFCE5', borderWidth: 1, borderColor: '#333333', borderRadius: 10, padding: 12, paddingTop: 7, gap: 4 },
  backstoryLabel: { fontSize: 11, lineHeight: 17 },
  lockedBackstory: { backgroundColor: '#F0F0F0' },
  backstoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  storyText: { fontSize: 11, lineHeight: 17, color: '#333333' },
  measurement: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  footer: { paddingTop: 10, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  startButton: { minHeight: 44, backgroundColor: '#2860E8', shadowColor: '#1E1E1E', shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  upgradeButton: { backgroundColor: '#F9DA60' },
  buttonText: { fontSize: 12, lineHeight: 18, textTransform: 'uppercase' },
  upgradeText: { color: '#1E1E1E' },
});
