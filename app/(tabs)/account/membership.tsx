import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MoreMembershipRoute() {
  const params = useLocalSearchParams<{ source?: string }>();
  const source = typeof params.source === 'string' ? params.source : undefined;

  return (
    <Redirect
      href={{
        pathname: '/membership',
        params: source ? { source } : undefined,
      }}
    />
  );
}
