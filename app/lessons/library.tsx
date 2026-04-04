import React from 'react';
import { Redirect } from 'expo-router';

export default function GuestLessonLibraryRoute() {
  return <Redirect href="/(tabs)/lessons/library" />;
}
