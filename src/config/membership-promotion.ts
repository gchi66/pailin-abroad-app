export type MembershipPromotionLanguage = 'en' | 'th';

// The build-time switch can end the campaign early; endsAt provides the normal
// automatic cutoff. Prices always come from the store.
export const MEMBERSHIP_PROMOTION = {
  campaignId: 'pailin-debut-2026-11-15',
  enabled: true,
  endsAt: '2026-11-16T00:00:00+07:00',
  discounts: {
    lifetime: 30,
    monthly: 50,
    '3-month': 50,
  },
  popup: {
    firstSessionActiveUseMs: 75_000,
    returningSessionDelayMs: 4_000,
    dismissalCooldownMs: 72 * 60 * 60 * 1_000,
    backgroundSessionGapMs: 30 * 60 * 1_000,
    maxImpressions: 2,
  },
} as const;

export const isMembershipPromotionActive = (now = Date.now()) =>
  MEMBERSHIP_PROMOTION.enabled && now < Date.parse(MEMBERSHIP_PROMOTION.endsAt);

const PROMOTION_COPY = {
  en: {
    eyebrow: 'PAILIN’S DEBUT SPECIAL!',
    headlinePrefix: 'Save up to ',
    headlineHighlight: '50% off!',
    detail: 'Limited-time offer · Ends November 15',
    compactBody: 'Save up to 50% off! Limited-time offer · Ends November 15',
  },
  th: {
    eyebrow: 'โปรโมชั่นเปิดตัวของไพลิน!',
    headlinePrefix: 'ประหยัดสูงสุด ',
    headlineHighlight: '50%!',
    detail: 'ข้อเสนอเวลาจำกัด · สิ้นสุด 15 พฤศจิกายน',
    compactBody: 'ประหยัดสูงสุด 50%! ข้อเสนอเวลาจำกัด · สิ้นสุด 15 พฤศจิกายน',
  },
} as const;

export const getMembershipPromotionCopy = (language: MembershipPromotionLanguage) =>
  PROMOTION_COPY[language];
