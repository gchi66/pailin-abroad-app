import { HomeData, LocalizedText, UiLanguage } from '../types/home';

export const pickText = (value: LocalizedText, ui: UiLanguage): string => value[ui];

export const homeMockData: HomeData = {
  hero: {
    title: { en: 'English learning for Thai speakers', th: 'เรียนภาษาอังกฤษสำหรับคนไทย' },
    subtitle: {
      en: 'Lessons based on audio conversations to teach useful, conversational English.',
      th: 'บทเรียนผ่านทางบทสนทนาเสียง เพื่อฝึกการใช้ภาษาอังกฤษที่ใช้ได้จริงในชีวิตประจำวัน',
    },
    cta: { en: 'SIGN UP FOR FREE', th: 'สมัครเรียนฟรี' },
  },
  freeLessons: {
    headerTitleFirst: { en: 'Try a free', th: 'ลองเรียนบทเรียนฟรี' },
    headerTitleSecond: { en: 'lesson now!', th: 'ตอนนี้เลย!' },
    headerSubtitle: { en: 'No sign up needed.', th: 'ไม่ต้องสมัครสมาชิก' },
    cards: [
      {
        id: 'beginner',
        level: { en: 'BEGINNER', th: 'BEGINNER' },
        title: { en: 'Surfing at Venice Beach', th: 'เล่นเซิร์ฟที่หาดเวนิส' },
        focusLabel: { en: 'LESSON FOCUS', th: 'เนื้อหาบทเรียน' },
        description: {
          en: 'Habits and routines with present simple tense.',
          th: 'การพูดถึงนิสัยและกิจวัตรประจำวันด้วย present simple tense',
        },
      },
      {
        id: 'intermediate',
        level: { en: 'INTERMEDIATE', th: 'INTERMEDIATE' },
        title: { en: "Look, there's a celebrity!", th: 'ดูสิ มีคนดังด้วยนะ!' },
        focusLabel: { en: 'LESSON FOCUS', th: 'เนื้อหาบทเรียน' },
        description: {
          en: "How to use 'There is' and 'There are'.",
          th: 'การใช้ There is และ There are',
        },
      },
      {
        id: 'advanced',
        level: { en: 'ADVANCED', th: 'ADVANCED' },
        title: { en: 'At the baseball game', th: 'ที่สนามแข่งเบสบอล' },
        focusLabel: { en: 'LESSON FOCUS', th: 'เนื้อหาบทเรียน' },
        description: {
          en: 'Practice -ing and -ed adjectives.',
          th: 'ฝึกใช้คำคุณศัพท์ -ing และ -ed',
        },
      },
      {
        id: 'expert',
        level: { en: 'EXPERT', th: 'EXPERT' },
        title: { en: 'Spaghetti sauce everywhere!', th: 'ซอสสปาเก็ตตี้เลอะเทอะไปหมด!' },
        focusLabel: { en: 'LESSON FOCUS', th: 'เนื้อหาบทเรียน' },
        description: {
          en: 'How to use past perfect tense.',
          th: 'การใช้ past perfect tense',
        },
        comingSoon: true,
      },
    ],
  },
  signUpCTA: {
    titleParts: {
      beforeEm: { en: 'Ready to access', th: 'พร้อมเข้าถึง' },
      emphasis: { en: 'all', th: 'บทเรียนฟรีทั้งหมด' },
      afterEm: { en: 'our free lessons?', th: 'ของเราหรือยัง?' },
    },
    cta: { en: 'SIGN UP FOR FREE', th: 'สมัครสมาชิกฟรี' },
  },
  chooseUs: {
    title: { en: 'Why choose Pailin Abroad?', th: 'ทำไมถึงต้องเลือกเรียนกับ Pailin Abroad?' },
    reasons: [
      { text: { en: 'Natural, everyday English', th: 'ภาษาอังกฤษที่มีการใช้จริงในชีวิตประจำวัน' } },
      { text: { en: 'Content by native English speakers', th: 'เนื้อหาเขียนโดยเจ้าของภาษา' } },
      { text: { en: 'All content translated to Thai', th: 'เนื้อหาทุกบทแปลเป็นภาษาไทย' } },
      { text: { en: 'Listen to real conversations', th: 'ได้ฟังบทสนทนาจริงจากสถานการณ์จริง' } },
      { text: { en: 'Learn common mistakes by Thais', th: 'เรียนรู้ข้อผิดพลาดที่คนไทยมักใช้ผิด' } },
    ],
  },
  howItWorks: {
    title: { en: 'How it works', th: 'วิธีการเรียน' },
    steps: [
      {
        number: '1',
        header: { en: 'Listen to the conversation', th: 'ฟังบทสนทนา' },
        text: {
          en: 'Move from Beginner to Expert level conversations that follow Pailin in a new country.',
          th: 'เรียนผ่านบทสนทนาตั้งแต่ Beginner ไปจนถึง Expert ตามการใช้ชีวิตของไพลินในประเทศใหม่',
        },
      },
      {
        number: '2',
        header: { en: 'Dive into the lesson focus', th: 'เจาะลึกเนื้อหาบทเรียน' },
        text: {
          en: 'Learn grammar and key words inside realistic dialogue, not isolated drills.',
          th: 'เรียนไวยากรณ์และคำสำคัญจากบทสนทนาจริง ไม่ใช่แค่การท่องจำกฎ',
        },
      },
      {
        number: '3',
        header: { en: 'Build your fluency', th: 'พัฒนาความคล่องแคล่วของคุณ' },
        text: {
          en: 'Reinforce learning with exercises, common mistakes, and useful phrases.',
          th: 'เสริมการเรียนรู้ด้วยแบบฝึกหัด ข้อผิดพลาดที่พบบ่อย และวลีที่ใช้บ่อย',
        },
      },
    ],
  },
  characters: {
    title: { en: 'Meet the Characters', th: 'ทำความรู้จักตัวละคร' },
    entries: [
      {
        id: 'pailin',
        name: { en: 'Pailin', th: 'ไพลิน' },
        description: {
          en: 'I am Pailin, a 21-year-old student from Bangkok studying abroad in Los Angeles.',
          th: 'ฉันชื่อไพลิน อายุ 21 ปีจากกรุงเทพฯ ที่ไปเรียนต่อที่ลอสแอนเจลิส',
        },
      },
      {
        id: 'luke',
        name: { en: 'Luke', th: 'ลุค' },
        description: {
          en: 'Luke is Pailin\'s host brother and guide to life in the US.',
          th: 'ลุคคือพี่ชายโฮสต์ของไพลิน และเป็นไกด์สำหรับการใช้ชีวิตในอเมริกา',
        },
      },
      {
        id: 'chloe',
        name: { en: 'Chloe', th: 'โคลอี้' },
        description: {
          en: 'Chloe is Pailin\'s close friend from orientation, energetic and fun.',
          th: 'โคลอี้เป็นเพื่อนสนิทของไพลินจากวันปฐมนิเทศ ร่าเริงและสนุกสนาน',
        },
      },
      {
        id: 'mark',
        name: { en: 'Mark', th: 'มาร์ค' },
        description: {
          en: 'Mark is Pailin\'s host dad and a thoughtful mentor.',
          th: 'มาร์คคือคุณพ่อโฮสต์ของไพลิน และเป็นที่ปรึกษาที่ใจดี',
        },
      },
      {
        id: 'emily',
        name: { en: 'Emily', th: 'เอมิลี่' },
        description: {
          en: 'Emily is Pailin\'s host sister with a quirky personality.',
          th: 'เอมิลี่คือน้องสาวโฮสต์ของไพลินที่มีบุคลิกน่ารักสดใส',
        },
      },
      {
        id: 'sylvie',
        name: { en: 'Sylvie', th: 'ซิลวี่' },
        description: {
          en: 'Sylvie is Pailin\'s host mom, warm and welcoming.',
          th: 'ซิลวี่คือคุณแม่โฮสต์ของไพลิน อบอุ่นและเป็นกันเอง',
        },
      },
    ],
  },
  takeTheLeap: {
    title: { en: 'Take the leap with Pailin and sign up today!', th: 'ก้าวไปกับไพลินและสมัครวันนี้เลย!' },
    cta: { en: 'SIGN UP FOR FREE', th: 'สมัครสมาชิกฟรี' },
  },
  faq: {
    title: { en: 'Frequently Asked Questions', th: 'คำถามที่พบบ่อย' },
    items: [
      {
        id: 1,
        question: {
          en: 'How is Pailin Abroad different from other English-learning platforms?',
          th: 'Pailin Abroad แตกต่างจากแพลตฟอร์มเรียนภาษาอังกฤษอื่นอย่างไร?',
        },
        answer: {
          en: 'We focus on real-world conversational English through stories and practical context.',
          th: 'เราเน้นภาษาอังกฤษที่ใช้ได้จริงผ่านเรื่องราวและบริบทที่นำไปใช้ในชีวิตประจำวัน',
        },
      },
      {
        id: 2,
        question: { en: 'Which skills does Pailin Abroad focus on?', th: 'Pailin Abroad เน้นพัฒนาทักษะอะไรบ้าง?' },
        answer: {
          en: 'Listening and speaking confidence, supported by vocabulary, grammar, and culture context.',
          th: 'เน้นการฟังและการพูดอย่างมั่นใจ พร้อมคำศัพท์ ไวยากรณ์ และบริบททางวัฒนธรรม',
        },
      },
      {
        id: 3,
        question: { en: 'Do you offer a free trial?', th: 'มีทดลองใช้งานฟรีหรือไม่?' },
        answer: {
          en: 'Yes, you can start with free lessons immediately.',
          th: 'มี คุณสามารถเริ่มเรียนจากบทเรียนฟรีได้ทันที',
        },
      },
      {
        id: 4,
        question: { en: 'What are your membership options?', th: 'แพ็กเกจสมาชิกมีอะไรบ้าง?' },
        answer: {
          en: 'We offer flexible membership options and free content for new learners.',
          th: 'เรามีแพ็กเกจสมาชิกที่ยืดหยุ่น และมีเนื้อหาฟรีสำหรับผู้เริ่มต้น',
        },
      },
    ],
  },
};
