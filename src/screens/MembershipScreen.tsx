import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CustomerInfo, PurchasesPackage, PURCHASES_ERROR_CODE, PurchasesError } from 'react-native-purchases';

import { getPricing, PricingPlan } from '@/src/api/pricing';
import { membershipImages } from '@/src/assets/app-images';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
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
import { createNeoShadow } from '@/src/theme/shadows';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';

type PricingState = {
  loading: boolean;
  error: string | null;
  regionKey: string | null;
  currency: string | null;
  plans: PricingPlan[];
};

type MembershipCard = {
  id: string;
  duration: string;
  bestFor: string;
  price: string;
  totalPrice: number;
  originalPrice: number | null;
  originalDisplayPrice?: number | null;
  billingPeriod: string;
  savings?: string | null;
  period?: string;
  paymentLabel?: string;
  savingsLabel?: string;
  includesLabel?: string;
  includes?: string[];
  bestValue?: string;
  isLifetime?: boolean;
};

type PlanCopy = {
  duration: string;
  bestFor: string;
  savings?: string;
};

type PlanId = 'monthly' | '3-month' | '6-month' | 'lifetime';

const INITIAL_PRICING_STATE: PricingState = {
  loading: true,
  error: null,
  regionKey: null,
  currency: null,
  plans: [],
};

const billingPeriodToCopyKey: Record<string, 'oneMonth' | 'threeMonth' | 'sixMonth'> = {
  monthly: 'oneMonth',
  '3-month': 'threeMonth',
  '6-month': 'sixMonth',
};

const monthsByPeriod: Record<string, number> = {
  monthly: 1,
  '3-month': 3,
  '6-month': 6,
};

const THB_PROMO_MONTHLY_PRICES: Record<string, { currentPerMonth: number; originalPerMonth: number }> = {
  monthly: { currentPerMonth: 199, originalPerMonth: 399 },
  '3-month': { currentPerMonth: 179, originalPerMonth: 349 },
  '6-month': { currentPerMonth: 149, originalPerMonth: 299 },
};

const THB_LIFETIME_PRICING = {
  current: 3490,
  original: 6999,
};

