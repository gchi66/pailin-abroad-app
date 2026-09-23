import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CustomerInfo, PurchasesPackage, PURCHASES_ERROR_CODE, PurchasesError } from 'react-native-purchases';
import { usePostHog } from 'posthog-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPricing, PricingPlan } from '@/src/api/pricing';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import {
  getPlanPackageMap,
  getRevenueCatCustomerInfo,
  getRevenueCatOffering,
  hasRevenueCatFullAccess,
  initializeRevenueCat,
  isRevenueCatAvailable,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '@/src/lib/revenuecat';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';
type MembershipSource = 'onboarding' | 'free-account' | 'guest';
type PaidPlanId = 'lifetime' | 'monthly' | '3-month';
type SelectionId = PaidPlanId | 'free';
type PlanId = 'monthly' | '3-month' | '6-month' | 'lifetime';

type PricingState = {
  loading: boolean;
  error: string | null;
  regionKey: string | null;
  currency: string | null;
  plans: PricingPlan[];
};

type PaidPlan = {
  id: PaidPlanId;
  title: string;
  price: string;
  summaryPrice: string;
  totalPrice: number;
  originalTotalPrice: number | null;
  originalMonthlyPrice: number | null;
  billingCurrency: string;
  periodLabel?: string;
  savingsSummary?: string | null;
};

const INITIAL_PRICING_STATE: PricingState = {
  loading: true,
  error: null,
  regionKey: null,
  currency: null,
  plans: [],
};

const THB_FALLBACKS = {
  lifetime: 4999,
  monthly: 450,
  threeMonthMonthly: 350,
};

const USD_FALLBACKS = {
  lifetime: 149,
  monthly: 14.99,
  threeMonthMonthly: 11.99,
};

const normalizeSource = (value: string | string[] | undefined, fallback: MembershipSource): MembershipSource => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'onboarding' || raw === 'free-account' || raw === 'guest') {
    return raw;
  }
  if (raw === 'free') {
    return 'free-account';
  }
  return fallback;
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'Take your learning\nto the next level!',
      subtitle: 'Explore our plans to find the best fit for your learning journey.',
      lifetimeTitle: 'Lifetime Membership',
      fullTitle: 'Full Membership',
      freeTitle: 'Free Account',
      monthlyToggle: 'Monthly',
      threeMonthToggle: '3 Months',
      monthLabel: 'month',
      joinCta: 'JOIN NOW!',
      joinLoading: 'PROCESSING...',
      freeCta: 'CONTINUE WITH FREE ACCOUNT',
      loadingErrorTitle: 'เกิดข้อผิดพลาด',
      loadingErrorBody: 'เราไม่สามารถโหลดราคาสมาชิกได้ กรุณาลองใหม่อีกครั้ง',
      purchaseUnavailableTitle: 'Products unavailable',
      purchaseUnavailableBody: "We couldn't load the membership products right now. Please try again.",
      restoreCta: 'Restore Purchases',
      restoreLoading: 'Restoring...',
      restoreNoPurchasesTitle: 'No purchases found',
      restoreNoPurchasesBody: "We couldn't find any previous purchases to restore for this Apple ID.",
      restoreSuccessTitle: 'Purchases restored',
      restoreSuccessBody: 'Your membership access has been restored.',
      alreadyMemberTitle: 'You already have full access',
      alreadyMemberBody: 'This account is already unlocked.',
      guaranteeLineOne: "100% money-back guarantee within 30 days of your purchase if you're not completely satisfied with your membership.",
      guaranteeLineTwo: "But, we're confident you'll love Pailin Abroad!",
      lifetimeFeatures: [
        'Pay once, learn forever',
        'Full membership + all future updates',
        'One simple payment, no renewals',
      ],
      paidFeatures: [
        'AI-guided speaking practice',
        'Access to full lesson library, over 250 lessons!',
        'Access to full Exercise Bank',
        'Access to all topics in Topic Library',
        'Detailed stats on your progress',
      ],
      freeFeatures: [
        'Access to 16 free lessons',
        'Access to featured exercises in Exercise Bank',
        'Access to featured topics in Topic Library',
      ],
      lifetimeSummary: 'No renewals - Full access for life!',
      threeMonthSavings: (amount: string) => `You're saving ${amount} total with this plan!`,
    };
  }

  return {
    title: 'Take your learning\nto the next level!',
    subtitle: 'Explore our plans to find the best fit for your learning journey.',
    lifetimeTitle: 'Lifetime Membership',
    fullTitle: 'Full Membership',
    freeTitle: 'Free Account',
    monthlyToggle: 'Monthly',
    threeMonthToggle: '3 Months',
    monthLabel: 'month',
    joinCta: 'JOIN NOW!',
    joinLoading: 'PROCESSING...',
    freeCta: 'CONTINUE WITH FREE ACCOUNT',
    loadingErrorTitle: 'Something went wrong',
    loadingErrorBody: "We couldn't load membership pricing. Please try again.",
    purchaseUnavailableTitle: 'Products unavailable',
    purchaseUnavailableBody: "We couldn't load the membership products right now. Please try again.",
    restoreCta: 'Restore Purchases',
    restoreLoading: 'Restoring...',
    restoreNoPurchasesTitle: 'No purchases found',
    restoreNoPurchasesBody: "We couldn't find any previous purchases to restore for this Apple ID.",
    restoreSuccessTitle: 'Purchases restored',
    restoreSuccessBody: 'Your membership access has been restored.',
    alreadyMemberTitle: 'You already have full access',
    alreadyMemberBody: 'This account is already unlocked.',
    guaranteeLineOne: "100% money-back guarantee within 30 days of your purchase if you're not completely satisfied with your membership.",
    guaranteeLineTwo: "But, we're confident you'll love Pailin Abroad!",
    lifetimeFeatures: [
      'Pay once, learn forever',
      'Full membership + all future updates',
      'One simple payment, no renewals',
    ],
    paidFeatures: [
      'AI-guided speaking practice',
      'Access to full lesson library, over 250 lessons!',
      'Access to full Exercise Bank',
      'Access to all topics in Topic Library',
      'Detailed stats on your progress',
    ],
    freeFeatures: [
      'Access to 16 free lessons',
      'Access to featured exercises in Exercise Bank',
      'Access to featured topics in Topic Library',
    ],
    lifetimeSummary: 'No renewals - Full access for life!',
    threeMonthSavings: (amount: string) => `You're saving ${amount} total with this plan!`,
  };
};

