import React from 'react';

import { GuestLessonLibraryScreen } from '@/src/screens/GuestLessonLibraryScreen';
import { LessonsLibraryScreen } from '@/src/screens/LessonsLibraryScreen';
import { useAppSession } from '@/src/context/app-session-context';

export default function GuestLessonLibraryTabRoute() {
  const { hasMembership } = useAppSession();

  if (hasMembership) {
    return <LessonsLibraryScreen />;
  }

  return <GuestLessonLibraryScreen />;
}
