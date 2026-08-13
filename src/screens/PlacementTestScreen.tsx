import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';

import placementTestLoadingPailin from '@/assets/images/placement-test-loading-pailin.gif';
import placementTestPailinThumbsUp from '@/assets/images/placement-test-pailin-thumbs-up.webp';
import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';
import {
  getPlacementAudioUrl,
  getPlacementConversations,
  PlacementConversation,
} from '@/src/api/placement-test';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { LessonAudioTray } from '@/src/components/lesson/LessonAudioTray';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { theme } from '@/src/theme/theme';

const secondsToMillis = (seconds: number) => Math.max(0, seconds * 1000);
const MINIMUM_CALCULATION_TIME_MS = 3000;

const getLevelStageLabel = (level: number) => {
  if (level <= 4) return 'ระดับเริ่มต้น';
  if (level <= 8) return 'ระดับกลาง';
  return 'ระดับสูง';
};

const formatTime = (seconds: number) => {
  const wholeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, '0')}`;
};

export function PlacementTestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<PlacementConversation[]>([]);
  const [conversationOrder, setConversationOrder] = useState(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [resultLevel, setResultLevel] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultLessonId, setResultLessonId] = useState<string | null>(null);
  const [isResultLessonLoading, setIsResultLessonLoading] = useState(false);
  const [isResultButtonPressed, setIsResultButtonPressed] = useState(false);
  const [hasStartedAudio, setHasStartedAudio] = useState(false);
  const [audioRate, setAudioRate] = useState(1);
  const [introTrackWidth, setIntroTrackWidth] = useState(0);
  const [isNextPressed, setIsNextPressed] = useState(false);
  const delayedPlaybackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calculationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultReveal = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conversation = useMemo(
    () => conversations.find((item) => item.conversation_order === conversationOrder) ?? null,
    [conversationOrder, conversations]
  );
  const audioUrl = conversation ? getPlacementAudioUrl(conversation.audio_path) : null;
  const currentQuestion = conversation?.questions[questionIndex] ?? null;
  const player = useAudioPlayer(audioUrl, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);
  const closePreview = () => {
    if (delayedPlaybackRef.current) {
      clearTimeout(delayedPlaybackRef.current);
      delayedPlaybackRef.current = null;
    }
    if (calculationTimerRef.current) {
      clearTimeout(calculationTimerRef.current);
      calculationTimerRef.current = null;
    }
    player.pause();
    router.replace('/(tabs)');
  };
  const progressRatio = playerStatus.duration > 0
    ? Math.max(0, Math.min(1, playerStatus.currentTime / playerStatus.duration))
    : 0;

  const seekToRatio = (ratio: number) => {
    if (!playerStatus.duration) return;
    void player.seekTo(Math.max(0, Math.min(1, ratio)) * playerStatus.duration);
  };

  const skipAudio = (millis: number) => {
    const nextTime = Math.max(0, Math.min(playerStatus.duration || 0, playerStatus.currentTime + millis / 1000));
    void player.seekTo(nextTime);
  };

  const toggleAudio = () => {
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    if (playerStatus.didJustFinish || (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration)) {
      void player.seekTo(0);
    }
    player.play();
  };

  const startTestAudio = () => {
    setHasStartedAudio(true);
    if (delayedPlaybackRef.current) {
      clearTimeout(delayedPlaybackRef.current);
    }
    delayedPlaybackRef.current = setTimeout(() => {
      delayedPlaybackRef.current = null;
      toggleAudio();
    }, 1750);
  };

  const seekIntroTrack = (event: { nativeEvent: { locationX: number } }) => {
    if (introTrackWidth <= 0) return;
    seekToRatio(event.nativeEvent.locationX / introTrackWidth);
  };

  useEffect(() => {
    void getPlacementConversations()
      .then((rows) => {
        if (rows.length !== 3) {
          throw new Error(`Expected 3 placement conversations; found ${rows.length}.`);
        }
        setConversations(rows);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'ไม่สามารถโหลดแบบทดสอบวัดระดับได้');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (delayedPlaybackRef.current) {
        clearTimeout(delayedPlaybackRef.current);
      }
      if (calculationTimerRef.current) {
        clearTimeout(calculationTimerRef.current);
      }
    };
  }, []);

  const submitConversation = () => {
    if (!conversation) {
      return;
    }

    const unanswered = conversation.questions.some((question) => answers[question.id] === undefined);
    if (unanswered) {
      Alert.alert('แบบทดสอบวัดระดับ', 'กรุณาตอบคำถามทุกข้อก่อนดำเนินการต่อ');
      return;
    }

    const correctCount = conversation.questions.reduce(
      (count, question) => count + (answers[question.id] === question.correctChoice ? 1 : 0),
      0
    );
    const outcome = conversation.scoring_rules.find(
      (rule) => correctCount >= rule.minCorrect && correctCount <= rule.maxCorrect
    );

    if (!outcome) {
      Alert.alert('แบบทดสอบวัดระดับ', 'ไม่พบเกณฑ์คะแนนที่ตรงกับผลลัพธ์นี้');
      return;
    }

    player.pause();
    if (typeof outcome.nextConversation === 'number') {
      setConversationOrder(outcome.nextConversation);
      setQuestionIndex(0);
      setHasStartedAudio(false);
      return;
    }
    if (typeof outcome.level === 'number') {
      const level = outcome.level;
      setIsCalculating(true);
      setIsResultLessonLoading(true);
      setResultLessonId(null);

      void getLessonsIndex()
        .then((lessons) => {
          const firstLesson = lessons.find(
            (lesson) => lesson.level === level && lesson.lesson_order === 1
          );
          setResultLessonId(firstLesson?.id ?? null);
          if (firstLesson?.id) {
            prefetchResolvedLesson(firstLesson.id, 'th');
          }
        })
        .catch(() => setResultLessonId(null))
        .finally(() => setIsResultLessonLoading(false));

      calculationTimerRef.current = setTimeout(() => {
        calculationTimerRef.current = null;
        LayoutAnimation.configureNext({
          duration: 450,
          create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
          update: { type: LayoutAnimation.Types.easeInEaseOut },
        });
        setResultLevel(level);
        setIsCalculating(false);
        Animated.timing(resultReveal, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();
      }, MINIMUM_CALCULATION_TIME_MS);
    }
  };

  const openResultLesson = () => {
    if (!resultLessonId) return;
    router.replace({
      pathname: '/lessons/[id]',
      params: { id: resultLessonId, locked: '0' },
    });
  };

  const goToNextQuestion = () => {
    if (!conversation || !currentQuestion || answers[currentQuestion.id] === undefined) return;

    if (questionIndex < conversation.questions.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    submitConversation();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          !hasStartedAudio && resultLevel === null ? styles.listeningContent : null,
          isCalculating || resultLevel !== null ? styles.outcomeContent : null,
          { paddingTop: insets.top + theme.spacing.md },
        ]}
        showsVerticalScrollIndicator={false}>
        <ResponsivePageShell style={styles.pageShell}>
          <Stack gap="md">
            {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
            {error ? (
              <Card padding="lg" radius="lg">
                <AppText language="th" variant="body">
                  {error}
                </AppText>
              </Card>
            ) : null}

            {isCalculating || resultLevel !== null ? (
              <View style={[styles.outcomeSlot, isCalculating ? styles.calculatingOutcomeSlot : null]}>
                <View style={styles.outcomeCardWrap}>
                  <View pointerEvents="none" style={styles.outcomeCardShadow} />
                  <View style={[styles.outcomeCard, isCalculating ? styles.calculatingCard : styles.resultCard]}>
                    {isCalculating ? (
                      <View style={styles.calculatingContent}>
                      <Image
                        source={placementTestLoadingPailin}
                        style={styles.calculatingImage}
                        resizeMode="contain"
                      />
                      <AppText language="th" variant="body" style={styles.calculatingText}>
                        กำลังประเมินจุดเริ่มต้นของคุณ...
                      </AppText>
                      </View>
                    ) : resultLevel !== null ? (
                      <Animated.View
                        style={[
                          styles.resultContent,
                          {
                            opacity: resultReveal,
                            transform: [
                              {
                                translateY: resultReveal.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-12, 0],
                                }),
                              },
                            ],
                          },
                        ]}>
                        <Image
                          source={placementTestPailinThumbsUp}
                          style={styles.resultImage}
                          resizeMode="contain"
                        />
                        <AppText language="th" variant="muted" style={styles.resultEyebrow}>
                          จุดเริ่มต้นของคุณ
                        </AppText>
                        <AppText language="th" variant="title" style={styles.resultLevelTitle}>
                          ระดับ {resultLevel}
                        </AppText>
                        <AppText language="th" variant="body" style={styles.resultLevelSubtitle}>
                          {getLevelStageLabel(resultLevel)}
                        </AppText>

                        <AppText language="th" variant="body" style={styles.resultPrimer}>
                          {'ไพลินเพิ่งย้ายจากกรุงเทพฯ มาอยู่อินล็อก\nที่สวอนสวรรค์! ตอนนี้เธออยู่ที่งานปฐมนิเทศ\nของโรงเรียน ซึ่งเป็นสถานที่ที่เธอจะได้\nเจอเพื่อนนักเรียนแลกเปลี่ยนมากมาย!'}
                        </AppText>

                        <View style={styles.resultButtonWrap}>
                          <View
                            pointerEvents="none"
                            style={[
                              styles.resultButtonShadow,
                              isResultButtonPressed ? styles.resultButtonShadowPressed : null,
                            ]}
                          />
                          <Button
                            language="th"
                            title={isResultLessonLoading ? 'กำลังโหลด...' : 'เริ่มบทเรียนแรกของคุณ!'}
                            disabled={isResultLessonLoading || !resultLessonId}
                            disabledStyle={styles.resultButtonDisabledOpacity}
                            onPress={openResultLesson}
                            onPressIn={() => setIsResultButtonPressed(true)}
                            onPressOut={() => setIsResultButtonPressed(false)}
                            style={[
                              styles.resultButton,
                              isResultLessonLoading || !resultLessonId
                                ? styles.resultButtonDisabled
                                : null,
                              isResultButtonPressed ? styles.resultButtonPressed : null,
                            ]}
                            textStyle={styles.resultButtonText}
                          />
                        </View>

                        {!isResultLessonLoading && !resultLessonId ? (
                          <AppText language="th" variant="muted" style={styles.resultErrorText}>
                            ไม่พบบทเรียน กรุณาลองอีกครั้ง
                          </AppText>
                        ) : null}
                      </Animated.View>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : conversation && !hasStartedAudio ? (
              <View style={styles.audioCardWrap}>
                <View pointerEvents="none" style={styles.audioCardShadow} />
                <View style={styles.audioCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ปิดแบบทดสอบวัดระดับ"
                    hitSlop={12}
                    onPress={closePreview}
                    style={styles.audioCardCloseButton}>
                    <MaterialIcons name="close" size={31} color={theme.colors.text} />
                  </Pressable>

                  <AppText language="th" variant="title" style={styles.listenInstruction}>
                    {'ฟังบทสนทนา\nแล้วตอบคำถาม!'}
                  </AppText>

                  <View style={styles.audioControls}>
                    <View style={styles.mainPlayShadow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="เล่นบทสนทนา"
                        onPress={startTestAudio}
                        style={({ pressed }) => [styles.mainPlayButton, pressed ? styles.mainPlayButtonPressed : null]}>
                        <Svg width={48} height={52} viewBox="0 0 48 52">
                          <Polygon
                            points="13,4 45,26 13,48"
                            fill={theme.colors.surface}
                            stroke={theme.colors.border}
                            strokeWidth={1.75}
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </Pressable>
                    </View>
                  </View>

                  <View
                    onLayout={(event: LayoutChangeEvent) => setIntroTrackWidth(event.nativeEvent.layout.width)}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={seekIntroTrack}
                    onResponderMove={seekIntroTrack}
                    style={styles.introProgressTrack}>
                    <View style={styles.introProgressBase} />
                    <View style={[styles.introProgressFill, { width: `${progressRatio * 100}%` }]} />
                  </View>

                  <View style={styles.timeRow}>
                    <AppText language="en" variant="caption" style={styles.timeText}>
                      {formatTime(playerStatus.currentTime)}
                    </AppText>
                    <AppText language="en" variant="caption" style={styles.timeText}>
                      {formatTime(playerStatus.duration)}
                    </AppText>
                  </View>
                </View>
              </View>
            ) : conversation && currentQuestion ? (
              <View style={styles.questionCardWrap}>
                <View pointerEvents="none" style={styles.questionCardShadow} />
                <View style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <AppText language="th" variant="title" style={styles.questionHeaderTitle}>
                      แบบทดสอบวัดระดับ
                    </AppText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="ปิดแบบทดสอบวัดระดับ"
                      hitSlop={12}
                      onPress={closePreview}
                      style={styles.closeButton}>
                      <MaterialIcons name="close" size={28} color={theme.colors.text} />
                    </Pressable>
                  </View>

                  <View style={styles.questionProgressRow}>
                    <View style={styles.questionProgressTrack}>
                      <View
                        style={[
                          styles.questionProgressFill,
                          { width: `${((questionIndex + 1) / conversation.questions.length) * 100}%` },
                        ]}
                      />
                    </View>
                    <AppText language="en" variant="caption" style={styles.questionProgressText}>
                      {questionIndex + 1} / {conversation.questions.length}
                    </AppText>
                  </View>

                  <View style={styles.reassuranceBanner}>
                    <MaterialIcons name="lightbulb-outline" size={20} color="#727272" />
                    <AppText language="th" variant="body" style={styles.reassuranceText}>
                      ไม่ต้องเดานะ! ถ้าไม่แน่ใจ เลือก <AppText language="th" style={styles.reassuranceBold}>ไม่รู้</AppText> ได้เลย เพื่อผลการวัดระดับที่แม่นยำที่สุด
                    </AppText>
                  </View>

                  <AppText language="th" variant="title" style={styles.question}>
                    {currentQuestion.promptTh ?? currentQuestion.prompt}
                  </AppText>

                  <View style={styles.choicesList}>
                    {(currentQuestion.choicesTh ?? currentQuestion.choices).map((choice, choiceIndex) => {
                      const selected = answers[currentQuestion.id] === choiceIndex;
                      return (
                        <Pressable
                          key={`${currentQuestion.id}-${choiceIndex}`}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          onPress={() =>
                            setAnswers((current) => ({ ...current, [currentQuestion.id]: choiceIndex }))
                          }
                          style={[styles.choice, selected ? styles.choiceSelected : null]}>
                          <View style={[styles.choiceLetterWrap, selected ? styles.choiceLetterSelected : null]}>
                            <AppText language="en" variant="body" style={styles.choiceLetter}>
                              {String.fromCharCode(65 + choiceIndex)}
                            </AppText>
                          </View>
                          <AppText language="th" variant="body" style={styles.choiceText}>
                            {choice}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.nextButtonWrap}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.nextButtonShadow,
                        isNextPressed ? styles.nextButtonShadowPressed : null,
                      ]}
                    />
                    <Button
                      title="ถัดไป"
                      language="th"
                      disabled={answers[currentQuestion.id] === undefined}
                      disabledStyle={styles.nextButtonDisabledOpacity}
                      onPress={goToNextQuestion}
                      onPressIn={() => setIsNextPressed(true)}
                      onPressOut={() => setIsNextPressed(false)}
                      style={[
                        styles.nextButton,
                        answers[currentQuestion.id] === undefined ? styles.nextButtonDisabled : null,
                        isNextPressed ? styles.nextButtonPressed : null,
                      ]}
                      textStyle={styles.nextButtonText}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </Stack>
        </ResponsivePageShell>
      </ScrollView>

      {conversation && hasStartedAudio && !isCalculating && resultLevel === null ? (
        <View style={styles.audioTrayRegion}>
          <View style={[styles.audioTrayDock, { paddingBottom: insets.bottom }]}> 
            <LessonAudioTray
              language="th"
              title="แบบทดสอบวัดระดับ"
              statusLabel={playerStatus.playing ? 'กำลังเล่น' : 'หยุดชั่วคราว'}
              audioUrl={audioUrl}
              isPlaying={playerStatus.playing}
              isLoading={!playerStatus.isLoaded || playerStatus.isBuffering}
              currentMillis={secondsToMillis(playerStatus.currentTime)}
              durationMillis={secondsToMillis(playerStatus.duration)}
              rate={audioRate}
              showRateControl={false}
              onTogglePlay={toggleAudio}
              onSkip={skipAudio}
              onSeek={seekToRatio}
              onSetRate={(rate) => {
                setAudioRate(rate);
                player.setPlaybackRate(rate, 'medium');
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, paddingHorizontal: 12, paddingBottom: theme.spacing.xl },
  listeningContent: { justifyContent: 'center' },
  outcomeContent: { justifyContent: 'center' },
  pageShell: { width: '100%' },
  outcomeSlot: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  calculatingOutcomeSlot: { minHeight: 450 },
  outcomeCardWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    position: 'relative',
  },
  outcomeCardShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 6 }],
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.shadow,
  },
  outcomeCard: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  calculatingCard: {
    minHeight: 330,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 44,
  },
  calculatingContent: { alignItems: 'center' },
  calculatingImage: { width: 150, height: 150 },
  calculatingText: {
    marginTop: 24,
    color: theme.colors.accent,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  resultCard: { paddingHorizontal: 30, paddingTop: 28, paddingBottom: 30 },
  resultContent: { width: '100%', alignItems: 'center' },
  resultImage: { width: 112, height: 112 },
  resultEyebrow: {
    marginTop: 8,
    color: '#747474',
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  resultLevelTitle: {
    marginTop: 2,
    color: '#8AC832',
    fontFamily: theme.typography.fontFaces.th.bold,
    fontSize: 40,
    lineHeight: 50,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  resultLevelSubtitle: { color: '#8AC832', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  resultPrimer: { marginTop: 22, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  resultButtonWrap: { width: '100%', marginTop: 26, position: 'relative' },
  resultButtonShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 4 }, { translateY: 5 }],
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.shadow,
  },
  resultButtonShadowPressed: { opacity: 0 },
  resultButton: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.accent,
  },
  resultButtonPressed: { transform: [{ translateX: 4 }, { translateY: 5 }] },
  resultButtonDisabled: { backgroundColor: '#CFCFCF' },
  resultButtonDisabledOpacity: { opacity: 1 },
  resultButtonText: { fontSize: 14, lineHeight: 20, fontWeight: theme.typography.weights.medium },
  resultErrorText: { marginTop: 12, color: theme.colors.primary, textAlign: 'center' },
  audioCardWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    position: 'relative',
  },
  audioCardShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 5 }],
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.shadow,
  },
  audioCard: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 42,
    paddingBottom: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  audioCardCloseButton: {
    position: 'absolute',
    top: 14,
    right: 13,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    zIndex: 2,
  },
  listenInstruction: {
    fontFamily: theme.typography.fontFaces.th.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  audioControls: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  mainPlayShadow: {
    width: 100,
    height: 100,
    transform: [{ translateX: 2 }, { translateY: 3 }],
    borderRadius: 999,
    backgroundColor: theme.colors.shadow,
  },
  mainPlayButton: {
    width: 100,
    height: 100,
    transform: [{ translateX: -2 }, { translateY: -3 }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  mainPlayButtonPressed: { transform: [{ translateX: 0 }, { translateY: 0 }], opacity: 0.94 },
  introProgressTrack: {
    height: 4,
    width: '100%',
    marginTop: 26,
    borderRadius: 999,
    overflow: 'hidden',
  },
  introProgressBase: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.accentMuted },
  introProgressFill: { height: '100%', borderRadius: 999, backgroundColor: theme.colors.accent },
  timeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  timeText: { color: theme.colors.text, fontSize: 13, lineHeight: 17 },
  questionCardWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    position: 'relative',
  },
  questionCardShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 6 }],
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.shadow,
  },
  questionCard: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7C7',
  },
  questionHeaderTitle: {
    flex: 1,
    marginLeft: 44,
    fontFamily: theme.typography.fontFaces.th.bold,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  questionProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
  },
  questionProgressTrack: {
    flex: 1,
    height: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  questionProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#B8EC69',
  },
  questionProgressText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 14,
  },
  reassuranceBanner: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 17,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: '#FFF3F3',
  },
  reassuranceText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  reassuranceBold: {
    fontFamily: theme.typography.fontFaces.th.bold,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.bold,
  },
  card: { borderWidth: 1.5, borderColor: theme.colors.border },
  question: {
    marginTop: 20,
    paddingHorizontal: 12,
    fontFamily: theme.typography.fontFaces.th.bold,
    fontSize: 25,
    lineHeight: 33,
    fontWeight: theme.typography.weights.bold,
  },
  choicesList: { gap: 8, marginTop: 20 },
  choice: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.25,
    borderColor: theme.colors.border,
    borderRadius: 13,
    backgroundColor: theme.colors.surface,
  },
  choiceSelected: { backgroundColor: '#D8F3FF' },
  choiceLetterWrap: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#DFF1FF',
  },
  choiceLetterSelected: { backgroundColor: theme.colors.surface },
  choiceLetter: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: theme.typography.weights.semibold,
  },
  choiceText: { flex: 1, fontSize: 16, lineHeight: 23 },
  nextButtonWrap: { position: 'relative', marginTop: 24 },
  nextButtonShadow: {
    position: 'absolute',
    top: 5,
    right: -4,
    bottom: -5,
    left: 4,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.shadow,
  },
  nextButtonShadowPressed: { opacity: 0 },
  nextButton: {
    minHeight: 47,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.accent,
  },
  nextButtonDisabled: {
    backgroundColor: '#CFCFCF',
  },
  nextButtonDisabledOpacity: { opacity: 1 },
  nextButtonPressed: { transform: [{ translateX: 4 }, { translateY: 5 }] },
  nextButtonText: { fontSize: 14, lineHeight: 20, fontWeight: theme.typography.weights.medium },
  audioTrayRegion: {
    position: 'relative',
    zIndex: 2,
    marginTop: -28,
    backgroundColor: 'transparent',
  },
  audioTrayDock: {
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.surface,
    overflow: 'visible',
  },
});