const formatAmount = (value: number, maximumFractionDigits = 2, minimumFractionDigits = 0) =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits, minimumFractionDigits });

const buildPriceWithSymbol = (
  currency: string | null,
  value: number,
  maximumFractionDigits = 2,
  minimumFractionDigits = 0
) => {
  if (currency === 'USD') {
    return `$${formatAmount(value, maximumFractionDigits, minimumFractionDigits)}`;
  }
  if (currency === 'THB') {
    return `฿${formatAmount(value, 0)}`;
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        currency,
        maximumFractionDigits,
        minimumFractionDigits,
        style: 'currency',
      }).format(value);
    } catch {
      return `${currency} ${formatAmount(value, maximumFractionDigits, minimumFractionDigits)}`;
    }
  }
  return `฿${formatAmount(value, 0)}`;
};

const getFallbacks = (currency: string | null) => currency === 'USD' ? USD_FALLBACKS : THB_FALLBACKS;

const findPricingPlan = (plans: PricingPlan[], id: 'monthly' | '3-month') =>
  plans.find((plan) => plan.billing_period === id) ?? null;

const buildPaidPlans = (
  copy: ReturnType<typeof getCopy>,
  pricingState: PricingState,
  availablePackages: Partial<Record<PlanId, PurchasesPackage>>
): Record<PaidPlanId, PaidPlan> => {
  const currency = pricingState.currency ?? 'THB';
  const fallbacks = getFallbacks(currency);
  const lifetimePackage = availablePackages.lifetime;
  const monthlyPackage = availablePackages.monthly;
  const threeMonthPackage = availablePackages['3-month'];
  const monthlyPricing = findPricingPlan(pricingState.plans, 'monthly');
  const threeMonthPricing = findPricingPlan(pricingState.plans, '3-month');
  const lifetimeCurrency = lifetimePackage?.product.currencyCode ?? currency;
  const monthlyCurrency = monthlyPackage?.product.currencyCode ?? currency;
  const threeMonthCurrency = threeMonthPackage?.product.currencyCode ?? currency;
  const lifetimeTotal = lifetimePackage?.product.price ?? fallbacks.lifetime;
  const monthlyTotal = monthlyPackage?.product.price ?? Number(monthlyPricing?.amount_total ?? monthlyPricing?.amount_per_month ?? fallbacks.monthly);
  const threeMonthTotal =
    threeMonthPackage?.product.price ??
    Number(threeMonthPricing?.amount_total ?? (threeMonthPricing?.amount_per_month ? Number(threeMonthPricing.amount_per_month) * 3 : fallbacks.threeMonthMonthly * 3));
  const threeMonthMonthly = threeMonthTotal / 3;
  const canCompareRecurringPrices = monthlyCurrency === threeMonthCurrency;
  const comparisonTotal = canCompareRecurringPrices ? monthlyTotal * 3 : null;
  const threeMonthSavingsAmount = comparisonTotal === null ? null : comparisonTotal - threeMonthTotal;
  const hasThreeMonthSavings = threeMonthSavingsAmount !== null && threeMonthSavingsAmount > 0;
  const threeMonthOriginalMonthly = hasThreeMonthSavings ? monthlyTotal : null;
  const threeMonthOriginalTotal = hasThreeMonthSavings ? comparisonTotal : null;
  const threeMonthSavingsSummary = threeMonthSavingsAmount !== null && threeMonthSavingsAmount > 0
    ? copy.threeMonthSavings(buildPriceWithSymbol(threeMonthCurrency, threeMonthSavingsAmount))
    : null;

  return {
    lifetime: {
      id: 'lifetime',
      title: copy.lifetimeTitle,
      price: lifetimePackage?.product.priceString ?? buildPriceWithSymbol(lifetimeCurrency, lifetimeTotal),
      summaryPrice: lifetimePackage?.product.priceString ?? buildPriceWithSymbol(lifetimeCurrency, lifetimeTotal),
      totalPrice: lifetimeTotal,
      originalTotalPrice: null,
      originalMonthlyPrice: null,
      billingCurrency: lifetimeCurrency,
    },
    monthly: {
      id: 'monthly',
      title: copy.fullTitle,
      price: monthlyPackage?.product.priceString ?? buildPriceWithSymbol(monthlyCurrency, monthlyTotal),
      summaryPrice: monthlyPackage?.product.priceString ?? buildPriceWithSymbol(monthlyCurrency, monthlyTotal),
      totalPrice: monthlyTotal,
      originalTotalPrice: null,
      originalMonthlyPrice: null,
      billingCurrency: monthlyCurrency,
      periodLabel: copy.monthLabel,
    },
    '3-month': {
      id: '3-month',
      title: copy.fullTitle,
      price: buildPriceWithSymbol(threeMonthCurrency, threeMonthMonthly),
      summaryPrice: buildPriceWithSymbol(threeMonthCurrency, threeMonthTotal),
      totalPrice: threeMonthTotal,
      originalTotalPrice: threeMonthOriginalTotal,
      originalMonthlyPrice: threeMonthOriginalMonthly,
      billingCurrency: threeMonthCurrency,
      periodLabel: copy.monthLabel,
      savingsSummary: threeMonthSavingsSummary,
    },
  };
};

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );
}

