import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, usePathname } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PailinTabBar } from '@/src/components/navigation/PailinTabBar';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

const labels: Record<UiLanguage, { home: string; pathway: string; exercises: string; lessons: string; resources: string; more: string }> = {
  en: {
    home: 'Home',
    pathway: 'Pathway',
    exercises: 'Exercises',
    lessons: 'Lessons',
    resources: 'Resources',
    more: 'More',
  },
  th: {
    home: 'หน้าหลัก',
    pathway: 'เส้นทาง',
    exercises: 'แบบฝึกหัด',
    lessons: 'บทเรียน',
    resources: 'คลังเสริม',
    more: 'เพิ่มเติม',
  },
};

export default function TabLayout() {
  useColorScheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, isGuestMode, isLoading } = useAppSession();

  const text = labels[uiLanguage];
  const isExerciseSet = pathname.startsWith('/exercises/topic/')
    || pathname.startsWith('/resources/exercise-bank/topic/');
  // Placement results open the free library directly. Keep that destination in
  // the app shell even if the persisted guest session has not hydrated yet (or
  // was lost), so it still receives the top safe area and bottom navigation.
  const isFreeLessonLibrary = pathname === '/lessons/free-library';
  const shouldShowTabBar = (isLoading || hasAccount || isGuestMode || isFreeLessonLibrary) && !isExerciseSet;

  const tabsScreenOptions = useMemo(
    () => ({
      headerShown: false,
      sceneStyle: isExerciseSet || shouldShowTabBar
        ? [styles.scene, { paddingTop: insets.top }]
        : styles.sceneFullscreen,
    }),
    [insets.top, isExerciseSet, shouldShowTabBar]
  );

  return (
    <Tabs
      screenOptions={tabsScreenOptions}
      tabBar={(props) => (shouldShowTabBar ? <PailinTabBar {...props} /> : null)}>
      <Tabs.Screen
        name="index"
        options={{
          title: hasAccount || isGuestMode ? text.pathway : text.home,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: text.exercises,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: text.lessons,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: text.resources,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: text.more,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="pathway"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
    scene: {
      backgroundColor: theme.colors.background,
    },
    sceneFullscreen: {
      backgroundColor: theme.colors.background,
    },
  });
