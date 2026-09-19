type CultureNoteCategory =
  | 'social_customs'
  | 'dating_family'
  | 'society_culture'
  | 'living_us'
  | 'language_measurements'
  | 'food_drinks'
  | 'los_angeles'
  | 'holidays'
  | 'work_money'
  | 'school_life'
  | 'sports'
  | 'games_entertainment';

const labels: Record<CultureNoteCategory, { en: string; th: string }> = {
  social_customs: { en: 'Social Customs 👋', th: 'มารยาทสังคม 👋' },
  dating_family: { en: 'Dating & Family 💕', th: 'ความรัก & ครอบครัว 💕' },
  society_culture: { en: 'Society & Culture 🇺🇸', th: 'สังคม & วัฒนธรรม 🇺🇸' },
  living_us: { en: 'Living in the US 🏠', th: 'ชีวิตในอเมริกา 🏠' },
  language_measurements: { en: 'Language & Measurements 📐', th: 'ภาษา & หน่วยวัด 📐' },
  food_drinks: { en: 'Food & Drinks 🍔', th: 'อาหาร & เครื่องดื่ม 🍔' },
  los_angeles: { en: 'Los Angeles 🌴', th: 'ลอสแอนเจลิส 🌴' },
  holidays: { en: 'Holidays 🎉', th: 'วันหยุด & เทศกาล 🎉' },
  work_money: { en: 'Work & Money 💰', th: 'งาน & การเงิน 💰' },
  school_life: { en: 'School Life 📚', th: 'ชีวิตในมหาวิทยาลัย 📚' },
  sports: { en: 'Sports 🏆', th: 'กีฬา 🏆' },
  games_entertainment: { en: 'Games & Entertainment 🎢', th: 'เกม & ความบันเทิง 🎢' },
};

