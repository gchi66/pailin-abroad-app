import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export function AccountScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership, setHasMembership } = useAppSession();

  const freePlanActions = [
    uiLanguage === 'th' ? 'Profile' : 'Profile',
    uiLanguage === 'th' ? 'Membership' : 'Membership',
    uiLanguage === 'th' ? 'About' : 'About',
    uiLanguage === 'th' ? 'Contact' : 'Contact',
  ];

  const paidActions = [
    uiLanguage === 'th' ? 'Profile' : 'Profile',
    uiLanguage === 'th' ? 'About' : 'About',
    uiLanguage === 'th' ? 'Contact' : 'Contact',
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {uiLanguage === 'th' ? 'Account' : 'Account'}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {hasMembership
                ? uiLanguage === 'th'
                  ? 'นี่คือมุมมองสำหรับผู้ใช้ที่มีสมาชิกแบบชำระเงิน'
                  : 'This is the preview state for a paid membership user.'
                : uiLanguage === 'th'
                  ? 'นี่คือมุมมองสำหรับผู้ใช้ที่มีบัญชีแบบแพ็กเกจฟรี'
                  : 'This is the preview state for a signed-in user on the free plan.'}
            </AppText>
          </Stack>
        </View>

        <Card padding="lg" radius="lg">
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
              {uiLanguage === 'th' ? 'Preview State' : 'Preview State'}
            </AppText>
            <AppText language={uiLanguage} variant="muted">
              {uiLanguage === 'th'
                ? 'ตอนนี้ใช้ตัวสลับชั่วคราวเพื่อดูโครงสร้างระหว่างแพ็กเกจฟรีกับสมาชิกแบบชำระเงินก่อนเชื่อม auth จริง'
                : 'This temporary switch previews the navigation structure until real auth is connected.'}
            </AppText>
            <View style={styles.previewSwitchWrap}>
              <Pressable
                accessibilityRole="button"
                style={[styles.previewSwitchOption, !hasMembership ? styles.previewSwitchOptionActive : null]}
                onPress={() => setHasMembership(false)}>
                <AppText language={uiLanguage} variant="caption" style={!hasMembership ? styles.previewSwitchTextActive : styles.previewSwitchText}>
                  {uiLanguage === 'th' ? 'Free Plan' : 'Free Plan'}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.previewSwitchOption, hasMembership ? styles.previewSwitchOptionActive : null]}
                onPress={() => setHasMembership(true)}>
                <AppText language={uiLanguage} variant="caption" style={hasMembership ? styles.previewSwitchTextActive : styles.previewSwitchText}>
                  {uiLanguage === 'th' ? 'Paid' : 'Paid'}
                </AppText>
              </Pressable>
            </View>
          </Stack>
        </Card>

        <View style={styles.languageRow}>
          <LanguageToggle />
        </View>

        <Card padding="lg" radius="lg">
          <Stack gap="sm">
            {(hasMembership ? paidActions : freePlanActions).map((label) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                style={styles.linkRow}
                onPress={() => {
                  if (label === 'Membership') {
                    router.push('/account/membership');
                    return;
                  }
                  if (label === 'Profile') {
                    router.push('/account/profile');
                    return;
                  }
                  if (label === 'About') {
                    router.push('/account/about');
                    return;
                  }
                  if (label === 'Contact') {
                    router.push('/account/contact');
                    return;
                  }
                  Alert.alert(label, uiLanguage === 'th' ? 'หน้านี้จะถูกเชื่อมต่อในขั้นตอนถัดไป' : 'This page will be connected in a later step.');
                }}>
                <AppText language={uiLanguage} variant="body" style={styles.linkText}>
                  {label}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                  ›
                </AppText>
              </Pressable>
            ))}
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
  sectionTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  previewSwitchWrap: {
    flexDirection: 'row',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 4,
    gap: 4,
  },
  previewSwitchOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSwitchOptionActive: {
    backgroundColor: '#91CAFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewSwitchText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  previewSwitchTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  languageRow: {
    alignItems: 'flex-end',
  },
  linkRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
  },
  linkText: {
    fontWeight: theme.typography.weights.medium,
  },
  linkChevron: {
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
});
