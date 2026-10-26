export type MembershipPromotionLanguage = 'en' | 'th';

// This is intentionally a build-time switch. Flip it and ship a new build when
// the Pailin's Debut campaign starts or ends. Prices always come from the store.
export const MEMBERSHIP_PROMOTION = {
  enabled: false,
  discounts: {
    lifetime: 30,
    monthly: 50,
    '3-month': 50,
  },
} as const;

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
