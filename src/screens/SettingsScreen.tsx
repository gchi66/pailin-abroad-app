import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getPricing, prefetchPricing } from '@/src/api/pricing';
import { BillingInvoice, BillingPaymentMethod, cancelUserSubscription, deleteUserAccount, fetchBillingInvoices, fetchBillingPaymentMethod } from '@/src/api/user';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { getPlanPackageMap, getRevenueCatCustomerInfo, getRevenueCatOffering } from '@/src/lib/revenuecat';
import { theme } from '@/src/theme/theme';

type SectionKey = 'billing-history' | 'more';

type SettingsCopy = {
  title: string;
  back: string;
  subscriptionInfoTitle: string;
  planLabel: string;
  billingLabel: string;
  priceLabel: string;
  currentPlanFree: string;
  billingFree: string;
  priceFree: string;
  changePlan: string;
  termsTitle: string;
  privacyTitle: string;
  moreTitle: string;
  billingHistoryTitle: string;
  billingManagedByApple: string;
  billingNoChargeHistory: string;
  billingPaymentMethodLabel: string;
  billingPaymentsLabel: string;
  billingNoCardOnFile: string;
  billingLoading: string;
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
  requestInFlight: string;
  successTitle: string;
  errorTitle: string;
  cancellationSuccess: string;
  deleteSuccess: string;
  genericError: string;
  cancellationScheduledLabel: string;
};

const getCopy = (uiLanguage: 'en' | 'th'): SettingsCopy => {
  if (uiLanguage === 'th') {
    return {
      title: 'การตั้งค่า',
      back: 'ย้อนกลับ',
      subscriptionInfoTitle: 'ข้อมูลการสมัครสมาชิก',
      planLabel: 'แผนปัจจุบัน',
      billingLabel: 'รอบบิลถัดไป',
      priceLabel: 'ราคา',
      currentPlanFree: 'Free Plan',
      billingFree: 'ไม่มี',
      priceFree: 'ฟรี',
      changePlan: 'เปลี่ยนแผน',
      termsTitle: 'ข้อกำหนดและเงื่อนไข',
      privacyTitle: 'นโยบายความเป็นส่วนตัว',
      moreTitle: 'เพิ่มเติม',
      billingHistoryTitle: 'ประวัติการเรียกเก็บเงิน',
      billingManagedByApple: 'การชำระเงินนี้จัดการผ่าน Apple โปรดตรวจสอบการสมัครสมาชิกและประวัติการซื้อในบัญชี Apple ของคุณ',
      billingNoChargeHistory: 'ยังไม่มีประวัติการชำระเงิน',
      billingPaymentMethodLabel: 'วิธีการชำระเงิน',
      billingPaymentsLabel: 'การชำระเงิน',
      billingNoCardOnFile: 'ไม่มีบัตรที่บันทึกไว้',
      billingLoading: 'กำลังโหลดข้อมูลการเรียกเก็บเงิน...',
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
      requestInFlight: 'กรุณารอสักครู่',
      successTitle: 'สำเร็จ',
      errorTitle: 'เกิดข้อผิดพลาด',
      cancellationSuccess: 'ยกเลิกสมาชิกเรียบร้อยแล้ว คุณยังใช้งานได้จนกว่าจะสิ้นสุดรอบบิลปัจจุบัน',
      deleteSuccess: 'ลบบัญชีเรียบร้อยแล้ว',
      genericError: 'มีบางอย่างผิดพลาด กรุณาลองอีกครั้ง',
      cancellationScheduledLabel: 'กำหนดยกเลิกแล้ว',
    };
  }

  return {
    title: 'Settings',
    back: 'Back',
    subscriptionInfoTitle: 'Subscription Info',
    planLabel: 'Current Plan',
    billingLabel: 'Next Billing Date',
    priceLabel: 'Price',
    currentPlanFree: 'Free Plan',
    billingFree: 'None',
    priceFree: 'Free',
    changePlan: 'Change Plan',
    termsTitle: 'Terms & Conditions',
    privacyTitle: 'Privacy Policy',
    moreTitle: 'More',
    billingHistoryTitle: 'Billing History',
    billingManagedByApple: 'This subscription is managed through Apple. Check your Apple account for payment method and purchase history.',
    billingNoChargeHistory: 'No payments yet.',
    billingPaymentMethodLabel: 'Payment Method',
    billingPaymentsLabel: 'Payments',
    billingNoCardOnFile: 'No card on file',
    billingLoading: 'Loading billing details...',
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
    requestInFlight: 'Please wait a moment.',
    successTitle: 'Success',
    errorTitle: 'Something went wrong',
    cancellationSuccess: "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
    deleteSuccess: 'Your account has been deleted successfully.',
    genericError: 'Something went wrong. Please try again.',
    cancellationScheduledLabel: 'Cancellation scheduled',
  };
};