function FeatureRow({ children, muted, uiLanguage }: { children: string; muted?: boolean; uiLanguage: UiLanguage }) {
  return (
    <View style={styles.featureRow}>
      <MaterialIcons name="check" size={15} color={muted ? '#AEB4B8' : '#8CC63E'} />
      <AppText language={uiLanguage} variant="caption" style={[styles.featureText, muted ? styles.featureTextMuted : null]}>
        {children}
      </AppText>
    </View>
  );
}

type PlanCardProps = {
  selected: boolean;
  onPress: () => void;
  title: string;
  price?: string;
  originalPrice?: string | null;
  periodLabel?: string;
  features: string[];
  uiLanguage: UiLanguage;
  tone: 'lifetime' | 'paid' | 'free';
};

function PlanCard({ selected, onPress, title, price, originalPrice, periodLabel, features, uiLanguage, tone }: PlanCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.planCard,
        tone === 'lifetime' ? styles.lifetimeCard : null,
        tone === 'paid' ? styles.paidCard : null,
        tone === 'free' ? styles.freeCard : null,
        selected ? styles.selectedPlanCard : null,
      ]}>
      <View
        style={[
          styles.planCardHeader,
          tone === 'lifetime' ? styles.lifetimeHeader : null,
          tone === 'paid' ? styles.paidHeader : null,
          tone === 'free' ? styles.freeHeader : null,
        ]}>
        <View style={styles.cardTitleRow}>
          <RadioDot selected={selected} />
          <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
            {title}
          </AppText>
        </View>
        {price ? (
          <View style={styles.cardPriceRow}>
            {originalPrice ? (
              <AppText language={uiLanguage} variant="caption" style={styles.cardOriginalPrice}>
                {originalPrice}
              </AppText>
            ) : null}
            <AppText language={uiLanguage} variant="body" style={styles.cardPrice}>
              {price}
            </AppText>
            {periodLabel ? (
              <AppText language={uiLanguage} variant="caption" style={styles.cardPeriod}>
                / {periodLabel}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={styles.planCardBody}>
        {features.map((feature) => (
          <FeatureRow key={feature} muted={tone === 'free'} uiLanguage={uiLanguage}>
            {feature}
          </FeatureRow>
        ))}
      </View>
    </Pressable>
  );
}

type MembershipScreenProps = {
  source?: MembershipSource;
};

export function MembershipScreen({ source: sourceOverride }: MembershipScreenProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const insets = useSafeAreaInsets();
  const { hasAccount, hasMembership, isGuestMode, refreshMembershipAccess } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const copy = useMemo(() => getCopy(uiLanguage), [uiLanguage]);
  const posthog = usePostHog();
  const isNativeApp = Platform.OS !== 'web';
  const fallbackSource: MembershipSource = isGuestMode && !hasAccount ? 'guest' : 'free-account';
  const source = sourceOverride ?? normalizeSource(params.source, fallbackSource);
  const showCloseButton = source !== 'onboarding';
  const showFreeAccountOption = source === 'onboarding' || source === 'guest';
  const successRoute = source === 'free-account' ? '/(tabs)' : '/placement-entry';
  const closeRoute = '/(tabs)/account';
  const [selectedOption, setSelectedOption] = useState<SelectionId>('lifetime');
  const [recurringPeriod, setRecurringPeriod] = useState<'monthly' | '3-month'>('monthly');
  const [pricingState, setPricingState] = useState<PricingState>(INITIAL_PRICING_STATE);
  const [availablePackages, setAvailablePackages] = useState<Partial<Record<PlanId, PurchasesPackage>>>({});
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [stickyFooterHeight, setStickyFooterHeight] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      try {
        const data = await getPricing();
        if (cancelled) return;
        setPricingState({
          loading: false,
          error: null,
          regionKey: data.region_key,
          currency: data.currency,
          plans: data.plans ?? [],
        });
      } catch (error) {
        if (cancelled) return;
        setPricingState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load pricing',
          regionKey: null,
          currency: null,
          plans: [],
        });
      }
    };

    void loadPricing();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRevenueCatProducts = async () => {
      if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !isRevenueCatAvailable()) {
        return;
      }

      try {
        await initializeRevenueCat();
        const [offering, nextCustomerInfo] = await Promise.all([getRevenueCatOffering(), getRevenueCatCustomerInfo()]);
        if (cancelled) return;
        setAvailablePackages(getPlanPackageMap(offering));
        setCustomerInfo(nextCustomerInfo);
      } catch (error) {
        console.warn('[revenuecat] failed to load products', error);
      }
    };

    void loadRevenueCatProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showFreeAccountOption && selectedOption === 'free') {
      setSelectedOption('lifetime');
    }
  }, [selectedOption, showFreeAccountOption]);

  const paidPlans = useMemo(
    () => buildPaidPlans(copy, pricingState, availablePackages),
    [availablePackages, copy, pricingState]
  );
  const selectedPaidPlanId: PaidPlanId | null =
    selectedOption === 'free' ? null : selectedOption === 'lifetime' ? 'lifetime' : recurringPeriod;
  const selectedPaidPlan = selectedPaidPlanId ? paidPlans[selectedPaidPlanId] : null;
  const selectedPackage = selectedPaidPlan ? availablePackages[selectedPaidPlan.id] ?? null : null;
  const alreadyHasRevenueCatAccess = hasMembership || hasRevenueCatFullAccess(customerInfo);

  const handleSelectRecurringPeriod = (period: 'monthly' | '3-month') => {
    setRecurringPeriod(period);
    setSelectedOption(period);
    posthog.capture('membership_plan_selected', {
      plan_id: period,
      source,
    });
  };

  const handleContinueFree = () => {
    posthog.capture('membership_free_account_selected', { source });
    router.replace(successRoute as never);
  };

  const handleJoinPress = async () => {
    if (!selectedPaidPlan) {
      handleContinueFree();
      return;
    }

    if (alreadyHasRevenueCatAccess) {
      Alert.alert(copy.alreadyMemberTitle, copy.alreadyMemberBody);
      return;
    }

    if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !selectedPackage) {
      Alert.alert(copy.purchaseUnavailableTitle, copy.purchaseUnavailableBody);
      return;
    }

    try {
      setPurchaseInProgress(true);
      const result = await purchaseRevenueCatPackage(selectedPackage);
      setCustomerInfo(result.customerInfo);
      await refreshMembershipAccess();
      posthog.capture('membership_purchased', {
        plan_id: selectedPaidPlan.id,
        plan_duration: selectedPaidPlan.title,
        is_lifetime: selectedPaidPlan.id === 'lifetime',
        total_price: selectedPaidPlan.totalPrice,
        source,
      });
      router.replace({
        pathname: '/purchase-success',
        params: { returnTo: successRoute },
      });
    } catch (error) {
      const purchasesError = error as Partial<PurchasesError> | null;
      const didUserCancel =
        purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || purchasesError?.userCancelled === true;

      if (didUserCancel) {
        posthog.capture('membership_purchase_cancelled', {
          plan_id: selectedPaidPlan.id,
          plan_duration: selectedPaidPlan.title,
          source,
        });
        return;
      }

      const message = error instanceof Error ? error.message : copy.loadingErrorBody;
      Alert.alert(copy.loadingErrorTitle, message);
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const handleRestorePress = async () => {
    if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !isRevenueCatAvailable()) {
      Alert.alert(copy.purchaseUnavailableTitle, copy.purchaseUnavailableBody);
      return;
    }

    posthog.capture('membership_restore_pressed', { source });
    try {
      setRestoreInProgress(true);
      const restoredCustomerInfo = await restoreRevenueCatPurchases();
      setCustomerInfo(restoredCustomerInfo);
      await refreshMembershipAccess();

      if (!hasRevenueCatFullAccess(restoredCustomerInfo)) {
        Alert.alert(copy.restoreNoPurchasesTitle, copy.restoreNoPurchasesBody);
        return;
      }

      Alert.alert(copy.restoreSuccessTitle, copy.restoreSuccessBody, [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/purchase-success',
              params: { returnTo: successRoute },
            }),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.loadingErrorBody;
      Alert.alert(copy.loadingErrorTitle, message);
    } finally {
      setRestoreInProgress(false);
    }
  };

  if (pricingState.loading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  if (pricingState.error) {
    return <PageLoadingState language={uiLanguage} errorTitle={copy.loadingErrorTitle} errorBody={copy.loadingErrorBody} />;
  }

  const recurringPlan = paidPlans[recurringPeriod];
  const ctaTitle = selectedOption === 'free' ? copy.freeCta : purchaseInProgress ? copy.joinLoading : copy.joinCta;
  const summaryOriginalPrice = selectedPaidPlan?.originalTotalPrice
    ? buildPriceWithSymbol(selectedPaidPlan.billingCurrency, selectedPaidPlan.originalTotalPrice)
    : null;
  const summaryHintText = selectedPaidPlan
    ? selectedPaidPlan.id === 'lifetime'
      ? copy.lifetimeSummary
      : selectedPaidPlan.savingsSummary ?? ''
    : '';
  const recurringOriginalPrice = recurringPlan.originalMonthlyPrice
    ? buildPriceWithSymbol(recurringPlan.billingCurrency, recurringPlan.originalMonthlyPrice)
    : null;
  const renderSummary = () =>
    selectedOption !== 'free' && selectedPaidPlan ? (
      <View style={[styles.summaryBlock, styles.stickySummaryBlock]}>
        {summaryOriginalPrice ? (
          <AppText language={uiLanguage} variant="caption" style={styles.summaryOriginalPrice}>
            {summaryOriginalPrice}
          </AppText>
        ) : null}
        <AppText language={uiLanguage} variant="title" style={styles.summaryPrice}>
          {selectedPaidPlan.summaryPrice}
        </AppText>
        {summaryHintText ? (
          <AppText language={uiLanguage} variant="caption" style={styles.summaryHint}>
            {summaryHintText}
          </AppText>
        ) : null}
      </View>
    ) : null;
  const renderPrimaryCta = () => (
    <Button
      language={uiLanguage}
      onPress={selectedOption === 'free' ? handleContinueFree : handleJoinPress}
      disabled={purchaseInProgress}
      style={styles.primaryCta}
      textStyle={styles.primaryCtaText}
      title={ctaTitle}
    />
  );
  const renderRestorePurchases = () =>
    isNativeApp ? (
      <Pressable
        accessibilityRole="button"
        onPress={handleRestorePress}
        disabled={restoreInProgress}
        style={styles.restoreButton}>
        <AppText language={uiLanguage} variant="caption" style={styles.restoreText}>
          {restoreInProgress ? copy.restoreLoading : copy.restoreCta}
        </AppText>
      </Pressable>
    ) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: showCloseButton ? 18 : 44,
            paddingBottom: Math.max(stickyFooterHeight, 170) + 24,
          },
        ]}>
        <ResponsivePageShell>
          <Stack gap="lg">
            {showCloseButton ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiLanguage === 'th' ? 'ปิดหน้าสมาชิก' : 'Close membership page'}
                onPress={() => router.replace(closeRoute as never)}
                style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            ) : null}

            <View style={styles.headerBlock}>
              <AppText language={uiLanguage} variant="title" style={styles.title}>
                {copy.title}
              </AppText>
              <AppText language={uiLanguage} variant="caption" style={styles.subtitle}>
                {copy.subtitle}
              </AppText>
            </View>

            <PlanCard
              selected={selectedOption === 'lifetime'}
              onPress={() => {
                setSelectedOption('lifetime');
                posthog.capture('membership_plan_selected', { plan_id: 'lifetime', source });
              }}
              title={copy.lifetimeTitle}
              price={paidPlans.lifetime.price}
              features={copy.lifetimeFeatures}
              uiLanguage={uiLanguage}
              tone="lifetime"
            />

            <View style={styles.toggleWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: recurringPeriod === 'monthly' }}
                onPress={() => handleSelectRecurringPeriod('monthly')}
                style={[
                  styles.toggleOption,
                  recurringPeriod === 'monthly' ? [styles.toggleOptionSelected, styles.toggleOptionSelectedMonthly] : null,
                ]}>
                <AppText
                  language={uiLanguage}
                  variant="caption"
                  style={[styles.toggleText, recurringPeriod === 'monthly' ? styles.toggleTextSelected : null]}>
                  {copy.monthlyToggle}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: recurringPeriod === '3-month' }}
                onPress={() => handleSelectRecurringPeriod('3-month')}
                style={[
                  styles.toggleOption,
                  recurringPeriod === '3-month' ? [styles.toggleOptionSelected, styles.toggleOptionSelectedThreeMonth] : null,
                ]}>
                <AppText
                  language={uiLanguage}
                  variant="caption"
                  style={[styles.toggleText, recurringPeriod === '3-month' ? styles.toggleTextSelected : null]}>
                  {copy.threeMonthToggle}
                </AppText>
              </Pressable>
            </View>

            <PlanCard
              selected={selectedOption === 'monthly' || selectedOption === '3-month'}
              onPress={() => {
                setSelectedOption(recurringPeriod);
                posthog.capture('membership_plan_selected', { plan_id: recurringPeriod, source });
              }}
              title={copy.fullTitle}
              price={recurringPlan.price}
              originalPrice={recurringOriginalPrice}
              periodLabel={copy.monthLabel}
              features={copy.paidFeatures}
              uiLanguage={uiLanguage}
              tone="paid"
            />

            {showFreeAccountOption ? (
              <PlanCard
                selected={selectedOption === 'free'}
                onPress={() => setSelectedOption('free')}
                title={copy.freeTitle}
                features={copy.freeFeatures}
                uiLanguage={uiLanguage}
                tone="free"
              />
            ) : null}

            <View style={styles.guaranteeBlock}>
              <AppText language={uiLanguage} variant="caption" style={styles.guaranteeText}>
                {copy.guaranteeLineOne}
              </AppText>
              <AppText language={uiLanguage} variant="caption" style={styles.guaranteeText}>
                {copy.guaranteeLineTwo}
              </AppText>
            </View>
          </Stack>
        </ResponsivePageShell>
      </ScrollView>
      <View
        onLayout={(event) => {
          const nextHeight = Math.ceil(event.nativeEvent.layout.height);
          setStickyFooterHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
        }}
        style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {renderSummary()}
        {renderPrimaryCta()}
        {renderRestorePurchases()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
  },
  headerBlock: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 2,
  },
  title: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
  },
  subtitle: {
    color: '#525A63',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },
  planCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  selectedPlanCard: {
    borderColor: '#E5B40B',
    boxShadow: '0px 0px 12px #F6D867',
  },
  lifetimeCard: {
    borderColor: '#E6B600',
  },
  paidCard: {
    borderColor: theme.colors.border,
  },
  freeCard: {
    borderColor: theme.colors.border,
  },
  planCardHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  lifetimeHeader: {
    backgroundColor: '#FFE997',
  },
  paidHeader: {
    backgroundColor: '#B5E6F7',
  },
  freeHeader: {
    backgroundColor: '#DEDEDE',
  },
  cardTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4F8BEF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioOuterSelected: {
    borderColor: '#1F64FF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#1F64FF',
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 5,
  },
  cardOriginalPrice: {
    color: '#7E858C',
    textDecorationLine: 'line-through',
    fontSize: 11,
    lineHeight: 14,
  },
  cardPrice: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: theme.typography.weights.bold,
  },
  cardPeriod: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 13,
  },
  planCardBody: {
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  featureTextMuted: {
    color: '#2F3438',
  },
  toggleWrap: {
    alignSelf: 'center',
    width: 250,
    height: 34,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginVertical: 10,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptionSelected: {
    backgroundColor: '#FFFCEB',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    marginVertical: -1,
  },
  toggleOptionSelectedMonthly: {
    marginLeft: -1,
  },
  toggleOptionSelectedThreeMonth: {
    marginRight: -1,
  },
  toggleText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: theme.typography.weights.regular,
  },
  toggleTextSelected: {
    fontWeight: theme.typography.weights.bold,
  },
  guaranteeBlock: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  guaranteeText: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
  },
  summaryBlock: {
    alignItems: 'center',
    minHeight: 38,
    justifyContent: 'center',
    gap: 1,
    marginTop: -14,
    marginBottom: -18,
  },
  stickySummaryBlock: {
    marginTop: 0,
    marginBottom: 0,
  },
  summaryOriginalPrice: {
    color: '#6D747B',
    textDecorationLine: 'line-through',
    fontSize: 14,
    lineHeight: 18,
  },
  summaryPrice: {
    color: theme.colors.text,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: theme.typography.weights.bold,
  },
  summaryHint: {
    color: '#A0A5AA',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
  },
  primaryCta: {
    minHeight: 50,
    borderWidth: 2,
    borderRadius: 999,
    borderColor: theme.colors.border,
    backgroundColor: '#2D66E8',
    boxShadow: '4px 4px 0px #1E1E1E',
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  restoreButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restoreText: {
    color: '#2D66E8',
    fontWeight: theme.typography.weights.bold,
    textDecorationLine: 'underline',
  },
  stickyFooter: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#D9DDE2',
    backgroundColor: '#F5F6F8',
  },
});