const USD_LIFETIME_PRICING = {
  current: 99.99,
  original: 199.99,
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      titleHighlight: 'ลด 50%',
      titleRest: 'สำหรับสมาชิก 200 คนแรก!',
      subtitle: 'เราเพิ่งเปิดตัว และอยากเชิญคุณมาลองใช้ Pailin Abroad!',
      bestForLabel: 'เหมาะสำหรับ:',
      payMonthlyLabel: 'จ่ายรายเดือน',
      period: 'เดือน',
      joinCta: 'สมัครเลย!',
      joinLoading: 'กำลังดำเนินการ...',
      planWarning: 'กรุณาเลือกแผนการชำระเงิน',
      joinPlaceholder: 'การชำระเงินสำเร็จแล้ว สิทธิ์อาจใช้เวลาสักครู่ในการซิงก์กับบัญชีของคุณ',
      loadingTitle: 'กำลังโหลดข้อมูลสมาชิก',
      backLabel: 'ย้อนกลับ',
      loadingErrorTitle: 'เกิดข้อผิดพลาด',
      loadingErrorBody: 'เราไม่สามารถโหลดราคาสมาชิกได้ กรุณาลองใหม่อีกครั้ง',
      termsTitle: 'ข้อกำหนดและเงื่อนไข',
      privacyTitle: 'นโยบายความเป็นส่วนตัว',
      purchaseUnavailableTitle: 'ยังไม่พร้อมใช้งาน',
      purchaseUnavailableBody: 'เราไม่พบตัวเลือกการสมัครในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      restoreCta: 'กู้คืนการซื้อ',
      restoreLoading: 'กำลังกู้คืน...',
      restoreNoPurchasesTitle: 'ไม่พบรายการซื้อ',
      restoreNoPurchasesBody: 'เราไม่พบการซื้อเดิมที่สามารถกู้คืนได้สำหรับ Apple ID นี้',
      restoreSuccessTitle: 'กู้คืนการซื้อสำเร็จ',
      restoreSuccessBody: 'สิทธิ์สมาชิกของคุณได้รับการกู้คืนแล้ว',
      alreadyMemberTitle: 'คุณเป็นสมาชิกอยู่แล้ว',
      alreadyMemberBody: 'บัญชีนี้มีสิทธิ์เข้าถึงแบบเต็มรูปแบบอยู่แล้ว',
      purchaseSuccessTitle: 'การซื้อสำเร็จ',
      guaranteeStrong: 'รับประกันคืนเงิน 100%',
      guaranteeBody:
        'ภายใน 30 วันหลังจากวันชำระเงิน หากคุณไม่พึงพอใจในการเป็นสมาชิกกับเรา แต่เรามั่นใจว่าคุณจะหลงรัก Pailin Abroad อย่างแน่นอนเลย!',
      lifetimeFollowupLineOne: 'หากยังไม่พร้อมสำหรับสมาชิกตลอดชีพ',
      lifetimeFollowupLineTwo: 'เลือกแพ็กเกจรายเดือนด้านล่างได้',
      lifetime: {
        title: 'สมาชิกตลอดชีพ',
        paymentLabel: 'ชำระครั้งเดียว',
        savingsLabel: 'ลด 50%',
        bestFor: 'ผู้เรียนที่ต้องการเข้าถึงแบบเต็มรูปแบบตลอดไป!',
        includesLabel: 'รวม:',
        includes: [
          'เข้าถึงบทเรียนทั้งหมดตลอดชีพ',
          'อัปเดตใหม่ทั้งหมดในอนาคตโดยไม่เสียค่าใช้จ่ายเพิ่ม',
          'ชำระครั้งเดียว ไม่มีต่ออายุ',
        ],
        bestValue: 'คุ้มที่สุด!',
      },
      plans: {
        sixMonth: {
          duration: '6 เดือน',
          bestFor: 'ผู้เรียนที่ต้องการพัฒนาความคล่องแคล่วและความเชี่ยวชาญแบบระยะยาว',
          savings: 'ประหยัด 25%',
        },
        threeMonth: {
          duration: '3 เดือน',
          bestFor: 'ผู้เรียนที่ต้องการพัฒนาอย่างต่อเนื่อง',
          savings: 'ประหยัด 12.5%',
        },
        oneMonth: {
          duration: '1 เดือน',
          bestFor: 'ผู้เรียนที่ต้องการทดลองเรียนด้วยความเร็วที่กำหนดเอง',
        },
      },
      featuresTitle: 'สิทธิของสมาชิกที่สามารถเข้าถึงได้:',
      features: [
        'คลังบทเรียนทั้งหมดของเรา มากกว่า 200 บทเรียน!',
        'คลังแบบฝึกหัดทั้งหมดมหาศาลของเรา',
        'ข้อผิดพลาดที่คนไทยมักใช้ผิด',
        'คลังวลีและกริยาวลีของเรา',
        'คลังหัวข้อการเรียนรู้ภาษาอังกฤษของเรา',
        'เกร็ดความรู้ทางวัฒนธรรมที่จะช่วยให้คุณเข้าใจบริบทการใช้ภาษาอังกฤษ',
        'ทิ้งความคิดเห็นของคุณไว้ได้ในทุกบทเรียน พร้อมรับการตอบกลับจากเรา!',
      ],
      loadingImageAlt: 'Pailin membership illustration',
    };
  }

  return {
    titleHighlight: '50% off',
    titleRest: 'for our first 200 users!',
    subtitle: 'We just launched. We want to invite you to try Pailin Abroad!',
    bestForLabel: 'BEST FOR:',
    payMonthlyLabel: 'PAY MONTHLY',
    period: 'month',
    joinCta: 'JOIN NOW!',
    joinLoading: 'PROCESSING...',
    planWarning: 'Please select a payment plan',
    joinPlaceholder: 'Your purchase went through. It may take a moment for access to sync to your account.',
    loadingTitle: 'Loading membership',
    backLabel: 'Back',
    loadingErrorTitle: 'Something went wrong',
    loadingErrorBody: "We couldn't load membership pricing. Please try again.",
    termsTitle: 'Terms & Conditions',
    privacyTitle: 'Privacy Policy',
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
    purchaseSuccessTitle: 'Purchase complete',
    guaranteeStrong: '100% money-back guarantee',
    guaranteeBody:
      "within 30 days of your purchase if you're not completely satisfied with your membership. But, we're confident you'll love Pailin Abroad!",
    lifetimeFollowupLineOne: 'Not ready for lifetime access?',
    lifetimeFollowupLineTwo: 'Choose a monthly plan below!',
    lifetime: {
      title: 'LIFETIME MEMBERSHIP',
      paymentLabel: 'One-time payment',
      savingsLabel: 'Save 50%',
      bestFor: 'Learners who want full access, forever!',
      includesLabel: 'INCLUDES:',
      includes: [
        'Full access to all lessons, for life',
        'All future updates included at no extra cost',
        'One simple payment, no renewals',
      ],
      bestValue: 'Best value!',
    },
    plans: {
      sixMonth: {
        duration: '6 MONTHS',
        bestFor: 'Achieving long-term fluency and mastery',
        savings: 'Save 25%',
      },
      threeMonth: {
        duration: '3 MONTHS',
        bestFor: 'Committing to consistent progress',
        savings: 'Save 12.5%',
      },
      oneMonth: {
        duration: '1 MONTH',
        bestFor: 'Trying out our lessons at your own pace',
      },
    },
    featuresTitle: 'Membership gives you full access to:',
    features: [
      "Our whole lesson library - that's over 200 lessons!",
      'Our extensive Exercise Bank',
      'Common mistakes made by Thai speakers',
      'Our Phrases & Phrasal Verbs Bank',
      'Our ESL Topic Library',
      'Cultural notes to help you understand English in context',
      'Comment on any lesson and get feedback from us!',
    ],
    loadingImageAlt: 'Pailin membership illustration',
  };
};

