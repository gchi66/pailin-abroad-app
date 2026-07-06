import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

const labels: Record<UiLanguage, { home: string; pathway: string; lessons: string; resources: string; more: string }> = {
  en: {
    home: 'Home',
    pathway: 'Pathway',
    lessons: 'Lessons',
    resources: 'Resources',
    more: 'More',
  },
  th: {
    home: 'หน้าหลัก',
    pathway: 'เส้นทาง',
    lessons: 'บทเรียน',
    resources: 'คลังเสริม',
    more: 'เพิ่มเติม',
  },
};

export default function TabLayout() {
  useColorScheme();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, isGuestMode } = useAppSession();

  const styles = useMemo(() => createStyles(insets.top, insets.bottom), [insets.bottom, insets.top]);
  const text = labels[uiLanguage];

  const tabsScreenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: theme.colors.accent,
      tabBarInactiveTintColor: theme.colors.mutedText,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarItemStyle: styles.tabBarItem,
      sceneStyle: !hasAccount && !isGuestMode ? styles.sceneFullscreen : styles.scene,
      tabBarStyle: !hasAccount && !isGuestMode ? styles.tabBarHidden : styles.tabBar,
      tabBarLabelStyle: [styles.tabBarLabel, uiLanguage === 'th' ? styles.tabBarLabelThai : styles.tabBarLabelEnglish],
    }),
    [
      hasAccount,
      isGuestMode,
      styles.scene,
      styles.sceneFullscreen,
      styles.tabBar,
      styles.tabBarHidden,
      styles.tabBarItem,
      styles.tabBarLabel,
      styles.tabBarLabelEnglish,
      styles.tabBarLabelThai,
      uiLanguage,
    ]
  );

  return (
    <Tabs screenOptions={tabsScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: hasAccount || isGuestMode ? text.pathway : text.home,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name={hasAccount || isGuestMode ? 'flag.fill' : 'house.fill'} color={color} />
          ),
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
          title: text.more,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="ellipsis.circle.fill" color={color} />,
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

const createStyles = (insetTop: number, insetBottom: number) =>
  StyleSheet.create({
    scene: {
      paddingTop: insetTop,
      backgroundColor: theme.colors.background,
    },
    sceneFullscreen: {
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
    tabBarHidden: {
      display: 'none',
    },
    tabBarItem: {
      flex: 1,
      maxWidth: '25%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBarLabel: {
      fontSize: 11,
      ...(Platform.OS === 'android' ? null : { fontWeight: theme.typography.weights.semibold }),
      textAlign: 'center',
    },
    tabBarLabelEnglish: {
      fontFamily: theme.typography.fontFaces.en.semibold,
    },
    tabBarLabelThai: {
      fontFamily: theme.typography.fontFaces.th.semibold,
    },
  });
