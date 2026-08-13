import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getPlacementAudioUrl,
  getPlacementConversations,
  PlacementConversation,
} from '@/src/api/placement-test';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { theme } from '@/src/theme/theme';

export function PlacementTestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<PlacementConversation[]>([]);
  const [conversationOrder, setConversationOrder] = useState(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [resultLevel, setResultLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conversation = useMemo(
    () => conversations.find((item) => item.conversation_order === conversationOrder) ?? null,
    [conversationOrder, conversations]
  );
  const audioUrl = conversation ? getPlacementAudioUrl(conversation.audio_path) : null;
  const player = useAudioPlayer(audioUrl, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);
  const closePreview = () => router.replace('/(tabs)');

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
      return;
    }
    if (typeof outcome.level === 'number') {
      setResultLevel(outcome.level);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.sm }]}>
        <ResponsivePageShell>
          <Stack gap="md">
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ปิดแบบทดสอบวัดระดับ"
                hitSlop={12}
                onPress={closePreview}
                style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </Pressable>
              <AppText language="th" variant="title" style={styles.title}>
                แบบทดสอบวัดระดับ
              </AppText>
            </View>

            {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
            {error ? (
              <Card padding="lg" radius="lg">
                <AppText language="th" variant="body">{error}</AppText>
              </Card>
            ) : null}

            {resultLevel !== null ? (
              <Card padding="lg" radius="lg" style={styles.card}>
                <Stack gap="md">
                  <AppText language="th" variant="title">ผลลัพธ์ตัวอย่าง: ระดับ {resultLevel}</AppText>
                  <AppText language="th" variant="muted">
                    ระดับที่เหมาะสำหรับการเริ่มต้นของคุณ
                  </AppText>
                  <Button title="ปิดตัวอย่าง" language="th" onPress={closePreview} />
                </Stack>
              </Card>
            ) : conversation ? (
              <>
                <Card padding="lg" radius="lg" style={styles.card}>
                  <Stack gap="md">
                    <AppText language="th" variant="title">
                      บทสนทนาที่ {conversation.conversation_order} จาก 3
                    </AppText>
                    <Button
                      title={playerStatus.playing ? 'หยุดเสียงชั่วคราว' : 'เล่นเสียง'}
                      language="th"
                      variant="outline"
                      onPress={() => {
                        if (playerStatus.playing) {
                          player.pause();
                        } else {
                          if (playerStatus.didJustFinish) {
                            player.seekTo(0);
                          }
                          player.play();
                        }
                      }}
                    />
                  </Stack>
                </Card>

                {conversation.questions.map((question, questionIndex) => (
                  <Card key={question.id} padding="lg" radius="lg" style={styles.card}>
                    <Stack gap="sm">
                      <AppText language="th" variant="body" style={styles.question}>
                        {questionIndex + 1}. {question.promptTh ?? question.prompt}
                      </AppText>
                      {(question.choicesTh ?? question.choices).map((choice, choiceIndex) => {
                        const selected = answers[question.id] === choiceIndex;
                        return (
                          <Pressable
                            key={`${question.id}-${choiceIndex}`}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            onPress={() => setAnswers((current) => ({ ...current, [question.id]: choiceIndex }))}
                            style={[styles.choice, selected ? styles.choiceSelected : null]}>
                            <AppText language="th" variant="body">
                              {String.fromCharCode(65 + choiceIndex)}. {choice}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </Stack>
                  </Card>
                ))}

                <Button title="ส่งคำตอบ" language="th" onPress={submitConversation} />
              </>
            ) : null}
          </Stack>
        </ResponsivePageShell>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: { flex: 1 },
  card: { borderWidth: 1.5, borderColor: theme.colors.border },
  question: { fontWeight: theme.typography.weights.semibold },
  choice: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  choiceSelected: { backgroundColor: theme.colors.accentMuted, borderWidth: 2 },
});
