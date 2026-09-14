import type { ImageSourcePropType } from 'react-native';

export const lessonHeaderBlueBlob = require('@/assets/images/lesson-headers/blue-blob-header.webp') as ImageSourcePropType;

const lessonHeaderImages = {
  chloe_sebastian: require('@/assets/images/lesson-headers/chloe_sebastian.webp'),
  luke_emily: require('@/assets/images/lesson-headers/luke_emily.webp'),
  luke_emily_mark: require('@/assets/images/lesson-headers/luke_emily_mark.webp'),
  luke_emily_sylvie: require('@/assets/images/lesson-headers/luke_emily_sylvie.webp'),
  luke_mark: require('@/assets/images/lesson-headers/luke_mark.webp'),
  pailin_2_strangers: require('@/assets/images/lesson-headers/pailin_2_strangers.webp'),
  pailin_4_family: require('@/assets/images/lesson-headers/pailin_4_family.webp'),
  pailin_chai: require('@/assets/images/lesson-headers/pailin_chai.webp'),
  pailin_chai_lek: require('@/assets/images/lesson-headers/pailin_chai_lek.webp'),
  pailin_chloe: require('@/assets/images/lesson-headers/pailin_chloe.webp'),
  pailin_chloe_anthony: require('@/assets/images/lesson-headers/pailin_chloe_anthony.webp'),
  pailin_chloe_anthony_ice_cream: require('@/assets/images/lesson-headers/pailin_chloe_anthony_ice_cream.webp'),
  pailin_chloe_emma: require('@/assets/images/lesson-headers/pailin_chloe_lily.webp'),
  pailin_chloe_frank: require('@/assets/images/lesson-headers/pailin_chloe_frank.webp'),
  pailin_chloe_lily: require('@/assets/images/lesson-headers/pailin_chloe_lily.webp'),
  pailin_chloe_luke: require('@/assets/images/lesson-headers/pailin_chloe_luke.webp'),
  pailin_chloe_steven: require('@/assets/images/lesson-headers/pailin_chloe_steven.webp'),
  pailin_daniel_chloe_luke: require('@/assets/images/lesson-headers/pailin_daniel_chloe_luke.webp'),
  pailin_dara: require('@/assets/images/lesson-headers/pailin_dara.webp'),
  pailin_emily: require('@/assets/images/lesson-headers/pailin_emily.webp'),
  pailin_emily_luke_mark: require('@/assets/images/lesson-headers/pailin_emily_luke_mark.webp'),
  pailin_emily_mark: require('@/assets/images/lesson-headers/pailin_emily_mark.webp'),
  pailin_emily_sylvie_mark: require('@/assets/images/lesson-headers/pailin_emily_sylvie_mark.webp'),
  pailin_enzo: require('@/assets/images/lesson-headers/pailin_enzo.webp'),
  pailin_jerald: require('@/assets/images/lesson-headers/pailin_jerald.webp'),
  pailin_lek: require('@/assets/images/lesson-headers/pailin_lek.webp'),
  pailin_little_girl: require('@/assets/images/lesson-headers/pailin_little_girl.webp'),
  pailin_lola_bill: require('@/assets/images/lesson-headers/pailin_lola_bill.webp'),
  pailin_luke: require('@/assets/images/lesson-headers/pailin_luke.webp'),
  pailin_man1: require('@/assets/images/lesson-headers/pailin_man1.webp'),
  pailin_man2: require('@/assets/images/lesson-headers/pailin_man2.webp'),
  pailin_man3: require('@/assets/images/lesson-headers/pailin_man3.webp'),
  pailin_man4: require('@/assets/images/lesson-headers/pailin_man4.webp'),
  pailin_marcus: require('@/assets/images/lesson-headers/pailin_marcus.webp'),
  pailin_marcy_luke: require('@/assets/images/lesson-headers/pailin_marcy_luke.webp'),
  pailin_mark: require('@/assets/images/lesson-headers/pailin_mark.webp'),
  pailin_mark_luke: require('@/assets/images/lesson-headers/pailin_mark_luke.webp'),
  pailin_old_man: require('@/assets/images/lesson-headers/pailin_old_man.webp'),
  pailin_pete: require('@/assets/images/lesson-headers/pailin_pete.webp'),
  pailin_sebastian: require('@/assets/images/lesson-headers/pailin_sebastian.webp'),
  pailin_server_luke: require('@/assets/images/lesson-headers/pailin_server_luke.webp'),
  pailin_shelby_jerald: require('@/assets/images/lesson-headers/pailin_shelby_jerald.webp'),
  pailin_sophia: require('@/assets/images/lesson-headers/pailin_sophia.webp'),
  pailin_sophia_marcus_professor: require('@/assets/images/lesson-headers/pailin_sophia_marcus_professor.webp'),
  pailin_superbowl: require('@/assets/images/lesson-headers/pailin_superbowl.webp'),
  pailin_sylvie: require('@/assets/images/lesson-headers/pailin_sylvie.webp'),
  pailin_sylvie_flower: require('@/assets/images/lesson-headers/pailin_sylvie_flower.webp'),
  pailin_tyler: require('@/assets/images/lesson-headers/pailin_tyler.webp'),
  pailin_woman1: require('@/assets/images/lesson-headers/pailin_woman1.webp'),
  pailin_woman2: require('@/assets/images/lesson-headers/pailin_woman2.webp'),
} satisfies Record<string, ImageSourcePropType>;

const getLessonHeaderKey = (rawValue: string | null | undefined): string | null => {
  const normalized = rawValue?.trim().split(/[?#]/)[0].replace(/\\/g, '/');
  if (!normalized) {
    return null;
  }

  const filename = normalized.split('/').at(-1) ?? normalized;
  return filename.replace(/\.[a-z0-9]+$/i, '').toLocaleLowerCase();
};

export const resolveLocalLessonHeaderImage = (
  rawValue: string | null | undefined
): ImageSourcePropType | null => {
  const key = getLessonHeaderKey(rawValue);
  if (!key) {
    return null;
  }

  return lessonHeaderImages[key as keyof typeof lessonHeaderImages] ?? null;
};
