import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import pailinAvatar from '@/assets/images/characters/pailin_blue_circle.webp';
import { PlacementTestIntroCard } from '@/src/components/placement-test/PlacementTestIntroCard';
import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';

const isEmailLike = (value: string | null | undefined) => Boolean(value && /\S+@\S+\.\S+/.test(value.trim()));

export function PlacementEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isGuestMode, profile, user } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const isGuest = isGuestMode && !user?.id;
  const displayName =
    (!isEmailLike(profile?.name) ? profile?.name?.trim() || '' : '') ||
    (!isEmailLike(profile?.username) ? profile?.username?.trim() || '' : '') ||
    (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '') ||
    (typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '');
  const firstName = displayName.split(/\s+/)[0] || '';
  const avatarSource = isGuest
    ? pailinAvatar
    : resolveAvatarSource(
        profile?.avatar_image ||
          (typeof user?.user_metadata?.avatar_image === 'string' ? user.user_metadata.avatar_image : null)
      ) || pailinAvatar;

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.headerBorder, { paddingTop: insets.top }]}>
          <ResponsivePageShell style={styles.headerShell}>
            <View style={styles.headerRow}>
              <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
              <View style={styles.headerCopy}>
                <View style={styles.welcomeRow}>
                  <AppText language={uiLanguage} variant="title" style={styles.welcomeText}>
                    {uiLanguage === 'en'
                      ? `Welcome${firstName && !isGuest ? `, ${firstName}` : ''}!`
                      : `ยินดีต้อนรับ${firstName && !isGuest ? `, ${firstName}` : ''}!`}
                  </AppText>
                </View>
                <AppText language={uiLanguage} variant="body" style={styles.subheader}>
                  {uiLanguage === 'en'
                    ? 'Ready to learn English with Pailin?'
                    : 'พร้อมเรียนภาษาอังกฤษกับไพลินไหม?'}
                </AppText>
              </View>
              <LanguageToggle style={styles.languageToggle} textStyle={styles.languageToggleText} />
            </View>
          </ResponsivePageShell>
        </View>

        <ResponsivePageShell style={styles.cardShell}>
          <PlacementTestIntroCard
            language={uiLanguage}
            onChooseManually={() => router.push('/choose-level')}
            onStart={() => router.push('/placement-test')}
          />
        </ResponsivePageShell>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, backgroundColor: theme.colors.background },
  headerBorder: { borderBottomWidth: 1, borderBottomColor: '#E3E5E8', backgroundColor: theme.colors.surface },
  headerShell: { paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, backgroundColor: '#D9F1FA' },
  headerCopy: { flex: 1, gap: 1 },
  welcomeRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  welcomeText: { fontSize: 20, lineHeight: 26, fontWeight: theme.typography.weights.bold },
  subheader: { fontSize: 13, lineHeight: 19 },
  languageToggle: { minWidth: 62, minHeight: 32, borderColor: '#D5D9DE', alignSelf: 'flex-start' },
  languageToggleText: { fontSize: 10, lineHeight: 13 },
  cardShell: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: theme.spacing.xl,
  },
});
