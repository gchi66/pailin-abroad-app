import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LessonDiscussionScreen } from '@/src/screens/LessonDiscussionScreen';

export default function LessonDiscussionRoute() {
  const params = useLocalSearchParams<{ id?: string; language?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';
  const language = params.language === 'en' || params.language === 'th' ? params.language : undefined;

  return <LessonDiscussionScreen language={language} lessonId={lessonId} />;
}
