import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';

import transcriptLeftAvatar from '@/assets/images/characters/pailin-blue-right.png';
import transcriptRightAvatar from '@/assets/images/characters/chloe-friend-blue-left.png';
import { resolveTranscriptCharacterHead } from '@/src/assets/transcript-character-heads';
import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';
import type { ResolvedLessonTranscriptLine } from '@/src/types/lesson';

type Props = {
  language: 'en' | 'th';
  lessonExternalId: string;
  lines: ResolvedLessonTranscriptLine[];
};

type TranscriptLine = {
  id: string;
  sortOrder: number;
  speaker: string;
  speakerTh: string;
  englishLine: string;
  thaiLine: string;
};

const isDivider = (line: TranscriptLine) =>
  [line.englishLine, line.thaiLine].some((text) => /^(?:\.{3,}|…+)$/.test(text.trim()));

export function LessonTranscriptPage({ language, lessonExternalId, lines }: Props) {
  const normalizedLines = useMemo<TranscriptLine[]>(() => lines
    .map((line, index) => ({
      id: String(line.id ?? `transcript-${index + 1}`),
      sortOrder: Number(line.sort_order ?? index + 1),
      speaker: String(line.speaker ?? '').trim(),
      speakerTh: String(line.speaker_th ?? '').trim(),
      englishLine: String(line.line_text ?? '').trim(),
      thaiLine: String(line.line_text_th ?? '').trim(),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder), [lines]);

  const sides = useMemo(() => {
    const sideBySpeaker = new Map<string, 'left' | 'right'>();
    const sideByLineId: Record<string, 'left' | 'right'> = {};
    let nextSide: 'left' | 'right' = 'left';
    normalizedLines.forEach((line) => {
      if (isDivider(line)) return;
      const key = line.speaker.toLocaleLowerCase() || `line:${line.id}`;
      const side = sideBySpeaker.get(key) ?? nextSide;
      if (!sideBySpeaker.has(key)) {
        sideBySpeaker.set(key, side);
        nextSide = nextSide === 'left' ? 'right' : 'left';
      }
      sideByLineId[line.id] = side;
    });
    return sideByLineId;
  }, [normalizedLines]);

  return (
    <View style={styles.conversation}>
      {normalizedLines.map((line) => {
        if (isDivider(line)) return <View key={line.id} style={styles.divider} />;
        const isLeft = (sides[line.id] ?? 'left') === 'left';
        const characterHead = resolveTranscriptCharacterHead(line.speaker, lessonExternalId);
        const avatar: ImageSourcePropType | null = characterHead === undefined
          ? (isLeft ? transcriptLeftAvatar : transcriptRightAvatar)
          : characterHead;
        const speaker = language === 'th' ? line.speakerTh || line.speaker : line.speaker;

        return (
          <View key={line.id} style={[styles.messageRow, !isLeft ? styles.messageRowRight : null]}>
            {isLeft && avatar ? <Image source={avatar} contentFit="contain" style={styles.avatar} /> : null}
            <View style={[styles.bubbleColumn, !isLeft ? styles.bubbleColumnRight : null]}>
              <View style={[styles.bubble, isLeft ? styles.bubbleLeft : styles.bubbleRight]}>
                {line.englishLine ? <AppText language="en" style={styles.text}>{line.englishLine}</AppText> : null}
                {language === 'th' && line.thaiLine ? <AppText language="th" style={styles.textThai}>{line.thaiLine}</AppText> : null}
              </View>
              {speaker ? (
                <Text style={[styles.speaker, language === 'th' ? styles.speakerThai : null, !isLeft ? styles.speakerRight : null]}>
                  {speaker.toLocaleUpperCase()}
                </Text>
              ) : null}
            </View>
            {!isLeft && avatar ? (
              <Image source={avatar} contentFit="contain" style={[styles.avatar, characterHead !== undefined ? styles.avatarMirrored : null]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  conversation: { marginHorizontal: 4, gap: 13, paddingTop: 3, paddingBottom: 12 },
  divider: { width: '84%', height: 1, alignSelf: 'center', marginVertical: 7, backgroundColor: '#C8CBD0' },
  messageRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  messageRowRight: { justifyContent: 'flex-end' },
  avatar: { width: 42, height: 42, marginBottom: 14, flexShrink: 0 },
  avatarMirrored: { transform: [{ scaleX: -1 }] },
  bubbleColumn: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  bubbleColumnRight: { alignItems: 'flex-end' },
  bubble: { width: '100%', gap: 5, borderWidth: 1.2, borderColor: '#1E1E1E', borderRadius: 11, backgroundColor: theme.colors.surface, paddingHorizontal: 14, paddingVertical: 12 },
  bubbleLeft: { borderBottomLeftRadius: 0 },
  bubbleRight: { borderBottomRightRadius: 0 },
  speaker: { color: theme.colors.text, fontSize: 9, lineHeight: 14, fontFamily: theme.typography.fontFaces.en.medium, letterSpacing: 0.7, marginTop: 1 },
  speakerThai: { fontFamily: theme.typography.fontFaces.th.medium },
  speakerRight: { textAlign: 'right' },
  text: { color: theme.colors.text, fontFamily: theme.typography.fontFaces.en.regular, fontSize: 14, lineHeight: 21 },
  textThai: { color: theme.colors.mutedText, fontFamily: theme.typography.fontFaces.th.regular, fontSize: 13, lineHeight: 20 },
});
