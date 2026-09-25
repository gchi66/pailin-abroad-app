import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  Image,
  ImageProps,
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
} from 'react-native';

import { theme } from '@/src/theme/theme';

import { AndroidNeoShadowLayer } from './AndroidNeoShadowLayer';
import { AppText } from './AppText';

type NavigationCardProps = {
  language: 'en' | 'th';
  title: string;
  description: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  eyebrow?: string;
  imageSource?: ImageSourcePropType | null;
  imageResizeMode?: ImageProps['resizeMode'];
  imageStyle?: StyleProp<ImageStyle>;
  leadingElement?: React.ReactNode;
  onPress: () => void;
};

export function NavigationCard({
  language,
  title,
  description,
  accessibilityLabel,
  disabled = false,
  eyebrow,
  imageSource,
  imageResizeMode = 'contain',
  imageStyle,
  leadingElement,
  onPress,
}: NavigationCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.pressable}>
      <AndroidNeoShadowLayer borderRadius={12} color={theme.colors.border} offset={3} />
      <View style={styles.card}>
        {imageSource ? (
          <Image source={imageSource} style={[styles.image, imageStyle]} resizeMode={imageResizeMode} />
        ) : leadingElement ? (
          <View style={styles.leadingSlot}>{leadingElement}</View>
        ) : null}
        <View style={styles.copy}>
          {eyebrow ? (
            <AppText language={language} variant="caption" style={styles.eyebrow}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText language={language} variant="body" style={styles.title}>
            {title.toLocaleUpperCase(language === 'th' ? 'th' : 'en')}
          </AppText>
          <AppText language={language} variant="caption" style={styles.description}>
            {description}
          </AppText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.colors.text} style={styles.chevron} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    position: 'relative',
  },
  card: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  image: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  leadingSlot: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#60A6DC',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.2,
  },
  description: {
    marginTop: 4,
    color: '#33383D',
    fontSize: 11,
    lineHeight: 17,
  },
  chevron: {
    marginLeft: 4,
  },
});
