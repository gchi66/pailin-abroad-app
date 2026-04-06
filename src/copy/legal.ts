export type LegalDocumentKey = 'terms' | 'privacy';
export type UiLanguage = 'en' | 'th';

type LegalDocumentCopy = {
  title: string;
  paragraphs: string[];
};

const TERMS_EN = {
  title: 'Terms & Conditions',
  paragraphs: [
    'Pailin Abroad - Terms & Conditions',
    'Last Updated: November 28, 2025',
    'These Terms & Conditions ("Terms") are a contract between you and Pailin Abroad LLC ("Pailin Abroad", "Company", "we", "us", or "our"). They govern your access to and use of the Pailin Abroad website, related domains, and any products, services, content, features, or applications we make available through the Service.',
    'By accessing or using the Service, creating an account, or making a purchase, you agree to be bound by these Terms. If you do not agree, you must not use the Service.',
    'Pailin Abroad grants you a revocable, non-exclusive, non-transferable, limited license to access the Service for your personal, non-commercial use. You may not share your account or allow others to use your login credentials.',
    'You agree not to sell, rent, or commercially exploit the Service, reverse engineer or modify it, remove copyright or trademark notices, harass or harm others, upload malware, impersonate others, or use robots, crawlers, scrapers, or automated tools without written permission.',
    'Subscription plans include monthly, 3-month, and 6-month options. Subscriptions renew automatically unless canceled. You may cancel through your account settings. We offer a 30-day money-back guarantee for eligible purchases, while renewals and partially used terms are generally non-refundable unless required by law.',
    'All content, software, text, graphics, logos, and media are owned by Pailin Abroad or its licensors. Unauthorized copying, modification, distribution, or reproduction is prohibited.',
    'The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. Pailin Abroad is not liable for indirect, incidental, special, or consequential damages, and total liability will not exceed the amount paid in the past 12 months.',
    'We may suspend or terminate accounts for violations. Disputes are subject to binding arbitration except where intellectual property matters apply. These Terms are governed by Texas law.',
  ],
} satisfies LegalDocumentCopy;

const PRIVACY_EN = {
  title: 'Privacy Policy',
  paragraphs: [
    'Pailin Abroad - Privacy Policy',
    'Last Updated: November 28, 2025',
    'Pailin Abroad LLC ("Pailin Abroad", "Company", "we", "us", or "our") is committed to protecting your privacy. This policy explains how we collect, use, disclose, and protect information when you use our website, app, and related services.',
    'We collect information you provide directly, information collected automatically, and information from third parties. This can include account information, profile information, billing confirmations, comments, survey responses, lesson progress, device and log data, cookie data, and login details from providers such as Google or Facebook.',
    'We use your information to provide the Service, track learning progress, process payments and subscriptions, communicate about your account, improve the Service, send optional marketing emails, prevent abuse, and comply with legal obligations.',
    'We do not sell your information. We may share it with service providers, successors in a business transfer, authorities when legally required, and in public areas of the Service when you choose to post publicly.',
    'Your information may be transferred internationally, including to the United States. We retain data only as long as necessary, and after account deletion we delete or anonymize data where allowed.',
    'Depending on your location, you may have rights to access, correct, delete, restrict processing, or request portability of your information. Contact: contact@pailinabroad.com.',
    'We use reasonable technical and organizational measures to protect your data, but no system can guarantee absolute security. The Service is not intended for children under 13.',
    'We may update this Privacy Policy from time to time. Continued use of the Service after updates constitutes acceptance. Contact us at contact@pailinabroad.com or through https://www.pailinabroad.com/contact.',
  ],
} satisfies LegalDocumentCopy;

const TERMS_TH = {
  title: 'ข้อกำหนดและเงื่อนไข',
  paragraphs: TERMS_EN.paragraphs,
} satisfies LegalDocumentCopy;

const PRIVACY_TH = {
  title: 'นโยบายความเป็นส่วนตัว',
  paragraphs: PRIVACY_EN.paragraphs,
} satisfies LegalDocumentCopy;

export function getLegalDocumentCopy(language: UiLanguage, document: LegalDocumentKey): LegalDocumentCopy {
  if (language === 'th') {
    return document === 'terms' ? TERMS_TH : PRIVACY_TH;
  }

  return document === 'terms' ? TERMS_EN : PRIVACY_EN;
}
