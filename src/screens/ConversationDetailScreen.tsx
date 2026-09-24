import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import listenLeftAvatar from '@/assets/images/characters/pailin_blue_circle.webp';
import listenRightAvatar from '@/assets/images/characters/chloe_blue_circle.webp';
import { fetchConversationLibraryDetail, fetchLessonAudioUrls, getConversationLibrary } from '@/src/api/lessons';
import { resolveTranscriptCharacterBlueCircle } from '@/src/assets/transcript-character-heads';
import { LessonListenPage } from '@/src/components/lesson/LessonListenPage';
import { LessonAudioTray } from '@/src/components/lesson/LessonAudioTray';
import { LessonTranscriptPage } from '@/src/components/lesson/LessonTranscriptPage';
import { AppText } from '@/src/components/ui/AppText';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import type { ConversationLibraryDetail, ConversationLibraryLesson } from '@/src/types/lesson';

type Mode = 'listen' | 'transcript';
const secondsToMillis = (seconds: number) => Math.max(0, Math.round(seconds * 1000));
const millisToSeconds = (millis: number) => Math.max(0, millis / 1000);
const lessonSort = (a: ConversationLibraryLesson, b: ConversationLibraryLesson) =>
  (a.level ?? 0) - (b.level ?? 0) || (a.lesson_order ?? 999) - (b.lesson_order ?? 999);

