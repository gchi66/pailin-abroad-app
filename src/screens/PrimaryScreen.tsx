import React from 'react';

import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { useAppSession } from '@/src/context/app-session-context';
import { AuthScreen } from './AuthScreen';
import { MyPathwayScreen } from './MyPathwayScreen';

export function PrimaryScreen() {
  const { hasAccount, isLoading } = useAppSession();

  if (isLoading) {
    return <PageLoadingState animate={false} showImage={false} />;
  }

  if (hasAccount) {
    return <MyPathwayScreen />;
  }

  return <AuthScreen />;
}
