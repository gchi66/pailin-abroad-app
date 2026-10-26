import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UnlockArtwork } from '@/src/components/lesson/UnlockArtwork';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { getMembershipPromotionCopy, MEMBERSHIP_PROMOTION } from '@/src/config/membership-promotion';
import { theme } from '@/src/theme/theme';

type ResourceUnlockCardProps = {
  language: 'en' | 'th';
  title: string;
  body: string;
  italicWord?: string;
  buttonLabel: string;
  onPress: () => void;
  appearance?: 'default' | 'guestProgress';
  accentColor?: string;
  promoteMembership?: boolean;
};

export function ResourceUnlockCard({
  language,
  title,
  body,
  italicWord,
  buttonLabel,
  onPress,
  appearance = 'default',
  accentColor,
  promoteMembership = false,
}: ResourceUnlockCardProps) {
  const italicIndex = italicWord ? body.indexOf(italicWord) : -1;
  const isGuestProgress = appearance === 'guestProgress';
  const resolvedAccentColor = accentColor ?? '#FF57A3';
  const promotionCopy = getMembershipPromotionCopy(language);
  const resolvedTitle = promoteMembership && MEMBERSHIP_PROMOTION.enabled ? promotionCopy.eyebrow : title;
  const resolvedBody = promoteMembership && MEMBERSHIP_PROMOTION.enabled ? promotionCopy.compactBody : body;
  const resolvedItalicWord = promoteMembership && MEMBERSHIP_PROMOTION.enabled ? undefined : italicWord;

  return (
    <View style={[styles.card, isGuestProgress ? styles.guestProgressCard : null]}>
      <UnlockArtwork
        accentColor={resolvedAccentColor}
        keyholeColor="#FFFFFF"
        showBackdrop={false}
        style={[styles.artwork, isGuestProgress ? styles.guestProgressArtwork : null]}
      />
      <View style={[styles.copy, isGuestProgress ? styles.guestProgressCopy : null]}>
        <AppText language={language} variant="title" style={[styles.title, isGuestProgress ? styles.guestProgressTitle : null]}>{resolvedTitle}</AppText>
        <AppText language={language} variant="muted" style={[styles.body, isGuestProgress ? styles.guestProgressBody : null]}>
          {italicIndex >= 0 && resolvedItalicWord ? (
            <>
              {resolvedBody.slice(0, italicIndex)}
              <Text style={styles.italic}>{resolvedItalicWord}</Text>
              {resolvedBody.slice(italicIndex + resolvedItalicWord.length)}
            </>
          ) : resolvedBody}
        </AppText>
        <Button
          language={language}
          title={buttonLabel}
          onPress={onPress}
          style={[
            styles.button,
            isGuestProgress ? styles.guestProgressButton : null,
            { backgroundColor: resolvedAccentColor },
          ]}
          textStyle={[styles.buttonText, isGuestProgress ? styles.guestProgressButtonText : null]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: '#F4FF57',
    padding: 12,
    gap: 12,
  },
  artwork: {
    width: 96,
    height: 96,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.text,
  },
  italic: {
    fontStyle: 'italic',
  },
  button: {
    minHeight: 36,
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#FF57A3',
  },
  buttonText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  guestProgressCard: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: '#F4FF57',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 14,
  },
  guestProgressArtwork: {
    width: 104,
    height: 104,
  },
  guestProgressCopy: {
    gap: 5,
  },
  guestProgressTitle: {
    fontSize: 14,
    lineHeight: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  guestProgressBody: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.text,
  },
  guestProgressButton: {
    minWidth: 156,
    minHeight: 36,
    marginTop: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  guestProgressButtonText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
