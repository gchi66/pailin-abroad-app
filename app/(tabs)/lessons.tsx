import React from 'react';

import { GuestLessonsHubScreen } from '@/src/screens/GuestLessonsHubScreen';
import { useAppSession } from '@/src/context/app-session-context';
import { LessonsLibraryScreen } from '@/src/screens/LessonsLibraryScreen';

export default function LessonsTabScreen() {
  const { hasAccount } = useAppSession();

  if (!hasAccount) {
    return <GuestLessonsHubScreen />;
  }

  return <LessonsLibraryScreen />;
}
