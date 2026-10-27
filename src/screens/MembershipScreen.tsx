import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CustomerInfo,
  INTRO_ELIGIBILITY_STATUS,
  IntroEligibility,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
  PurchasesError,
} from 'react-native-purchases';
import { usePostHog } from 'posthog-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable as Pressable } from '@/src/components/ui/MotionPressable';

import pailinThumbsUpHead from '@/assets/images/characters/pailin_thumbs_up_head.webp';
import pailinLessonFinished from '@/assets/images/speaking-coach/pailin-lesson-finished.webp';
import { getPricing, PricingPlan } from '@/src/api/pricing';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import {
  getMembershipPromotionCopy,
  MEMBERSHIP_PROMOTION,
} from '@/src/config/membership-promotion';
import {
  getPlanPackageMap,
  getRevenueCatCustomerInfo,
  getRevenueCatIntroEligibility,
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
type PlanId = 'monthly' | '3-month' | '6-month' | 'lifetime' | 'lifetime-promo';

type PricingState = {
  loading: boolean;
  error: string | null;
  regionKey: string | null;
  currency: string | null;
  plans: PricingPlan[];
};

type PaidPlan = {
  id: PaidPlanId;
  packageId: PlanId;
  title: string;
  price: string;
  summaryPrice: string;
  totalPrice: number;
  originalTotalPrice: number | null;
  originalMonthlyPrice: number | null;
  originalPriceLabel?: string | null;
  billingCurrency: string;
  periodLabel?: string;
  savingsSummary?: string | null;
  introOffer?: IntroOfferInfo | null;
};

type IntroOfferInfo = {
  billingCycleCount: number;
  billingPeriodMonths: number;
  price: number;
  priceString: string;
};

type PlanCardCopy = {
  subtitle: string;
  details: string[];
};

const INITIAL_PRICING_STATE: PricingState = {
  loading: true,
  error: null,
  regionKey: null,
  currency: null,
  plans: [],
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
      title: 'พร้อมพูดภาษาอังกฤษ\nอย่างมั่นใจหรือยัง?',
      subtitle: 'เรียนภาษาอังกฤษที่ใช้ได้จริง ผ่านเรื่องราวของไพลินในลอสแอนเจลิส',
      lifetimeTitle: 'ตลอดชีพ',
      threeMonthTitle: '3 เดือน',
      monthlyTitle: '1 เดือน',
      monthLabel: 'เดือน',
      joinCta: 'เลือกแพ็กเกจนี้',
      joinLoading: 'กำลังดำเนินการ...',
      freeCta: 'ใช้งานบัญชีฟรีต่อ',
      guestFreeCta: 'สร้างบัญชีฟรี →',
      existingFreeCta: 'ใช้บัญชีฟรีต่อ →',
      planCta: (planId: PaidPlanId) => planId === 'lifetime'
        ? 'รับสิทธิ์ตลอดชีพ'
        : planId === '3-month'
          ? 'เลือกแพ็กเกจ 3 เดือน'
          : 'เลือกแพ็กเกจ 1 เดือน',
      savePercent: (percent: number) => `ประหยัด ${percent}%`,
      threeMonthTotal: (price: string) => `${price} ต่อ 3 เดือน`,
      introBilling: (price: string, billingMonths: number, totalMonths: number) =>
        billingMonths === 1
          ? `${price} ทุกเดือนใน ${totalMonths} เดือนแรก`
          : `${price} ทุก ${billingMonths} เดือนใน ${totalMonths} เดือนแรก`,
      thenBilling: (price: string, billingMonths: number) =>
        billingMonths === 1 ? `จากนั้น ${price} ทุกเดือน` : `จากนั้น ${price} ทุก ${billingMonths} เดือน`,
      lifetimeCard: {
        subtitle: 'รวมอัปเดตทั้งหมดในอนาคต',
        details: ['ชำระครั้งเดียว', 'ไม่มีการต่ออายุ'],
      } satisfies PlanCardCopy,
      threeMonthCard: {
        subtitle: 'เพื่อสร้างความมั่นใจอย่างต่อเนื่อง',
        details: ['ยกเลิกได้ทุกเมื่อ'],
      } satisfies PlanCardCopy,
      monthlyCard: {
        subtitle: 'สำหรับการเรียนที่ยืดหยุ่น',
        details: ['เรียกเก็บเงินทุกเดือน', 'ยกเลิกได้ทุกเมื่อ'],
      } satisfies PlanCardCopy,
      loadingErrorTitle: 'เกิดข้อผิดพลาด',
      loadingErrorBody: 'เราไม่สามารถโหลดราคาสมาชิกได้ กรุณาลองใหม่อีกครั้ง',
      purchaseUnavailableTitle: 'ยังไม่มีแพ็กเกจสมาชิกให้เลือก',
      purchaseUnavailableBody: 'ไม่สามารถโหลดแพ็กเกจสมาชิกได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      restoreCta: 'กู้คืนการซื้อ',
      restoreLoading: 'กำลังกู้คืน...',
      restoreNoPurchasesTitle: 'ไม่พบรายการซื้อ',
      restoreNoPurchasesBody: 'ไม่พบรายการซื้อก่อนหน้าที่สามารถกู้คืนได้สำหรับ Apple ID นี้',
      restoreSuccessTitle: 'กู้คืนการซื้อสำเร็จ',
      restoreSuccessBody: 'กู้คืนสิทธิ์การเข้าถึงสมาชิกของคุณแล้ว',
      alreadyMemberTitle: 'คุณมีสิทธิ์เข้าถึงแบบเต็มรูปแบบแล้ว',
      alreadyMemberBody: 'บัญชีนี้ปลดล็อกเนื้อหาทั้งหมดแล้ว',
      termsTitle: 'ข้อกำหนดและเงื่อนไข',
      privacyTitle: 'นโยบายความเป็นส่วนตัว',
      guaranteeLineOne: 'รับประกันคืนเงิน 100% ภายใน 30 วันนับจากวันที่ซื้อ หากคุณไม่พอใจกับการเป็นสมาชิกของคุณ',
      monthlyBilling: 'เรียกเก็บเงินรายเดือน และต่ออายุโดยอัตโนมัติจนกว่าจะยกเลิก',
      threeMonthBilling: 'เรียกเก็บเงินทุก 3 เดือน และต่ออายุโดยอัตโนมัติจนกว่าจะยกเลิก',
      lifetimeBilling: 'ชำระเงินครั้งเดียว ไม่มีการสมัครสมาชิกหรือการต่ออายุอัตโนมัติ',
      cancelAppStore: 'ยกเลิกได้ทุกเมื่อใน App Store',
      cancelGooglePlay: 'ยกเลิกได้ทุกเมื่อผ่าน Google Play',
      lifetimeFeatures: [
        'ชำระครั้งเดียว เรียนได้ตลอดชีพ',
        'สมาชิกแบบเต็มรูปแบบ พร้อมการอัปเดตทั้งหมดในอนาคต',
        'ชำระเพียงครั้งเดียว ไม่มีการต่ออายุ',
      ],
      paidFeatures: [
        'ฝึกพูดพร้อมคำแนะนำจาก AI',
        'เข้าถึงคลังบทเรียนทั้งหมด มากกว่า 250 บทเรียน!',
        'เข้าถึงแบบฝึกหัดทั้งหมดในคลังแบบฝึกหัด',
        'เข้าถึงทุกหัวข้อในคลังหัวข้อ',
        'ดูข้อมูลความก้าวหน้าในการเรียนแบบละเอียด',
      ],
      freeFeatures: [
        'เข้าถึงบทเรียนฟรี 16 บทเรียน',
        'เข้าถึงแบบฝึกหัดแนะนำในคลังแบบฝึกหัด',
        'เข้าถึงหัวข้อแนะนำในคลังหัวข้อ',
      ],
      lifetimeSummary: 'ไม่มีการต่ออายุ – เข้าถึงทุกอย่างได้ตลอดชีพ!',
      threeMonthSavings: (amount: string) => `แผนนี้ช่วยให้คุณประหยัดรวม ${amount}!`,
    };
  }

  return {
    title: 'Ready to speak English\nwith confidence?',
    subtitle: "Learn real English through Pailin’s journeys in L.A.",
    lifetimeTitle: 'Lifetime',
    threeMonthTitle: '3 Months',
    monthlyTitle: '1 Month',
    monthLabel: 'month',
    joinCta: 'CHOOSE THIS PLAN',
    joinLoading: 'PROCESSING...',
    freeCta: 'CONTINUE WITH FREE ACCOUNT',
    guestFreeCta: 'Make a free account →',
    existingFreeCta: 'Continue with free account →',
    planCta: (planId: PaidPlanId) => planId === 'lifetime'
      ? 'GET LIFETIME ACCESS'
      : planId === '3-month'
        ? 'GET 3-MONTH PLAN'
        : 'GET 1-MONTH PLAN',
    savePercent: (percent: number) => `SAVE ${percent}%`,
    threeMonthTotal: (price: string) => `${price} every 3 months`,
    introBilling: (price: string, billingMonths: number, totalMonths: number) =>
      billingMonths === 1
        ? `${price} every month for the first ${totalMonths} months`
        : `${price} every ${billingMonths} months for the first ${totalMonths} months`,
    thenBilling: (price: string, billingMonths: number) =>
      billingMonths === 1 ? `Then ${price} every month` : `Then ${price} every ${billingMonths} months`,
    lifetimeCard: {
      subtitle: 'All future updates included',
      details: ['One-time purchase', 'No renewals'],
    } satisfies PlanCardCopy,
    threeMonthCard: {
      subtitle: 'For building confidence',
      details: ['Cancel anytime'],
    } satisfies PlanCardCopy,
    monthlyCard: {
      subtitle: 'For flexible learning',
      details: ['Billed every month', 'Cancel anytime'],
    } satisfies PlanCardCopy,
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
    termsTitle: 'Terms of Use',
    privacyTitle: 'Privacy Policy',
    guaranteeLineOne: "100% money-back guarantee within 30 days of your purchase if you're not completely satisfied with your membership.",
    monthlyBilling: 'Billed monthly. Automatically renews until canceled.',
    threeMonthBilling: 'Billed every 3 months. Automatically renews until canceled.',
    lifetimeBilling: 'One-time payment. No subscription or automatic renewal.',
    cancelAppStore: 'Cancel anytime in the App Store.',
    cancelGooglePlay: 'Cancel anytime through Google Play.',
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

const findPricingPlan = (plans: PricingPlan[], id: PaidPlanId) =>
  plans.find((plan) => plan.billing_period === id) ?? null;

const getPeriodMonths = (unit: string | undefined, value: number | undefined, fallback: number) =>
  unit?.toUpperCase() === 'MONTH' && value ? value : fallback;

const getIntroOffer = (
  pkg: PurchasesPackage | undefined,
  eligibility: Record<string, IntroEligibility>,
  promotionEnabled: boolean
): IntroOfferInfo | null => {
  if (!pkg || !promotionEnabled) return null;

  if (Platform.OS === 'ios') {
    const intro = pkg.product.introPrice;
    const status = eligibility[pkg.product.identifier]?.status;
    if (!intro || status !== INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return null;
    return {
      billingCycleCount: intro.cycles,
      billingPeriodMonths: getPeriodMonths(intro.periodUnit, intro.periodNumberOfUnits, 1),
      price: intro.price,
      priceString: intro.priceString,
    };
  }

  if (Platform.OS === 'android') {
    const intro = pkg.product.defaultOption?.introPhase;
    if (!intro) return null;
    return {
      billingCycleCount: intro.billingCycleCount ?? 1,
      billingPeriodMonths: getPeriodMonths(
        String(intro.billingPeriod.unit),
        intro.billingPeriod.value,
        pkg.packageType === 'THREE_MONTH' ? 3 : 1
      ),
      price: intro.price.amountMicros / 1_000_000,
      priceString: intro.price.formatted,
    };
  }

  return null;
};

const getRegularPackagePrice = (pkg: PurchasesPackage | undefined) => {
  if (!pkg) return null;
  const androidFullPrice = Platform.OS === 'android' ? pkg.product.defaultOption?.fullPricePhase?.price : null;
  return {
    currency: androidFullPrice?.currencyCode ?? pkg.product.currencyCode,
    price: androidFullPrice ? androidFullPrice.amountMicros / 1_000_000 : pkg.product.price,
    priceString: androidFullPrice?.formatted ?? pkg.product.priceString,
  };
};

const buildPaidPlans = (
  copy: ReturnType<typeof getCopy>,
  pricingState: PricingState,
  availablePackages: Partial<Record<PlanId, PurchasesPackage>>,
  introEligibility: Record<string, IntroEligibility>,
  promotionEnabled: boolean
): Record<PaidPlanId, PaidPlan> | null => {
  const lifetimePackage = availablePackages.lifetime;
  const lifetimePromoPackage = promotionEnabled
    ? availablePackages['lifetime-promo']
    : undefined;
  const lifetimePurchasePackage = lifetimePromoPackage ?? lifetimePackage;
  const monthlyPackage = availablePackages.monthly;
  const threeMonthPackage = availablePackages['3-month'];
  const lifetimeStorePrice = getRegularPackagePrice(lifetimePurchasePackage);
  const lifetimeComparisonStorePrice = promotionEnabled
    ? getRegularPackagePrice(lifetimePackage)
    : null;
  const monthlyStorePrice = getRegularPackagePrice(monthlyPackage);
  const threeMonthStorePrice = getRegularPackagePrice(threeMonthPackage);
  const lifetimePricing = findPricingPlan(pricingState.plans, 'lifetime');
  const monthlyPricing = findPricingPlan(pricingState.plans, 'monthly');
  const threeMonthPricing = findPricingPlan(pricingState.plans, '3-month');
  const fallbackCurrency = pricingState.currency;
  const webPrice = (plan: PricingPlan | null) => plan && fallbackCurrency
    ? {
        currency: fallbackCurrency,
        price: Number(plan.amount_total ?? plan.amount_per_month),
        priceString: buildPriceWithSymbol(fallbackCurrency, Number(plan.amount_total ?? plan.amount_per_month)),
      }
    : null;
  const lifetimeRegular = lifetimeStorePrice ?? (Platform.OS === 'web' ? webPrice(lifetimePricing) : null);
  const monthlyRegular = monthlyStorePrice ?? (Platform.OS === 'web' ? webPrice(monthlyPricing) : null);
  const threeMonthRegular = threeMonthStorePrice ?? (Platform.OS === 'web' ? webPrice(threeMonthPricing) : null);

  if (!lifetimeRegular || !monthlyRegular || !threeMonthRegular) return null;

  const monthlyIntro = getIntroOffer(monthlyPackage, introEligibility, promotionEnabled);
  const threeMonthIntro = getIntroOffer(threeMonthPackage, introEligibility, promotionEnabled);
  const monthlyShown = monthlyIntro ?? monthlyRegular;
  const threeMonthShown = threeMonthIntro ?? threeMonthRegular;
  const threeMonthMonthly = threeMonthShown.price / 3;
  const lifetimeTotal = lifetimeRegular.price;
  const monthlyTotal = monthlyShown.price;
  const threeMonthTotal = threeMonthShown.price;
  const lifetimeCurrency = lifetimeRegular.currency;
  const monthlyCurrency = monthlyRegular.currency;
  const threeMonthCurrency = threeMonthRegular.currency;
  const canCompareRecurringPrices = monthlyCurrency === threeMonthCurrency;
  const comparisonTotal = canCompareRecurringPrices ? monthlyRegular.price * 3 : null;
  const threeMonthSavingsAmount = comparisonTotal === null ? null : comparisonTotal - threeMonthRegular.price;
  const hasThreeMonthSavings = threeMonthSavingsAmount !== null && threeMonthSavingsAmount > 0;
  const threeMonthOriginalMonthly = threeMonthIntro
    ? threeMonthRegular.price / 3
    : hasThreeMonthSavings ? monthlyRegular.price : null;
  const threeMonthOriginalTotal = hasThreeMonthSavings ? comparisonTotal : null;
  const threeMonthSavingsSummary = threeMonthSavingsAmount !== null && threeMonthSavingsAmount > 0
    ? copy.threeMonthSavings(buildPriceWithSymbol(threeMonthCurrency, threeMonthSavingsAmount))
    : null;
  return {
    lifetime: {
      id: 'lifetime',
      packageId: lifetimePromoPackage ? 'lifetime-promo' : 'lifetime',
      title: copy.lifetimeTitle,
      price: promotionEnabled && !lifetimePromoPackage ? '—' : lifetimeRegular.priceString,
      summaryPrice: promotionEnabled && !lifetimePromoPackage ? '—' : lifetimeRegular.priceString,
      totalPrice: lifetimeTotal,
      originalTotalPrice: lifetimeComparisonStorePrice?.price ?? null,
      originalMonthlyPrice: null,
      originalPriceLabel: promotionEnabled
        ? lifetimeComparisonStorePrice?.priceString ?? '—'
        : null,
      billingCurrency: lifetimeCurrency,
    },
    monthly: {
      id: 'monthly',
      packageId: 'monthly',
      title: copy.monthlyTitle,
      price: promotionEnabled && !monthlyIntro ? '—' : monthlyShown.priceString,
      summaryPrice: promotionEnabled && !monthlyIntro ? '—' : monthlyShown.priceString,
      totalPrice: monthlyTotal,
      originalTotalPrice: promotionEnabled ? monthlyRegular.price : null,
      originalMonthlyPrice: promotionEnabled ? monthlyRegular.price : null,
      billingCurrency: monthlyCurrency,
      periodLabel: copy.monthLabel,
      introOffer: monthlyIntro,
    },
    '3-month': {
      id: '3-month',
      packageId: '3-month',
      title: copy.threeMonthTitle,
      price: promotionEnabled && !threeMonthIntro
        ? '—'
        : buildPriceWithSymbol(threeMonthCurrency, threeMonthMonthly),
      summaryPrice: promotionEnabled && !threeMonthIntro
        ? '—'
        : buildPriceWithSymbol(threeMonthCurrency, threeMonthTotal),
      totalPrice: threeMonthTotal,
      originalTotalPrice: promotionEnabled ? threeMonthRegular.price : threeMonthOriginalTotal,
      originalMonthlyPrice: promotionEnabled ? threeMonthRegular.price / 3 : threeMonthOriginalMonthly,
      billingCurrency: threeMonthCurrency,
      periodLabel: copy.monthLabel,
      savingsSummary: threeMonthSavingsSummary,
      introOffer: threeMonthIntro,
    },
  };
};

function FeatureRow({ children, uiLanguage }: { children: string; uiLanguage: UiLanguage }) {
  return (
    <View style={styles.featureRow}>
      <MaterialIcons name="check" size={20} color="#2860E8" />
      <AppText language={uiLanguage} variant="caption" style={styles.featureText}>
        {children}
      </AppText>
    </View>
  );
}

function MembershipPromotionBanner({ uiLanguage }: { uiLanguage: UiLanguage }) {
  const promotionCopy = getMembershipPromotionCopy(uiLanguage);
  return (
    <View style={styles.membershipBanner}>
      <Image source={pailinThumbsUpHead} style={styles.membershipBannerArtwork} resizeMode="contain" accessible={false} />
      <View style={styles.membershipBannerCopy}>
        <View style={styles.membershipBannerEyebrowRow}>
          <AppText language={uiLanguage} variant="caption" style={styles.membershipBannerEyebrow}>
            {promotionCopy.eyebrow}
          </AppText>
          <AppText language="en" variant="caption" style={styles.membershipBannerStar}>🎉</AppText>
        </View>
        <AppText language={uiLanguage} variant="title" style={styles.membershipBannerTitle}>
          {promotionCopy.headlinePrefix}
          <Text style={styles.membershipBannerHighlight}>{promotionCopy.headlineHighlight}</Text>
        </AppText>
        <AppText language={uiLanguage} variant="caption" style={styles.membershipBannerBody}>
          {promotionCopy.detail}
        </AppText>
      </View>
    </View>
  );
}

const getSavingsPercent = (plan: PaidPlan) => {
  if (!plan.originalTotalPrice || plan.originalTotalPrice <= plan.totalPrice) {
    return null;
  }

  return Math.round((1 - plan.totalPrice / plan.originalTotalPrice) * 100);
};

type PricingPlanCardProps = {
  plan: PaidPlan;
  selected: boolean;
  onPress: () => void;
  copy: PlanCardCopy;
  savingsLabel?: string | null;
  totalLine?: string | null;
  uiLanguage: UiLanguage;
};

function PricingPlanCard({
  plan,
  selected,
  onPress,
  copy,
  savingsLabel,
  totalLine,
  uiLanguage,
}: PricingPlanCardProps) {
  return (
    <View style={[styles.planCardWrap, savingsLabel ? styles.planCardWrapWithBadge : null]}>
      {savingsLabel ? (
        <View pointerEvents="none" style={[styles.savingsPill, selected ? styles.selectedSavingsPill : null]}>
          <AppText language={uiLanguage} variant="caption" numberOfLines={1} style={styles.savingsPillText}>
            {savingsLabel}
          </AppText>
        </View>
      ) : null}
      <View pointerEvents="none" style={[styles.planCardShadow, selected ? styles.planCardShadowSelected : null]} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[
          styles.planCard,
          selected ? styles.selectedPlanCard : null,
        ]}>
        <View style={styles.planCopyColumn}>
          <AppText language={uiLanguage} variant="title" style={styles.planTitle}>
            {plan.title}
          </AppText>
          <AppText language={uiLanguage} variant="caption" style={styles.planSubtitle}>
            {copy.subtitle}
          </AppText>
          <View style={styles.planDetails}>
            {totalLine ? (
              <AppText language={uiLanguage} variant="caption" style={styles.planDetailText}>
                {totalLine}
              </AppText>
            ) : null}
            {copy.details.map((detail) => (
              <AppText key={detail} language={uiLanguage} variant="caption" style={styles.planDetailText}>
                {detail}
              </AppText>
            ))}
          </View>
        </View>
        <View style={styles.planPriceColumn}>
          {plan.originalPriceLabel || plan.originalMonthlyPrice || (plan.id === 'lifetime' && plan.originalTotalPrice) ? (
            <AppText language={uiLanguage} variant="caption" style={styles.planOriginalPrice}>
              {plan.originalPriceLabel
                ?? buildPriceWithSymbol(plan.billingCurrency, plan.originalMonthlyPrice ?? plan.originalTotalPrice ?? 0)}
            </AppText>
          ) : null}
          <AppText language={uiLanguage} variant="title" style={styles.planPrice}>
            {plan.price}
          </AppText>
          {plan.periodLabel ? (
            <AppText language={uiLanguage} variant="caption" style={styles.planPeriod}>
              / {plan.periodLabel}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

type MembershipScreenProps = {
  source?: MembershipSource;
};

export function MembershipScreen({ source: sourceOverride }: MembershipScreenProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string; source?: string }>();
  const insets = useSafeAreaInsets();
  const { hasAccount, hasMembership, isGuestMode, profile, refreshMembershipAccess } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const copy = useMemo(() => getCopy(uiLanguage), [uiLanguage]);
  const posthog = usePostHog();
  const isNativeApp = Platform.OS !== 'web';
  const fallbackSource: MembershipSource = isGuestMode && !hasAccount ? 'guest' : 'free-account';
  const source = sourceOverride ?? normalizeSource(params.source, fallbackSource);
  const requestedPreview = profile?.is_admin === true ? params.preview : undefined;
  const promotionEnabled = requestedPreview === 'promo'
    ? true
    : requestedPreview === 'regular'
      ? false
      : MEMBERSHIP_PROMOTION.enabled;
  const showCloseButton = source !== 'onboarding';
  const successRoute = source === 'free-account' ? '/(tabs)' : '/placement-entry';
  const closeRoute = '/(tabs)/account';
  const [selectedOption, setSelectedOption] = useState<PaidPlanId>('3-month');
  const [pricingState, setPricingState] = useState<PricingState>(
    isNativeApp ? { ...INITIAL_PRICING_STATE, loading: false } : INITIAL_PRICING_STATE
  );
  const [availablePackages, setAvailablePackages] = useState<Partial<Record<PlanId, PurchasesPackage>>>({});
  const [introEligibility, setIntroEligibility] = useState<Record<string, IntroEligibility>>({});
  const [storeProductsLoading, setStoreProductsLoading] = useState(isNativeApp);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [stickyFooterHeight, setStickyFooterHeight] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      // Native storefronts are the sole source of truth for native prices.
      // The API remains a web-only fallback because RevenueCat is unavailable there.
      if (isNativeApp) {
        return;
      }
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
  }, [isNativeApp]);

  useEffect(() => {
    let cancelled = false;

    const loadRevenueCatProducts = async () => {
      if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !isRevenueCatAvailable()) {
        if (!cancelled) setStoreProductsLoading(false);
        return;
      }

      try {
        await initializeRevenueCat();
        const [offering, nextCustomerInfo] = await Promise.all([getRevenueCatOffering(), getRevenueCatCustomerInfo()]);
        if (cancelled) return;
        const packages = getPlanPackageMap(offering);
        setAvailablePackages(packages);
        setCustomerInfo(nextCustomerInfo);
        if (Platform.OS === 'ios') {
          const productIds = [packages.monthly, packages['3-month']]
            .filter((pkg): pkg is PurchasesPackage => Boolean(pkg))
            .map((pkg) => pkg.product.identifier);
          const eligibility = await getRevenueCatIntroEligibility(productIds);
          if (!cancelled) setIntroEligibility(eligibility);
        }
      } catch (error) {
        console.warn('[revenuecat] failed to load products', error);
      } finally {
        if (!cancelled) setStoreProductsLoading(false);
      }
    };

    void loadRevenueCatProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const paidPlans = useMemo(
    () => buildPaidPlans(copy, pricingState, availablePackages, introEligibility, promotionEnabled),
    [availablePackages, copy, introEligibility, pricingState, promotionEnabled]
  );
  const selectedPaidPlan = paidPlans?.[selectedOption] ?? null;
  const selectedPackage = selectedPaidPlan ? availablePackages[selectedPaidPlan.packageId] ?? null : null;
  const alreadyHasRevenueCatAccess = hasMembership || hasRevenueCatFullAccess(customerInfo);
  const showPromotion = promotionEnabled;
  const selectedPromoPriceUnavailable = Boolean(
    showPromotion
      && selectedPaidPlan
      && (selectedPaidPlan.id === 'lifetime'
        ? selectedPaidPlan.packageId !== 'lifetime-promo'
        : !selectedPaidPlan.introOffer)
  );

  const handleSelectPlan = (planId: PaidPlanId) => {
    setSelectedOption(planId);
    posthog.capture('membership_plan_selected', {
      plan_id: planId,
      source,
    });
  };

  const handleContinueFree = () => {
    posthog.capture('membership_free_account_selected', { source });
    router.replace(successRoute as never);
  };

  const handleSecondaryAction = () => {
    if (source === 'guest') {
      posthog.capture('membership_free_account_selected', { source });
      router.replace('/account/auth');
      return;
    }

    if (source === 'free-account') {
      posthog.capture('membership_free_account_selected', { source });
      router.replace('/(tabs)/lessons/free-library');
      return;
    }

    handleContinueFree();
  };

  const handleJoinPress = async () => {
    if (alreadyHasRevenueCatAccess) {
      Alert.alert(copy.alreadyMemberTitle, copy.alreadyMemberBody);
      return;
    }

    if (
      (Platform.OS !== 'ios' && Platform.OS !== 'android')
      || !selectedPackage
      || !selectedPaidPlan
      || selectedPromoPriceUnavailable
    ) {
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

  if (storeProductsLoading || (!isNativeApp && pricingState.loading)) {
    return <PageLoadingState language={uiLanguage} />;
  }

  if ((!isNativeApp && pricingState.error) || !paidPlans) {
    return <PageLoadingState language={uiLanguage} errorTitle={copy.loadingErrorTitle} errorBody={copy.loadingErrorBody} />;
  }

  const ctaTitle = purchaseInProgress ? copy.joinLoading : copy.planCta(selectedOption);
  const summaryOriginalPrice = showPromotion && selectedPaidPlan
    ? selectedPaidPlan.id === 'lifetime'
      ? selectedPaidPlan.originalPriceLabel ?? null
      : selectedPaidPlan.originalTotalPrice
        ? buildPriceWithSymbol(selectedPaidPlan.billingCurrency, selectedPaidPlan.originalTotalPrice)
        : null
    : null;
  const billingDisclosureText = selectedPaidPlan
    ? selectedPaidPlan.introOffer && selectedPaidPlan.originalTotalPrice
      ? selectedPaidPlan.id === '3-month'
        ? copy.threeMonthBilling
        : copy.monthlyBilling
      : selectedPaidPlan.id === 'lifetime'
      ? copy.lifetimeBilling
      : selectedPaidPlan.id === '3-month'
        ? copy.threeMonthBilling
        : copy.monthlyBilling
    : '';
  const cancellationText = selectedPaidPlan?.id === 'monthly' || selectedPaidPlan?.id === '3-month'
    ? Platform.OS === 'ios'
      ? copy.cancelAppStore
      : Platform.OS === 'android'
        ? copy.cancelGooglePlay
        : ''
    : '';
  const threeMonthSavingsPercent = getSavingsPercent(paidPlans['3-month']);
  const recurringCardCopy = (plan: PaidPlan, baseCopy: PlanCardCopy, billingMonths: number): PlanCardCopy => {
    if (!plan.introOffer || !plan.originalTotalPrice) return baseCopy;
    return {
      subtitle: baseCopy.subtitle,
      details: [
        copy.introBilling(
          plan.introOffer.priceString,
          plan.introOffer.billingPeriodMonths,
          plan.introOffer.billingCycleCount * plan.introOffer.billingPeriodMonths
        ),
        copy.thenBilling(buildPriceWithSymbol(plan.billingCurrency, plan.originalTotalPrice), billingMonths),
      ],
    };
  };
  const secondaryCta = source === 'guest'
    ? copy.guestFreeCta
    : source === 'free-account'
      ? copy.existingFreeCta
      : copy.freeCta;
  const renderSummary = () =>
    selectedPaidPlan ? (
      <View style={[styles.summaryBlock, styles.stickySummaryBlock]}>
        {summaryOriginalPrice ? (
          <AppText language={uiLanguage} variant="caption" style={styles.summaryOriginalPrice}>
            {summaryOriginalPrice}
          </AppText>
        ) : null}
        <AppText language={uiLanguage} variant="title" style={styles.summaryPrice}>
          {selectedPaidPlan.summaryPrice}
        </AppText>
        {billingDisclosureText ? (
          <View style={styles.billingDisclosureBlock}>
            <AppText language={uiLanguage} variant="caption" style={styles.billingDisclosureText}>
              {billingDisclosureText}
            </AppText>
            {cancellationText ? (
              <AppText language={uiLanguage} variant="caption" style={styles.billingDisclosureText}>
                {cancellationText}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
    ) : null;
  const renderPrimaryCta = () => (
    <Button
      language={uiLanguage}
      onPress={handleJoinPress}
      disabled={purchaseInProgress || selectedPromoPriceUnavailable}
      style={styles.primaryCta}
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
                motionDisabled
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

            {showPromotion ? <MembershipPromotionBanner uiLanguage={uiLanguage} /> : null}

            <View style={[styles.benefitsSection, !showPromotion ? styles.standardBenefitsSection : null]}>
              <View style={[styles.benefitsList, !showPromotion ? styles.standardBenefitsList : null]}>
                {copy.paidFeatures.map((feature) => (
                  <FeatureRow key={feature} uiLanguage={uiLanguage}>{feature}</FeatureRow>
                ))}
              </View>
              {!showPromotion ? (
                <Image source={pailinLessonFinished} style={styles.standardBenefitsArtwork} resizeMode="contain" accessible={false} />
              ) : null}
            </View>

            <View style={styles.planList}>
              <PricingPlanCard
                plan={paidPlans.lifetime}
                selected={selectedOption === 'lifetime'}
                onPress={() => handleSelectPlan('lifetime')}
                copy={copy.lifetimeCard}
                savingsLabel={showPromotion ? copy.savePercent(MEMBERSHIP_PROMOTION.discounts.lifetime) : null}
                uiLanguage={uiLanguage}
              />
              <PricingPlanCard
                plan={paidPlans['3-month']}
                selected={selectedOption === '3-month'}
                onPress={() => handleSelectPlan('3-month')}
                copy={recurringCardCopy(paidPlans['3-month'], copy.threeMonthCard, 3)}
                savingsLabel={showPromotion
                  ? copy.savePercent(MEMBERSHIP_PROMOTION.discounts['3-month'])
                  : threeMonthSavingsPercent ? copy.savePercent(threeMonthSavingsPercent) : null}
                totalLine={showPromotion ? null : copy.threeMonthTotal(paidPlans['3-month'].summaryPrice)}
                uiLanguage={uiLanguage}
              />
              <PricingPlanCard
                plan={paidPlans.monthly}
                selected={selectedOption === 'monthly'}
                onPress={() => handleSelectPlan('monthly')}
                copy={recurringCardCopy(paidPlans.monthly, copy.monthlyCard, 1)}
                savingsLabel={showPromotion ? copy.savePercent(MEMBERSHIP_PROMOTION.discounts.monthly) : null}
                uiLanguage={uiLanguage}
              />
            </View>

            <Pressable accessibilityRole="link" onPress={handleSecondaryAction} style={styles.secondaryAction}>
              <AppText language={uiLanguage} variant="body" style={styles.secondaryActionText}>
                {secondaryCta}
              </AppText>
            </Pressable>

            <View style={styles.assuranceBlock}>
              <View style={styles.legalLinks}>
                {renderRestorePurchases()}
                {isNativeApp ? (
                  <AppText language={uiLanguage} variant="caption" style={styles.legalSeparator}>
                    ·
                  </AppText>
                ) : null}
                <Pressable accessibilityRole="link" onPress={() => router.push('/account/terms')}>
                  <AppText language={uiLanguage} variant="caption" style={styles.legalLinkText}>
                    {copy.termsTitle}
                  </AppText>
                </Pressable>
                <AppText language={uiLanguage} variant="caption" style={styles.legalSeparator}>
                  ·
                </AppText>
                <Pressable accessibilityRole="link" onPress={() => router.push('/account/privacy')}>
                  <AppText language={uiLanguage} variant="caption" style={styles.legalLinkText}>
                    {copy.privacyTitle}
                  </AppText>
                </Pressable>
              </View>
              <View style={styles.guaranteeBlock}>
                <AppText language={uiLanguage} variant="caption" style={styles.guaranteeText}>
                  {copy.guaranteeLineOne}
                </AppText>
              </View>
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
        <ResponsivePageShell style={styles.stickyFooterContent}>
          {renderSummary()}
          {renderPrimaryCta()}
        </ResponsivePageShell>
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
  membershipBanner: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: '#F4FF57',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  membershipBannerArtwork: {
    width: 92,
    height: 98,
    flexShrink: 0,
  },
  membershipBannerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  membershipBannerEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membershipBannerEyebrow: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.7,
  },
  membershipBannerStar: {
    color: '#FF57A3',
    fontSize: 18,
    lineHeight: 20,
  },
  membershipBannerTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: theme.typography.weights.bold,
  },
  membershipBannerHighlight: {
    color: '#FF3F91',
  },
  membershipBannerBody: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 15,
  },
  benefitsSection: {
    position: 'relative',
  },
  standardBenefitsSection: {
    minHeight: 132,
    justifyContent: 'center',
  },
  benefitsList: {
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  standardBenefitsList: {
    paddingRight: 112,
    zIndex: 1,
  },
  standardBenefitsArtwork: {
    position: 'absolute',
    right: -12,
    bottom: -52,
    width: 140,
    height: 140,
    transform: [{ scaleX: -1 }],
    zIndex: 0,
  },
  planList: {
    gap: 18,
    zIndex: 2,
  },
  planCardWrap: {
    position: 'relative',
  },
  planCardWrapWithBadge: {
    marginTop: 14,
  },
  planCardShadow: {
    position: 'absolute',
    top: 4,
    right: -4,
    bottom: -4,
    left: 4,
    borderRadius: 13,
    backgroundColor: 'transparent',
  },
  planCardShadowSelected: {
    backgroundColor: '#2860E8',
  },
  planCard: {
    minHeight: 122,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 2,
    borderColor: '#D8D8D8',
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectedPlanCard: {
    borderColor: '#2860E8',
    backgroundColor: '#BCECFF',
  },
  savingsPill: {
    position: 'absolute',
    zIndex: 3,
    elevation: 4,
    top: -14,
    right: 14,
    minWidth: 126,
    minHeight: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 999,
    backgroundColor: '#F4FF57',
    paddingHorizontal: 18,
    paddingVertical: 5,
  },
  selectedSavingsPill: {
    borderWidth: 2,
    borderColor: '#2860E8',
  },
  savingsPillText: {
    color: '#FF57A3',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  planCopyColumn: {
    flex: 1,
    minWidth: 0,
  },
  planTitle: {
    color: theme.colors.text,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: theme.typography.weights.bold,
  },
  planSubtitle: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: theme.typography.weights.bold,
  },
  planDetails: {
    gap: 1,
    marginTop: 10,
  },
  planDetailText: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 15,
  },
  planPriceColumn: {
    width: 96,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  planOriginalPrice: {
    color: '#8A8A8A',
    textDecorationLine: 'line-through',
    fontSize: 11,
    lineHeight: 15,
  },
  planPrice: {
    color: theme.colors.text,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: theme.typography.weights.bold,
  },
  planPeriod: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  featureText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.regular,
  },
  secondaryAction: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  secondaryActionText: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    textDecorationLine: 'underline',
    fontWeight: theme.typography.weights.medium,
  },
  assuranceBlock: {
    alignItems: 'center',
    gap: 12,
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalSeparator: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 16,
  },
  legalLinkText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 16,
    textDecorationLine: 'underline',
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
  billingDisclosureBlock: {
    alignItems: 'center',
    gap: 1,
    marginTop: 1,
    paddingHorizontal: 8,
  },
  billingDisclosureText: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
  },
  primaryCta: {
    minHeight: 50,
    borderWidth: 2,
    borderRadius: 999,
    borderColor: theme.colors.border,
    backgroundColor: '#2860E8',
    boxShadow: '4px 4px 0px #1E1E1E',
  },
  restoreButton: {
    alignSelf: 'center',
  },
  restoreText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 16,
    textDecorationLine: 'underline',
  },
  stickyFooter: {
    position: 'absolute',
    right: -3,
    bottom: 0,
    left: -3,
    paddingTop: 16,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#F5F6F8',
    overflow: 'visible',
  },
  stickyFooterContent: {
    gap: 12,
    paddingHorizontal: 20,
  },
});
