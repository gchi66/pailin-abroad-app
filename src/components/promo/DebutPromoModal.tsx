import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import promoBackground from '@/assets/images/promo-stuff/pailin-debut-promo-background.png';
import promoPailin from '@/assets/images/promo-stuff/pailin-promo-backpack.png';
import pinkStar from '@/assets/images/promo-stuff/pink-star.png';
import yellowStar from '@/assets/images/promo-stuff/yellow-star.png';
import { AppText } from '@/src/components/ui/AppText';
import { UiLanguage } from '@/src/types/home';

type DebutPromoModalProps = {
  language?: UiLanguage;
  visible: boolean;
  onClose: () => void;
  onViewPlans: () => void;
};

const copy = {
  en: {
    accessibilityLabel: "Pailin's Debut Special. Save up to 50 percent.",
    close: 'Close promotion',
    eyebrow: "Pailin’s Debut Special",
    headline: 'Save up to',
    body: "Unlock all 231 lessons and\nfollow Pailin’s journey in Los Angeles!",
    cta: 'VIEW PLANS →',
    deadline: 'Offer ends November 15.',
  },
  th: {
    accessibilityLabel: 'โปรโมชั่นเปิดตัวของไพลิน ประหยัดสูงสุด 50 เปอร์เซ็นต์',
    close: 'ปิดโปรโมชั่น',
    eyebrow: 'โปรโมชั่นเปิดตัวของไพลิน',
    headline: 'ประหยัดสูงสุด',
    body: 'ปลดล็อกบทเรียนทั้งหมด 231 บท\nและติดตามไพลินผจญภัยในลอสแอนเจลิส!',
    cta: 'ดูแพ็กเกจ →',
    deadline: 'สิ้นสุดโปรโมชั่น 15 พฤศจิกายน',
  },
} as const;

const CARD_ASPECT_RATIO = 470 / 875;
const CARD_MAX_WIDTH = 470;
const CARD_OUTER_GUTTER = 32;
const CARD_VERTICAL_GUTTER = 24;
const DISCOUNT_OUTLINE_OFFSETS = [
  [-2, -2], [0, -2], [2, -2],
  [-2, 0], [2, 0],
  [-2, 2], [0, 2], [2, 2],
] as const;

