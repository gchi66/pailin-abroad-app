import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { useAppSession } from '@/src/context/app-session-context';
import { theme } from '@/src/theme/theme';
import { AuthScreen } from './AuthScreen';
import { MyPathwayScreen } from './MyPathwayScreen';

export function PrimaryScreen() {
  const { hasAccount, isGuestMode, isLoading } = useAppSession();
  const [isPathwayReady, setIsPathwayReady] = useState(false);
  const handlePathwayReady = useCallback(() => {
    setIsPathwayReady(true);
  }, []);

  const shouldShowPathway = !isLoading && (hasAccount || isGuestMode);
  const shouldShowStartupLoader = isLoading || (shouldShowPathway && !isPathwayReady);

  if (!isLoading && !shouldShowPathway) {
    return <AuthScreen />;
  }

  return (
    <View style={styles.container}>
      {shouldShowPathway ? (
        <MyPathwayScreen deferLoadingState onReady={handlePathwayReady} />
      ) : null}

      {shouldShowStartupLoader ? (
        <View pointerEvents="auto" style={styles.loadingOverlay}>
          <PageLoadingState />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
});
