import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resourceCardImages } from '@/src/assets/resource-images';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';
type ResourceCardId = keyof typeof resourceCardImages;

type ResourceCardCopy = {
  id: ResourceCardId;
  title: string;
  description: string;
  enabled: boolean;
};

type ResourcePageCopy = {
  title: string;
  subtitle: string;
  comingSoon: string;
  cards: ResourceCardCopy[];
};

const resourcePageCopy: Record<UiLanguage, ResourcePageCopy> = {
  en: {
    title: 'Resources',
    subtitle: 'Helpful tools to support your English learning',
    comingSoon: 'Coming soon!',
    cards: [
      {
        id: 'exercise-bank',
        title: 'Exercise Bank',
        description: 'A library of all the common mistakes from all the lessons!',
        enabled: true,
      },
      {
        id: 'topic-library',
        title: 'Topic Library',
        description: 'In-depth explanations of a range of ESL topics',
        enabled: true,
      },
      {
        id: 'pronunciation',
        title: 'Speaking Coach',
        description: 'Practise your English speaking with our AI coach!',
        enabled: true,
      },
      {
        id: 'common-mistakes',
        title: 'Common Mistakes',
        description: 'A library of all the common mistakes from all the lessons!',
        enabled: false,
      },
      {
        id: 'phrases-verbs',
        title: 'Phrases & Verbs',
        description: 'In-depth explanations of a range of ESL topics',
        enabled: false,
      },
      {
        id: 'conversations',
        title: 'Conversations',
        description: 'Listen to only the conversations from beginning to end',
        enabled: false,
      },
      {
        id: 'culture-notes',
        title: 'Culture Notes',
        description: 'A library of all the common mistakes from all the lessons!',
        enabled: false,
      },
    ],
  },
  th: {
    title: 'สื่อการเรียน',
    subtitle: 'เครื่องมือช่วยพัฒนาการเรียนภาษาอังกฤษของคุณ',
    comingSoon: 'เร็ว ๆ นี้!',
    cards: [
      {
        id: 'exercise-bank',
        title: 'คลังแบบฝึกหัด',
        description: 'รวมแบบฝึกหัดและข้อผิดพลาดที่พบบ่อยจากทุกบทเรียน',
        enabled: true,
      },
      {
        id: 'topic-library',
        title: 'คลังหัวข้อการเรียนรู้',
        description: 'คำอธิบายเชิงลึกเกี่ยวกับหัวข้อภาษาอังกฤษหลากหลายเรื่อง',
        enabled: true,
      },
      {
        id: 'pronunciation',
        title: 'โค้ชฝึกพูด',
        description: 'ฝึกพูดภาษาอังกฤษกับโค้ช AI ของเรา',
        enabled: true,
      },
      {
        id: 'common-mistakes',
        title: 'ข้อผิดพลาดที่พบบ่อย',
        description: 'รวมข้อผิดพลาดที่พบบ่อยจากทุกบทเรียน',
        enabled: false,
      },
      {
        id: 'phrases-verbs',
        title: 'วลีและคำกริยา',
        description: 'คำอธิบายเชิงลึกเกี่ยวกับวลีและคำกริยาในภาษาอังกฤษ',
        enabled: false,
      },
      {
        id: 'conversations',
        title: 'บทสนทนา',
        description: 'ฟังบทสนทนาจากต้นจนจบ',
        enabled: false,
      },
      {
        id: 'culture-notes',
        title: 'เกร็ดวัฒนธรรม',
        description: 'รวมเกร็ดวัฒนธรรมจากทุกบทเรียน',
        enabled: false,
      },
    ],
  },
};

export function ResourcesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = typeof returnToParam === 'string' && returnToParam.trim() ? returnToParam : null;
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const copy = resourcePageCopy[uiLanguage];

  const handleCardPress = (card: ResourceCardCopy) => {
    if (card.id === 'exercise-bank') {
      router.push(returnTo
        ? `/(tabs)/exercises?returnTo=${encodeURIComponent(returnTo)}`
        : '/(tabs)/exercises');
    } else if (card.id === 'topic-library') {
      router.push(returnTo
        ? `/(tabs)/resources/topic-library?returnTo=${encodeURIComponent(returnTo)}`
        : '/(tabs)/resources/topic-library');
    } else if (card.id === 'pronunciation') {
      router.push('/(tabs)/resources/speaking-practice');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <View style={styles.page}>
          {returnTo ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(returnTo as never)} style={styles.backButton}>
              <AppText language={uiLanguage} variant="caption">← {uiLanguage === 'th' ? 'กลับ' : 'Back'}</AppText>
            </Pressable>
          ) : null}

          <View style={styles.headingRow}>
            <AppText language={uiLanguage} variant="title" style={styles.heading}>
              {copy.title}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiLanguage === 'en' ? 'Switch language to Thai' : 'Switch language to English'}
              onPress={() => setUiLanguage(uiLanguage === 'en' ? 'th' : 'en')}
              style={styles.languageButton}>
              <AppText language={uiLanguage === 'en' ? 'en' : 'th'} variant="caption" style={styles.languageText}>
                {uiLanguage === 'en' ? 'TH' : 'EN'}
              </AppText>
            </Pressable>
          </View>
          <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
            {copy.subtitle}
          </AppText>

          <View style={styles.cards}>
            {copy.cards.map((card) => (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                accessibilityLabel={`${card.title}${card.enabled ? '' : `, ${copy.comingSoon}`}`}
                accessibilityState={{ disabled: !card.enabled }}
                disabled={!card.enabled}
                onPress={() => handleCardPress(card)}
                style={styles.cardPressable}>
                <AndroidNeoShadowLayer borderRadius={12} color={theme.colors.border} offset={3} />
                <View style={styles.card}>
                  <Image source={resourceCardImages[card.id]} style={styles.cardImage} resizeMode="contain" />
                  <View style={styles.cardCopy}>
                    {!card.enabled ? (
                      <AppText language={uiLanguage} variant="caption" style={styles.comingSoon}>
                        {copy.comingSoon}
                      </AppText>
                    ) : null}
                    <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
                      {card.title.toLocaleUpperCase(uiLanguage === 'th' ? 'th' : 'en')}
                    </AppText>
                    <AppText language={uiLanguage} variant="caption" style={styles.cardDescription}>
                      {card.description}
                    </AppText>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={theme.colors.text} style={styles.chevron} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
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
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
  },
  page: {
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: theme.typography.weights.bold,
  },
  languageButton: {
    minWidth: 52,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8DDE3',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageText: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 2,
    color: '#6D737B',
    fontSize: 13,
    lineHeight: 20,
  },
  cards: {
    marginTop: 18,
    gap: 15,
  },
  cardPressable: {
    position: 'relative',
  },
  card: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  cardCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  comingSoon: {
    color: '#60A6DC',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.2,
  },
  cardDescription: {
    marginTop: 4,
    color: '#33383D',
    fontSize: 11,
    lineHeight: 17,
  },
  chevron: {
    marginLeft: 4,
  },
});
