import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import pailinAvatar from '@/assets/images/characters/pailin_blue_circle_right.webp';
import { PlacementTestIntroCard } from '@/src/components/placement-test/PlacementTestIntroCard';
import { AppText } from '@/src/components/ui/AppText';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';

const isEmailLike = (value: string | null | undefined) => Boolean(value && /\S+@\S+\.\S+/.test(value.trim()));

export function PlacementEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isGuestMode, profile, user } = useAppSession();
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
                  <AppText language="th" variant="title" style={styles.welcomeText}>
                    {isGuest ? 'สวัสดีค่ะ!' : `ยินดีต้อนรับ${firstName ? ',' : '!'}`}
                  </AppText>
                  {firstName && !isGuest ? (
                    <AppText language="th" variant="title" style={styles.nameText}>
                      {` ${firstName}!`}
                    </AppText>
                  ) : null}
                </View>
                <AppText language="th" variant="body" style={styles.subheader}>
                  พร้อมเรียนภาษาอังกฤษกับไพลินไหม?
                </AppText>
              </View>
            </View>
          </ResponsivePageShell>
        </View>

        <ResponsivePageShell style={styles.cardShell}>
          <PlacementTestIntroCard
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
  headerBorder: { borderBottomWidth: 1.5, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  headerShell: { paddingHorizontal: theme.spacing.md, paddingVertical: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.accent },
  headerCopy: { flex: 1, gap: 1 },
  welcomeRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  welcomeText: { fontSize: 22, lineHeight: 28, fontWeight: theme.typography.weights.bold },
  nameText: { fontSize: 22, lineHeight: 28, color: theme.colors.accent, fontWeight: theme.typography.weights.bold },
  subheader: { fontSize: 14, lineHeight: 20 },
  cardShell: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: theme.spacing.xl,
  },
});
