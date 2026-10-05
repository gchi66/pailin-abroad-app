import React from 'react';

import { useAppSession } from '@/src/context/app-session-context';
import { FreeLessonLibraryScreen } from '@/src/screens/FreeLessonLibraryScreen';
import { LessonsLibraryScreen } from '@/src/screens/LessonsLibraryScreen';

export default function LessonsTabScreen() {
  const { hasMembership } = useAppSession();

  if (!hasMembership) {
    return <FreeLessonLibraryScreen />;
  }

  return <LessonsLibraryScreen />;
}
