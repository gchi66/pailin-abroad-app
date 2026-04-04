import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export function SettingsScreen() {
  const { uiLanguage } = useUiLanguage();

  const copy =
    uiLanguage === 'th'
      ? {
          title: 'การตั้งค่า',
          body: 'หน้านี้จะถูกเชื่อมต่อในขั้นตอนถัดไป ตอนนี้ใช้เป็น placeholder สำหรับปลายทางจากหน้า More ก่อน',
        }
      : {
          title: 'Settings',
          body: 'This page will be connected in a later step. For now it serves as the placeholder destination from the More screen.',
        };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Card padding="lg" radius="lg">
        <Stack gap="sm">
          <View>
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {copy.title}
            </AppText>
          </View>
          <AppText language={uiLanguage} variant="body" style={styles.body}>
            {copy.body}
          </AppText>
        </Stack>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
  },
  body: {
    color: theme.colors.mutedText,
  },
});
