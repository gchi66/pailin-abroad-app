import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { aboutImages } from '@/src/assets/app-images';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';
type AboutSectionKey = 'method' | 'team';

type AboutMethodCard = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  imagePlaceholderLabel?: string;
};

type TeamMember = {
  name: string;
  role: string;
  description: string;
  imagePlaceholderLabel: string;
};

const getAboutPageCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'เกี่ยวกับ Pailin Abroad',
      subtitle: 'มาทำความรู้จักเกี่ยวกับเรากัน ไม่ว่าจะเป็นวิธีการเรียน ทีมงาน และเรื่องราวของเรา!',
      sections: {
        method: 'วิธีการเรียนของเรา',
        team: 'ทีมงานของเรา',
      },
      imagePlaceholder: 'พื้นที่สำหรับรูปภาพ',
      methodCards: [
        {
          title: 'วิธีการเรียนในแบบของ Pailin Abroad คืออะไร?',
          paragraphs: [
            'Pailin Abroad เป็นแพลตฟอร์มการเรียนการสอนภาษาอังกฤษ ที่มีบทเรียนมากกว่า 150 บทเรียนผ่านเรื่องราวต่างๆ ที่อิงจากบทสนทนา แทนที่จะใช้วิธีการท่องจำกฎไวยากรณ์หรือคำศัพท์แบบแยกส่วนกัน คุณจะได้เรียนรู้ผ่านเรื่องราวที่มีความต่อเนื่องของชีวิตไพลินในเมืองลอสแอนเจลิส ซึ่งจะช่วยให้คุณได้เรียนรู้ภาษาอังกฤษจากในบริบท ด้วยวิธีการเรียนรู้ที่เป็นธรรมชาติและน่าสนใจ',
          ],
        },
        {
          title: 'ไพลินคือใคร?',
          paragraphs: [
            'ไพลินคือสาววัย 21 ปีจากกรุงเทพฯ ที่เดินทางไปเรียนต่อต่างประเทศที่เมืองลอสแอนเจลิสเป็นเวลา 1 ปี',
            'คุณจะได้ติดตามเส้นทางชีวิตการเดินทางของเธอ ไม่ว่าจะเป็นเรื่องมิตรภาพ ความรัก ครอบครัว การเรียน การทำงาน และการใช้ชีวิตในต่างประเทศ เมื่อคุณได้ทำความรู้จักกับไพลินและตัวละครอื่นๆมากขึ้น คุณจะรู้สึกผูกพันกับเรื่องราวของพวกเขา และมีแรงจูงใจในการเรียนรู้ไปกับเรื่องราวเหล่านี้ พร้อมทั้งพัฒนาภาษาอังกฤษของคุณไปด้วยในเวลาเดียวกัน',
            'รู้ไหม ว่าคุณสามารถติดตามดูชีวิตของไพลินในแอลเอได้ทาง Instagram ที่ @pailinabroad ได้ด้วยนะ!',
          ],
          imagePlaceholderLabel: 'ใส่รูป Pailin character ภายหลัง',
        },
        {
          title: 'ฉันจะได้เรียนภาษาอังกฤษแบบไหน?',
          paragraphs: [
            'คุณจะได้เรียนรู้ภาษาอังกฤษที่เป็นธรรมชาติจากบทสนทนาจริง ไปพร้อมกับ Pailin Abroad และเป็นภาษาอังกฤษที่เจ้าของภาษานั้นใช้จริงๆ',
            'สื่อการเรียนภาษาอังกฤษหลายๆแห่งนั้นสอนภาษาอังกฤษที่มีรูปแบบเป็นทางการและดูแข็งทื่อ ทำให้ฟังดูไม่เป็นธรรมชาติเมื่อนำมาใช้ในบทสนทนาจริง เราจะข้ามการเรียนในแบบตามตำรา และเน้นไปที่บทสนทนาที่ได้ใช้จริง ที่คุณสามารถใช้กับเพื่อนๆ ครอบครัว เพื่อนร่วมงาน คนที่คุณมีความสนใจ และรวมไปถึงคนแปลกหน้า',
            'เป้าหมายของเราคือช่วยให้คุณได้ใช้ภาษาอังกฤษเพื่อแสดงความเป็นตัวตนที่แท้จริงออกมา ตัวละครใน Pailin Abroad นั้นได้มีการแสดงออกทั้งความตื่นเต้น เศร้า โกรธ หงุดหงิด สับสน และอับอาย ซึ่งก็เหมือนกับพวกเราทุกคนนั่นแหละ! ผ่านบทสนทนาในชีวิตจริงของพวกเขา คุณจะได้เรียนรู้การแสดงความรู้สึกของคุณเป็นภาษาอังกฤษอย่างเป็นธรรมชาติ',
          ],
        },
        {
          title: 'Pailin Abroad เหมาะกับผู้เรียนภาษาอังกฤษระดับไหน?',
          paragraphs: [
            'Pailin Abroad ถูกออกแบบเพื่อรองรับผู้เรียนภาษาอังกฤษทุกระดับ! เรามีระดับบทเรียนตั้งแต่ระดับเริ่มต้น (Beginner), ระดับกลาง (Intermediate), ระดับสูง (Advanced) จนถึงระดับเชี่ยวชาญ (Expert)',
            'บทเรียนระดับ 1 ของคอร์สเริ่มต้น (Beginner) นั้นเหมาะอย่างยิ่งหากคุณกำลังเริ่มเรียนภาษาอังกฤษตั้งแต่พื้นฐาน',
            'และที่ดีที่สุดก็คือ คุณไม่ต้องเรียนตามเส้นทางที่กำหนดตายตัว คุณสามารถกระโดดเข้าไปเรียนในระดับที่เหมาะกับทักษะของคุณได้เลย แต่เราก็มั่นใจว่าผู้เรียนระดับสูงๆจะพบว่าบทเรียนระดับเริ่มต้นของเราน่าสนใจและมีมุมมองใหม่ๆด้วย',
          ],
        },
        {
          title: 'Pailin Abroad ช่วยผู้เรียนชาวไทยได้อย่างไร?',
          paragraphs: ['Pailin Abroad มีข้อดีใหญ่ๆสำหรับผู้เรียนชาวไทยอยู่ 2 อย่าง:'],
          bullets: [
            'เนื้อหาการเรียนทั้งหมดมีทั้งภาษาอังกฤษและภาษาไทย: สื่อการเรียนภาษาอังกฤษส่วนใหญ่จะมีเฉพาะภาษาอังกฤษ จึงทำให้ไม่เหมาะกับผู้เรียนมือใหม่! หรือไม่คุณก็ต้องใช้ Google Translate แปลเนื้อหาทั้งหมดออกมา ซึ่งมักแปลออกมาไม่ถูกต้อง แต่กับ Pailin Abroad นั้น คุณไม่ต้องกังวลในเรื่องนี้เลย คุณแค่โฟกัสไปที่การเรียนรู้ก็พอ',
            'บทเรียนทั้งหมดถูกเขียนขึ้นโดยเจ้าของภาษาที่เคยอาศัยอยู่ในประเทศไทยมาหลายปี: เรามีความเข้าใจในปัญหาที่ผู้เรียนชาวไทยมักประสบพบเจอเมื่อเรียนภาษาอังกฤษ คลังที่เรารวบรวมข้อผิดพลาดที่พบบ่อยที่คนไทยมักทำนั้น จะช่วยอธิบายข้อผิดพลาด พร้อมเหตุผลว่าทำไมถึงใช้ผิด และให้วิธีการแก้ไขในการใช้ภาษาอีกด้วย',
          ],
        },
        {
          title: 'Pailin Abroad จะช่วยให้ฉันพัฒนาภาษาอังกฤษของฉันในชีวิตประจำวันได้อย่างไร?',
          paragraphs: [
            'นี่เคยเกิดขึ้นกับคุณมาก่อนไหม?',
            'คุณเรียนภาษาอังกฤษมา และรู้สึกมั่นใจในภาษาของคุณ แต่พอเอาเข้าจริง เจ้าของภาษาพูดเร็วมาก และใช้คำสแลงเยอะมากๆ! คุณกลับพูดไม่ออก และจู่ๆมันก็เหมือนว่าภาษาอังกฤษที่คุณเรียนมาทั้งชีวิตนั้นหายไปทันที',
            'เราเข้าใจความรู้สึกนี้ดีเลย! นั่นเป็นสิ่งที่จะเกิดขึ้นเมื่อคุณเรียนภาษาอังกฤษมาแบบไม่มีบริบท ซึ่งมักมาจากตำราเรียนในห้องเรียนแบบเก่าๆ',
            'ในชีวิตจริงนั้น คุณไม่สามารถขอให้คนอื่นพูดช้าลง หรือพูดซ้ำๆให้เราได้อยู่ตลอดหรอกนะ แต่การเรียนกับ Pailin Abroad นั้น คุณเป็นคนควบคุมการเรียนรู้เองได้เลย คุณสามารถปรับความเร็วของไฟล์เสียง ฟังบทสนทนาซ้ำ และฟังกี่รอบก็ได้เท่าที่คุณต้องการ จนกว่าคุณจะเข้าใจเนื้อหาอย่างแท้จริง ไม่นานนักหรอก เดี๋ยวคุณก็จะหยุดแปลการพูดทุกคำเป็นภาษาไทยในหัวของคุณ และเริ่มเข้าใจภาษาอังกฤษขึ้นเรื่อยๆอย่างเป็นธรรมชาติในความเร็วที่ใช้ในชีวิตจริงเลยล่ะ',
          ],
        },
        {
          title: 'ในหนึ่งบทเรียนมีอะไรบ้าง?',
          paragraphs: ['แต่ละบทเรียนจะประกอบไปด้วยองค์ประกอบเหล่านี้ โดยเรียงลำดับอย่างเป็นขั้นตอนเพื่อเป็นแนวทางในการช่วยคุณฝึกใช้ภาษา'],
          bullets: [
            'บทสนทนาเสียง: ปรับความเร็วไฟล์เสียงลงและฟังบทสนทนาซ้ำได้บ่อยเท่าที่คุณต้องการ พยายามอย่าดูที่คำแปลก่อน ลองฟังดูก่อนว่าคุณเข้าใจมากน้อยแค่ไหน',
            'ประเด็นหลักของบทเรียน: แต่ละบทเรียนจะโฟกัสไปที่กฎไวยากรณ์หรือแนวคิดสำคัญเพียงหนึ่งเรื่อง ที่จะถูกใช้ตลอดบทสนทนา คุณจึงจะได้ยินการใช้ในบริบทที่มีความเป็นธรรมชาติ',
            'คำถามเพื่อทดสอบความเข้าใจ: ทดสอบความเข้าใจภาพรวมของบทสนทนา',
            'การนำไปใช้: นี่เป็นโอกาสของคุณที่จะลองใช้กฎไวยากรณ์ที่อยู่ในประเด็นหลักของบทเรียนด้วยการแต่งประโยคของตัวเอง ก่อนที่จะเริ่มเรียนจริง! นี่จะช่วยให้คุณจำเนื้อหาได้ดียิ่งขึ้น',
            'การทำความเข้าใจ: เจาะลึกประเด็นหลักของบทเรียนโดยใช้บทสนทนาเป็นบริบท กดฟังประโยคการใช้ตัวอย่างเพื่อฝึกการฟังและความเข้าใจของคุณมากยิ่งขึ้น',
            'เคล็ดลับเพิ่มเติม: ส่วนนี้จะเป็นทริคเพิ่มเติมที่จะช่วยให้คุณเข้าใจประเด็นหลักของบทเรียนมากขึ้น',
            'ข้อผิดพลาดที่พบบ่อย: นี่เป็นข้อผิดพลาดทางการใช้ที่คนไทยมักทำผิดพลาด พร้อมคำอธิบายและวิธีการแก้ใขในการใช้ที่ถูกต้อง',
            'วลีและ Phrasal Verbs ต่างๆ: เราได้ทำการเน้นวลีและ phrasal verbs ที่สำคัญๆที่ใช้ในบทสนทนาไว้ให้ พร้อมทั้งไฟล์เสียงตัวอย่างการใช้ในประโยคจริง',
            'เกร็ดความรู้ทางวัฒนธรรม: ส่วนนี้เป็นข้อมูลเชิงลึกในด้านวัฒนธรรมอเมริกันที่ถูกกล่าวถึงในบทสนทนา ที่คุณจะพบว่ามันน่าสนใจและมีประโยชน์',
            'แบบฝึกหัด: ทุกบทเรียนมีแบบฝึกหัดให้คุณทำ เพื่อเสริมความเข้าใจในประเด็นหลักของบทเรียน',
            'การแสดงความคิดเห็น: ฝึกทักษะการเขียนของคุณโดยตอบกลับคอมเมนต์ที่ปักหมุดไว้! เราจะตอบกลับพร้อมให้คำแนะนำและแก้ไขข้อผิดพลาดให้แบบส่วนตัวเลยล่ะ!',
          ],
        },
        {
          title: 'Pailin Abroad เหมาะกับใครที่สุด?',
          paragraphs: [
            'คุณคงจะเคยได้ยินคำแนะนำในการเรียนภาษาแบบนี้มาบ้างแล้วว่า "ก็แค่ออกไปฝึกใช้ข้างนอก และก็เริ่มพูดบ่อยๆเอง!"',
            'แต่ความจริงก็คือ ไม่ใช่ทุกคนที่จะเก่งมีพรสวรรค์ในการเรียนภาษา จากการซึมซับมาเพียงอย่างเดียวเท่านั้น',
            'Pailin Abroad ถูกออกแบบมาให้เป็นพื้นที่ที่เป็นระบบ แต่ก็สบายๆในการฝึกใช้ภาษาอังกฤษของคุณ และช่วยสร้างความมั่นใจให้กับคุณ เมื่อทักษะการฟังของคุณพัฒนาขึ้นแบบขีดสุดไปกับบทเรียนของเรา คุณก็ไม่ต้องกลัวการพูดกับเจ้าของภาษาอีกต่อไป!',
          ],
        },
      ] as AboutMethodCard[],
      teamMembers: [
        {
          name: 'CARISSA',
          role: 'Co-Founder & Head of Content',
          description:
            'สวัสดีทุกคน! ฉันเติบโตที่ลอสแอนเจลิส แต่ย้ายมาเมืองไทยตอนอายุเพียง 23 ปี ฉันเริ่มต้นจากการสอนนักเรียนชั้น ป.2 ที่ชัยภูมิ ซึ่งเป็นที่ที่ฉันได้รู้จักกับ Grant ผู้ร่วมก่อตั้งของเรา หลังจากอยู่ที่นั่น 6 เดือน ฉันก็ไปใช้ชีวิตต่อที่เชียงใหม่อีก 7 ปีที่แสนยอดเยี่ยม การได้เรียนภาษาไทยเปลี่ยนทุกอย่างสำหรับฉัน เพราะมันทำให้ฉันเห็นชัดเลยว่าคนไทยมักติดตรงไหนเวลาเรียนภาษาอังกฤษ และเพราะอะไร ฉันร่วมสร้าง Pailin Abroad ขึ้นมาเพื่อช่วยสร้างความมั่นใจให้ผู้เรียน และเพื่อทำให้บทเรียนจากเจ้าของภาษาอังกฤษเข้าถึงได้สำหรับทุกคน ไม่ว่าจะอยู่ที่ไหนก็ตาม',
          imagePlaceholderLabel: 'ใส่รูป Carissa ภายหลัง',
        },
        {
          name: 'GRANT',
          role: 'Co-Founder & Lead Developer',
          description:
            'สวัสดีครับ! ผมชื่อ Grant เดิมผมมาจากรัฐเท็กซัส แต่หลังจากเรียนจบมหาวิทยาลัย ผมก็เดินทางมาที่ประเทศไทยเพื่อสอนภาษาอังกฤษ ผมเป็นครูอยู่ในไทยเกือบ 4 ปี และหลังจากนั้นอีก 4 ปีในประเทศจีน ต่อมาผมก็เปลี่ยนสายมาทำงานด้านโค้ดและพัฒนาเว็บไซต์ ตอนที่อยู่เมืองไทย ผมได้เจอกับ Carissa ผู้ร่วมก่อตั้งของเรา ที่ชัยภูมิซึ่งเป็นเมืองชนบท คนไทยอบอุ่นและเป็นมิตรมาก และพวกเขาก็ช่วยผมมากในเส้นทางการเรียนภาษาไทยของผม ผมหวังว่า Pailin Abroad จะได้ช่วยพวกเขากลับคืนบ้าง!',
          imagePlaceholderLabel: 'ใส่รูป Grant ภายหลัง',
        },
      ] as TeamMember[],
    };
  }

  return {
    title: 'About Pailin Abroad',
    subtitle: 'Learn all you need to know about us - our method, our team, and our story!',
    sections: {
      method: 'The Method',
      team: 'Our Team',
    },
    imagePlaceholder: 'Image placeholder',
    methodCards: [
      {
        title: 'What is the Pailin Abroad method?',
        paragraphs: [
          'Pailin Abroad is a narrative-driven English learning platform with over 150 lessons, each based on a conversation. Instead of memorizing disconnected grammar rules or vocabulary lists, you will follow a continuous story that follows Pailin’s life in Los Angeles, which gives you an engaging and natural way of learning English in context.',
        ],
      },
      {
        title: 'Who is Pailin?',
        paragraphs: [
          'Pailin is a 21-year-old girl from Bangkok who will study abroad in Los Angeles for a year.',
          'You will follow her journey as she navigates friendship, love, family, school, work, and life in a new country. As you get to know Pailin and the other characters, you will feel connected to their stories and be motivated to move through the narrative, all while improving your English along the way.',
          'Did you know? You can see what Pailin is up to in LA on Instagram! @pailinabroad ✨',
        ],
        imagePlaceholderLabel: 'Add Pailin character image later',
      },
      {
        title: 'What kind of English will I learn?',
        paragraphs: [
          'You will learn natural, conversational English with Pailin Abroad - the English that native speakers actually use.',
          'Many ESL resources teach stiff, formal English that sounds awkward in casual conversation. We skip that textbook formality and focus on the real-life conversations you will have with friends, family, coworkers, romantic interests, and strangers.',
          'Our goal is to help you use English to show your true personality. The characters in Pailin Abroad get excited, sad, angry, annoyed, confused, and embarrassed - just like all of us. Through their real-life dialogues, you will learn authentic ways to express your feelings in English.',
        ],
      },
      {
        title: 'What English level is Pailin Abroad for?',
        paragraphs: [
          'Pailin Abroad is designed to support all levels of English learners. We offer Beginner, Intermediate, Advanced, and Expert levels.',
          'Level 1 of our Beginner course is perfect if you are starting your English learning from scratch.',
          'Best of all, you are not stuck on a pathway - you can jump into any level that suits your skills. But we think that more advanced learners will still find our beginner lessons interesting and insightful.',
        ],
      },
      {
        title: 'How does Pailin Abroad specifically benefit Thai people?',
        paragraphs: ['There are two huge advantages that Pailin Abroad offers for Thai people:'],
        bullets: [
          'All content is translated in English and Thai: Most ESL resources are only available in English, so they are not beginner-friendly. Or, you must use Google Translate for all the content, which leads to wildly inaccurate translations. With Pailin Abroad, you do not have to worry about this - you can just focus on learning.',
          'All lessons are created by native English speakers who lived in Thailand for years: We understand the unique challenges that Thai people face when learning English. Our Common Mistakes library gives specific insights into the mistakes that Thai people often make, and why. We also offer ways to fix these mistakes.',
        ],
      },
      {
        title: 'How will Pailin Abroad help me improve my English in the real world?',
        paragraphs: [
          'Has this ever happened to you?',
          'You study English and feel confident in your skills, but then a native speaker talks so quickly and uses so much slang. You freeze, and suddenly all the English you learned has disappeared.',
          'We totally get it. That is what happens when you learn English out of context, usually from outdated textbooks in the classroom.',
          'In real life, you cannot always ask people to slow down or repeat themselves. But with Pailin Abroad, you are in control. You can slow down the audio, replay the conversation, and listen as many times as you need until you fully grasp the dialogue. Soon enough, you will stop translating every single word into Thai in your head, and you will start naturally understanding English at a real-life pace.',
        ],
      },
      {
        title: 'What is included in each lesson?',
        paragraphs: ['Each lesson contains all or most of these items, in this specific flow to guide your practice:'],
        bullets: [
          'Audio Conversation: Slow down and relisten to the conversation as many times as you need. Try not to look at the translation first - see how much you can understand just by listening.',
          'Lesson Focus: Each lesson revolves around one grammar point or key concept that is used throughout the conversation, so you can hear it in a natural context.',
          'Comprehension Questions: Test your overall understanding of the conversation.',
          'Apply: This is your chance to try using the lesson focus in a sentence on your own before learning about it. This will help concepts stick better in your brain.',
          'Understand: Dive into the lesson focus, using the conversation for context. Listen to example sentences with audio to further practice your listening and comprehension skills.',
          'Extra Tips: These are tips that can further your understanding of the lesson focus.',
          'Common Mistakes: These are common mistakes made by Thai people, along with ways to fix them.',
          'Phrases & Phrasal Verbs: We have highlighted the important phrases and phrasal verbs used in the conversation, complete with examples of them used in a sentence.',
          'Culture Notes: These are insights into American culture that are mentioned in the conversation that you will find interesting or useful to know.',
          'Practice: Every lesson has practice exercises for you to complete to further your understanding of the lesson focus.',
          'Comment: Practice your writing skills by responding to the Pinned Comment. We will respond with personalized feedback and corrections.',
        ],
      },
      {
        title: 'Who is Pailin Abroad best for?',
        paragraphs: [
          'You have definitely heard this advice for learning a language: "Just go out there and start speaking!"',
          'But the truth is, not all of us are naturally gifted at learning a language just by immersion alone.',
          'Pailin Abroad is designed to be a comfortable, structured space to practice your English and build your confidence. By greatly improving your listening skills with our lessons, you will no longer feel intimidated to talk with native English speakers.',
        ],
      },
    ] as AboutMethodCard[],
    teamMembers: [
      {
        name: 'CARISSA',
        role: 'Co-Founder & Head of Content',
        description:
          'Hey everyone! I grew up in Los Angeles, but moved to Thailand when I was just 23 years old. I started out teaching 2nd grade in Chaiyaphum, where I became friends with my co-founder, Grant. After 6 months there, I spent 7 amazing years in Chiang Mai. Learning Thai changed everything for me - it helped me see exactly where Thai people get stuck learning English, and why. I helped create Pailin Abroad to build confidence in learners, and to make lessons from native English speakers accessible to everyone, everywhere.',
        imagePlaceholderLabel: 'Add Carissa image later',
      },
      {
        name: 'GRANT',
        role: 'Co-Founder & Lead Developer',
        description:
          'Hi! I’m Grant. I’m originally from Texas, but after I graduated from University I went over to Thailand to teach English. I was a teacher for almost 4 years in Thailand, and for 4 more years after that in China. After that I pivoted to coding and website development. While I was in Thailand, I met my co-founder, Carissa in rural Chaiypahum. Thai people are so warm and welcoming and they helped me a lot in my journey of learning Thai, and I hope that Pailin Abroad will help them!',
        imagePlaceholderLabel: 'Add Grant image later',
      },
    ] as TeamMember[],
  };
};

