import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { getPricing, PricingPlan } from '@/src/api/pricing';
import { membershipImages } from '@/src/assets/app-images';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
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

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      titleHighlight: 'ลด 50%',
      titleRest: 'สำหรับสมาชิก 200 คนแรก!',
      subtitle: 'เราเพิ่งเปิดตัว และอยากเชิญคุณมาลองใช้ Pailin Abroad!',
      bestForLabel: 'เหมาะสำหรับ:',
      period: 'เดือน',
      joinCta: 'สมัครเลย!',
      planWarning: 'กรุณาเลือกแผนการชำระเงิน',
      joinPlaceholder: 'ยังไม่เชื่อมการชำระเงินจริงในแอป',
      loadingTitle: 'กำลังโหลดข้อมูลสมาชิก',
      loadingErrorTitle: 'เกิดข้อผิดพลาด',
      loadingErrorBody: 'เราไม่สามารถโหลดราคาสมาชิกได้ กรุณาลองใหม่อีกครั้ง',
      guaranteeStrong: 'รับประกันคืนเงิน 100%',
      guaranteeBody:
        'ภายใน 30 วันหลังจากวันชำระเงิน หากคุณไม่พึงพอใจในการเป็นสมาชิกกับเรา แต่เรามั่นใจว่าคุณจะหลงรัก Pailin Abroad อย่างแน่นอนเลย!',
      lifetimeFollowup: 'หากยังไม่พร้อมสำหรับสมาชิกตลอดชีพ คุณสามารถเลือกแพ็กเกจรายเดือนด้านล่างได้',
      lifetime: {
        title: 'สมาชิกตลอดชีพ',
        paymentLabel: 'ชำระครั้งเดียว',
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
    period: 'month',
    joinCta: 'JOIN NOW!',
    planWarning: 'Please select a payment plan',
    joinPlaceholder: 'Real app payment flow is not connected yet.',
    loadingTitle: 'Loading membership',
    loadingErrorTitle: 'Something went wrong',
    loadingErrorBody: "We couldn't load membership pricing. Please try again.",
    guaranteeStrong: '100% money-back guarantee',
    guaranteeBody:
      "within 30 days of your purchase if you're not completely satisfied with your membership. But, we're confident you'll love Pailin Abroad!",
    lifetimeFollowup: 'Not ready for lifetime access? Choose a monthly plan below',
    lifetime: {
      title: 'LIFETIME MEMBERSHIP',
      paymentLabel: 'One-time payment',
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
  if (card.isLifetime) {
    return (
      <View style={styles.cardPressable}>
        <Pressable onPress={onPress} style={isSelected ? styles.selectedCardPressable : null}>
          <Card padding="lg" radius="lg" style={[styles.lifetimeCard, isSelected ? styles.selectedCard : null]}>
            <Stack gap="md">
              <View style={styles.lifetimeCardShell}>
                <View style={styles.paymentLabelWrap}>
                  <AppText language={uiLanguage} variant="caption" style={styles.paymentLabel}>
                    {card.paymentLabel}
                  </AppText>
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
        <Card padding="lg" radius="lg" style={[styles.planCard, isSelected ? styles.selectedCard : null]}>
          {card.savings ? (
            <View style={styles.savingsBadge}>
              <AppText language={uiLanguage} variant="caption" style={styles.savingsText}>
                {card.savings}
              </AppText>
            </View>
          ) : null}
          <View style={styles.planContentRow}>
            <View style={styles.planLeftColumn}>
              <AppText language={uiLanguage} variant="body" style={styles.planDuration}>
                {card.duration}
              </AppText>
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
              <View style={styles.planPriceRow}>
                <AppText language={uiLanguage} variant="title" style={styles.planPrice}>
                  {card.price}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.periodText}>
                  / {card.period}
                </AppText>
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
  const { uiLanguage } = useUiLanguage();
  const { width } = useWindowDimensions();
  const copy = useMemo(() => getCopy(uiLanguage), [uiLanguage]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('lifetime');
  const [showPlanWarning, setShowPlanWarning] = useState(false);
  const [pricingState, setPricingState] = useState<PricingState>(INITIAL_PRICING_STATE);

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

  const allPlans = useMemo<MembershipCard[]>(() => {
    if (pricingState.loading || pricingState.error) {
      return [];
    }

    const isUsdPricing = pricingState.currency === 'USD';
    const lifetimePrice = isUsdPricing ? 150 : 3500;
    const lifetimeOriginalPrice = lifetimePrice * 2;
    const lifetimePlan: MembershipCard = {
      id: 'lifetime',
      duration: copy.lifetime.title,
      bestFor: copy.lifetime.bestFor,
      price: buildPriceWithSymbol(pricingState.currency, lifetimePrice),
      totalPrice: lifetimePrice,
      originalPrice: lifetimeOriginalPrice,
      billingPeriod: pricingState.currency ?? '',
      paymentLabel: copy.lifetime.paymentLabel,
      includesLabel: copy.lifetime.includesLabel,
      includes: copy.lifetime.includes,
      bestValue: copy.lifetime.bestValue,
      isLifetime: true,
    };

    const monthlyTier = pricingState.plans.find((plan) => plan.billing_period === 'monthly');
    const baseMonthlyPrice = monthlyTier ? Number(monthlyTier.amount_per_month) : null;

    const plans: MembershipCard[] = [...pricingState.plans]
      .sort((a, b) => (monthsByPeriod[b.billing_period] ?? 0) - (monthsByPeriod[a.billing_period] ?? 0))
      .map((plan) => {
        const copyKey = billingPeriodToCopyKey[plan.billing_period];
        const planCopy = copy.plans[copyKey] as PlanCopy;
        const months = monthsByPeriod[plan.billing_period] ?? 1;
        const originalPrice = baseMonthlyPrice && months > 1 ? baseMonthlyPrice * months : null;
        return {
          id: plan.billing_period,
          duration: planCopy.duration,
          bestFor: planCopy.bestFor,
          savings: planCopy.savings ?? null,
          price: buildPriceWithSymbol(pricingState.currency, Number(plan.amount_per_month)),
          totalPrice: Number(plan.amount_total),
          originalPrice,
          originalDisplayPrice: Number(plan.amount_per_month) * 2,
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

  const handleJoinPress = () => {
    if (!selectedPlan) {
      setShowPlanWarning(true);
      return;
    }
    setShowPlanWarning(false);
    Alert.alert(copy.joinCta, copy.joinPlaceholder);
  };

  const stickyPlanLabel = selectedPlan
    ? selectedPlan.isLifetime
      ? selectedPlan.duration
      : `${selectedPlan.duration} • ${selectedPlan.price}/${selectedPlan.period}`
    : '';

  if (pricingState.loading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  if (pricingState.error) {
    return <PageLoadingState language={uiLanguage} errorTitle={copy.loadingErrorTitle} errorBody={copy.loadingErrorBody} />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.contentContainer, isCompactLayout ? styles.contentContainerWithStickyBar : null]}>
        <Stack gap="md">
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
                <AppText language={uiLanguage} variant="muted" style={styles.followupText}>
                  {copy.lifetimeFollowup}
                </AppText>
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
            style={styles.joinButton}
            textStyle={styles.joinButtonText}
            title={copy.joinCta}
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
              {copy.features.map((feature) => (
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
        </Stack>
      </ScrollView>

      {selectedPlan && isCompactLayout ? (
        <View style={styles.stickyBarShell}>
          <View style={styles.stickyBar}>
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
              style={styles.stickyJoinButton}
              textStyle={styles.stickyJoinButtonText}
              title={copy.joinCta}
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
    shadowColor: '#9D9D9D',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: '#9D9D9D',
    shadowColor: '#9D9D9D',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#3CA0FE',
    backgroundColor: '#F8FCFF',
    shadowColor: '#3CA0FE',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  lifetimeCardShell: {
    position: 'relative',
  },
  paymentLabelWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  lifetimeHeaderRow: {
    paddingRight: 0,
  },
  lifetimeTitle: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 28,
    lineHeight: 32,
  },
  paymentLabel: {
    color: theme.colors.mutedText,
    textAlign: 'right',
  },
  lifetimeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  bestForBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  bestForLabel: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  bestForText: {
    color: theme.colors.text,
  },
  lifetimePriceBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  crossedOutPrice: {
    textDecorationLine: 'line-through',
    color: '#C87979',
  },
  lifetimePrice: {
    color: theme.colors.text,
    fontSize: 36,
    lineHeight: 40,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  lifetimeBody: {
    gap: theme.spacing.md,
  },
  includesBlock: {
    gap: theme.spacing.sm,
  },
  includesLabel: {
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
    borderRadius: theme.radii.xl,
    backgroundColor: '#3CA0FE',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  bestValueText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
  },
  followupText: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
    borderRadius: theme.radii.xl,
    backgroundColor: '#3CA0FE',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  savingsText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
  },
  planContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  planLeftColumn: {
    flex: 1,
    gap: theme.spacing.md,
  },
  planDuration: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 26,
    lineHeight: 30,
  },
  planRightColumn: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  planRightColumnWithoutBadge: {
    paddingTop: theme.spacing.xl,
  },
  crossedOutMonthlyPrice: {
    textDecorationLine: 'line-through',
    color: '#C87979',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  planPrice: {
    fontSize: 30,
    lineHeight: 34,
  },
  periodText: {
    color: theme.colors.mutedText,
    marginBottom: 2,
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
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
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
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
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
  },
  guaranteeStrong: {
    fontWeight: theme.typography.weights.bold,
  },
  featuresCard: {
    backgroundColor: '#FFFDF9',
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
    padding: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
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