export function ConversationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { hasMembership, isLoading: sessionLoading } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const [mode, setMode] = useState<Mode>('listen');
  const [lesson, setLesson] = useState<ConversationLibraryDetail | null>(null);
  const [library, setLibrary] = useState<ConversationLibraryLesson[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    if (!lessonId) {
      setError('Conversation not found.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    void Promise.all([fetchConversationLibraryDetail(lessonId), getConversationLibrary()])
      .then(async ([detail, rows]) => {
        const urls = await fetchLessonAudioUrls(detail);
        if (!active) return;
        setLesson(detail);
        setLibrary([...rows].sort(lessonSort));
        setAudioUrl(urls.main);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this conversation.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId]);

  useEffect(() => {
    let active = true;
    const oldPlayer = playerRef.current;
    playerRef.current = null;
    try { oldPlayer?.remove(); } catch { /* already released */ }
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);
    if (!audioUrl) return () => { active = false; };

    setIsAudioLoading(true);
    try {
      const player = createAudioPlayer(audioUrl, { updateInterval: 500 });
      player.setPlaybackRate(1, 'medium');
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!active || !status.isLoaded) return;
        setIsAudioLoading(false);
        setIsPlaying(status.playing);
        setPositionMillis(secondsToMillis(status.currentTime));
        setDurationMillis(secondsToMillis(status.duration));
      });
      playerRef.current = player;
      return () => {
        active = false;
        subscription.remove();
        if (playerRef.current === player) playerRef.current = null;
        try { player.remove(); } catch { /* already released */ }
      };
    } catch {
      setIsAudioLoading(false);
      return () => { active = false; };
    }
  }, [audioUrl]); // Playback rate changes are applied by the dedicated effect below.

  useEffect(() => {
    if (playerRef.current?.isLoaded) playerRef.current.setPlaybackRate(rate, 'medium');
  }, [rate]);

  const currentIndex = useMemo(() => library.findIndex((item) => item.id === lessonId), [lessonId, library]);
  const previous = currentIndex > 0 ? library[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < library.length - 1 ? library[currentIndex + 1] : null;
  const lessonNumber = lesson?.lesson_external_id ?? (lesson ? `${lesson.level}.${lesson.lesson_order}` : '');
  const title = lesson ? ((uiLanguage === 'th' ? lesson.title_th ?? lesson.title : lesson.title) ?? '') : '';
  const focus = lesson ? ((uiLanguage === 'th' ? lesson.focus_th ?? lesson.focus : lesson.focus) ?? null) : null;
  const backstory = lesson ? ((uiLanguage === 'th' ? lesson.backstory_th ?? lesson.backstory : lesson.backstory) ?? null) : null;

  const speakers = useMemo(() => {
    if (!lesson) return [];
    const seen = new Set<string>();
    const result: { name: string; image: ImageSourcePropType }[] = [];
    for (const line of lesson.transcript) {
      const speaker = String(line.speaker ?? '').trim();
      const text = String(line.line_text ?? '').trim();
      const key = speaker.toLocaleLowerCase();
      if (!key || seen.has(key) || /^(?:\.{3,}|…+)$/.test(text)) continue;
      const image = resolveTranscriptCharacterBlueCircle(speaker, lessonNumber);
      if (image === null) continue;
      result.push({
        name: uiLanguage === 'th' ? String(line.speaker_th ?? '').trim() || speaker : speaker,
        image: image ?? (result.length === 0 ? listenLeftAvatar : listenRightAvatar),
      });
      seen.add(key);
    }
    return result;
  }, [lesson, lessonNumber, uiLanguage]);

  const navigateTo = (target: ConversationLibraryLesson | null) => {
    if (!target) return;
    playerRef.current?.pause();
    setMode('listen');
    router.replace({ pathname: '/conversations/[id]', params: { id: target.id } });
  };

  const toggleAudio = () => {
    const player = playerRef.current;
    if (!player?.isLoaded) return;
    if (player.playing) {
      player.pause();
      return;
    }
    if (durationMillis > 0 && positionMillis >= durationMillis - 250) void player.seekTo(0);
    player.play();
  };

  const skipAudio = (delta: number) => {
    const player = playerRef.current;
    if (!player?.isLoaded) return;
    void player.seekTo(millisToSeconds(Math.max(0, Math.min(durationMillis, positionMillis + delta))));
  };

  const seekAudio = (ratio: number) => {
    const player = playerRef.current;
    if (player?.isLoaded) void player.seekTo(millisToSeconds(durationMillis * ratio));
  };

  if (!sessionLoading && !hasMembership) return <Redirect href="/(tabs)/account/membership" />;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ResponsivePageShell style={styles.shell}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.titleRow}>
            <View style={styles.closeSpacer} />
            <AppText language={uiLanguage} variant="body" style={styles.lessonLabel}>
              {uiLanguage === 'th' ? `บทเรียน ${lessonNumber}` : `Lesson ${lessonNumber}`}
            </AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close conversation" onPress={() => router.replace('/(tabs)/resources/conversations')} style={styles.closeButton}>
              <MaterialIcons name="close" size={25} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.navigationRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous conversation" disabled={!previous} onPress={() => navigateTo(previous)} style={[styles.lessonNav, !previous ? styles.disabled : null]}>
              <MaterialIcons name="chevron-left" size={24} color={theme.colors.text} />
              <AppText variant="caption" style={styles.navLabel}>{previous?.lesson_external_id ?? ''}</AppText>
            </Pressable>

            <View style={styles.modeSelector}>
              {(['listen', 'transcript'] as const).map((value) => {
                const selected = mode === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setMode(value)}
                    style={[
                      styles.modeButton,
                      selected ? styles.modeButtonActive : null,
                      selected ? (value === 'listen' ? styles.activeListenButton : styles.activeTranscriptButton) : null,
                    ]}>
                    <AppText language={uiLanguage} variant="caption" style={[styles.modeText, selected ? styles.modeTextActive : null]}>
                      {value === 'listen' ? (uiLanguage === 'th' ? 'ฟัง' : 'Listen') : (uiLanguage === 'th' ? 'สคริปต์บท' : 'Transcript')}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Next conversation" disabled={!next} onPress={() => navigateTo(next)} style={[styles.lessonNav, styles.lessonNavRight, !next ? styles.disabled : null]}>
              <AppText variant="caption" style={styles.navLabel}>{next?.lesson_external_id ?? ''}</AppText>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />
        {loading ? <ActivityIndicator style={styles.loading} color={theme.colors.accent} /> : null}
        {error ? <AppText variant="body" style={styles.error}>{error}</AppText> : null}
        {!loading && !error && lesson ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, mode === 'transcript' ? styles.transcriptContent : null, { paddingBottom: Math.max(insets.bottom, 24) + (mode === 'transcript' ? 166 : 24) }]}>
            {mode === 'listen' ? (
              <LessonListenPage
                language={uiLanguage}
                title={title}
                focus={focus}
                backstory={backstory}
                speakers={speakers}
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                isLoading={isAudioLoading}
                currentMillis={positionMillis}
                durationMillis={durationMillis}
                rate={rate}
                onTogglePlay={toggleAudio}
                onSkip={skipAudio}
                onSeek={seekAudio}
                onSetRate={setRate}
              />
            ) : (
              <LessonTranscriptPage language={uiLanguage} lessonExternalId={lessonNumber} lines={lesson.transcript} />
            )}
          </ScrollView>
        ) : null}
        {!loading && !error && lesson && mode === 'transcript' ? (
          <View style={styles.audioTray}>
            <LessonAudioTray
              detached
              initiallyExpanded
              bottomInset={Math.max(insets.bottom, 10)}
              language={uiLanguage}
              title={title}
              lessonLabel={uiLanguage === 'th' ? `บทเรียน ${lessonNumber}` : `Lesson ${lessonNumber}`}
              statusLabel=""
              audioUrl={audioUrl}
              isPlaying={isPlaying}
              isLoading={isAudioLoading}
              currentMillis={positionMillis}
              durationMillis={durationMillis}
              rate={rate}
              onTogglePlay={toggleAudio}
              onSkip={skipAudio}
              onSeek={seekAudio}
              onSetRate={setRate}
            />
          </View>
        ) : null}
      </ResponsivePageShell>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FBFF' },
  shell: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#F8FBFF' },
  titleRow: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeSpacer: { width: 38 },
  lessonLabel: { fontSize: 16, lineHeight: 22, fontWeight: theme.typography.weights.bold },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  navigationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lessonNav: { width: 66, minHeight: 40, flexDirection: 'row', alignItems: 'center' },
  lessonNavRight: { justifyContent: 'flex-end' },
  navLabel: { fontSize: 12, lineHeight: 17 },
  disabled: { opacity: 0.22 },
  modeSelector: { flex: 1, maxWidth: 270, height: 40, flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, overflow: 'hidden', backgroundColor: theme.colors.surface },
  modeButton: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  modeButtonActive: { backgroundColor: '#BCECFF', borderWidth: 1, borderColor: theme.colors.border, marginVertical: -1 },
  activeListenButton: { marginLeft: -1 },
  activeTranscriptButton: { marginRight: -1 },
  modeText: { color: theme.colors.mutedText, fontSize: 12 },
  modeTextActive: { color: theme.colors.text, fontWeight: '800' },
  divider: { height: 1, marginHorizontal: 20, backgroundColor: '#C8CBD0' },
  content: { paddingHorizontal: 20, paddingTop: 18 },
  transcriptContent: { paddingTop: 18 },
  audioTray: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  loading: { marginTop: 80 },
  error: { margin: 24, color: theme.colors.error },
});