export function DebutPromoModal({
  language = 'en',
  visible,
  onClose,
  onViewPlans,
}: DebutPromoModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const text = copy[language];
  const usableHeight = windowHeight - insets.top - insets.bottom - CARD_VERTICAL_GUTTER;
  const cardWidth = Math.min(
    CARD_MAX_WIDTH,
    windowWidth - CARD_OUTER_GUTTER,
    usableHeight * CARD_ASPECT_RATIO
  );
  const scale = cardWidth / CARD_MAX_WIDTH;
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const scaled = (value: number) => value * scale;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View
          accessibilityLabel={text.accessibilityLabel}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[
            styles.card,
            {
              borderRadius: scaled(30),
              height: cardHeight,
              width: cardWidth,
            },
          ]}>
          <Image
            accessible={false}
            contentFit="contain"
            pointerEvents="none"
            source={promoBackground}
            style={[
              styles.backgroundArtwork,
              { height: scaled(575), width: cardWidth },
            ]}
          />

          <Image
            accessible={false}
            contentFit="contain"
            pointerEvents="none"
            source={promoPailin}
            style={[
              styles.pailinArtwork,
              {
                height: scaled(432),
                right: scaled(2),
                transform: [{ scaleX: -1 }],
                width: scaled(288),
              },
            ]}
          />

          <Pressable
            accessibilityLabel={text.close}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              {
                height: scaled(42),
                right: scaled(8),
                top: scaled(7),
                width: scaled(42),
              },
              pressed ? styles.pressed : null,
            ]}>
            <AppText allowFontScaling={false} language={language} style={[styles.closeGlyph, { fontSize: scaled(32), lineHeight: scaled(38) }]}>×</AppText>
          </Pressable>

          <View style={[styles.eyebrowShadow, {
            borderRadius: scaled(8),
            height: scaled(49),
            top: scaled(65),
            transform: [{ translateX: scaled(2) }],
            width: scaled(280),
          }]} />
          <View style={[styles.eyebrow, {
            borderRadius: scaled(8),
            height: scaled(49),
            top: scaled(63),
            width: scaled(280),
          }]}>
            <AppText
              allowFontScaling={false}
              language={language}
              numberOfLines={1}
              style={[styles.eyebrowText, {
                fontSize: scaled(language === 'th' ? 18 : 21),
                lineHeight: scaled(28),
              }]}>
              {text.eyebrow}
            </AppText>
          </View>
          <Image
            accessible={false}
            contentFit="contain"
            pointerEvents="none"
            source={pinkStar}
            style={[styles.pinkStar, { height: scaled(25), top: scaled(49), width: scaled(25) }]}
          />

          <AppText
            allowFontScaling={false}
            language={language}
            style={[styles.headline, {
              fontSize: scaled(language === 'th' ? 22 : 23),
              lineHeight: scaled(32),
              top: scaled(135),
            }]}>
            {text.headline}
          </AppText>

          <View style={[styles.discountWrap, { height: scaled(108), top: scaled(172) }]}>
            <Image
              accessible={false}
              contentFit="contain"
              pointerEvents="none"
              source={yellowStar}
              style={[styles.leftYellowStar, { height: scaled(25), top: scaled(45), width: scaled(25) }]}
            />
            <AppText
              accessibilityElementsHidden
              allowFontScaling={false}
              importantForAccessibility="no-hide-descendants"
              language="en"
              style={[styles.discount, styles.discountShadow, {
                fontSize: scaled(88),
                lineHeight: scaled(108),
                transform: [{ translateX: scaled(4) }, { translateY: scaled(5) }],
                width: scaled(280),
              }]}>
              50%
            </AppText>
            {DISCOUNT_OUTLINE_OFFSETS.map(([x, y]) => (
              <AppText
                accessibilityElementsHidden
                allowFontScaling={false}
                importantForAccessibility="no-hide-descendants"
                key={`${x}-${y}`}
                language="en"
                style={[styles.discount, styles.discountOutline, {
                  fontSize: scaled(88),
                  lineHeight: scaled(108),
                  transform: [{ translateX: scaled(x) }, { translateY: scaled(y) }],
                  width: scaled(280),
                }]}>
                50%
              </AppText>
            ))}
            <AppText
              accessibilityLabel="50 percent"
              allowFontScaling={false}
              language="en"
              style={[styles.discount, {
                fontSize: scaled(88),
                lineHeight: scaled(108),
                width: scaled(280),
              }]}>
              50%
            </AppText>
            <Image
              accessible={false}
              contentFit="contain"
              pointerEvents="none"
              source={yellowStar}
              style={[styles.rightYellowStar, { height: scaled(25), top: scaled(2), width: scaled(25) }]}
            />
          </View>

          <AppText
            allowFontScaling={false}
            language={language}
            style={[styles.body, {
              fontSize: scaled(language === 'th' ? 14 : 15),
              lineHeight: scaled(24),
              top: scaled(282),
            }]}>
            {text.body}
          </AppText>

          <Pressable
            accessibilityRole="button"
            onPress={onViewPlans}
            style={({ pressed }) => [
              styles.cta,
              {
                borderRadius: scaled(28),
                height: scaled(52),
                top: scaled(361),
                width: scaled(247),
              },
              pressed ? styles.ctaPressed : null,
            ]}>
            <AppText
              allowFontScaling={false}
              language={language}
              style={[styles.ctaText, { fontSize: scaled(13), lineHeight: scaled(19) }]}>
              {text.cta}
            </AppText>
          </Pressable>

          <AppText
            allowFontScaling={false}
            language={language}
            style={[styles.deadline, {
              fontSize: scaled(14),
              lineHeight: scaled(20),
              top: scaled(425),
            }]}>
            {text.deadline}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.55)',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#B8E9FB',
    borderColor: '#1E1E1E',
    borderWidth: 2,
    overflow: 'hidden',
  },
  backgroundArtwork: {
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  pailinArtwork: {
    bottom: -2,
    position: 'absolute',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 10,
  },
  closeGlyph: {
    color: '#1E1E1E',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  eyebrowShadow: {
    backgroundColor: '#1E1E1E',
    position: 'absolute',
  },
  eyebrow: {
    alignItems: 'center',
    backgroundColor: '#FCFF55',
    borderColor: '#1E1E1E',
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
  },
  eyebrowText: {
    color: '#1E1E1E',
    fontWeight: '700',
    textAlign: 'center',
  },
  pinkStar: {
    left: '24%',
    position: 'absolute',
  },
  headline: {
    color: '#1E1E1E',
    fontWeight: '700',
    position: 'absolute',
    textAlign: 'center',
  },
  discountWrap: {
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
  },
  discount: {
    color: '#F65299',
    fontFamily: 'Poppins-ExtraBold',
    includeFontPadding: true,
    letterSpacing: -4,
    position: 'absolute',
    textAlign: 'center',
  },
  discountShadow: {
    color: '#1E1E1E',
  },
  discountOutline: {
    color: '#1E1E1E',
  },
  leftYellowStar: {
    left: '21%',
    position: 'absolute',
  },
  rightYellowStar: {
    position: 'absolute',
    right: '23%',
  },
  body: {
    color: '#1E1E1E',
    fontWeight: '600',
    paddingHorizontal: 10,
    position: 'absolute',
    textAlign: 'center',
    width: '100%',
  },
  cta: {
    alignItems: 'center',
    backgroundColor: '#FF57A3',
    borderColor: '#1E1E1E',
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
  },
  ctaPressed: {
    backgroundColor: '#F43F92',
    transform: [{ translateY: 2 }],
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  deadline: {
    color: '#1E1E1E',
    fontWeight: '600',
    position: 'absolute',
    textAlign: 'center',
  },
});