type PlanId = 'monthly' | '3-month' | '6-month' | 'lifetime';

type SubscriptionInfoState = {
  currentPlanId: PlanId | null;
  priceText: string | null;
};

type BillingHistoryState = {
  paymentMethod: BillingPaymentMethod | null;
  invoices: BillingInvoice[];
  source: 'stripe' | 'apple' | 'none';
  isLoading: boolean;
  hasLoaded: boolean;
};

const PLAN_LABELS: Record<PlanId, { en: string; th: string }> = {
  monthly: { en: 'Monthly', th: 'รายเดือน' },
  '3-month': { en: '3 months', th: '3 เดือน' },
  '6-month': { en: '6 months', th: '6 เดือน' },
  lifetime: { en: 'Lifetime', th: 'ตลอดชีพ' },
};

const getPlanIdFromProductIdentifier = (productIdentifier: string | null | undefined): PlanId | null => {
  if (typeof productIdentifier !== 'string') {
    return null;
  }

  if (productIdentifier.includes('.lifetime')) return 'lifetime';
  if (productIdentifier.includes('.6month')) return '6-month';
  if (productIdentifier.includes('.3month')) return '3-month';
  if (productIdentifier.includes('.1month')) return 'monthly';

  return null;
};

const formatFallbackPrice = (amount: number, currency: string | null, uiLanguage: 'en' | 'th') => {
  const symbol = currency === 'USD' ? '$' : '฿';
  return `${symbol}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}/${uiLanguage === 'th' ? 'เดือน' : 'month'}`;
};

