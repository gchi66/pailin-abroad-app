import type { ImageSourcePropType } from 'react-native';

import aboutImage from '@/assets/images/resources-more/more-about.webp';
import commentsImage from '@/assets/images/resources-more/more-comments.webp';
import contactImage from '@/assets/images/resources-more/more-contact-us.webp';
import settingsImage from '@/assets/images/resources-more/more-settings.webp';

export const moreCardImages = {
  comments: commentsImage,
  about: aboutImage,
  contact: contactImage,
  settings: settingsImage,
} satisfies Record<string, ImageSourcePropType>;
