import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export function GuestLessonsHubScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {uiLanguage === 'th' ? 'บทเรียน' : 'Lessons'}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {uiLanguage === 'th'
                ? 'สำหรับผู้ใช้ที่ยังไม่มีบัญชี ตอนนี้เริ่มได้จาก 4 บทเรียนฟรีก่อน'
                : 'For guests, start with the 4 free lessons first.'}
            </AppText>
          </Stack>
        </View>

        <Card padding="lg" radius="lg">
          <Stack gap="sm">
            <Pressable accessibilityRole="button" style={styles.linkRow} onPress={() => router.push('/lessons/try')}>
              <View style={styles.linkCopy}>
                <AppText language={uiLanguage} variant="body" style={styles.linkTitle}>
                  {uiLanguage === 'th' ? '4 บทเรียนตัวอย่าง' : '4 Sample Lessons'}
                </AppText>
                <AppText language={uiLanguage} variant="muted" style={styles.linkDescription}>
                  {uiLanguage === 'th'
                    ? 'ลองเรียน 4 บทเรียนฟรีได้ทันที'
                    : 'Try the four free lessons now.'}
                </AppText>
              </View>
              <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                ›
              </AppText>
            </Pressable>

            <View style={[styles.linkRow, styles.linkRowLocked]}>
              <View style={styles.linkCopy}>
                <AppText language={uiLanguage} variant="body" style={styles.linkTitle}>
                  {uiLanguage === 'th' ? 'คลังบทเรียน' : 'Lesson Library'}
                </AppText>
                <AppText language={uiLanguage} variant="muted" style={styles.linkDescription}>
                  {uiLanguage === 'th'
                    ? 'จะแสดงเป็นสถานะล็อกสำหรับผู้ใช้ที่ยังไม่มีบัญชี'
                    : 'This will render as locked for guests for now.'}
                </AppText>
              </View>
              <View style={styles.lockBadge}>
                <AppText language={uiLanguage} variant="caption" style={styles.lockBadgeText}>
                  {uiLanguage === 'th' ? 'ล็อก' : 'Locked'}
                </AppText>
              </View>
            </View>
          </Stack>
        </Card>
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
  linkRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  linkRowLocked: {
    opacity: 0.7,
    backgroundColor: '#F3F3F3',
  },
  linkCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  linkTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  linkDescription: {
    color: theme.colors.mutedText,
  },
  linkChevron: {
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
  lockBadge: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#ECECEC',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  lockBadgeText: {
    fontWeight: theme.typography.weights.semibold,
  },
});