const formatAmount = (value: number) =>
  Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const buildPriceWithSymbol = (currency: string | null, value: number) => {
  const symbol = currency === 'USD' ? '$' : '฿';
  return `${symbol}${formatAmount(value)}`;
};

type MembershipPlanCardProps = {
  card: MembershipCard;
  uiLanguage: UiLanguage;
  bestForLabel: string;
  isSelected: boolean;
  onPress: () => void;
  onJoinPress: () => void;
  joinLabel: string;
  showInlineJoinButton?: boolean;
};

const getPlanPaymentLabel = (uiLanguage: UiLanguage, cardId: string) => {
  if (uiLanguage === 'th') {
    if (cardId === '6-month') {
      return 'จ่ายทุก 6 เดือน';
    }
    if (cardId === '3-month') {
      return 'จ่ายทุก 3 เดือน';
    }
    return 'จ่ายรายเดือน';
  }

  if (cardId === '6-month') {
    return 'PAY EVERY 6 MONTHS';
  }
  if (cardId === '3-month') {
    return 'PAY EVERY 3 MONTHS';
  }
  return 'PAY MONTHLY';
};

function MembershipPlanCard({
  card,
  uiLanguage,
  bestForLabel,
  isSelected,
  onPress,
  onJoinPress,
  joinLabel,
  showInlineJoinButton = true,
}: MembershipPlanCardProps) {
  const paymentLabel = getPlanPaymentLabel(uiLanguage, card.id);

  if (card.isLifetime) {
    return (
      <View style={styles.cardPressable}>
        <Pressable onPress={onPress} style={isSelected ? styles.selectedCardPressable : null}>
          <Card padding="md" radius="lg" style={[styles.lifetimeCard, isSelected ? styles.selectedCard : null]}>
            <Stack gap="md">
              <View style={styles.lifetimeCardShell}>
                <View style={styles.lifetimeMetaRow}>
                  {card.savingsLabel ? (
                    <View style={styles.lifetimeSavingsBadge}>
                      <AppText language={uiLanguage} variant="caption" style={styles.lifetimeSavingsText}>
                        {card.savingsLabel}
                      </AppText>
                    </View>
                  ) : null}
                  <View style={styles.paymentLabelWrap}>
                    <AppText language={uiLanguage} variant="caption" style={styles.paymentLabel}>
                      {card.paymentLabel}
                    </AppText>
                  </View>
                </View>

                <View style={styles.lifetimeHeaderRow}>
                  <AppText language={uiLanguage} variant="body" style={styles.lifetimeTitle}>
                    {card.duration}
                  </AppText>
                </View>

                <View style={styles.lifetimeTopRow}>
                  <View style={styles.bestForBlock}>
                    <AppText language={uiLanguage} variant="caption" style={styles.bestForLabel}>
                      {bestForLabel}
                    </AppText>
                    <AppText language={uiLanguage} variant="body" style={styles.bestForText}>
                      {card.bestFor}
                    </AppText>
                  </View>
                  <View style={styles.lifetimePriceBlock}>
                    {card.originalPrice ? (
                      <AppText language={uiLanguage} variant="muted" style={styles.crossedOutPrice}>
                        {buildPriceWithSymbol(card.billingPeriod, card.originalPrice)}
                      </AppText>
                    ) : null}
                    <AppText language={uiLanguage} variant="title" style={styles.lifetimePrice}>
                      {card.price}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.lifetimeBody}>
                <View style={styles.includesBlock}>
                  <AppText language={uiLanguage} variant="caption" style={styles.includesLabel}>
                    {card.includesLabel}
                  </AppText>
                  <Stack gap="xs">
                    {(card.includes ?? []).map((item) => (
                      <View key={item} style={styles.includeRow}>
                        <View style={styles.checkIconDot} />
                        <AppText language={uiLanguage} variant="body" style={styles.includeText}>
                          {item}
                        </AppText>
                      </View>
                    ))}
                  </Stack>
                </View>
                <View style={styles.bestValueBadge}>
                  <AppText language={uiLanguage} variant="caption" style={styles.bestValueText}>
                    {card.bestValue}
                  </AppText>
                </View>
              </View>
            </Stack>
          </Card>
        </Pressable>

        {isSelected && showInlineJoinButton ? (
          <Button
            language={uiLanguage}
            onPress={onJoinPress}
            style={styles.inlineJoinButton}
            textStyle={styles.joinButtonText}
            title={joinLabel}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.cardPressable}>
      <Pressable onPress={onPress} style={isSelected ? styles.selectedCardPressable : null}>
        <Card padding="md" radius="lg" style={[styles.planCard, isSelected ? styles.selectedCard : null]}>
          <View style={styles.planCardShell}>
            <View style={styles.planMetaRow}>
              {card.savings ? (
                <View style={styles.planSavingsBadge}>
                  <AppText language={uiLanguage} variant="caption" style={styles.planSavingsText}>
                    {card.savings}
                  </AppText>
                </View>
              ) : (
                <View />
              )}
              <AppText language={uiLanguage} variant="caption" style={styles.planPaymentLabel}>
                {paymentLabel}
              </AppText>
            </View>

            <View style={styles.planBodyRow}>
              <View style={[styles.planLeftColumn, card.id === 'monthly' ? styles.planLeftColumnMonthly : null]}>
                <View style={[styles.planHeaderRow, card.id === 'monthly' ? styles.planHeaderRowMonthly : null]}>
                  <AppText language={uiLanguage} variant="body" style={styles.planDuration}>
                    {card.duration}
                  </AppText>
                </View>
                <View style={styles.bestForBlock}>
                  <AppText language={uiLanguage} variant="caption" style={styles.bestForLabel}>
                    {bestForLabel}
                  </AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.bestForText}>
                    {card.bestFor}
                  </AppText>
                </View>
              </View>

              <View
                style={[
                  styles.planRightColumn,
                  !card.savings ? styles.planRightColumnWithoutBadge : null,
                ]}>
                {card.originalDisplayPrice ? (
                  <AppText language={uiLanguage} variant="muted" style={styles.crossedOutMonthlyPrice}>
                    {buildPriceWithSymbol(card.billingPeriod, card.originalDisplayPrice)}
                  </AppText>
                ) : null}
                <View style={styles.planPriceStack}>
                  <AppText language={uiLanguage} variant="title" style={styles.planPrice}>
                    {card.price}
                  </AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.periodText}>
                    / {card.period}
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>

      {isSelected && showInlineJoinButton ? (
        <Button
          language={uiLanguage}
          onPress={onJoinPress}
          style={styles.inlineJoinButton}
          textStyle={styles.joinButtonText}
          title={joinLabel}
        />
      ) : null}
    </View>
  );
}

