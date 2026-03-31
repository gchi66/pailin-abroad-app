import React from 'react';
import { Redirect } from 'expo-router';

export default function LessonsIndexScreen() {
  return <Redirect href="/(tabs)/lessons" />;
}