const formatBillingDate = (value: string | null, uiLanguage: 'en' | 'th') => {
  if (!value) {
    return uiLanguage === 'th' ? 'ไม่มี' : 'None';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(uiLanguage === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Billing request timed out'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export function SettingsScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership, profile, refreshProfile, signOut } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [isCancellingMembership, setIsCancellingMembership] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const hasPendingCancellation = profile?.cancel_at_period_end === true;
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfoState>({
    currentPlanId: null,
    priceText: null,
  });
  const [billingHistory, setBillingHistory] = useState<BillingHistoryState>({
    paymentMethod: null,
    invoices: [],
    source: 'none',
    isLoading: false,
    hasLoaded: false,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptionInfo = async () => {
      if (!hasMembership) {
        if (isMounted) {
          setSubscriptionInfo({ currentPlanId: null, priceText: null });
        }
        return;
      }

      try {
        const [offering, customerInfo] = await Promise.all([getRevenueCatOffering(), getRevenueCatCustomerInfo()]);
        const planPackageMap = getPlanPackageMap(offering);
        const entitlement = customerInfo?.entitlements.active?.full_access;
        const productIdentifier =
          (typeof entitlement?.productIdentifier === 'string' ? entitlement.productIdentifier : null) ||
          (Array.isArray(customerInfo?.activeSubscriptions) ? customerInfo.activeSubscriptions[0] ?? null : null);
        const currentPlanId = getPlanIdFromProductIdentifier(productIdentifier);
        let priceText = currentPlanId ? planPackageMap[currentPlanId]?.product?.priceString ?? null : null;

        if (!priceText && currentPlanId && currentPlanId !== 'lifetime') {
          const pricing = await getPricing();
          const matchedPlan = pricing.plans.find((plan) => plan.billing_period === currentPlanId);
          if (matchedPlan) {
            priceText = formatFallbackPrice(matchedPlan.amount_per_month, pricing.currency, uiLanguage);
          }
        }

        if (isMounted) {
          setSubscriptionInfo({ currentPlanId, priceText });
        }
      } catch {
        if (isMounted) {
          setSubscriptionInfo({ currentPlanId: null, priceText: null });
        }
      }
    };

    void loadSubscriptionInfo();

    return () => {
      isMounted = false;
    };
  }, [hasMembership, uiLanguage]);

  const subscriptionRows = useMemo(
    () => [
      {
        key: 'plan',
        label: copy.planLabel,
        value:
          hasMembership && subscriptionInfo.currentPlanId
            ? PLAN_LABELS[subscriptionInfo.currentPlanId][uiLanguage]
            : hasMembership
              ? '—'
              : copy.currentPlanFree,
      },
      {
        key: 'billing',
        label: copy.billingLabel,
        value: hasMembership ? formatBillingDate(profile?.current_period_end ?? null, uiLanguage) : copy.billingFree,
      },
      {
        key: 'price',
        label: copy.priceLabel,
        value: hasMembership ? subscriptionInfo.priceText ?? '—' : copy.priceFree,
      },
    ],
    [copy, hasMembership, profile?.current_period_end, subscriptionInfo.currentPlanId, subscriptionInfo.priceText, uiLanguage]
  );

  useEffect(() => {
    if (openSection !== 'billing-history' || billingHistory.hasLoaded) {
      return;
    }

    let isMounted = true;

    const loadBillingHistory = async () => {
      setBillingHistory((current) => (current.isLoading ? current : { ...current, isLoading: true }));

      try {
        const [paymentMethodResult, invoicesResult] = await Promise.allSettled([
          withTimeout(fetchBillingPaymentMethod(), 4000),
          withTimeout(fetchBillingInvoices(), 4000),
        ]);

        if (!isMounted) {
          return;
        }

        const paymentMethodResponse = paymentMethodResult.status === 'fulfilled' ? paymentMethodResult.value : null;
        const invoicesResponse = invoicesResult.status === 'fulfilled' ? invoicesResult.value : null;
        const paymentMethodError = paymentMethodResult.status === 'rejected' ? paymentMethodResult.reason : null;
        const invoicesError = invoicesResult.status === 'rejected' ? invoicesResult.reason : null;
        const errorMessages = [paymentMethodError, invoicesError]
          .map((error) => (error instanceof Error ? error.message : ''))
          .filter(Boolean);
        const isStripeMissing = errorMessages.some(
          (message) => message.includes('No Stripe customer found') || message.includes('No active subscription found')
        );

        if (paymentMethodResponse || invoicesResponse) {
          setBillingHistory({
            paymentMethod: paymentMethodResponse?.payment_method ?? null,
            invoices: invoicesResponse?.invoices ?? [],
            source: 'stripe',
            isLoading: false,
            hasLoaded: true,
          });
          return;
        }

        setBillingHistory({
          paymentMethod: null,
          invoices: [],
          source: hasMembership && isStripeMissing ? 'apple' : 'none',
          isLoading: false,
          hasLoaded: true,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : '';
        const isStripeMissing =
          message.includes('No Stripe customer found') || message.includes('No active subscription found');

        setBillingHistory({
          paymentMethod: null,
          invoices: [],
          source: hasMembership && isStripeMissing ? 'apple' : 'none',
          isLoading: false,
          hasLoaded: true,
        });
      }
    };

    void loadBillingHistory();

    return () => {
      isMounted = false;
    };
  }, [billingHistory.hasLoaded, hasMembership, openSection]);

  const formattedPaymentMethod = useMemo(() => {
    if (!billingHistory.paymentMethod) {
      return copy.billingNoCardOnFile;
    }

    const brand = billingHistory.paymentMethod.brand
      ? billingHistory.paymentMethod.brand.charAt(0).toUpperCase() + billingHistory.paymentMethod.brand.slice(1)
      : 'Card';

    return `${brand} •••• ${billingHistory.paymentMethod.last4}`;
  }, [billingHistory.paymentMethod, copy.billingNoCardOnFile]);

  const formattedInvoices = useMemo(
    () =>
      billingHistory.invoices.map((invoice) => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toLocaleDateString(uiLanguage === 'th' ? 'th-TH' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        amount: new Intl.NumberFormat(uiLanguage === 'th' ? 'th-TH' : 'en-US', {
          style: 'currency',
          currency: (invoice.currency || 'USD').toUpperCase(),
        }).format(invoice.amount / 100),
        status: invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : null,
      })),
    [billingHistory.invoices, uiLanguage]
  );

  const handleChangePlan = () => {
    prefetchPricing();
    router.push('/(tabs)/account/membership');
  };

  const handleCancelMembership = () => {
    Alert.alert(copy.cancelMembershipConfirmTitle, copy.cancelMembershipConfirmBody, [
      { text: copy.keepMembership, style: 'cancel' },
      {
        text: copy.cancelMembership,
        style: 'destructive',
        onPress: () => {
          if (isCancellingMembership) {
            Alert.alert(copy.requestInFlight);
            return;
          }

          void (async () => {
            try {
              setIsCancellingMembership(true);
              const result = await cancelUserSubscription();
              await refreshProfile();
              Alert.alert(copy.successTitle, result.message ?? copy.cancellationSuccess);
            } catch (error) {
              const message = error instanceof Error ? error.message : copy.genericError;
              Alert.alert(copy.errorTitle, message);
            } finally {
              setIsCancellingMembership(false);
            }
          })();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(copy.deleteAccountConfirmTitle, copy.deleteAccountConfirmBody, [
      { text: copy.goBack, style: 'cancel' },
      {
        text: copy.continueDelete,
        style: 'destructive',
        onPress: () => {
          if (isDeletingAccount) {
            Alert.alert(copy.requestInFlight);
            return;
          }

          void (async () => {
            try {
              setIsDeletingAccount(true);
              const result = await deleteUserAccount();
              await signOut();
              Alert.alert(copy.successTitle, result.message ?? copy.deleteSuccess, [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/account'),
                },
              ]);
            } catch (error) {
              const message = error instanceof Error ? error.message : copy.genericError;
              Alert.alert(copy.errorTitle, message);
            } finally {
              setIsDeletingAccount(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
      <Stack gap="md">
        <StandardPageHeader
          language={uiLanguage}
          title={copy.title}
          onBackPress={() => router.push('/(tabs)/account')}
          backLabel={copy.back}
          topInsetOffset={52}
        />

        <Card padding="lg" radius="lg" style={styles.neoCard}>
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
              {copy.subscriptionInfoTitle}
            </AppText>

            <Stack gap="xs">
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
          <View style={styles.moreCardContent}>
            <Pressable
              accessibilityRole="button"
              style={styles.moreTrigger}
              onPress={() => setOpenSection((current) => (current === 'billing-history' ? null : 'billing-history'))}>
              <AppText language={uiLanguage} variant="body" style={styles.moreTitle}>
                {copy.billingHistoryTitle}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.collapsibleChevron}>
                {openSection === 'billing-history' ? '−' : '+'}
              </AppText>
            </Pressable>

            {openSection === 'billing-history' ? (
              <View style={styles.moreBody}>
                {billingHistory.isLoading ? (
                  <View style={styles.billingLoadingRow}>
                    <ActivityIndicator color={theme.colors.text} size="small" />
                    <AppText language={uiLanguage} variant="muted" style={styles.dangerHint}>
                      {copy.billingLoading}
                    </AppText>
                  </View>
                ) : billingHistory.source === 'stripe' ? (
                  <View>
                    <View style={[styles.billingInfoRow, styles.infoRowBorder]}>
                      <AppText language={uiLanguage} variant="body" style={styles.infoLabel}>
                        {copy.billingPaymentMethodLabel}
                      </AppText>
                      <AppText language={uiLanguage} variant="body" style={styles.billingInfoValue}>
                        {formattedPaymentMethod}
                      </AppText>
                    </View>

                    <View style={styles.billingPaymentsBlock}>
                      <AppText language={uiLanguage} variant="body" style={styles.billingSectionLabel}>
                        {copy.billingPaymentsLabel}
                      </AppText>
                      {formattedInvoices.length > 0 ? (
                        formattedInvoices.map((invoice, index) => (
                          <View
                            key={invoice.id}
                            style={[styles.billingInvoiceRow, index < formattedInvoices.length - 1 ? styles.infoRowBorder : null]}>
                            <View style={styles.billingInvoiceTextBlock}>
                              <AppText language={uiLanguage} variant="body" style={styles.billingInvoiceAmount}>
                                {invoice.amount}
                              </AppText>
                              <AppText language={uiLanguage} variant="muted" style={styles.dangerHint}>
                                {invoice.date}
                              </AppText>
                            </View>
                            <AppText language={uiLanguage} variant="muted" style={styles.billingStatus}>
                              {invoice.status ?? ''}
                            </AppText>
                          </View>
                        ))
                      ) : (
                        <AppText language={uiLanguage} variant="muted" style={styles.billingEmptyText}>
                          {copy.billingNoChargeHistory}
                        </AppText>
                      )}
                    </View>
                  </View>
                ) : billingHistory.source === 'apple' ? (
                  <AppText language={uiLanguage} variant="muted" style={styles.billingEmptyText}>
                    {copy.billingManagedByApple}
                  </AppText>
                ) : (
                  <AppText language={uiLanguage} variant="muted" style={styles.billingEmptyText}>
                    {copy.billingNoChargeHistory}
                  </AppText>
                )}
              </View>
            ) : null}
          </View>
        </Card>

        <Card padding="lg" radius="lg" style={styles.neoCard}>
          <View style={styles.moreCardContent}>
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
                  <Pressable
                    accessibilityRole="button"
                    disabled={isCancellingMembership || hasPendingCancellation}
                    style={[styles.dangerRow, styles.infoRowBorder, isCancellingMembership || hasPendingCancellation ? styles.disabledRow : null]}
                    onPress={handleCancelMembership}>
                    <View style={styles.dangerRowContent}>
                      <View style={styles.dangerTextBlock}>
                        <AppText language={uiLanguage} variant="body" style={styles.dangerActionText}>
                          {copy.cancelMembership}
                        </AppText>
                        {hasPendingCancellation ? (
                          <AppText language={uiLanguage} variant="muted" style={styles.dangerHint}>
                            {copy.cancellationScheduledLabel}
                            {profile?.cancel_at ? ` • ${formatBillingDate(profile.cancel_at, uiLanguage)}` : ''}
                          </AppText>
                        ) : null}
                      </View>
                      {isCancellingMembership ? <ActivityIndicator color={theme.colors.text} size="small" /> : null}
                    </View>
                    <AppText language={uiLanguage} variant="body" style={styles.dangerChevron}>
                      ›
                    </AppText>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isDeletingAccount}
                  style={[styles.dangerRow, isDeletingAccount ? styles.disabledRow : null]}
                  onPress={handleDeleteAccount}>
                  <View style={styles.dangerRowContent}>
                    <View style={styles.dangerTextBlock}>
                      <AppText language={uiLanguage} variant="body" style={styles.dangerActionText}>
                        {copy.deleteAccount}
                      </AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.dangerHint}>
                        {copy.deleteAccountHint}
                      </AppText>
                    </View>
                    {isDeletingAccount ? <ActivityIndicator color={theme.colors.text} size="small" /> : null}
                  </View>
                  <AppText language={uiLanguage} variant="body" style={styles.dangerChevron}>
                    ›
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Card>

        <View style={styles.legalFooter}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/account/terms')}>
            <AppText language={uiLanguage} variant="caption" style={styles.legalFooterLink}>
              {copy.termsTitle}
            </AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/account/privacy')}>
            <AppText language={uiLanguage} variant="caption" style={styles.legalFooterLink}>
              {copy.privacyTitle}
            </AppText>
          </Pressable>
        </View>
      </Stack>
          </ResponsivePageShell>
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
  collapsibleChevron: {
    width: 24,
    minWidth: 24,
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: theme.typography.weights.regular,
  },
  moreTrigger: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  moreTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  moreCardContent: {
    gap: theme.spacing.xs,
    marginVertical: -(theme.spacing.lg - theme.spacing.sm),
  },
  moreBody: {
    borderTopWidth: 1,
    borderTopColor: '#D7D7D7',
    marginTop: -2,
  },
  billingLoadingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  billingInfoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  billingInfoValue: {
    flex: 1,
    textAlign: 'right',
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  billingPaymentsBlock: {
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  billingSectionLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  billingInvoiceRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  billingInvoiceTextBlock: {
    flex: 1,
    gap: 2,
  },
  billingInvoiceAmount: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  billingStatus: {
    color: theme.colors.mutedText,
    textAlign: 'right',
  },
  billingEmptyText: {
    color: theme.colors.mutedText,
    paddingVertical: theme.spacing.sm,
  },
  legalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  legalFooterLink: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  dangerRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dangerRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  dangerTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  disabledRow: {
    opacity: 0.6,
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
    fontSize: 28,
    lineHeight: 24,
  },
});
