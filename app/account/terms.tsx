import React from 'react';
import { Redirect } from 'expo-router';

export default function AccountTermsRedirectRoute() {
  return <Redirect href="/(tabs)/account/terms" />;
}
