import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

const resourceCards = {
  en: [
    {
      title: 'Exercise Bank',
      description: 'Skill drills and focused practice sets.',
      status: 'Open now',
      enabled: true,
    },
    {
      title: 'Topic Library',
      description: 'Browse practical conversation themes and scenarios.',
      status: 'Open now',
      enabled: true,
    },
    {
      title: 'Culture Notes',
      description: 'Short explanations about context, tone, and daily usage.',
      status: 'Coming soon',
      enabled: false,
    },
  ],
  th: [
    {
      title: 'Exercise Bank',
      description: 'คลังแบบฝึกหัดและชุดฝึกที่เน้นทักษะเฉพาะ',
      status: 'เปิดได้ตอนนี้',
      enabled: true,
    },
    {
      title: 'Topic Library',
      description: 'รวมสถานการณ์และหัวข้อสนทนาที่ใช้ได้จริง',
      status: 'เปิดได้ตอนนี้',
      enabled: true,
    },
    {
      title: 'Culture Notes',
      description: 'เกร็ดเรื่องบริบท น้ำเสียง และการใช้จริงในชีวิตประจำวัน',
      status: 'เร็ว ๆ นี้',
      enabled: false,
    },
  ],
} as const;

export function ResourcesScreen() {
  const { uiLanguage } = useUiLanguage();
  const cards = resourceCards[uiLanguage];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {uiLanguage === 'th' ? 'Resources' : 'Resources'}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {uiLanguage === 'th'
                ? 'ให้ Resources เป็นแท็บหลัก เพื่อไม่ให้ถูกซ่อนอยู่ในเมนูรอง'
                : 'Resources stays top-level so it does not get buried inside secondary navigation.'}
            </AppText>
          </Stack>
        </View>

        {cards.map((card) => (
          <Pressable
            key={card.title}
            accessibilityRole="button"
            disabled={!card.enabled}
            style={styles.cardPressable}
            onPress={() => Alert.alert(card.title, uiLanguage === 'th' ? 'หน้านี้จะถูกเชื่อมต่อในขั้นตอนถัดไป' : 'This page will be connected in a later step.')}>
            <Card padding="lg" radius="lg" style={[styles.resourceCard, !card.enabled ? styles.resourceCardMuted : null]}>
              <Stack gap="sm">
                <View style={styles.cardHeaderRow}>
                  <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
                    {card.title}
                  </AppText>
                  <View style={[styles.statusBadge, !card.enabled ? styles.statusBadgeMuted : null]}>
                    <AppText language={uiLanguage} variant="caption" style={styles.statusText}>
                      {card.status}
                    </AppText>
                  </View>
                </View>
                <AppText language={uiLanguage} variant="muted">
                  {card.description}
                </AppText>
              </Stack>
            </Card>
          </Pressable>
        ))}
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
    paddingBottom: theme.spacing.xl,
  },
  headerBlock: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.mutedText,
  },
  cardPressable: {
    width: '100%',
  },
  resourceCard: {
    shadowColor: theme.colors.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  resourceCardMuted: {
    opacity: 0.72,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontWeight: theme.typography.weights.semibold,
  },
  statusBadge: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#DDEEFF',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  statusBadgeMuted: {
    backgroundColor: '#FFF0B8',
  },
  statusText: {
    fontWeight: theme.typography.weights.semibold,
  },
});