export function MembershipScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { refreshMembershipAccess } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const { width } = useWindowDimensions();
  const copy = useMemo(() => getCopy(uiLanguage), [uiLanguage]);
  const isNativeApp = Platform.OS !== 'web';
  const [selectedPlanId, setSelectedPlanId] = useState<string>('lifetime');
  const [showPlanWarning, setShowPlanWarning] = useState(false);
  const [pricingState, setPricingState] = useState<PricingState>(INITIAL_PRICING_STATE);
  const [availablePackages, setAvailablePackages] = useState<Partial<Record<PlanId, PurchasesPackage>>>({});
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      try {
        const data = await getPricing();
        if (cancelled) {
          return;
        }
        setPricingState({
          loading: false,
          error: null,
          regionKey: data.region_key,
          currency: data.currency,
          plans: data.plans ?? [],
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setPricingState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load pricing',
          regionKey: null,
          currency: null,
          plans: [],
        });
      }
    };

    loadPricing();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRevenueCatProducts = async () => {
      if (Platform.OS !== 'ios' || !isRevenueCatAvailable()) {
        return;
      }

      try {
        await initializeRevenueCat();
        const [offering, nextCustomerInfo] = await Promise.all([getRevenueCatOffering(), getRevenueCatCustomerInfo()]);
        if (cancelled) {
          return;
        }
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

  const allPlans = useMemo<MembershipCard[]>(() => {
    if (pricingState.loading || pricingState.error) {
      return [];
    }

    const isUsdPricing = pricingState.currency === 'USD';
    const lifetimePrice = isUsdPricing ? USD_LIFETIME_PRICING.current : THB_LIFETIME_PRICING.current;
    const lifetimeOriginalPrice = isUsdPricing ? USD_LIFETIME_PRICING.original : THB_LIFETIME_PRICING.original;
    const lifetimePlan: MembershipCard = {
      id: 'lifetime',
      duration: copy.lifetime.title,
      bestFor: copy.lifetime.bestFor,
      price: buildPriceWithSymbol(pricingState.currency, lifetimePrice),
      totalPrice: lifetimePrice,
      originalPrice: lifetimeOriginalPrice,
      billingPeriod: pricingState.currency ?? '',
      paymentLabel: copy.lifetime.paymentLabel,
      savingsLabel: copy.lifetime.savingsLabel,
      includesLabel: copy.lifetime.includesLabel,
      includes: copy.lifetime.includes,
      bestValue: copy.lifetime.bestValue,
      isLifetime: true,
    };

    const plans: MembershipCard[] = [...pricingState.plans]
      .sort((a, b) => (monthsByPeriod[b.billing_period] ?? 0) - (monthsByPeriod[a.billing_period] ?? 0))
      .map((plan) => {
        const copyKey = billingPeriodToCopyKey[plan.billing_period];
        const planCopy = copy.plans[copyKey] as PlanCopy;
        const months = monthsByPeriod[plan.billing_period] ?? 1;
        const thbPromoPrice = pricingState.currency === 'THB' ? THB_PROMO_MONTHLY_PRICES[plan.billing_period] : null;
        const currentPerMonth = thbPromoPrice ? thbPromoPrice.currentPerMonth : Number(plan.amount_per_month);
        const originalPerMonth = thbPromoPrice
          ? thbPromoPrice.originalPerMonth
          : Number.isFinite(Number(plan.amount_per_month))
            ? Number(plan.amount_per_month) * 2
            : null;
        const totalPrice = currentPerMonth * months;
        const originalPrice = originalPerMonth ? originalPerMonth * months : null;
        return {
          id: plan.billing_period,
          duration: planCopy.duration,
          bestFor: planCopy.bestFor,
          savings: planCopy.savings ?? null,
          price: buildPriceWithSymbol(pricingState.currency, currentPerMonth),
          totalPrice,
          originalPrice,
          originalDisplayPrice: originalPerMonth,
          billingPeriod: pricingState.currency ?? '',
          period: copy.period,
        } satisfies MembershipCard;
      });

    return [lifetimePlan, ...plans];
  }, [copy, pricingState]);

  useEffect(() => {
    if (allPlans.length === 0) {
      return;
    }
    if (allPlans.some((plan) => plan.id === selectedPlanId)) {
      return;
    }
    setSelectedPlanId(allPlans[0].id);
  }, [allPlans, selectedPlanId]);

  const selectedPlan = allPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const isCompactLayout = width < 768;
  const selectedPackage = selectedPlan ? availablePackages[selectedPlan.id as PlanId] ?? null : null;
  const alreadyHasRevenueCatAccess = hasRevenueCatFullAccess(customerInfo);

  const handleJoinPress = async () => {
    if (!selectedPlan) {
      setShowPlanWarning(true);
      return;
    }

    if (alreadyHasRevenueCatAccess) {
      Alert.alert(copy.alreadyMemberTitle, copy.alreadyMemberBody);
      return;
    }

    if (Platform.OS !== 'ios' || !selectedPackage) {
      Alert.alert(copy.purchaseUnavailableTitle, copy.purchaseUnavailableBody);
      return;
    }

    setShowPlanWarning(false);

    try {
      setPurchaseInProgress(true);
      const result = await purchaseRevenueCatPackage(selectedPackage);
      setCustomerInfo(result.customerInfo);
      await refreshMembershipAccess();
      router.replace({
        pathname: '/purchase-success',
        params: { returnTo: '/(tabs)' },
      });
    } catch (error) {
      const purchasesError = error as Partial<PurchasesError> | null;
      const didUserCancel =
        purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || purchasesError?.userCancelled === true;

      if (didUserCancel) {
        return;
      }

      const message = error instanceof Error ? error.message : copy.loadingErrorBody;
      Alert.alert(copy.loadingErrorTitle, message);
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const handleRestorePress = async () => {
    if (Platform.OS !== 'ios' || !isRevenueCatAvailable()) {
      Alert.alert(copy.purchaseUnavailableTitle, copy.purchaseUnavailableBody);
      return;
    }

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
              params: { returnTo: '/(tabs)' },
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

  const stickyPlanLabel = selectedPlan
    ? selectedPlan.isLifetime
      ? selectedPlan.duration
      : `${selectedPlan.duration} • ${selectedPlan.price}/${selectedPlan.period}`
    : '';
  const canGoBack = typeof router.canGoBack === 'function' ? router.canGoBack() : false;
  const returnTo = typeof params.returnTo === 'string' && params.returnTo.trim() ? params.returnTo.trim() : null;
  const handleBackPress = () => {
    if (returnTo) {
      router.replace(returnTo as never);
      return;
    }

    if (canGoBack) {
      router.back();
    }
  };

  if (pricingState.loading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  if (pricingState.error) {
    return <PageLoadingState language={uiLanguage} errorTitle={copy.loadingErrorTitle} errorBody={copy.loadingErrorBody} />;
  }

  const visibleFeatures = isNativeApp ? copy.features.slice(0, -1) : copy.features;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.contentContainer, isCompactLayout ? styles.contentContainerWithStickyBar : null]}>
      <ResponsivePageShell>
        <Stack gap="md">
        {canGoBack || returnTo ? (
          <Pressable accessibilityRole="button" onPress={handleBackPress} style={styles.backLink}>
            <AppText language={uiLanguage} variant="caption" style={styles.backLinkText}>
              {`← ${copy.backLabel}`}
            </AppText>
          </Pressable>
        ) : null}
        <View style={styles.headerBlock}>
          <AppText language={uiLanguage} variant="title" style={styles.membershipTitle}>
            <AppText language={uiLanguage} variant="title" style={styles.membershipTitleHighlight}>
              {copy.titleHighlight}
            </AppText>{' '}
            {copy.titleRest}
          </AppText>
          <AppText language={uiLanguage} variant="body" style={styles.membershipSubtitle}>
            {copy.subtitle}
          </AppText>
        </View>

        <Image source={membershipImages.banner} style={styles.bannerImage} resizeMode="cover" />

        <Stack gap="md">
          {allPlans.map((plan, index) => (
            <React.Fragment key={plan.id}>
              <MembershipPlanCard
                bestForLabel={copy.bestForLabel}
                card={plan}
                isSelected={selectedPlanId === plan.id}
                joinLabel={copy.joinCta}
                onJoinPress={handleJoinPress}
                onPress={() => setSelectedPlanId(plan.id)}
                showInlineJoinButton={!isCompactLayout}
                uiLanguage={uiLanguage}
              />
              {index === 0 ? (
                <View style={styles.followupTextBlock}>
                  <AppText language={uiLanguage} variant="muted" style={styles.followupText}>
                    {copy.lifetimeFollowupLineOne}
                  </AppText>
                  <AppText language={uiLanguage} variant="muted" style={styles.followupText}>
                    {copy.lifetimeFollowupLineTwo}
                  </AppText>
                </View>
              ) : null}
            </React.Fragment>
          ))}
        </Stack>

        {selectedPlan && !isCompactLayout ? (
          <View style={styles.pricingSummary}>
            {selectedPlan.originalPrice ? (
              <AppText language={uiLanguage} variant="muted" style={styles.summaryOriginalPrice}>
                {buildPriceWithSymbol(pricingState.currency, selectedPlan.originalPrice)}
              </AppText>
            ) : null}
            <AppText language={uiLanguage} variant="title" style={styles.summaryFinalPrice}>
              {buildPriceWithSymbol(pricingState.currency, selectedPlan.totalPrice)}
            </AppText>
          </View>
        ) : null}

        {!isCompactLayout ? (
          <Button
            language={uiLanguage}
            onPress={handleJoinPress}
            disabled={purchaseInProgress}
            style={styles.joinButton}
            textStyle={styles.joinButtonText}
            title={purchaseInProgress ? copy.joinLoading : copy.joinCta}
          />
        ) : null}

        {showPlanWarning ? (
          <View style={styles.warningBox}>
            <AppText language={uiLanguage} variant="body" style={styles.warningText}>
              {copy.planWarning}
            </AppText>
          </View>
        ) : null}

        <View style={styles.guaranteeSection}>
          <AppText language={uiLanguage} variant="body" style={styles.guaranteeText}>
            <AppText language={uiLanguage} variant="body" style={styles.guaranteeStrong}>
              {copy.guaranteeStrong}
            </AppText>{' '}
            {copy.guaranteeBody}
          </AppText>
        </View>

        <Card padding="lg" radius="lg" style={styles.featuresCard}>
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.featuresTitle}>
              {copy.featuresTitle}
            </AppText>
            <Stack gap="sm">
              {visibleFeatures.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <View style={styles.featureIconInner} />
                  </View>
                  <AppText language={uiLanguage} variant="body" style={styles.featureText}>
                    {feature}
                  </AppText>
                </View>
              ))}
            </Stack>
          </Stack>
        </Card>

        <View style={styles.legalFooter}>
          <Pressable accessibilityRole="button" onPress={handleRestorePress} disabled={restoreInProgress} style={styles.restoreLinkButton}>
            <AppText language={uiLanguage} variant="caption" style={styles.restoreLinkText}>
              {restoreInProgress ? copy.restoreLoading : copy.restoreCta}
            </AppText>
          </Pressable>
        </View>

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

      {selectedPlan && isCompactLayout ? (
        <View style={styles.stickyBarShell}>
          <View style={styles.stickyBar}>
            <AndroidNeoShadowLayer borderRadius={theme.radii.lg} color={theme.colors.shadow} offset={3} />
            <View style={styles.stickyBarCopy}>
              <AppText language={uiLanguage} variant="caption" style={styles.stickyBarLabel}>
                {stickyPlanLabel}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.stickyBarPrice}>
                {buildPriceWithSymbol(pricingState.currency, selectedPlan.totalPrice)}
              </AppText>
            </View>
            <Button
              language={uiLanguage}
              onPress={handleJoinPress}
              disabled={purchaseInProgress}
              style={styles.stickyJoinButton}
              textStyle={styles.stickyJoinButtonText}
              title={purchaseInProgress ? copy.joinLoading : copy.joinCta}
            />
          </View>
        </View>
      ) : null}
    </View>
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
  contentContainerWithStickyBar: {
    paddingBottom: 120,
  },
  stateScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  loadingInner: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingImage: {
    width: 180,
    height: 180,
  },
  loadingText: {
    textAlign: 'center',
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorBody: {
    textAlign: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
  },
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
  },
  backLinkText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  membershipTitle: {
    textAlign: 'center',
    fontSize: 42,
    lineHeight: 48,
    color: theme.colors.text,
  },
  membershipTitleHighlight: {
    color: '#F25F53',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: theme.typography.weights.bold,
  },
  membershipSubtitle: {
    textAlign: 'center',
    color: theme.colors.mutedText,
    marginTop: theme.spacing.sm,
  },
  bannerImage: {
    width: 'auto',
    minHeight: 150,
    height: 150,
    marginTop: -55,
    marginHorizontal: -theme.spacing.md,
  },
  cardPressable: {
    width: '100%',
  },
  selectedCardPressable: {
    transform: [{ scale: 1.01 }],
  },
  lifetimeCard: {
    backgroundColor: '#FFF3DC',
    borderWidth: 2,
    borderColor: '#9D9D9D',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    ...createNeoShadow({
      color: '#9D9D9D',
      elevation: 1,
      offset: 1,
      opacity: 0.35,
    }),
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: '#9D9D9D',
    paddingHorizontal: theme.spacing.lg,
    ...createNeoShadow({
      color: '#9D9D9D',
      elevation: 2,
      offset: 1.5,
      opacity: 0.55,
    }),
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#3CA0FE',
    backgroundColor: '#F8FCFF',
    ...createNeoShadow({
      color: '#3CA0FE',
      elevation: 2,
      offset: 1.5,
      opacity: 0.55,
    }),
  },
  lifetimeCardShell: {
    gap: theme.spacing.sm,
  },
  lifetimeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  lifetimeSavingsBadge: {
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#A4DE35',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 6,
  },
  lifetimeSavingsText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  paymentLabelWrap: {
    flexShrink: 1,
  },
  lifetimeHeaderRow: {
    paddingTop: theme.spacing.sm,
    paddingRight: 0,
  },
  lifetimeTitle: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 28,
    lineHeight: 32,
  },
  paymentLabel: {
    color: '#676C74',
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  lifetimeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  bestForBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  bestForLabel: {
    color: theme.colors.mutedText,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  bestForText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  lifetimePriceBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  crossedOutPrice: {
    textDecorationLine: 'line-through',
    color: '#A94444',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.medium,
  },
  lifetimePrice: {
    fontFamily: theme.typography.fontFaces.en.bold,
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 32,
    textShadowColor: theme.colors.text,
    textShadowOffset: { width: 0.6, height: 0 },
    textShadowRadius: 0,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  lifetimeBody: {
    gap: theme.spacing.md,
    minHeight: 164,
  },
  includesBlock: {
    gap: theme.spacing.sm,
  },
  includesLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  includeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  includeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  checkIconDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#3CA0FE',
    marginTop: 7,
  },
  bestValueBadge: {
    alignSelf: 'flex-start',
    minWidth: 112,
    borderRadius: theme.radii.xl,
    backgroundColor: '#3CA0FE',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 6,
    marginTop: theme.spacing.sm,
  },
  bestValueText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
    lineHeight: 16,
  },
  followupTextBlock: {
    gap: 2,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  followupText: {
    textAlign: 'center',
    color: '#1E1E1E',
    fontWeight: theme.typography.weights.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  planCardShell: {
    gap: theme.spacing.sm,
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  planSavingsBadge: {
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#A4DE35',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 6,
  },
  planSavingsText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  planPaymentLabel: {
    color: '#676C74',
    textAlign: 'right',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    maxWidth: 118,
  },
  planHeaderRow: {
    paddingTop: theme.spacing.sm,
  },
  planHeaderRowMonthly: {
    paddingTop: 0,
    marginTop: 0,
  },
  planBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  planLeftColumn: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  planLeftColumnMonthly: {
    position: 'relative',
    top: -12,
  },
  planDuration: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 26,
    lineHeight: 30,
  },
  planRightColumn: {
    width: 104,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 0,
    marginTop: -36,
  },
  planRightColumnWithoutBadge: {
    paddingTop: 0,
  },
  crossedOutMonthlyPrice: {
    textDecorationLine: 'line-through',
    color: '#A94444',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.medium,
    marginBottom: 2,
  },
  planPriceStack: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  planPrice: {
    fontFamily: theme.typography.fontFaces.en.bold,
    fontSize: 28,
    lineHeight: 32,
  },
  periodText: {
    color: theme.colors.mutedText,
    marginTop: -4,
  },
  pricingSummary: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  summaryOriginalPrice: {
    textDecorationLine: 'line-through',
    color: '#C87979',
  },
  summaryFinalPrice: {
    fontSize: 36,
    lineHeight: 40,
  },
  joinButton: {
    minHeight: 58,
    borderWidth: 2,
    borderRadius: theme.radii.lg,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
    ...createNeoShadow({
      color: theme.colors.shadow,
      elevation: 3,
      offset: 3,
    }),
  },
  joinButtonText: {
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.3,
  },
  inlineJoinButton: {
    marginTop: theme.spacing.sm,
    minHeight: 54,
    borderWidth: 2,
    borderRadius: theme.radii.lg,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
    ...createNeoShadow({
      color: theme.colors.shadow,
      elevation: 3,
      offset: 3,
    }),
  },
  warningBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  warningText: {
    color: '#3CA0FE',
    textAlign: 'center',
  },
  guaranteeSection: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  guaranteeText: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  guaranteeStrong: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  featuresCard: {
    backgroundColor: '#FFFDF9',
  },
  restoreLinkButton: {
    paddingVertical: theme.spacing.xs,
  },
  restoreLinkText: {
    color: '#3CA0FE',
    fontWeight: theme.typography.weights.bold,
    textDecorationLine: 'underline',
  },
  legalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    paddingBottom: theme.spacing.lg,
  },
  legalFooterLink: {
    color: theme.colors.text,
    textDecorationLine: 'underline',
  },
  stickyBarShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: '#FFFDF9',
    paddingTop: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    ...createNeoShadow({
      color: theme.colors.shadow,
      elevation: 3,
      offset: 3,
    }),
  },
  stickyBarCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stickyBarLabel: {
    color: theme.colors.mutedText,
  },
  stickyBarPrice: {
    fontWeight: theme.typography.weights.bold,
  },
  stickyJoinButton: {
    minHeight: 48,
    minWidth: 132,
    borderWidth: 2,
    borderRadius: theme.radii.lg,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
  },
  stickyJoinButtonText: {
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.3,
  },
  featuresTitle: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 24,
    lineHeight: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3CA0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureIconInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#3CA0FE',
  },
  featureText: {
    flex: 1,
  },
});
