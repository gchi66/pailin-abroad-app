import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { LessonCompletePreviewScreen } from '@/src/screens/LessonCompletePreviewScreen';

export default function LessonCompletePreviewRoute() {
  const params = useLocalSearchParams<{ lesson?: string; lessonId?: string }>();
  const { isLoading, profile } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const isCompletedLessonRoute = Boolean(params.lesson && params.lessonId);

  if (isLoading) return <PageLoadingState language={uiLanguage} />;
  if (!isCompletedLessonRoute && profile?.is_admin !== true) return <Redirect href="/(tabs)/account/profile" />;
  return <LessonCompletePreviewScreen />;
}
