import { View } from 'react-native';

import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';

export default function AuthCallbackRoute() {
  const { authError } = useAppSession();
  const { uiLanguage } = useUiLanguage();

  return (
    <View style={{ flex: 1 }}>
      <PageLoadingState
        language={uiLanguage}
        errorTitle={
          authError
            ? uiLanguage === 'th'
              ? 'ไม่สามารถดำเนินการต่อได้'
              : 'Unable to continue'
            : null
        }
        errorBody={authError}
      />
    </View>
  );
}
