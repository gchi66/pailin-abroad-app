import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';
type ResourceTone = 'exercise' | 'topic' | 'mistakes' | 'phrases' | 'culture';

type ResourceCardCopy = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  badge?: string;
  placeholderLabel: string;
  tone: ResourceTone;
};

type ResourcePageCopy = {
  title: string;
  subtitle: string;
  placeholderAlert: string;
  cards: ResourceCardCopy[];
};

const resourcePageCopy: Record<UiLanguage, ResourcePageCopy> = {
  en: {
    title: 'Resources',
    subtitle: 'Extra materials to guide your English-learning journey with Pailin',
    placeholderAlert: 'This destination page has not been ported yet.',
    cards: [
      {
        id: 'exercise-bank',
        title: 'Exercise Bank',
        description: 'Additional practice exercises for those difficult grammar topics',
        enabled: true,
        placeholderLabel: 'EX',
        tone: 'exercise',
      },
      {
        id: 'topic-library',
        title: 'Topic Library',
        description: 'Further explanations on a range of interesting ESL topics',
        enabled: true,
        placeholderLabel: 'TL',
        tone: 'topic',
      },
      {
        id: 'common-mistakes',
        title: 'Common Mistakes',
        description: 'View our full library of common mistakes made by Thai speakers and how to fix them',
        enabled: false,
        badge: 'Coming soon!',
        placeholderLabel: 'CM',
        tone: 'mistakes',
      },
      {
        id: 'phrases-verbs',
        title: 'Phrases & Phrasal Verbs',
        description: 'Explore our bank of phrases, phrasal verbs, and slang used in our lessons',
        enabled: false,
        badge: 'Coming soon!',
        placeholderLabel: 'PV',
        tone: 'phrases',
      },
      {
        id: 'culture-notes',
        title: 'Culture Notes',
        description: 'View our full collection of Culture Notes from our lessons',
        enabled: false,
        badge: 'Coming soon!',
        placeholderLabel: 'CN',
        tone: 'culture',
      },
    ],
  },
  th: {
    title: 'สื่อการเรียน',
    subtitle: 'สื่อการเรียนรู้เพิ่มเติมเพื่อช่วยในการเรียนรู้ภาษาอังกฤษไปกับไพลิน',
    placeholderAlert: 'ปลายทางหน้านี้ยังไม่ได้พอร์ตในแอป',
    cards: [
      {
        id: 'exercise-bank',
        title: 'คลังแบบฝึกหัด',
        description: 'แบบฝึกหัดเพิ่มเติมสำหรับกฎไวยากรณ์ที่เข้าใจยาก',
        enabled: true,
        placeholderLabel: 'EX',
        tone: 'exercise',
      },
      {
        id: 'topic-library',
        title: 'คลังหัวข้อการเรียนรู้',
        description: 'คำอธิบายเพิ่มเติมเกี่ยวกับห้อข้อการใช้ภาษาอังกฤษที่น่าสนใจ',
        enabled: true,
        placeholderLabel: 'TL',
        tone: 'topic',
      },
      {
        id: 'common-mistakes',
        title: 'ข้อผิดพลาดที่พบบ่อย',
        description: 'ดูคลังข้อผิดพลาดพบบ่อยที่คนไทยมักใช้ผิด พร้อมวิธีการแก้ไขให้ถูกต้อง',
        enabled: false,
        badge: 'เร็วๆนี้!',
        placeholderLabel: 'CM',
        tone: 'mistakes',
      },
      {
        id: 'phrases-verbs',
        title: 'วลี & Phrasal Verbs',
        description: 'สำรวจคลังวลี, Phrasal Verbs และคำสแลงที่ใช้ในบทเรียนต่างๆของเรา',
        enabled: false,
        badge: 'เร็วๆนี้!',
        placeholderLabel: 'PV',
        tone: 'phrases',
      },
      {
        id: 'culture-notes',
        title: 'เกร็ดความรู้ทางวัฒนธรรม',
        description: 'ดูคลังข้อมูลวัฒนธรรมอเมริกันทั้งหมดจากบทเรียนของเรา',
        enabled: false,
        badge: 'เร็วๆนี้!',
        placeholderLabel: 'CN',
        tone: 'culture',
      },
    ],
  },
};

