import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export function GuestLessonsHubScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader
          language={uiLanguage}
          title={uiLanguage === 'th' ? 'บทเรียน' : 'Lessons'}
          subtitle={
            uiLanguage === 'th'
              ? 'เลือกได้ทั้งคลังบทเรียนเต็มแบบมีบทเรียนล็อกไว้ และคลังบทเรียนฟรีที่รวมบทเรียนแรกของแต่ละเลเวล'
              : 'Choose between the full lesson library with locked lessons and the free lesson library with the first lesson from each level.'
          }
        />

        <Stack gap="sm" style={styles.linksWrap}>
          <Pressable accessibilityRole="button" style={styles.linkRow} onPress={() => router.push('/lessons/library')}>
            <View style={styles.linkCopy}>
              <AppText language={uiLanguage} variant="body" style={styles.linkTitle}>
                {uiLanguage === 'th' ? 'คลังบทเรียน' : 'Lesson Library'}
              </AppText>
              <AppText language={uiLanguage} variant="muted" style={styles.linkDescription}>
                {uiLanguage === 'th'
                  ? 'ดูคลังบทเรียนเต็ม พร้อมบทเรียนที่ล็อกไว้สำหรับสมาชิก'
                  : 'Browse the full lesson library with locked lessons still visible on the free plan.'}
              </AppText>
            </View>
            <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
              ›
            </AppText>
          </Pressable>

          <Pressable accessibilityRole="button" style={styles.linkRow} onPress={() => router.push('/lessons/free-library')}>
            <View style={styles.linkCopy}>
              <AppText language={uiLanguage} variant="body" style={styles.linkTitle}>
                {uiLanguage === 'th' ? 'คลังบทเรียนฟรี' : 'Free Lesson Library'}
              </AppText>
              <AppText language={uiLanguage} variant="muted" style={styles.linkDescription}>
                {uiLanguage === 'th'
                  ? 'รวมบทเรียนแรกของแต่ละเลเวลที่เปิดเรียนได้ทันที'
                  : 'Open the collection of first lessons from each level that are fully available on the free plan.'}
              </AppText>
            </View>
            <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
              ›
            </AppText>
          </Pressable>
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
    paddingBottom: theme.spacing.xl,
  },
  linksWrap: {
    paddingHorizontal: theme.spacing.md,
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
    shadowColor: theme.colors.border,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
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
});
