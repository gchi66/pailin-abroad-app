import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resourceCardImages } from '@/src/assets/resource-images';
import { NavigationCard } from '@/src/components/ui/NavigationCard';
import { PageHeader } from '@/src/components/ui/PageHeader';
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
        id: 'pronunciation',
        title: 'Speaking Coach',
        description: 'Practise your English speaking with our AI coach!',
        enabled: true,
      },
      {
        id: 'topic-library',
        title: 'Topic Library',
        description: 'In-depth explanations of a range of ESL topics',
        enabled: true,
      },
      {
        id: 'conversations',
        title: 'Conversations',
        description: 'Listen to only the conversations from beginning to end',
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
        id: 'pronunciation',
        title: 'โค้ชฝึกพูด',
        description: 'ฝึกพูดภาษาอังกฤษกับโค้ช AI ของเรา',
        enabled: true,
      },
      {
        id: 'topic-library',
        title: 'คลังหัวข้อการเรียนรู้',
        description: 'คำอธิบายเชิงลึกเกี่ยวกับหัวข้อภาษาอังกฤษหลากหลายเรื่อง',
        enabled: true,
      },
      {
        id: 'conversations',
        title: 'บทสนทนา',
        description: 'ฟังบทสนทนาจากต้นจนจบ',
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
  const { uiLanguage } = useUiLanguage();
  const copy = resourcePageCopy[uiLanguage];

  const handleCardPress = (card: ResourceCardCopy) => {
    if (card.id === 'exercise-bank') {
      router.push(returnTo
        ? `/(tabs)/resources/exercise-bank?returnTo=${encodeURIComponent(returnTo)}`
        : '/(tabs)/resources/exercise-bank');
    } else if (card.id === 'topic-library') {
      router.push(returnTo
        ? `/(tabs)/resources/topic-library?returnTo=${encodeURIComponent(returnTo)}`
        : '/(tabs)/resources/topic-library');
    } else if (card.id === 'pronunciation') {
      router.push('/(tabs)/resources/speaking-practice');
    } else if (card.id === 'conversations') {
      router.push('/(tabs)/resources/conversations');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <View style={styles.page}>
          <PageHeader
            language={uiLanguage}
            variant="root"
            title={copy.title}
            subtitle={copy.subtitle}
            onBackPress={returnTo ? () => router.push(returnTo as never) : undefined}
          />

          <View style={styles.cards}>
            {copy.cards.map((card) => (
              <NavigationCard
                key={card.id}
                language={uiLanguage}
                title={card.title}
                description={card.description}
                accessibilityLabel={`${card.title}${card.enabled ? '' : `, ${copy.comingSoon}`}`}
                disabled={!card.enabled}
                eyebrow={!card.enabled ? copy.comingSoon : undefined}
                imageSource={resourceCardImages[card.id]}
                onPress={() => handleCardPress(card)}
              />
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
  cards: {
    marginTop: 18,
    gap: 15,
  },
});
