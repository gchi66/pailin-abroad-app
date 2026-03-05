import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, usePathname, useRouter } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppText } from '@/src/components/ui/AppText';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

const MENU_PANEL_WIDTH = 280;
const MENU_HEADER_HEIGHT = 56;

const labels: Record<UiLanguage, { home: string; explore: string; lessons: string; menu: string; language: string }> = {
  en: {
    home: 'Home',
    explore: 'Explore',
    lessons: 'Lessons',
    menu: 'Menu',
    language: 'Language',
  },
  th: {
    home: 'หน้าหลัก',
    explore: 'สำรวจ',
    lessons: 'บทเรียน',
    menu: 'เมนู',
    language: 'ภาษา',
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const styles = useMemo(() => createStyles(insets.top), [insets.top]);
  const text = labels[uiLanguage];

  const tabsScreenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      headerShown: false,
      tabBarButton: HapticTab,
      sceneStyle: styles.scene,
    }),
    [colorScheme, styles.scene]
  );

  const isHomeRoute = pathname === '/' || pathname === '/index';
  const isExploreRoute = pathname === '/explore';
  const homeItemStyle = isHomeRoute ? styles.menuItemActive : styles.menuItemDefault;
  const exploreItemStyle = isExploreRoute ? styles.menuItemActive : styles.menuItemDefault;

  return (
    <View style={styles.root}>
      <Tabs screenOptions={tabsScreenOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: text.home,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: text.explore,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
      </Tabs>

      <View style={styles.menuTopBar}>
        <Pressable accessibilityRole="button" style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
          <AppText variant="caption" style={styles.menuButtonText}>
            ≡
          </AppText>
        </Pressable>
      </View>

      {isMenuOpen ? (
        <>
          <Pressable accessibilityRole="button" style={styles.scrim} onPress={() => setIsMenuOpen(false)} />
          <View style={styles.menuPanel}>
            <Stack gap="lg">
              <Stack direction="horizontal" gap="sm" style={styles.menuHeaderRow}>
                <AppText language={uiLanguage} variant="body" style={styles.menuTitle}>
                  {text.menu}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  style={styles.closeButton}
                  onPress={() => setIsMenuOpen(false)}>
                  <AppText variant="caption" style={styles.closeButtonText}>
                    ✕
                  </AppText>
                </Pressable>
              </Stack>

              <Stack gap="sm">
                <AppText language={uiLanguage} variant="caption" style={styles.menuSectionLabel}>
                  {text.language}
                </AppText>
                <Stack direction="horizontal" gap="sm">
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.languageChip, uiLanguage === 'th' ? styles.languageChipActive : styles.languageChipDefault]}
                    onPress={() => setUiLanguage('th')}>
                    <AppText
                      variant="caption"
                      style={[styles.languageChipText, uiLanguage === 'th' ? styles.languageChipTextActive : styles.languageChipTextDefault]}>
                      TH
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.languageChip, uiLanguage === 'en' ? styles.languageChipActive : styles.languageChipDefault]}
                    onPress={() => setUiLanguage('en')}>
                    <AppText
                      variant="caption"
                      style={[styles.languageChipText, uiLanguage === 'en' ? styles.languageChipTextActive : styles.languageChipTextDefault]}>
                      EN
                    </AppText>
                  </Pressable>
                </Stack>
              </Stack>

              <Stack gap="sm">
                <Pressable
                  accessibilityRole="button"
                  style={[styles.menuItem, homeItemStyle]}
                    onPress={() => {
                    router.push('/');
                    setIsMenuOpen(false);
                  }}>
                  <AppText language={uiLanguage} variant="body">
                    {text.home}
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.menuItem, styles.menuItemDefault]}
                  onPress={() => {
                    router.push('/lessons');
                    setIsMenuOpen(false);
                  }}>
                  <AppText language={uiLanguage} variant="body">
                    {text.lessons}
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.menuItem, exploreItemStyle]}
                    onPress={() => {
                    router.push('/explore');
                    setIsMenuOpen(false);
                  }}>
                  <AppText language={uiLanguage} variant="body">
                    {text.explore}
                  </AppText>
                </Pressable>
              </Stack>
            </Stack>
          </View>
        </>
      ) : null}
    </View>
  );
}

const createStyles = (insetTop: number) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scene: {
      paddingTop: insetTop + MENU_HEADER_HEIGHT,
      backgroundColor: theme.colors.background,
    },
    menuTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: insetTop + MENU_HEADER_HEIGHT,
      paddingTop: insetTop,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      justifyContent: 'center',
      zIndex: 20,
    },
    menuButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuButtonText: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.lg,
      lineHeight: theme.typography.lineHeights.md,
      fontWeight: theme.typography.weights.bold,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.28)',
      zIndex: 40,
    },
    menuPanel: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: MENU_PANEL_WIDTH,
      backgroundColor: theme.colors.surface,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      paddingTop: insetTop + theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      zIndex: 50,
    },
    menuHeaderRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    menuTitle: {
      fontWeight: theme.typography.weights.semibold,
    },
    closeButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    closeButtonText: {
      fontWeight: theme.typography.weights.bold,
    },
    menuSectionLabel: {
      color: theme.colors.mutedText,
    },
    languageChip: {
      minWidth: 58,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    languageChipDefault: {
      backgroundColor: theme.colors.surface,
    },
    languageChipActive: {
      backgroundColor: theme.colors.primary,
    },
    languageChipText: {
      fontWeight: theme.typography.weights.semibold,
    },
    languageChipTextDefault: {
      color: theme.colors.text,
    },
    languageChipTextActive: {
      color: theme.colors.surface,
    },
    menuItem: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    menuItemDefault: {
      backgroundColor: theme.colors.surface,
    },
    menuItemActive: {
      backgroundColor: theme.colors.background,
    },
  });
