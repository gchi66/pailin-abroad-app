import React from 'react';

import { useAppSession } from '@/src/context/app-session-context';
import { AuthScreen } from './AuthScreen';
import { MyPathwayScreen } from './MyPathwayScreen';

export function PrimaryScreen() {
  const { hasAccount, isLoading } = useAppSession();

  if (isLoading) {
    return null;
  }

  if (hasAccount) {
    return <MyPathwayScreen />;
  }

  return <AuthScreen />;
}
