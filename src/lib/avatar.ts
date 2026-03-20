import type { ImageSourcePropType } from 'react-native';

import avatar1 from '@/assets/images/characters/avatar_1.png';
import avatar2 from '@/assets/images/characters/avatar_2.png';
import avatar3 from '@/assets/images/characters/avatar_3.png';
import avatar4 from '@/assets/images/characters/avatar_4.png';
import avatar5 from '@/assets/images/characters/avatar_5.png';
import avatar6 from '@/assets/images/characters/avatar_6.png';
import avatar7 from '@/assets/images/characters/avatar_7.png';
import avatar8 from '@/assets/images/characters/avatar_8.png';

const avatarMap: Record<string, ImageSourcePropType> = {
  '/images/characters/avatar_1.webp': avatar1,
  '/images/characters/avatar_1.png': avatar1,
  '/images/characters/avatar_2.webp': avatar2,
  '/images/characters/avatar_2.png': avatar2,
  '/images/characters/avatar_3.webp': avatar3,
  '/images/characters/avatar_3.png': avatar3,
  '/images/characters/avatar_4.webp': avatar4,
  '/images/characters/avatar_4.png': avatar4,
  '/images/characters/avatar_5.webp': avatar5,
  '/images/characters/avatar_5.png': avatar5,
  '/images/characters/avatar_6.webp': avatar6,
  '/images/characters/avatar_6.png': avatar6,
  '/images/characters/avatar_7.webp': avatar7,
  '/images/characters/avatar_7.png': avatar7,
  '/images/characters/avatar_8.webp': avatar8,
  '/images/characters/avatar_8.png': avatar8,
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
