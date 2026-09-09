import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

const VISIBLE_ROUTES = ['index', 'exercises', 'lessons', 'resources', 'account'] as const;
type VisibleRoute = (typeof VISIBLE_ROUTES)[number];

const LABELS = {
  en: {
    index: 'PATHWAY',
    exercises: 'EXERCISES',
    lessons: 'LESSONS',
    resources: 'RESOURCES',
    account: 'MORE',
  },
  th: {
    index: 'เส้นทาง',
    exercises: 'แบบฝึกหัด',
    lessons: 'บทเรียน',
    resources: 'คลังเสริม',
    account: 'เพิ่มเติม',
  },
} as const;

const ICONS: Record<
  VisibleRoute,
  { active: React.ComponentProps<typeof MaterialIcons>['name']; inactive: React.ComponentProps<typeof MaterialIcons>['name'] }
> = {
  index: { active: 'flag', inactive: 'outlined-flag' },
  exercises: { active: 'edit', inactive: 'edit' },
  lessons: { active: 'menu-book', inactive: 'menu-book' },
  resources: { active: 'grid-view', inactive: 'grid-view' },
  account: { active: 'more-horiz', inactive: 'more-horiz' },
};

export function PailinTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { hasAccount, isGuestMode } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const labels = LABELS[uiLanguage];

  const routes = VISIBLE_ROUTES.map((name) => state.routes.find((route) => route.name === name)).filter(
    (route): route is (typeof state.routes)[number] => Boolean(route)
  );

  return (
    <View pointerEvents="box-none" style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom - 6, 6) }]}>
      <View style={styles.barShadow}>
        <View style={styles.bar}>
          {routes.map((route, visibleIndex) => {
            const routeName = route.name as VisibleRoute;
            const routeIndex = state.routes.indexOf(route);
            const isFocused = state.index === routeIndex;
            const isCenter = routeName === 'lessons';
            const tintColor = isFocused ? '#1F5CFF' : theme.colors.text;
            const label = routeName === 'index' && !hasAccount && !isGuestMode ? 'HOME' : labels[routeName];
            const options = descriptors[route.key]?.options;

            const onPress = () => {
              if (Platform.OS === 'ios') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityLabel={options?.tabBarAccessibilityLabel}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onLongPress={onLongPress}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.item,
                  visibleIndex > 0 && !isCenter ? styles.itemDivider : null,
                  isCenter ? styles.centerItem : null,
                  pressed ? styles.itemPressed : null,
                ]}>
                {isCenter ? (
                  <View pointerEvents="none" style={styles.starBadge}>
                    <MaterialIcons color={theme.colors.text} name="star-border" size={20} style={styles.starOutline} />
                    <MaterialIcons color="#B8DD4A" name="star" size={14} />
                  </View>
                ) : null}

                <View
                  style={[
                    styles.itemContent,
                    routeName === 'index' ? styles.firstItemContent : null,
                    routeName === 'account' ? styles.lastItemContent : null,
                  ]}>
                  {routeName === 'account' ? (
                    <View style={[styles.moreIconBox, { borderColor: tintColor }]}>
                      <MaterialIcons color={tintColor} name={ICONS.account[isFocused ? 'active' : 'inactive']} size={22} />
                    </View>
                  ) : (
                    <MaterialIcons
                      color={tintColor}
                      name={ICONS[routeName][isFocused ? 'active' : 'inactive']}
                      size={isCenter ? 30 : 27}
                    />
                  )}

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      uiLanguage === 'th' ? styles.labelThai : styles.labelEnglish,
                      { color: tintColor },
                    ]}>
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// The lesson overview lives outside the tab navigator, but uses the same bar geometry.
export function LessonOverviewTabBar({ actions }: { actions: (() => void)[] }) {
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  return <View pointerEvents="box-none" style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom - 6, 6) }]}>
    <View style={styles.barShadow}><View style={styles.bar}>
      {VISIBLE_ROUTES.map((name, index) => {
        const active = name === 'lessons';
        const color = active ? '#1F5CFF' : theme.colors.text;
        return <Pressable key={name} accessibilityRole="button" accessibilityLabel={LABELS[uiLanguage][name]} accessibilityState={{ selected: active }} onPress={actions[index]}
          style={[styles.item, index > 0 && !active && styles.itemDivider, active && styles.centerItem]}>
          {active && <View style={styles.starBadge}><MaterialIcons name="star-border" size={20} color={theme.colors.text} style={styles.starOutline} /><MaterialIcons name="star" size={14} color="#B8DD4A" /></View>}
          <View style={[styles.itemContent, index === 0 && styles.firstItemContent, index === 4 && styles.lastItemContent]}>
            {name === 'account' ? <View style={[styles.moreIconBox, { borderColor: color }]}><MaterialIcons name="more-horiz" size={22} color={color} /></View> : <MaterialIcons name={ICONS[name][active ? 'active' : 'inactive']} size={active ? 30 : 27} color={color} />}
            <Text numberOfLines={1} style={[styles.label, uiLanguage === 'th' ? styles.labelThai : styles.labelEnglish, { color }]}>{LABELS[uiLanguage][name]}</Text>
          </View>
        </Pressable>;
      })}
    </View></View>
  </View>;
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 20,
    paddingTop: 11,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  barShadow: {
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.shadow,
  },
  bar: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 34,
    backgroundColor: theme.colors.surface,
    transform: [{ translateX: -3 }, { translateY: -3 }],
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemDivider: {
    borderLeftWidth: 1.5,
    borderLeftColor: theme.colors.border,
  },
  centerItem: {
    height: 82,
    marginTop: -8,
    marginBottom: -6,
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 5,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
  },
  itemPressed: {
    opacity: 0.65,
  },
  itemContent: {
    alignItems: 'center',
    gap: 3,
  },
  firstItemContent: {
    transform: [{ translateX: 4 }],
  },
  lastItemContent: {
    transform: [{ translateX: -2 }],
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: theme.typography.weights.medium,
    textAlign: 'center',
  },
  labelEnglish: {
    fontFamily: theme.typography.fontFaces.en.medium,
    letterSpacing: 0.2,
  },
  labelThai: {
    fontFamily: theme.typography.fontFaces.th.medium,
  },
  moreIconBox: {
    width: 27,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 4,
  },
  starBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starOutline: {
    position: 'absolute',
  },
});
