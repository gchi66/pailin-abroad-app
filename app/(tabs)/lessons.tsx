import React from 'react';

import { GuestLessonLibraryScreen } from '@/src/screens/GuestLessonLibraryScreen';
import { useAppSession } from '@/src/context/app-session-context';
import { LessonsLibraryScreen } from '@/src/screens/LessonsLibraryScreen';

export default function LessonsTabScreen() {
  const { hasMembership } = useAppSession();

  if (!hasMembership) {
    return <GuestLessonLibraryScreen />;
  }

  return <LessonsLibraryScreen />;
}
