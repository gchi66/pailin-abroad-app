import type { ImageSourcePropType } from 'react-native';

import carissaImage from '@/assets/images/carissa.webp';
import freeLessonAdvancedImage from '@/assets/images/free_lesson_advanced_baseball.webp';
import freeLessonBeginnerImage from '@/assets/images/free_lesson_beginner_surf.webp';
import freeLessonExpertImage from '@/assets/images/free_lesson_expert_spaghetti.webp';
import freeLessonIntermediateImage from '@/assets/images/free_lesson_intermediate_hollywood.webp';
import grantImage from '@/assets/images/grant.webp';
import heroImage from '@/assets/images/characters/hero_image_pailin_luke.webp';
import membershipBannerImage from '@/assets/images/membership_launch_pricing_banner.webp';
import membershipStateImage from '@/assets/images/characters/pailin_blue_circle_right.webp';

import chloeActiveThumb from '@/assets/images/characters/chloe_blue_circle.webp';
import chloeDefaultThumb from '@/assets/images/characters/chloe_white_circle.webp';
import chloeImage from '@/assets/images/characters/chloe_meet_the_characters.webp';
import emilyActiveThumb from '@/assets/images/characters/emily_blue_circle.webp';
import emilyDefaultThumb from '@/assets/images/characters/emily_white_circle.webp';
import emilyImage from '@/assets/images/characters/emily_meet_the_characters.webp';
import lukeActiveThumb from '@/assets/images/characters/luke_blue_circle.webp';
import lukeDefaultThumb from '@/assets/images/characters/luke_white_circle.webp';
import lukeImage from '@/assets/images/characters/luke_meet_the_characters.webp';
import markActiveThumb from '@/assets/images/characters/mark_blue_circle.webp';
import markDefaultThumb from '@/assets/images/characters/mark_white_circle.webp';
import markImage from '@/assets/images/characters/mark_meet_the_characters.webp';
import pailinActiveThumb from '@/assets/images/characters/pailin_blue_circle.webp';
import pailinDefaultThumb from '@/assets/images/characters/pailin_white_circle.webp';
import pailinImage from '@/assets/images/characters/pailin_meet_the_characters.webp';
import sylvieActiveThumb from '@/assets/images/characters/sylvie_blue_circle.webp';
import sylvieDefaultThumb from '@/assets/images/characters/sylvie_white_circle.webp';
import sylvieImage from '@/assets/images/characters/sylvie_meet_the_characters.webp';

export const homeHeroImage = heroImage;

export const freeLessonImages = {
  beginner: freeLessonBeginnerImage,
  intermediate: freeLessonIntermediateImage,
  advanced: freeLessonAdvancedImage,
  expert: freeLessonExpertImage,
} satisfies Record<string, ImageSourcePropType>;

export const characterImages = {
  pailin: {
    hero: pailinImage,
    thumbnailDefault: pailinDefaultThumb,
    thumbnailActive: pailinActiveThumb,
  },
  luke: {
    hero: lukeImage,
    thumbnailDefault: lukeDefaultThumb,
    thumbnailActive: lukeActiveThumb,
  },
  chloe: {
    hero: chloeImage,
    thumbnailDefault: chloeDefaultThumb,
    thumbnailActive: chloeActiveThumb,
  },
  mark: {
    hero: markImage,
    thumbnailDefault: markDefaultThumb,
    thumbnailActive: markActiveThumb,
  },
  emily: {
    hero: emilyImage,
    thumbnailDefault: emilyDefaultThumb,
    thumbnailActive: emilyActiveThumb,
  },
  sylvie: {
    hero: sylvieImage,
    thumbnailDefault: sylvieDefaultThumb,
    thumbnailActive: sylvieActiveThumb,
  },
} satisfies Record<string, { hero: ImageSourcePropType; thumbnailDefault: ImageSourcePropType; thumbnailActive: ImageSourcePropType }>;

export const aboutImages = {
  methodPailin: pailinImage,
  carissa: carissaImage,
  grant: grantImage,
} as const;

export const membershipImages = {
  banner: membershipBannerImage,
  state: membershipStateImage,
} as const;
