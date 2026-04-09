import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, useRouter } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
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
  const router = useRouter();
  useColorScheme();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasCompletedOnboarding, isLoading } = useAppSession();

  const styles = useMemo(() => createStyles(insets.top, insets.bottom), [insets.bottom, insets.top]);
  const text = labels[uiLanguage];

  useEffect(() => {
    if (!isLoading && hasAccount && !hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [hasAccount, hasCompletedOnboarding, isLoading, router]);

  const tabsScreenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: theme.colors.text,
      tabBarInactiveTintColor: theme.colors.mutedText,
      headerShown: false,
      tabBarButton: HapticTab,
      sceneStyle: !hasAccount ? styles.sceneFullscreen : styles.scene,
      tabBarStyle: !hasAccount ? styles.tabBarHidden : styles.tabBar,
      tabBarLabelStyle: styles.tabBarLabel,
    }),
    [hasAccount, styles.scene, styles.sceneFullscreen, styles.tabBar, styles.tabBarHidden, styles.tabBarLabel]
  );

  if (!isLoading && hasAccount && !hasCompletedOnboarding) {
    return (
      <View style={styles.redirectOverlay}>
        <PageLoadingState language={uiLanguage} />
      </View>
    );
  }

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
          title: text.more,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="ellipsis.circle.fill" color={color} />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push('/(tabs)/account');
          },
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
    tabBarLabel: {
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    redirectOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
  });
