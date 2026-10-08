import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
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

const TAB_HISTORY_EDGE_WIDTH = 24;
const TAB_HISTORY_SWIPE_DISTANCE = 56;
const TAB_HISTORY_SWIPE_VELOCITY = 500;

type TabNavigation = BottomTabBarProps['navigation'];

type HistoryAwareTabBarProps = BottomTabBarProps & {
  onHistoryStateChange: (navigation: TabNavigation, canSwipeBack: boolean) => void;
};

function HistoryAwareTabBar({ onHistoryStateChange, ...props }: HistoryAwareTabBarProps) {
  const activeRoute = props.state.routes[props.state.index];
  const activeChildIndex = activeRoute?.state?.index ?? 0;
  const visitedTabCount = props.state.history?.filter((entry) => entry.type === 'route').length ?? 0;
  const canSwipeBack = activeChildIndex === 0 && visitedTabCount > 1;

  useEffect(() => {
    onHistoryStateChange(props.navigation, canSwipeBack);
  }, [canSwipeBack, onHistoryStateChange, props.navigation]);

  return <PailinTabBar {...props} />;
}

export default function TabLayout() {
  useColorScheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { continueAsGuest, hasAccount, isGuestMode, isLoading } = useAppSession();
  const tabNavigationRef = useRef<TabNavigation | null>(null);
  const [canSwipeThroughTabHistory, setCanSwipeThroughTabHistory] = useState(false);

  const text = labels[uiLanguage];
  const isExerciseSet = pathname.startsWith('/exercises/topic/')
    || pathname.startsWith('/resources/exercise-bank/topic/');
  // Placement results open the free library directly. Keep that destination in
  // the app shell even if the persisted guest session has not hydrated yet (or
  // was lost), so it still receives the top safe area and bottom navigation.
  const isFreeLessonLibrary = pathname === '/lessons/free-library';
  const shouldShowTabBar = (isLoading || hasAccount || isGuestMode || isFreeLessonLibrary) && !isExerciseSet;

  useEffect(() => {
    if (isLoading || hasAccount || isGuestMode || !isFreeLessonLibrary) {
      return;
    }

    // Placement results intentionally land signed-out learners in the free
    // library. Restore the guest session as well as the temporary tab shell so
    // subsequent tabs keep their navigation chrome and guest-specific UI.
    void continueAsGuest();
  }, [continueAsGuest, hasAccount, isFreeLessonLibrary, isGuestMode, isLoading]);

  const tabsScreenOptions = useMemo(
    () => ({
      headerShown: false,
      sceneStyle: isExerciseSet || shouldShowTabBar
        ? [styles.scene, { paddingTop: insets.top }]
        : styles.sceneFullscreen,
    }),
    [insets.top, isExerciseSet, shouldShowTabBar]
  );

  const handleHistoryStateChange = useCallback((navigation: TabNavigation, canSwipeBack: boolean) => {
    tabNavigationRef.current = navigation;
    setCanSwipeThroughTabHistory(canSwipeBack);
  }, []);

  useEffect(() => {
    if (!shouldShowTabBar) {
      setCanSwipeThroughTabHistory(false);
    }
  }, [shouldShowTabBar]);

  const goBackThroughTabHistory = useCallback(() => {
    const navigation = tabNavigationRef.current;
    if (!navigation) {
      return;
    }

    const state = navigation.getState();
    navigation.dispatch({
      ...CommonActions.goBack(),
      target: state.key,
    });
  }, []);

  const tabHistoryGesture = useMemo(
    () => Gesture.Pan()
      .enabled(Platform.OS === 'ios' && canSwipeThroughTabHistory)
      .hitSlop({ left: 0, width: TAB_HISTORY_EDGE_WIDTH })
      .activeOffsetX(10)
      .failOffsetY([-18, 18])
      .onEnd((event) => {
        if (
          event.translationX >= TAB_HISTORY_SWIPE_DISTANCE
          || event.velocityX >= TAB_HISTORY_SWIPE_VELOCITY
        ) {
          runOnJS(goBackThroughTabHistory)();
        }
      }),
    [canSwipeThroughTabHistory, goBackThroughTabHistory]
  );

  return (
    <GestureDetector gesture={tabHistoryGesture}>
      <View style={styles.container}>
        <Tabs
          backBehavior="history"
          screenOptions={tabsScreenOptions}
          tabBar={(props) => shouldShowTabBar
            ? <HistoryAwareTabBar {...props} onHistoryStateChange={handleHistoryStateChange} />
            : null}>
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
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scene: {
    backgroundColor: theme.colors.background,
  },
  sceneFullscreen: {
    backgroundColor: theme.colors.background,
  },
});
