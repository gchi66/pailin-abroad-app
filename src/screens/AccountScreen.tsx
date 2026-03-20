import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthScreen } from '@/src/screens/AuthScreen';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export function AccountScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership } = useAppSession();

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

  const copy =
    uiLanguage === 'th'
      ? {
          title: 'Account',
          freeSubtitle: 'คุณลงชื่อเข้าใช้แล้วและกำลังใช้งานแพ็กเกจฟรี',
          paidSubtitle: 'คุณลงชื่อเข้าใช้แล้วและมีสิทธิ์สมาชิกแบบชำระเงิน',
        }
      : {
          title: 'Account',
          freeSubtitle: 'You are signed in on the free plan.',
          paidSubtitle: 'You are signed in with paid membership access.',
        };

  if (!hasAccount) {
    return <AuthScreen />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {copy.title}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {hasMembership ? copy.paidSubtitle : copy.freeSubtitle}
            </AppText>
          </Stack>
        </View>

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
