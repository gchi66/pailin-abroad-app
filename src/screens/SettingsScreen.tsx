import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type SectionKey = 'more';

type SettingsCopy = {
  title: string;
  membershipTitle: string;
  subscriptionSectionTitle: string;
  planLabel: string;
  billingLabel: string;
  priceLabel: string;
  statusLabel: string;
  statusActive: string;
  statusFree: string;
  currentPlanPaid: string;
  currentPlanFree: string;
  billingPaid: string;
  billingFree: string;
  pricePaid: string;
  priceFree: string;
  changePlan: string;
  appPreferencesTitle: string;
  legalIntro: string;
  termsTitle: string;
  privacyTitle: string;
  moreTitle: string;
  cancelMembership: string;
  deleteAccount: string;
  deleteAccountHint: string;
  cancelMembershipConfirmTitle: string;
  cancelMembershipConfirmBody: string;
  keepMembership: string;
  deleteAccountConfirmTitle: string;
  deleteAccountConfirmBody: string;
  goBack: string;
  continueDelete: string;
  notConnectedTitle: string;
  cancelMembershipPlaceholder: string;
  deleteAccountPlaceholder: string;
};

const getCopy = (uiLanguage: 'en' | 'th'): SettingsCopy => {
  if (uiLanguage === 'th') {
    return {
      title: 'การตั้งค่า',
      membershipTitle: 'สมาชิกและการเรียกเก็บเงิน',
      subscriptionSectionTitle: 'การสมัครสมาชิก',
      planLabel: 'แผนปัจจุบัน',
      billingLabel: 'รอบบิลถัดไป',
      priceLabel: 'ราคา',
      statusLabel: 'สถานะ',
      statusActive: 'ใช้งานอยู่',
      statusFree: 'ฟรี',
      currentPlanPaid: 'Premium Monthly',
      currentPlanFree: 'Free Plan',
      billingPaid: 'N/A',
      billingFree: 'ไม่มี',
      pricePaid: '฿400/เดือน',
      priceFree: 'ฟรี',
      changePlan: 'เปลี่ยนแผน',
      appPreferencesTitle: 'การตั้งค่าแอป',
      legalIntro: 'ดูรายละเอียดข้อกำหนดและนโยบายของเราได้ด้านล่าง',
      termsTitle: 'ข้อกำหนดและเงื่อนไข',
      privacyTitle: 'นโยบายความเป็นส่วนตัว',
      moreTitle: 'เพิ่มเติม',
      cancelMembership: 'ยกเลิกสมาชิก',
      deleteAccount: 'ลบบัญชี',
      deleteAccountHint: 'การลบบัญชีจะลบข้อมูลและความคืบหน้าของคุณอย่างถาวร',
      cancelMembershipConfirmTitle: 'ยกเลิกสมาชิก?',
      cancelMembershipConfirmBody: 'คุณจะยังใช้งานได้จนจบรอบปัจจุบัน การกระทำนี้ไม่สามารถย้อนกลับได้',
      keepMembership: 'คงสมาชิกไว้',
      deleteAccountConfirmTitle: 'ลบบัญชี?',
      deleteAccountConfirmBody: 'การกระทำนี้จะลบบัญชีและความคืบหน้าของคุณอย่างถาวร และไม่สามารถย้อนกลับได้',
      goBack: 'ย้อนกลับ',
      continueDelete: 'ลบบัญชี',
      notConnectedTitle: 'ยังไม่เชื่อมต่อ',
      cancelMembershipPlaceholder: 'ยังไม่ได้เชื่อม flow การยกเลิกสมาชิกในแอป',
      deleteAccountPlaceholder: 'ยังไม่ได้เชื่อม flow การลบบัญชีในแอป',
    };
  }

  return {
    title: 'Settings',
    membershipTitle: 'Membership & Billing',
    subscriptionSectionTitle: 'Subscription',
    planLabel: 'Current Plan',
    billingLabel: 'Next Billing Date',
    priceLabel: 'Price',
    statusLabel: 'Status',
    statusActive: 'Active',
    statusFree: 'Free',
    currentPlanPaid: 'Premium Monthly',
    currentPlanFree: 'Free Plan',
    billingPaid: 'N/A',
    billingFree: 'None',
    pricePaid: '$400/month',
    priceFree: 'Free',
    changePlan: 'Change Plan',
    appPreferencesTitle: 'App Preferences',
    legalIntro: 'Review our legal terms and privacy details below.',
    termsTitle: 'Terms & Conditions',
    privacyTitle: 'Privacy Policy',
    moreTitle: 'More',
    cancelMembership: 'Cancel Membership',
    deleteAccount: 'Delete Account',
    deleteAccountHint: 'Deleting your account permanently removes your data and learning progress.',
    cancelMembershipConfirmTitle: 'Cancel membership?',
    cancelMembershipConfirmBody: 'You will keep access until the end of your current period. This action cannot be undone.',
    keepMembership: 'Keep Membership',
    deleteAccountConfirmTitle: 'Delete account?',
    deleteAccountConfirmBody: 'This permanently deletes your account and progress. This action cannot be undone.',
    goBack: 'Go Back',
    continueDelete: 'Delete Account',
    notConnectedTitle: 'Not connected yet',
    cancelMembershipPlaceholder: 'Membership cancellation flow is not connected in the app yet.',
    deleteAccountPlaceholder: 'Account deletion flow is not connected in the app yet.',
  };
};

