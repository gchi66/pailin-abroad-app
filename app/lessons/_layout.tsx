import React from 'react';
import { Stack } from 'expo-router';

export default function LessonsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        presentation: 'card',
      }}
    />
  );
}