// The parsed sections do not contain categories. These are the supplied
// assignments, keyed by lesson and the English heading of each Culture Note.
// A note can belong to more than one category.
const notesByCategory: Record<CultureNoteCategory, readonly string[]> = {
  los_angeles: [
    '2.4|TACO TRUCKS', '2.5|LOS ANGELES: A CITY BUILT AROUND CARS',
    '4.15|LOS ANGELES: SUN, SURF, AND SNOW', '5.1|CELEBRITY SIGHTINGS',
    '5.13|THEME PARKS IN LA', '6.4|WEATHER IN LA', '7.12|NEIGHBORHOODS IN LA',
    '8.14|HIKING IN LOS ANGELES', '9.5|DIVERSITY IN LOS ANGELES',
    '11.6|SANTA ANA WINDS & WILDFIRES', '11.10|SKIING IN SOUTHERN CALIFORNIA',
    '16.5|HOMELESSNESS IN LOS ANGELES',
  ],
  food_drinks: [
    '3.3|BREAKFAST FOODS', "3.11|TRADER JOE'S", '6.12|COFFEE CHAINS IN THE US',
    '7.6|ETIQUETTE IN RESTAURANTS', '7.6|FOOD ALLERGIES & SPECIAL DIETS',
    '7.8|MARKETS & GROCERY STORES', '7.10|THAI VS. US DINING CUSTOMS',
    '8.13|HUGE FOOD PORTIONS', '10.1|UNFAMILIAR FOODS', '10.6|BARBECUE', '14.2|EREWHON',
  ],
  holidays: [
    '10.15|OCTOBER 31ST: HALLOWEEN', '12.13|THANKSGIVING', '12.13|FRIENDSGIVING',
    '12.14|BLACK FRIDAY', '12.14|CYBER MONDAY', '13.2|CHRISTMAS',
    "13.3|NEW YEAR'S EVE", '13.4|SUPER BOWL SUNDAY', "13.6|VALENTINE'S DAY",
  ],
  social_customs: [
    '1.1|GREETINGS IN THE US', '1.7|AGE & RESPECT', '1.4|HAVE YOU EATEN?',
    '3.1|SORRY!', '4.2|SMALL TALK', '4.3|SMALL TALK', // Parsed Small Talk is in 4.3.
    '6.10|TIPPING CULTURE', '8.7|TIPPING CULTURE',
    '10.10|THE CONCEPT OF ‘GRENG-JAI’', '11.1|SHOES IN THE HOUSE',
    '12.1|THAI TIME & PUNCTUALITY',
  ],
  dating_family: [
    '2.6|FAMILY & FRIENDS', '2.6|BROTHERS & SISTERS', '5.8|I LOVE YOU',
    '6.3|DATING APPS', '7.1|PROPOSALS & GETTING ENGAGED', '8.9|DATING TERMS',
    '9.9|FRIENDS TO MORE THAN JUST FRIENDS', '11.5|THE NUCLEAR FAMILY',
    '12.5|MODERN DATING SLANG', '12.10|ALTERNATIVE FAMILY TERMS',
    '12.chp|DEFINING THE RELATIONSHIP', "13.6|SAYING 'I LOVE YOU'",
    '13.6|PUBLIC DISPLAYS OF AFFECTION', '13.7|COUPLE NAMES',
    '15.4|BACHELORETTE PARTIES', '15.4|BACHELOR PARTIES',
    '15.5|FLIRTING & APPROACHING STRANGERS', '15.9|AMERICAN WEDDING TRADITIONS',
    '16.9|RELATIONSHIP STAGES & TERMS',
  ],
  sports: [
    '7.3|UCLA VS. USC RIVALRY', "9.1|BASEBALL: AMERICA'S PASTIME",
    '11.3|TAILGATE PARTIES', '12.8|TRENDY SPORTS: PICKLEBALL',
    '13.4|SUPER BOWL SUNDAY',
  ],
  school_life: [
    '7.14|HIGH SCHOOL DANCES', '11.11|HIGH SCHOOL DANCES',
    '10.11|FRATERNITIES & SORORITIES',
    '13.12|SPRING BREAK', '14.5|HIGHER EDUCATION IN THE US',
    '14.6|INTERNSHIPS', '16.2|UNIVERSITY GRADUATION', '16.2|USA:',
  ],
  work_money: [
    '1.4|FRIENDLY EMPLOYEES', '2.3|DOLLARS AND CENTS',
    '4.13|PAYMENT SYSTEMS IN THE US', '5.15|US WORK WEEK',
    '12.11|JOB BENEFITS', '14.8|APPLYING FOR JOBS',
    '15.3|MINIMUM WAGE', '16.8|WORK CULTURE & HIERARCHY',
  ],
  living_us: [
    '4.12|YARD SALES', '5.10|BIRTHDAY FREEBIES',
    '7.4|CITIES IN THE USA: BOSTON', '14.7|DAYLIGHT SAVING TIME',
    '14.9|DRIVING TERMS & ROAD RAGE', '15.1|RENTING AN APARTMENT',
    '15.6|WAYMO', '16.6|HEALTH INSURANCE',
  ],
  language_measurements: [
    '2.3|DOLLARS AND CENTS', '4.14|US VS. UK ENGLISH',
    '4.15|3 NAMES FOR THE USA', '5.7|DATE FORMATS',
    '6.4|CELSIUS VS. FAHRENHEIT', '6.4|100°F (38°C) =',
    '6.4|75°F (24°C) =', '6.4|50°F (10°C) =', '6.4|32°F (0°C) =',
    '8.3|ROMAN NUMERALS',
    '9.4|SHOE SIZES IN THE US', '9.10|CENTIMETERS VS. INCHES',
    '15.11|AC VS. BC YEARS',
  ],
  society_culture: [
    '1.2|NICKNAMES', "3.8|'Y’ALL' AS A GENDER-NEUTRAL PHRASE",
    "5.3|'THEY / THEM' PRONOUNS FOR NON-BINARY PEOPLE",
    '5.7|FRIDAY THE 13TH', '5.7|WESTERN VS. EASTERN ASTROLOGY',
    '6.1|THAILAND-TAIWAN MIX UP', '6.10|TATTOOS', '6.10|TIPPING CULTURE',
    '6.11|STRAY ANIMALS', '9.2|LGBTQ+', '9.2|COMING OUT',
    '11.1|BUM GUNS', '11.2|CHRISTIANITY IN THE US',
    '11.2|RELIGIOUS INFLUENCE IN THE US', '11.2|TALKING ABOUT RELIGION',
    '12.3|SOCIAL MEDIA APPS', '12.12|COUNTRY MUSIC',
    '16.1|SCIENTOLOGY', '16.7|AMERICAN POLITICS',
  ],
  games_entertainment: [
    '4.7|LEGAL DRINKING AGE', '5.13|THEME PARKS IN LA',
    '6.9|ROCK, PAPER, SCISSORS', '8.5|BOARD GAMES',
    '9.chp|BEACH BONFIRES', '10.7|TRUTH OR DARE',
    '10.12|PREGAMING', '10.13|DESIGNATED DRIVER',
    '10.14|BEER PONG & OTHER DRINKING GAMES', '12.2|BUCKET LIST',
  ],
};

const normalizeHeading = (heading: string) =>
  heading.normalize('NFKC').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

const categoriesByNote: Record<string, CultureNoteCategory[]> = {};
Object.entries(notesByCategory).forEach(([category, notes]) => {
  notes.forEach((note) => {
    const separator = note.indexOf('|');
    const lessonId = note.slice(0, separator).toLowerCase();
    const heading = normalizeHeading(note.slice(separator + 1));
    const key = `${lessonId}|${heading}`;
    const categories = categoriesByNote[key] ?? [];
    categories.push(category as CultureNoteCategory);
    categoriesByNote[key] = categories;
  });
});

export const getCultureNoteCategoryLabels = (
  lessonId: string | null | undefined,
  heading: string | null | undefined,
  language: 'en' | 'th'
) => {
  if (!lessonId || !heading) return [];
  const categories = categoriesByNote[`${lessonId.toLowerCase()}|${normalizeHeading(heading)}`] ?? [];
  return categories.map((category) => labels[category][language]);
};
