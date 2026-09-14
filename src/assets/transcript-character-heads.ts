import type { ImageSourcePropType } from 'react-native';

import chloeHead from '@/assets/images/characters/chloe_head.webp';
import daraHead from '@/assets/images/characters/dara_head.webp';
import emilyHead from '@/assets/images/characters/emily_head.webp';
import enzoHead from '@/assets/images/characters/enzo_head.webp';
import jeraldHead from '@/assets/images/characters/jerald_head.webp';
import littleGirlHead from '@/assets/images/characters/little_girl_head.webp';
import lukeHead from '@/assets/images/characters/luke_head.webp';
import man1Head from '@/assets/images/characters/man1_head.webp';
import man2Head from '@/assets/images/characters/man2_head.webp';
import man3Head from '@/assets/images/characters/man3_head.webp';
import man4Head from '@/assets/images/characters/man4_head.webp';
import marcusHead from '@/assets/images/characters/marcus_head.webp';
import markHead from '@/assets/images/characters/mark_head.webp';
import oldManHead from '@/assets/images/characters/old_man_head.webp';
import pailinHead from '@/assets/images/characters/pailin_head.webp';
import peteHead from '@/assets/images/characters/pete_head.webp';
import sebastianHead from '@/assets/images/characters/sebastian_head.webp';
import sophiaHead from '@/assets/images/characters/sophia_head.webp';
import sylvieHead from '@/assets/images/characters/sylvie_head.webp';
import tylerHead from '@/assets/images/characters/tyler_head.webp';
import woman1Head from '@/assets/images/characters/woman1_head.webp';
import woman2Head from '@/assets/images/characters/woman2_head.webp';

const transcriptCharacterHeads = {
  chloe: chloeHead,
  dara: daraHead,
  emily: emilyHead,
  enzo: enzoHead,
  jerald: jeraldHead,
  luke: lukeHead,
  marcus: marcusHead,
  mark: markHead,
  pailin: pailinHead,
  pete: peteHead,
  sebastian: sebastianHead,
  sophia: sophiaHead,
  sylvie: sylvieHead,
  tyler: tylerHead,
} satisfies Record<string, ImageSourcePropType>;

const transcriptCharacterHeadAliases = {
  adult: woman1Head,
  alex: pailinHead,
  alicia: sophiaHead,
  anthony: peteHead,
  banker: man3Head,
  barista: woman1Head,
  bill: man4Head,
  carlos: man4Head,
  charlotte: chloeHead,
  cook: woman1Head,
  customer: woman2Head,
  dad: markHead,
  daniel: peteHead,
  diego: marcusHead,
  doug: man3Head,
  emma: emilyHead,
  ethan: markHead,
  frank: pailinHead,
  franklin: man1Head,
  'frat boy': man4Head,
  george: man3Head,
  joey: man3Head,
  kevin: man2Head,
  kid: littleGirlHead,
  lily: woman2Head,
  lola: woman1Head,
  marco: sebastianHead,
  marcy: woman1Head,
  michael: man3Head,
  ploy: chloeHead,
  professor: oldManHead,
  shelby: woman2Head,
  staff: woman1Head,
  steven: man3Head,
  'stranger #1': man1Head,
  'stranger #2': woman2Head,
  'surfer guy': man2Head,
  valet: man2Head,
} satisfies Record<string, ImageSourcePropType>;

const transcriptCharacterHeadByLesson = {
  '1.13|mom': woman2Head,
  '2.7|cashier': woman1Head,
  '2.9|man': man2Head,
  '3.5|worker': man1Head,
  '3.8|worker': woman2Head,
  '4.2|man': man4Head,
  '4.3|man': man2Head,
  '4.7|host': man3Head,
  '4.11|cashier': woman1Head,
  '4.13|cashier': woman2Head,
  '4.14|worker': man3Head,
  '4.7|server': woman2Head,
  '5.5|worker': woman1Head,
  '5.10|server': man1Head,
  '6.1|man': man2Head,
  '7.3|man': man1Head,
  '7.6|server': man3Head,
  '9.4|worker': man2Head,
  '9.8|mom': woman2Head,
  '10.7|everyone': null,
  '10.chp|3 kids': null,
  '12.11|man': man2Head,
  '14.8|dara': pailinHead,
  '16.12|mom': chloeHead,
} satisfies Record<string, ImageSourcePropType | null>;

export type TranscriptCharacterHeadResolution = ImageSourcePropType | null | undefined;

export const resolveTranscriptCharacterHead = (
  speaker: string | null | undefined,
  lessonExternalId?: string | null
): TranscriptCharacterHeadResolution => {
  const key = speaker?.trim().toLocaleLowerCase();
  if (!key) {
    return undefined;
  }

  const lessonKey = lessonExternalId?.trim().toLocaleLowerCase();
  if (lessonKey) {
    const scopedKey = `${lessonKey}|${key}`;
    if (Object.prototype.hasOwnProperty.call(transcriptCharacterHeadByLesson, scopedKey)) {
      return transcriptCharacterHeadByLesson[
        scopedKey as keyof typeof transcriptCharacterHeadByLesson
      ];
    }
  }

  const alias = transcriptCharacterHeadAliases[
    key as keyof typeof transcriptCharacterHeadAliases
  ];
  if (alias) {
    return alias;
  }

  return transcriptCharacterHeads[key as keyof typeof transcriptCharacterHeads];
};