export function AboutScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const copy = useMemo(() => getAboutPageCopy(uiLanguage), [uiLanguage]);
  const [activeSection, setActiveSection] = useState<AboutSectionKey>('method');
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({ 0: true });

  const toggleCard = (index: number) => {
    setExpandedCards((current) => ({ ...current, [index]: !current[index] }));
  };

  const sectionOptions: { key: AboutSectionKey; label: string }[] = [
    { key: 'method', label: copy.sections.method },
    { key: 'team', label: copy.sections.team },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} onBackPress={() => router.push('/(tabs)/account')} topInsetOffset={52} />

        <View style={styles.sectionTabs}>
          {sectionOptions.map((option) => {
            const isActive = activeSection === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={() => setActiveSection(option.key)}
                style={[styles.sectionTab, isActive ? styles.sectionTabActive : null]}>
                <AppText
                  language={uiLanguage}
                  variant="caption"
                  style={[styles.sectionTabText, isActive ? styles.sectionTabTextActive : null]}>
                  {option.label.toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {activeSection === 'method' ? (
          <Stack gap="sm">
            {copy.methodCards.map((card, index) => {
              const isExpanded = Boolean(expandedCards[index]);
              return (
                <Card key={card.title} padding="lg" radius="lg" style={[styles.contentCard, !isExpanded ? styles.contentCardCollapsed : null]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => toggleCard(index)}
                    style={[styles.cardHeader, !isExpanded ? styles.cardHeaderCollapsed : null]}>
                    <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
                      {card.title}
                    </AppText>
                    <AppText language={uiLanguage} variant="body" style={styles.cardChevron}>
                      {isExpanded ? '▴' : '▾'}
                    </AppText>
                  </Pressable>

                  {isExpanded ? (
                    <Stack gap="sm">
                      {card.imagePlaceholderLabel ? (
                        <Image source={aboutImages.methodPailin} style={styles.methodImage} resizeMode="contain" />
                      ) : null}
                      {card.paragraphs.map((paragraph) => (
                        <AppText key={paragraph} language={uiLanguage} variant="body" style={styles.bodyText}>
                          {paragraph}
                        </AppText>
                      ))}
                      {card.bullets?.map((bullet) => (
                        <View key={bullet} style={styles.bulletRow}>
                          <View style={styles.bulletDot} />
                          <AppText language={uiLanguage} variant="body" style={styles.bulletText}>
                            {bullet}
                          </AppText>
                        </View>
                      ))}
                    </Stack>
                  ) : null}
                </Card>
              );
            })}
          </Stack>
        ) : (
          <Stack gap="md">
            {copy.teamMembers.map((member) => (
              <Card key={member.name} padding="lg" radius="lg" style={styles.contentCard}>
                <Stack gap="md">
                  <View style={styles.teamTopRow}>
                    <Image source={getTeamImage(member.name)} style={styles.teamImage} resizeMode="cover" />
                    <View style={styles.teamHeading}>
                      <AppText language={uiLanguage} variant="body" style={styles.teamName}>
                        {member.name}
                      </AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.teamRole}>
                        {member.role}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.teamDivider} />
                  <AppText language={uiLanguage} variant="body" style={styles.bodyText}>
                    {member.description}
                  </AppText>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
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
  sectionTabs: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sectionTab: {
    flex: 1,
    minHeight: 52,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  sectionTabActive: {
    backgroundColor: '#91CAFF',
  },
  contentCard: {
    borderWidth: 1.5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  contentCardCollapsed: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  sectionTabText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  sectionTabTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  cardHeader: {
    minHeight: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  cardHeaderCollapsed: {
    marginBottom: 0,
  },
  cardTitle: {
    flex: 1,
    fontWeight: theme.typography.weights.semibold,
  },
  cardChevron: {
    fontSize: 18,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  bodyText: {
    color: theme.colors.text,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
  },
  methodImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.radii.lg,
    backgroundColor: '#F4F0E6',
  },
  teamTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  teamImage: {
    width: 104,
    height: 104,
    borderRadius: 999,
    backgroundColor: '#F4F0E6',
  },
  teamHeading: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  teamName: {
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  teamRole: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  teamDivider: {
    height: 2,
    backgroundColor: '#99CEFF',
  },
});

function getTeamImage(name: string) {
  return name === 'CARISSA' ? aboutImages.carissa : aboutImages.grant;
}
