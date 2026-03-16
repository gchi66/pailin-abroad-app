import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

const labels: Record<UiLanguage, { home: string; pathway: string; lessons: string; resources: string; account: string }> = {
  en: {
    home: 'Home',
    pathway: 'Pathway',
    lessons: 'Lessons',
    resources: 'Resources',
    account: 'Account',
  },
  th: {
    home: 'หน้าหลัก',
    pathway: 'เส้นทาง',
    lessons: 'บทเรียน',
    resources: 'คลังเสริม',
    account: 'บัญชี',
  },
};

export default function TabLayout() {
  useColorScheme();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount } = useAppSession();

  const styles = useMemo(() => createStyles(insets.top, insets.bottom), [insets.bottom, insets.top]);
  const text = labels[uiLanguage];

  const tabsScreenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: theme.colors.text,
      tabBarInactiveTintColor: theme.colors.mutedText,
      headerShown: false,
      tabBarButton: HapticTab,
      sceneStyle: styles.scene,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabBarLabel,
    }),
    [styles.scene, styles.tabBar, styles.tabBarLabel]
  );

  return (
    <Tabs screenOptions={tabsScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: hasAccount ? text.pathway : text.home,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name={hasAccount ? 'flag.fill' : 'house.fill'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: text.lessons,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: text.resources,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="square.grid.2x2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: text.account,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const createStyles = (insetTop: number, insetBottom: number) =>
  StyleSheet.create({
    scene: {
      paddingTop: insetTop,
      backgroundColor: theme.colors.background,
    },
    tabBar: {
      height: 74 + insetBottom,
      paddingTop: theme.spacing.xs,
      paddingBottom: Math.max(insetBottom, theme.spacing.sm),
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    tabBarLabel: {
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
  });
