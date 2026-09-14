import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LessonDiscussionScreen } from '@/src/screens/LessonDiscussionScreen';

export default function LessonDiscussionRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';

  return <LessonDiscussionScreen lessonId={lessonId} />;
}
