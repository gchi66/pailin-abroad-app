import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paymentSuccessImages } from '@/src/assets/app-images';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type SuccessCopy = {
  title: string;
  subtitle: string;
  syncing: string;
  redirecting: string;
  devtoolsMessage: string;
};

const getCopy = (uiLanguage: 'en' | 'th'): SuccessCopy => {
  if (uiLanguage === 'th') {
    return {
      title: 'รับชำระเงินแล้ว!',
      subtitle: 'คุณจะถูกพาไปต่อในอีกสักครู่',
      syncing: 'กำลังปลดล็อกสิทธิ์สมาชิกของคุณ...',
      redirecting: 'กำลังพาคุณไปที่ My Pathway...',
      devtoolsMessage: 'โหมด Devtools เปิดอยู่ หน้านี้จะค้างไว้เพื่อให้คุณปรับดีไซน์ได้',
    };
  }

  return {
    title: 'Payment Received!',
    subtitle: 'You will be redirected momentarily.',
    syncing: 'Unlocking your membership access...',
    redirecting: 'Redirecting you to My Pathway...',
    devtoolsMessage: 'Devtools mode is on. This screen will stay here for design tweaking.',
  };
};

const AUTO_REDIRECT_DELAY_MS = 1200;
const MAX_SYNC_ATTEMPTS = 8;
const SYNC_INTERVAL_MS = 1250;

export function PurchaseSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ returnTo?: string; devtools?: string }>();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership, refreshMembershipAccess } = useAppSession();
  const copy = useMemo(() => getCopy(uiLanguage), [uiLanguage]);
  const [status, setStatus] = useState<'syncing' | 'redirecting' | 'devtools'>('syncing');

  const destination = typeof params.returnTo === 'string' && params.returnTo.trim() ? params.returnTo.trim() : '/(tabs)';
  const isDevtoolsMode = params.devtools === '1';

  useEffect(() => {
    if (isDevtoolsMode) {
      setStatus('devtools');
      return;
    }

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const syncAccess = async () => {
      if (hasMembership) {
        if (isMounted) {
          setStatus('redirecting');
        }
        timeoutId = setTimeout(() => {
          router.replace(destination as never);
        }, AUTO_REDIRECT_DELAY_MS);
        return;
      }

      for (let attempt = 0; attempt < MAX_SYNC_ATTEMPTS && isMounted; attempt += 1) {
        try {
          await refreshMembershipAccess();
        } catch {
          // Short retry window for sandbox / webhook propagation.
        }

        if (!isMounted) {
          return;
        }

        if (attempt < MAX_SYNC_ATTEMPTS - 1) {
          await new Promise((resolve) => {
            timeoutId = setTimeout(resolve, SYNC_INTERVAL_MS);
          });
        }
      }

      if (isMounted) {
        setStatus('redirecting');
        timeoutId = setTimeout(() => {
          router.replace(destination as never);
        }, AUTO_REDIRECT_DELAY_MS);
      }
    };

    void syncAccess();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [destination, hasMembership, isDevtoolsMode, refreshMembershipAccess, router]);

  const statusMessage =
    status === 'devtools'
      ? copy.devtoolsMessage
      : status === 'redirecting'
        ? copy.redirecting
        : copy.syncing;

  return (
    <ImageBackground source={paymentSuccessImages.confetti} resizeMode="cover" style={styles.screen}>
      <ResponsivePageShell style={styles.shell}>
        <View
          style={[
            styles.content,
            {
              minHeight: Math.max(height - insets.top - insets.bottom - theme.spacing.xl * 2, 0),
              paddingTop: 0,
              paddingBottom: 0,
            },
          ]}>
          <Card padding="lg" radius="lg" style={styles.card}>
            <Stack gap="md">
              <Image source={paymentSuccessImages.pailinThumbsUp} style={styles.heroImage} contentFit="contain" />

              <Stack gap="xs">
                <AppText language={uiLanguage} variant="title" style={styles.title}>
                  {copy.title}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
                  {copy.subtitle}
                </AppText>
              </Stack>

              <View style={styles.statusBox}>
                {status !== 'devtools' ? <ActivityIndicator color={theme.colors.text} /> : null}
                <AppText language={uiLanguage} variant="body" style={styles.statusText}>
                  {statusMessage}
                </AppText>
              </View>
            </Stack>
          </Card>
        </View>
      </ResponsivePageShell>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  heroImage: {
    alignSelf: 'center',
    width: 144,
    height: 144,
    marginTop: -8,
  },
  title: {
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 38,
  },
  subtitle: {
    textAlign: 'center',
    color: '#91CAFF',
    fontWeight: theme.typography.weights.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  statusBox: {
    minHeight: 92,
    borderRadius: theme.radii.md,
    backgroundColor: '#DFF3DE',
    borderWidth: 1,
    borderColor: '#A7D9A5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  statusText: {
    textAlign: 'center',
    color: '#5C6660',
    lineHeight: 30,
    fontSize: 17,
  },
});
