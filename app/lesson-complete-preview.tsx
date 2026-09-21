import { Redirect } from 'expo-router';
import React from 'react';

import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { LessonCompletePreviewScreen } from '@/src/screens/LessonCompletePreviewScreen';

export default function LessonCompletePreviewRoute() {
  const { isLoading, profile } = useAppSession();
  const { uiLanguage } = useUiLanguage();

  if (isLoading) return <PageLoadingState language={uiLanguage} />;
  if (profile?.is_admin !== true) return <Redirect href="/(tabs)/account/profile" />;
  return <LessonCompletePreviewScreen />;
}
