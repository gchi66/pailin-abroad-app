import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';

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
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, isGuestMode, isLoading } = useAppSession();

  const text = labels[uiLanguage];
  const shouldShowTabBar = isLoading || hasAccount || isGuestMode;

  const tabsScreenOptions = useMemo(
    () => ({
      headerShown: false,
      sceneStyle: shouldShowTabBar ? [styles.scene, { paddingTop: insets.top }] : styles.sceneFullscreen,
    }),
    [insets.top, shouldShowTabBar]
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
