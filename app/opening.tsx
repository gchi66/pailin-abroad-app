import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { useAppSession } from '@/src/context/app-session-context';
import { useOpeningScreen } from '@/src/context/opening-screen-context';
import { OpeningScreen } from '@/src/screens/OpeningScreen';

export default function OpeningRoute() {
  const params = useLocalSearchParams<{ preview?: string }>();
  const { isLoading, profile } = useAppSession();
  const { hasSeenOpeningScreen, isOpeningScreenStateReady } = useOpeningScreen();
  const isPreview = params.preview === '1';

  if (isLoading || !isOpeningScreenStateReady) return <PageLoadingState language="th" />;
  if (isPreview && profile?.is_admin !== true) return <Redirect href="/(tabs)/account/profile" />;
  if (!isPreview && hasSeenOpeningScreen) return <Redirect href="/(tabs)" />;

  return <OpeningScreen preview={isPreview} />;
}
