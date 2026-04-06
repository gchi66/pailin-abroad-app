import React from 'react';
import { Stack } from 'expo-router';

export default function AccountTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="membership" />
      <Stack.Screen name="about" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
