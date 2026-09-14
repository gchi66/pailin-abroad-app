import type { ImageSourcePropType } from 'react-native';

import avatar1 from '@/assets/images/characters/avatar1_blue_circle.webp';
import avatar2 from '@/assets/images/characters/avatar2_blue_circle.webp';
import avatar3 from '@/assets/images/characters/avatar3_blue_circle.webp';
import avatar4 from '@/assets/images/characters/avatar4_blue_circle.webp';
import avatar5 from '@/assets/images/characters/avatar5_blue_circle.webp';
import avatar6 from '@/assets/images/characters/avatar6_blue_circle.webp';
import avatar7 from '@/assets/images/characters/avatar7_blue_circle.webp';
import avatar8 from '@/assets/images/characters/avatar8_blue_circle.webp';
import pailinBlueCircleRight from '@/assets/images/pailin_blue_circle_right.webp';

const avatarMap: Record<string, ImageSourcePropType> = {
  '/images/characters/avatar1_blue_circle.webp': avatar1,
  '/images/characters/avatar_1.webp': avatar1,
  '/images/characters/avatar_1.png': avatar1,
  '/images/characters/avatar2_blue_circle.webp': avatar2,
  '/images/characters/avatar_2.webp': avatar2,
  '/images/characters/avatar_2.png': avatar2,
  '/images/characters/avatar3_blue_circle.webp': avatar3,
  '/images/characters/avatar_3.webp': avatar3,
  '/images/characters/avatar_3.png': avatar3,
  '/images/characters/avatar4_blue_circle.webp': avatar4,
  '/images/characters/avatar_4.webp': avatar4,
  '/images/characters/avatar_4.png': avatar4,
  '/images/characters/avatar5_blue_circle.webp': avatar5,
  '/images/characters/avatar_5.webp': avatar5,
  '/images/characters/avatar_5.png': avatar5,
  '/images/characters/avatar6_blue_circle.webp': avatar6,
  '/images/characters/avatar_6.webp': avatar6,
  '/images/characters/avatar_6.png': avatar6,
  '/images/characters/avatar7_blue_circle.webp': avatar7,
  '/images/characters/avatar_7.webp': avatar7,
  '/images/characters/avatar_7.png': avatar7,
  '/images/characters/avatar8_blue_circle.webp': avatar8,
  '/images/characters/avatar_8.webp': avatar8,
  '/images/characters/avatar_8.png': avatar8,
  '/images/pailin_blue_circle_right.webp': pailinBlueCircleRight,
  '/images/characters/pailin_blue_circle_right.webp': pailinBlueCircleRight,
};

export function resolveAvatarSource(value: string | null | undefined): ImageSourcePropType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const pathOnly = normalized.replace(/^https?:\/\/[^/]+/i, '');
  if (avatarMap[pathOnly]) {
    return avatarMap[pathOnly];
  }

  if (/^https?:\/\//i.test(normalized)) {
    return { uri: normalized };
  }

  return null;
}