export function SettingsScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const subscriptionRows = useMemo(
    () => [
      {
        key: 'plan',
        label: copy.planLabel,
        value: hasMembership ? copy.currentPlanPaid : copy.currentPlanFree,
      },
      {
        key: 'billing',
        label: copy.billingLabel,
        value: hasMembership ? copy.billingPaid : copy.billingFree,
      },
      {
        key: 'price',
        label: copy.priceLabel,
        value: hasMembership ? copy.pricePaid : copy.priceFree,
      },
      {
        key: 'status',
        label: copy.statusLabel,
        value: hasMembership ? copy.statusActive : copy.statusFree,
      },
    ],
    [copy, hasMembership]
  );

  const handleChangePlan = () => {
    router.push('/(tabs)/account/membership');
  };

  const handleCancelMembership = () => {
    Alert.alert(copy.cancelMembershipConfirmTitle, copy.cancelMembershipConfirmBody, [
      { text: copy.keepMembership, style: 'cancel' },
      {
        text: copy.cancelMembership,
        style: 'destructive',
        onPress: () => Alert.alert(copy.notConnectedTitle, copy.cancelMembershipPlaceholder),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(copy.deleteAccountConfirmTitle, copy.deleteAccountConfirmBody, [
      { text: copy.goBack, style: 'cancel' },
      {
        text: copy.continueDelete,
        style: 'destructive',
        onPress: () => Alert.alert(copy.notConnectedTitle, copy.deleteAccountPlaceholder),
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} onBackPress={() => router.push('/(tabs)/account')} topInsetOffset={52} />

        <Card padding="lg" radius="lg" style={styles.neoCard}>
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
              {copy.membershipTitle}
            </AppText>

            <Stack gap="xs">
              <AppText language={uiLanguage} variant="caption" style={styles.subsectionLabel}>
                {copy.subscriptionSectionTitle}
              </AppText>
              {subscriptionRows.map((row, index) => (
                <View key={row.key} style={[styles.infoRow, index < subscriptionRows.length - 1 ? styles.infoRowBorder : null]}>
                  <AppText language={uiLanguage} variant="body" style={styles.infoLabel}>
                    {row.label}
                  </AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.infoValue}>
                    {row.value}
                  </AppText>
                </View>
              ))}
            </Stack>

            <Button language={uiLanguage} title={copy.changePlan} onPress={handleChangePlan} />
          </Stack>
        </Card>

        <Card padding="lg" radius="lg" style={styles.neoCard}>
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
              {copy.appPreferencesTitle}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.helperText}>
              {copy.legalIntro}
            </AppText>
            <Pressable accessibilityRole="button" style={styles.linkRow} onPress={() => router.push('/account/terms')}>
              <AppText language={uiLanguage} variant="body" style={styles.linkText}>
                {copy.termsTitle}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                ›
              </AppText>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.linkRow} onPress={() => router.push('/account/privacy')}>
              <AppText language={uiLanguage} variant="body" style={styles.linkText}>
                {copy.privacyTitle}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                ›
              </AppText>
            </Pressable>
          </Stack>
        </Card>

        <View style={styles.moreSection}>
          <Pressable accessibilityRole="button" style={styles.moreTrigger} onPress={() => setOpenSection((current) => (current === 'more' ? null : 'more'))}>
            <AppText language={uiLanguage} variant="body" style={styles.moreTitle}>
              {copy.moreTitle}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.collapsibleChevron}>
              {openSection === 'more' ? '−' : '+'}
            </AppText>
          </Pressable>

          {openSection === 'more' ? (
            <View style={styles.moreBody}>
              {hasMembership ? (
                <Pressable accessibilityRole="button" style={styles.dangerRow} onPress={handleCancelMembership}>
                  <AppText language={uiLanguage} variant="body" style={styles.dangerActionText}>
                    {copy.cancelMembership}
                  </AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.dangerChevron}>
                    ›
                  </AppText>
                </Pressable>
              ) : null}

              <Pressable accessibilityRole="button" style={styles.dangerRow} onPress={handleDeleteAccount}>
                <View style={styles.dangerTextBlock}>
                  <AppText language={uiLanguage} variant="body" style={styles.dangerActionText}>
                    {copy.deleteAccount}
                  </AppText>
                  <AppText language={uiLanguage} variant="muted" style={styles.dangerHint}>
                    {copy.deleteAccountHint}
                  </AppText>
                </View>
                <AppText language={uiLanguage} variant="body" style={styles.dangerChevron}>
                  ›
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </View>
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
  neoCard: {
    borderWidth: 1.5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  subsectionLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  helperText: {
    color: theme.colors.mutedText,
  },
  infoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#D7D7D7',
  },
  infoLabel: {
    flex: 1,
    color: theme.colors.mutedText,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  linkRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  linkText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  linkChevron: {
    color: theme.colors.mutedText,
    fontSize: 24,
    lineHeight: 24,
  },
  moreSection: {
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  collapsibleChevron: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: theme.typography.weights.bold,
  },
  moreTrigger: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  moreTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  moreBody: {
    borderTopWidth: 1,
    borderTopColor: '#D7D7D7',
  },
  dangerRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  dangerTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  dangerActionText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  dangerHint: {
    color: theme.colors.mutedText,
  },
  dangerChevron: {
    color: theme.colors.mutedText,
    fontSize: 24,
    lineHeight: 24,
  },
});
