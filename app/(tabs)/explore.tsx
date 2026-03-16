import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();

  const title = uiLanguage === 'th' ? 'แนวทางการนำทาง' : 'Navigation Concepts';
  const subtitle =
    uiLanguage === 'th'
      ? 'หน้าชั่วคราวสำหรับเปรียบเทียบ bottom nav และตำแหน่งปุ่มสลับภาษา ก่อนปรับ navigation จริง'
      : 'A temporary gallery for comparing bottom-nav and language-toggle directions before changing the real navigation.';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {title}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {subtitle}
            </AppText>
          </Stack>
        </View>

        <Card padding="lg" radius="lg" style={styles.cardShadow}>
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
              {uiLanguage === 'th' ? 'Bottom Nav Mockups' : 'Bottom Nav Mockups'}
            </AppText>
            <AppText language={uiLanguage} variant="muted">
              {uiLanguage === 'th'
                ? 'มี 3 แนวทางให้ดู: Account แบบเรียบง่าย, ภาษาใน top bar, และ Account แบบ sheet'
                : 'There are 3 directions to review: simple Account tab, language in the top bar, and a sheet-style Account hub.'}
            </AppText>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.push('/nav-mockups')}>
              <AppText language={uiLanguage} variant="body" style={styles.primaryButtonText}>
                {uiLanguage === 'th' ? 'เปิดดู mockups' : 'Open mockups'}
              </AppText>
            </Pressable>
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
  cardShadow: {
    shadowColor: theme.colors.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  primaryButtonText: {
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
});
