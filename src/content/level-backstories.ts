export type LevelBackstory = {
  en: string;
  th: string;
};

export const LEVEL_BACKSTORIES: Readonly<Record<number, LevelBackstory>> = {
  1: {
    en: "Pailin has just moved from Bangkok to Los Angeles. She's at a summer orientation for foreign exchange students at University of California, Los Angeles (UCLA). She meets other students there and learns about her upcoming school and host family experience.",
    th: 'ไพลินเพิ่งย้ายจากกรุงเทพฯ มาที่ลอสแอนเจลิส เธออยู่งานปฐมนิเทศฤดูร้อนสำหรับนักศึกษาแลกเปลี่ยนที่มหาวิทยาลัยแคลิฟอร์เนีย ลอสแอนเจลิส (UCLA) เธอได้พบกับนักศึกษาคนอื่นๆ ที่นั่น และได้เรียนรู้เกี่ยวกับการเรียนและการใช้ชีวิตกับครอบครัวโฮสต์ที่กำลังจะเริ่มขึ้น',
  },
  2: {
    en: 'Pailin has a week of free time before moving in with her host family and starting school at UCLA! She explores different places around Los Angeles with her new friend Chloe, who she met at orientation.',
    th: 'ไพลินมีเวลาว่างหนึ่งสัปดาห์ก่อนที่เธอจะย้ายเข้าไปอยู่กับครอบครัวโฮสต์ของเธอ และเริ่มเข้าเรียนที่ UCLA โดยเธอได้ไปออกสำรวจสถานที่ต่างๆ รอบๆ ลอสแอนเจลิสกับเพื่อนใหม่ของเธอที่ชื่อโคลอี้ ซึ่งพวกเธอได้รู้จักกันจากวันปฐมนิเทศ',
  },
  3: {
    en: 'Pailin meets her host family and moves into their home. With school starting in a few days, she takes time to bond with them and explore more of Los Angeles.',
    th: 'ไพลินได้พบกับครอบครัวโฮสต์ของเธอ และได้ย้ายเข้าไปที่บ้านของพวกเขา ก่อนที่จะเริ่มการเรียนในอีกไม่กี่วันข้างหน้า เธอใช้เวลาในการทำความรู้จักกับพวกเขาและออกไปเที่ยวลอสแอนเจลิสเพิ่มเติม',
  },
  4: {
    en: 'Pailin has started school at UCLA! She gets to know some classmates, becomes familiar with her new school, and also begins looking for a part-time job.',
    th: 'ไพลินเริ่มเรียนที่ UCLA แล้ว! เธอได้รู้จักกับเพื่อนร่วมชั้นหลายคน เริ่มคุ้นเคยกับสภาพแวดล้อมใหม่ในมหาวิทยาลัยของเธอ และเริ่มหางานพาร์ทไทม์ทำ',
  },
  5: {
    en: 'Pailin starts a part-time job at Skylight Books, a bookstore near UCLA. She attempts to juggle school, work, and her new friendships, all while looking forward to her birthday!',
    th: 'ไพลินเริ่มทำงานพาร์ทไทม์ที่ร้านหนังสือ Skylight Books ซึ่งเป็นร้านหนังสือใกล้ๆ UCLA เธอพยายามบาลานซ์การเรียน การงาน และมิตรภาพใหม่ๆ และก็ตั้งหน้าตั้งตารอวันเกิดของตัวเธอเองด้วย',
  },
  6: {
    en: 'Pailin deepens her friendships with her host family, classmates, and coworkers. She also begins going on a few dates with guys she meets at school and through dating apps.',
    th: 'ไพลินมีความสัมพันธ์ที่แน่นแฟ้นมากขึ้นทั้งกับครอบครัวโฮสต์ เพื่อนร่วมชั้น และเพื่อนที่ทำงานของเธอ และเธอยังเริ่มไปออกเดทกับผู้ชายที่เธอได้พบที่มหาวิทยาลัยและผ่านทางแอปหาคู่',
  },
  7: {
    en: 'Pailin begins to feel stressed as she tries to juggle work, school, friendships, and dating. She also becomes friends with a coworker at the bookstore, Tyler.',
    th: 'ไพลินเริ่มรู้สึกเครียดจากการพยายามทำหลายๆ เรื่อง ไม่ว่าจะเป็นการทำงาน การเรียน มิตรภาพต่างๆ และการออกเดท เธอเริ่มสนิทกับเพื่อนร่วมงานที่ร้านหนังสือที่ชื่อไทเลอร์',
  },
  8: {
    en: 'Pailin begins to feel homesick for Thailand. She spends extra time with her host family for comfort while still exploring Los Angeles with her friends.',
    th: 'ไพลินเริ่มรู้สึกคิดถึงประเทศไทย เธอเริ่มหาความสบายใจโดยใช้เวลากับครอบครัวโฮสต์ของเธอมากขึ้น ขณะที่ยังออกไปสำรวจลอสแอนเจลิสกับเพื่อนๆ ของเธอ',
  },
  9: {
    en: 'Pailin gets closer to Tyler and receives good news from her big sister Dara. She also helps out more around the house after her host mom breaks her foot. She enjoys the last few days of warm weather before it gets colder.',
    th: 'ไพลินสนิทกับไทเลอร์มากขึ้นเรื่อยๆ และได้รับข่าวดีจากดารา พี่สาวของเธอ ในขณะเดียวกัน เธอก็ช่วยงานบ้านมากขึ้นหลังจากที่แม่โฮสต์ของเธอเท้าหัก และใช้เวลาอย่างสนุกสนานไปกับช่วงอากาศอบอุ่นโค้งสุดท้ายก่อนที่อากาศจะเริ่มหนาว',
  },
  10: {
    en: "Pailin looks forward to her friend Chloe's birthday, attends a college party with her friends, and is excited to celebrate Halloween!",
    th: 'ไพลินตั้งหน้าตั้งตารอวันเกิดของโคลอี้ ไปงานปาร์ตี้ของหนุ่มสาวมหาวิทยาลัยกับเพื่อนๆ ของเธอ และตื่นเต้นที่จะได้ฉลองฮาโลวีน!',
  },
  11: {
    en: 'Pailin goes on a date with her coworker Tyler and starts to develop feelings for him. As winter approaches, she accepts an invitation to go on a ski trip with her host family and enjoys catching up with her good friends.',
    th: 'ไพลินไปออกเดทกับไทเลอร์ เพื่อนร่วมงานของเธอ และเริ่มมีความรู้สึกดีๆ ให้กับเขา และเมื่อฤดูหนาวมาถึง เธอตอบรับคำชวนไปทริปเล่นสกีกับครอบครัวโฮสต์ของเธอ และใช้เวลาไปเที่ยวกับเพื่อนๆ ของเธอ',
  },
  12: {
    en: "As Pailin's relationship with Tyler becomes more serious, she learns of her host brother Luke's dating mishaps. She is also looking forward to Thanksgiving and Black Friday!",
    th: 'เมื่อความสัมพันธ์ของไพลินและไทเลอร์เริ่มมีความจริงจังมากขึ้น เธอก็รู้เรื่องปัญหาความรักของลูค พี่ชายโฮสต์ของเธอ และเธอยังตั้งตารอเทศกาลขอบคุณพระเจ้า และช่วงเทศกาลลดราคา Black Friday!',
  },
  13: {
    en: "The start of the new year is approaching, which means lots of holidays! Christmas, New Year's, Valentine's Day, spring break… Pailin and Tyler have just made things official—they're now in a relationship! Pailin continues to work part-time at Skylight Books and study for her classes.",
    th: 'ปีใหม่กำลังใกล้เข้ามา ซึ่งหมายถึงเทศกาลต่างๆ มากมาย ทั้งคริสต์มาส ปีใหม่ วันวาเลนไทน์ และปิดเทอมฤดูใบไม้ผลิ… ไพลินกับไทเลอร์เพิ่งตกลงคบกันอย่างเป็นทางการ ตอนนี้ทั้งคู่เป็นแฟนกันแล้ว! ไพลินยังคงทำงานพาร์ทไทม์ที่ร้านหนังสือ Skylight Books ควบคู่ไปกับการเรียน',
  },
  14: {
    en: 'Pailin has just been let go from her job at Skylight Books and needs to find a new job. She looks forward to a trip with friends in the desert, continues to date her boyfriend Tyler, and starts thinking about graduation with just a few more months of school left.',
    th: 'ไพลินเพิ่งถูกเลิกจ้างจากร้านหนังสือ Skylight Books และต้องหางานใหม่ เธอตั้งตารอทริปไปเที่ยวทะเลทรายกับเพื่อนๆ ยังคงคบหากับไทเลอร์ แฟนหนุ่มของเธอ และเริ่มคิดถึงการเรียนจบ เพราะเหลือเวลาเรียนอีกเพียงไม่กี่เดือน',
  },
  15: {
    en: 'Pailin has just started working as a receptionist at The Broad art museum in downtown Los Angeles. Finals are approaching at school and Pailin and her friends begin thinking of their next steps after graduation. She also starts thinking of where her relationship with Tyler is headed.',
    th: 'ไพลินเพิ่งเริ่มทำงานเป็นพนักงานต้อนรับที่พิพิธภัณฑ์ศิลปะ The Broad ในใจกลางลอสแอนเจลิส ช่วงสอบปลายภาคกำลังใกล้เข้ามา และไพลินกับเพื่อนๆ เริ่มคิดถึงก้าวต่อไปหลังเรียนจบ นอกจากนี้ เธอยังเริ่มคิดว่าความสัมพันธ์ของเธอกับไทเลอร์จะดำเนินต่อไปอย่างไร',
  },
  16: {
    en: "Pailin just learned that her boyfriend Tyler was offered a job in New York, and they're not sure if they should continue their relationship. Her UCLA graduation ceremony is in a few days and she starts planning out her next steps—move back to Thailand or stay in LA? What's in store for Pailin and her friends after finishing university?",
    th: 'ไพลินเพิ่งรู้ว่าไทเลอร์ แฟนหนุ่มของเธอ ได้รับข้อเสนองานในนิวยอร์ก และทั้งคู่ยังไม่แน่ใจว่าควรสานต่อความสัมพันธ์หรือไม่ อีกไม่กี่วันก็จะถึงพิธีจบการศึกษาของเธอที่ UCLA และเธอเริ่มวางแผนก้าวต่อไปว่าจะย้ายกลับประเทศไทยหรืออยู่ต่อที่ลอสแอนเจลิส แล้วชีวิตของไพลินและเพื่อนๆ หลังเรียนจบมหาวิทยาลัยจะเป็นอย่างไรต่อไป?',
  },
};

export function getLevelBackstory(level: number | null, language: 'en' | 'th'): string {
  if (level == null) return '';
  return LEVEL_BACKSTORIES[level]?.[language] ?? '';
}