export function ResourcesScreen() {
  const { uiLanguage } = useUiLanguage();
  const copy = resourcePageCopy[uiLanguage];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="lg" style={styles.page}>
        <View style={styles.headerBlock}>
          <Stack gap="sm" align="center">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {copy.title}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {copy.subtitle}
            </AppText>
          </Stack>
        </View>

        <Stack gap="md" style={styles.cardsShell}>
          {copy.cards.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              disabled={!card.enabled}
              style={styles.cardPressable}
              onPress={() => Alert.alert(card.title, copy.placeholderAlert)}>
              <Card padding="lg" radius="lg" style={[styles.resourceCard, !card.enabled ? styles.resourceCardDisabled : null]}>
                <View style={[styles.cardInner, card.badge ? styles.cardInnerWithBadge : null, !card.enabled ? styles.cardInnerDisabled : null]}>
                  <View style={[styles.mediaShell, getMediaShellStyle(card.tone)]}>
                    <View style={[styles.mediaAccentShape, getMediaAccentStyle(card.tone)]} />
                    <View style={styles.mediaLabelWrap}>
                      <AppText language="en" variant="caption" style={styles.mediaLabel}>
                        {card.placeholderLabel}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.cardCopy}>
                    <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
                      {card.title}
                    </AppText>
                    <AppText language={uiLanguage} variant="body" style={styles.cardDescription}>
                      {card.description}
                    </AppText>
                  </View>

                  {card.badge ? (
                    <View style={styles.badgeWrap}>
                      <AppText language={uiLanguage} variant="caption" style={styles.badgeText}>
                        {card.badge}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </Stack>
      </Stack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  page: {
    alignItems: 'center',
  },
  headerBlock: {
    width: '100%',
    maxWidth: 980,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.mutedText,
    textAlign: 'center',
    maxWidth: 720,
  },
  cardsShell: {
    maxWidth: 980,
  },
  cardPressable: {
    width: '100%',
  },
  resourceCard: {
    width: '100%',
    minHeight: 184,
    shadowColor: theme.colors.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  resourceCardDisabled: {
    opacity: 0.64,
  },
  cardInner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    minHeight: 136,
  },
  cardInnerWithBadge: {
    paddingRight: 96,
  },
  cardInnerDisabled: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 28,
    paddingRight: 0,
  },
  mediaShell: {
    width: 112,
    height: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  mediaShellExercise: {
    backgroundColor: '#F8E3BF',
  },
  mediaShellTopic: {
    backgroundColor: '#D9EEFF',
  },
  mediaShellMistakes: {
    backgroundColor: '#FDE2D7',
  },
  mediaShellPhrases: {
    backgroundColor: '#E6E0FF',
  },
  mediaShellCulture: {
    backgroundColor: '#DDF3E6',
  },
  mediaAccentShape: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 999,
    right: -10,
    bottom: -12,
    opacity: 0.95,
  },
  mediaAccentExercise: {
    backgroundColor: '#FFB347',
  },
  mediaAccentTopic: {
    backgroundColor: '#74BEFF',
  },
  mediaAccentMistakes: {
    backgroundColor: '#FF8F72',
  },
  mediaAccentPhrases: {
    backgroundColor: '#B59CFF',
  },
  mediaAccentCulture: {
    backgroundColor: '#74C690',
  },
  mediaLabelWrap: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.8,
  },
  cardCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.xl,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
  },
  cardDescription: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: 24,
  },
  badgeWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  badgeText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.6,
  },
});

function getMediaShellStyle(tone: ResourceTone) {
  switch (tone) {
    case 'exercise':
      return styles.mediaShellExercise;
    case 'topic':
      return styles.mediaShellTopic;
    case 'mistakes':
      return styles.mediaShellMistakes;
    case 'phrases':
      return styles.mediaShellPhrases;
    case 'culture':
      return styles.mediaShellCulture;
  }
}

function getMediaAccentStyle(tone: ResourceTone) {
  switch (tone) {
    case 'exercise':
      return styles.mediaAccentExercise;
    case 'topic':
      return styles.mediaAccentTopic;
    case 'mistakes':
      return styles.mediaAccentMistakes;
    case 'phrases':
      return styles.mediaAccentPhrases;
    case 'culture':
      return styles.mediaAccentCulture;
  }
}
