import {
  thaiCheckpointReminderCopy,
  thaiGenericReminderCopy,
  thaiInactivityReminderCopy,
  thaiLessonReminderCopy,
} from './daily-reminders-th';

// Generated from the approved Push Notifications Google Doc export.
// Keep notification copy centralized here so scheduling logic remains content-agnostic.

export type DailyReminderCopy = Readonly<{
  title: string;
  body: string;
}>;

export type DailyReminderLanguage = 'en' | 'th';

export type InactivityReminderCopy = DailyReminderCopy &
  Readonly<{
    inactiveDays: number;
  }>;

export const lessonReminderCopy: Readonly<Record<string, DailyReminderCopy>> = {
  "1.1": {
    "title": "Meet Pailin! 👋",
    "body": "She’s starting her school year in LA. Say hi!"
  },
  "1.2": {
    "title": "Pailin made a friend! 👭",
    "body": "Come meet Pailin’s new friend, Chloe"
  },
  "1.3": {
    "title": "Nice to meet you 🤝",
    "body": "Pailin is meeting lots of people at orientation. Who’s next?"
  },
  "1.6": {
    "title": "Pailin is nervous 😬",
    "body": "Come find out why!"
  },
  "1.9": {
    "title": "What’s for breakfast? 🥞",
    "body": "Let’s see what Pailin’s eating this morning"
  },
  "1.11": {
    "title": "Pailin is Thai 🇹🇭",
    "body": "Find out which of her friends is also from Thailand!"
  },
  "1.13": {
    "title": "Pailin calls her mom 📞",
    "body": "See what Pailin has to say about LA!"
  },
  "1.15": {
    "title": "Lunch time for Pailin! 🍽️",
    "body": "See where Pailin and Chloe will grab lunch"
  },
  "2.1": {
    "title": "Pailin explores LA!",
    "body": "Where will she go first?"
  },
  "2.3": {
    "title": "Coffee time! ☕",
    "body": "What’s Pailin’s go-to order?"
  },
  "2.5": {
    "title": "Pailin takes the subway 🚇",
    "body": "Where is she headed?"
  },
  "2.7": {
    "title": "Show time! 🎤",
    "body": "Pailin and Chloe grab snacks before a comedy show"
  },
  "2.10": {
    "title": "English or Thai? 💬",
    "body": "Find out what Pailin speaks with her family!"
  },
  "3.1": {
    "title": "Meet the family! 🏠",
    "body": "Pailin moves in with her host family today!"
  },
  "3.2": {
    "title": "Pailin meets Luke 🏫",
    "body": "Find out what her host brother is studying at UCLA"
  },
  "3.5": {
    "title": "At the flower shop 🌹",
    "body": "Come pick out some flowers with Pailin and her host mom!"
  },
  "3.7": {
    "title": "Who’s calling? 📞",
    "body": "Pailin makes plans to meet up with an old friend!"
  },
  "3.9": {
    "title": "Chloe has a crush 👀",
    "body": "Chloe wants to know more about Pailin's friend Anthony"
  },
  "3.11": {
    "title": "Grocery shopping with Luke 🍊",
    "body": "Learn what Pailin and Luke’s parents do for a living"
  },
  "3.12": {
    "title": "At the Walk of Fame ⭐",
    "body": "Pailin and Chloe will spend the day in Hollywood!"
  },
  "4.1": {
    "title": "First class of the day! 🏫",
    "body": "Will Pailin and Chloe make it to class on time?"
  },
  "4.2": {
    "title": "Where's the library? 📍",
    "body": "Pailin needs directions to her next class"
  },
  "4.4": {
    "title": "A job opportunity! 💼",
    "body": "Luke will help Pailin get a part-time job"
  },
  "4.7": {
    "title": "A night out 🍻",
    "body": "Come grab drinks with Pailin and Enzo!"
  },
  "4.9": {
    "title": "Pailin’s hungover 😖",
    "body": "She’s not feeling great after her night out!"
  },
  "4.10": {
    "title": "Pailin had a rough day 😞",
    "body": "Find out what happened!"
  },
  "4.12": {
    "title": "At a yard sale 🛍️",
    "body": "What treasures will Pailin and Chloe find?"
  },
  "4.16": {
    "title": "A day at the pier 🎡",
    "body": "What fun things did Pailin do at the Santa Monica Pier with Chloe?"
  },
  "5.1": {
    "title": "Is that a celebrity?! 🤩",
    "body": "Pailin may have seen one walking around LA!"
  },
  "5.2": {
    "title": "First day of work 📦",
    "body": "See how Pailin’s first shift at the bookstore goes!"
  },
  "5.4": {
    "title": "Pailin joins the gym 🏋️‍♀️",
    "body": "Find out how she likes to exercise!"
  },
  "5.7": {
    "title": "Happy birthday Pailin! 🎂",
    "body": "See how she’ll celebrate with Chloe"
  },
  "5.9": {
    "title": "A day at Venice Beach 🌊",
    "body": "What fun things will they see?"
  },
  "5.11": {
    "title": "Study time 📝",
    "body": "Pailin's got a big exam tomorrow!"
  },
  "5.13": {
    "title": "Universal Studios! 🎢",
    "body": "Come celebrate Pailin’s birthday with her host family"
  },
  "5.14": {
    "title": "Work gossip 🤫",
    "body": "What does Pailin’s coworker think of their boss?"
  },
  "6.1": {
    "title": "First date! 🌶",
    "body": "How will Pailin’s date go??"
  },
  "6.3": {
    "title": "Dating app help 💖",
    "body": "Pailin needs Chloe’s help to improve her profile"
  },
  "6.5": {
    "title": "Beach day! 🏖️",
    "body": "Pailin will go to the beach with her host brother and sister"
  },
  "6.6": {
    "title": "A breakup update 💔",
    "body": "Pailin gets some news from her brother Pete"
  },
  "6.7": {
    "title": "Meet Tyler 📚",
    "body": "Pailin meets another coworker at the bookstore!"
  },
  "6.10": {
    "title": "Do you have tattoos? ♍",
    "body": "What tattoo does Pailin want to get?"
  },
  "6.12": {
    "title": "Luke goes to work ☕",
    "body": "Find out where Pailin’s host brother works!"
  },
  "7.1": {
    "title": "Big family news 💍",
    "body": "What family gossip will Pailin learn about?"
  },
  "7.2": {
    "title": "A blind date! 💕",
    "body": "Pailin gets set up on a blind date by Chloe"
  },
  "7.3": {
    "title": "Another date 🏈",
    "body": "Will Pailin like her date? He has some strong opinions"
  },
  "7.6": {
    "title": "Lunch with Luke 🦞",
    "body": "What will Pailin and her host brother eat for lunch?"
  },
  "7.9": {
    "title": "Tom kha gai for dinner 🧑‍🍳",
    "body": "Pailin and Emily will make a Thai meal for the family!"
  },
  "7.11": {
    "title": "A busy shift 💢",
    "body": "Yikes, Pailin’s boss can be pretty mean sometimes"
  },
  "7.13": {
    "title": "Luke gets pranked 😆",
    "body": "Pailin cracks up when she hears about Luke’s bad day!"
  },
  "8.1": {
    "title": "What to watch… 🐙",
    "body": "Pailin and Luke discuss what good TV shows are out"
  },
  "8.4": {
    "title": "A little homesick 🏠",
    "body": "Pailin calls her big sister to get advice"
  },
  "8.5": {
    "title": "Game night! 🎲",
    "body": "Pailin joins her host family for a game of Pictionary"
  },
  "8.6": {
    "title": "Tyler's on the phone 📞",
    "body": "What do you think he wants to ask Pailin?"
  },
  "8.8": {
    "title": "What’s burning?! 🍪",
    "body": "Emily gets distracted while baking cookies"
  },
  "8.9": {
    "title": "Does Pailin like him? 🧐",
    "body": "Sebastian isn't sure if Pailin likes him back"
  },
  "8.12": {
    "title": "A night at the club! 👠",
    "body": "Pailin has a night out with friends at LA’s biggest nightclub"
  },
  "8.14": {
    "title": "Oh no! 🏥",
    "body": "Something happened to Pailin’s host mom!"
  },
  "9.1": {
    "title": "Baseball game! ⚾",
    "body": "Something exciting happened to Pailin at the Dodgers game!"
  },
  "9.2": {
    "title": "Enzo has a date 🏳️‍🌈",
    "body": "He tells Pailin why he’s excited for it!"
  },
  "9.5": {
    "title": "Brazilian food is yummy! 🌎",
    "body": "Pailin takes a break from studying with her classmate"
  },
  "9.6": {
    "title": "Dinner with Tyler 🌶",
    "body": "Pailin grabs dinner with her cute coworker Tyler!"
  },
  "9.7": {
    "title": "Was that a date? 💓",
    "body": "Pailin isn’t sure if Tyler likes her as more than a friend"
  },
  "9.9": {
    "title": "Sebastian likes Pailin 💔",
    "body": "But does she like him back?"
  },
  "9.12": {
    "title": "Dara has big news… 🔊",
    "body": "Pailin's sister has an exciting announcement!"
  },
  "10.1": {
    "title": "Chicken feet for dinner! 🐓",
    "body": "Will Pailin’s host family like the dish she made?"
  },
  "10.3": {
    "title": "Where’s Pailin’s laptop? 💻",
    "body": "Pailin needs Luke's help before her essay is due!"
  },
  "10.4": {
    "title": "Movie night chaos 🎬",
    "body": "Luke gets fed up with everyone talking during the movie!"
  },
  "10.6": {
    "title": "Birthday barbecue! 🍖",
    "body": "Pailin and Luke arrive at Chloe's birthday BBQ!"
  },
  "10.7": {
    "title": "Truth or dare 💰",
    "body": "What will Pailin ask Luke?"
  },
  "10.10": {
    "title": "Study group tonight! 📚",
    "body": "Pailin’s study group takes a pizza break"
  },
  "10.12": {
    "title": "Party plans 🪩",
    "body": "Pailin invites her crush to come to a party tonight!"
  },
  "10.14": {
    "title": "Beer pong champ 🏓",
    "body": "Tyler teaches Pailin how to play beer pong! How will she do?"
  },
  "10.15": {
    "title": "Halloween is coming! 🎃",
    "body": "Pailin and Emily talk costumes and plans"
  },
  "11.1": {
    "title": "Shoes in the house!? 🥾",
    "body": "Pailin and Luke debate some cultural differences"
  },
  "11.3": {
    "title": "At the tailgate party 🏈",
    "body": "Pailin and Luke might see a fight break out!"
  },
  "11.4": {
    "title": "A surprise dinner date 👠",
    "body": "Where will Tyler take Pailin on a date?"
  },
  "11.5": {
    "title": "Growing up in Thailand 🇹🇭",
    "body": "Pailin shares stories with Tyler over dinner"
  },
  "11.7": {
    "title": "Worst date ever 👎",
    "body": "Chloe has a funny story to tell Pailin about a terrible date!"
  },
  "11.9": {
    "title": "Again?! 😮‍💨",
    "body": "Chloe keeps bumping into her bad date at school!"
  },
  "11.11": {
    "title": "Breakup news 💔",
    "body": "Pailin’s host sister is going to the school dance without a date"
  },
  "12.1": {
    "title": "Movie date night! 🍿",
    "body": "Pailin and Tyler disagree on when they should sit down for the movie"
  },
  "12.3": {
    "title": "Addicted to TikTok! 🤳",
    "body": "Pailin can't believe how much time Emily spends on TikTok!"
  },
  "12.5": {
    "title": "Ghosted 👻",
    "body": "Luke is NOT having good luck with the dating apps"
  },
  "12.6": {
    "title": "Trouble at work 📚",
    "body": "What will Jerald get mad at Pailin about this time?"
  },
  "12.9": {
    "title": "Is Tyler a player? 🫠",
    "body": "Pailin learns something about the guy she’s dating…"
  },
  "12.12": {
    "title": "Swan boats at Echo Park 🦢",
    "body": "Pailin and Tyler go on a super romantic date!"
  },
  "12.13": {
    "title": "Thanksgiving memories 🦃",
    "body": "Pailin learns how Luke’s family celebrates it!"
  },
  "12.14": {
    "title": "Black Friday shopping 🛍️",
    "body": "Will Pailin and Chloe have a good time fighting the crowds?"
  },
  "13.1": {
    "title": "Meet Chloe's boyfriend! 🍝",
    "body": "Pailin hears the funny story of how they met"
  },
  "13.2": {
    "title": "It’s Christmas time 🎄",
    "body": "What interesting Christmas traditions will Pailin learn about?"
  },
  "13.3": {
    "title": "New Year’s Eve! 🎊",
    "body": "Where will Pailin and Tyler go for the countdown?"
  },
  "13.5": {
    "title": "Luke has a crush 😍",
    "body": "Does she like him back?"
  },
  "13.6": {
    "title": "Happy Valentine's Day! 💕",
    "body": "What do Pailin and Tyler want to say to each other?"
  },
  "13.8": {
    "title": "Money problems 💸",
    "body": "Pailin and Luke come up with interesting ways to save money"
  },
  "13.10": {
    "title": "Snowboarding lesson 🏂",
    "body": "Was Pailin able to make it down the mountain in one piece?"
  },
  "14.1": {
    "title": "Pailin is sad… 😩",
    "body": "She’s still shocked that she doesn’t work at the bookstore anymore"
  },
  "14.2": {
    "title": "$20 for a smoothie?! 🍓",
    "body": "What other shocking things will Pailin see at this fancy grocery store?"
  },
  "14.3": {
    "title": "Camping problems ⛺",
    "body": "Pailin and her friends forgot a few important things on their trip"
  },
  "14.6": {
    "title": "Applying for jobs 📄",
    "body": "Pailin submitted her museum application last night!"
  },
  "14.8": {
    "title": "Job interview! 🎨",
    "body": "How will Pailin’s interview at the art museum go?"
  },
  "14.10": {
    "title": "Their first fight? 😡",
    "body": "What do Pailin and Tyler get upset over?"
  },
  "14.11": {
    "title": "Time to apologize 📞",
    "body": "Will Pailin and Tyler work through their argument?"
  },
  "15.1": {
    "title": "Luke needs an apartment 🏠",
    "body": "Something will make Pailin scream with fear"
  },
  "15.2": {
    "title": "Are we lost? ⛰️",
    "body": "Pailin and Tyler might be lost on their hike"
  },
  "15.4": {
    "title": "Sister advice 👰‍♀️",
    "body": "Pailin’s sister doesn’t wanna go on the bachelorette trip"
  },
  "15.6": {
    "title": "Self-driving cars? 🚙",
    "body": "Luke tells Pailin about his cool and strange experience"
  },
  "15.8": {
    "title": "Roommate drama 😖",
    "body": "Pailin’s friend wants to move out ASAP!"
  },
  "15.9": {
    "title": "Here comes the bride 👰",
    "body": "Pailin goes to her first American wedding!"
  },
  "15.10": {
    "title": "Stay in LA or go home? ↔️",
    "body": "Pailin talks through a big decision with Chloe"
  },
  "15.12": {
    "title": "Tyler has news 🔈",
    "body": "Pailin’s boyfriend got an exciting opportunity!"
  },
  "15.13": {
    "title": "The last final! 😵‍💫",
    "body": "Pailin and Chloe compare how little sleep they got"
  },
  "16.1": {
    "title": "Your last level! 🎉",
    "body": "Pailin shares her most ‘Only in LA’ moment with Luke"
  },
  "16.2": {
    "title": "Graduation day! 👩🏻‍🎓",
    "body": "Pailin's host family celebrates a huge milestone with her"
  },
  "16.4": {
    "title": "Internship opportunity! 📃",
    "body": "Will Pailin apply for a life-changing internship?"
  },
  "16.5": {
    "title": "LA has a rough side ⛺",
    "body": "Pailin and Sophia drive through Skid Row"
  },
  "16.7": {
    "title": "Let’s talk politics 🇺🇸",
    "body": "Pailin asks Luke to break down American politics"
  },
  "16.8": {
    "title": "Good or bad news? 🎨",
    "body": "Pailin will find out soon!"
  },
  "16.9": {
    "title": "Parting ways 💔",
    "body": "Pailin and Tyler say their goodbyes on the way to the airport"
  },
  "16.10": {
    "title": "Apartment tour! 🏡",
    "body": "Will Pailin find the perfect apartment to move into?"
  },
  "16.11": {
    "title": "News from Chloe 📦",
    "body": "What will Chloe decide to do after graduating?"
  },
  "16.12": {
    "title": "You’re almost there! 💪",
    "body": "You have only 2 lessons to go with Pailin Abroad!"
  }
};

export const checkpointReminderCopy: Readonly<Record<number, DailyReminderCopy>> = {
  "1": {
    "title": "Almost done with Level 1! 🎉",
    "body": "Test your skills to see how far you’ve come"
  },
  "2": {
    "title": "Almost done with Level 2! 🎉",
    "body": "Come meet Mark, Pailin’s host dad!"
  },
  "3": {
    "title": "Almost done with Level 3! 🎉",
    "body": "See how Pailin’s first day at UCLA goes!"
  },
  "4": {
    "title": "Almost done with Level 4! 🎉",
    "body": "How will Pailin’s job interview go?"
  },
  "5": {
    "title": "Almost done with Level 5! 🎉",
    "body": "Pailin and Chloe swap stories about school, work, and dating"
  },
  "6": {
    "title": "Almost done with Level 6! 🎉",
    "body": "Find out what Pailin’s host parents loved about Thailand"
  },
  "7": {
    "title": "Almost done with Level 7! 🎉",
    "body": "Pailin vents to Tyler about her latest bad date"
  },
  "8": {
    "title": "Almost done with Level 8! 🎉",
    "body": "Find out why Pailin’s host mom is in the hospital"
  },
  "9": {
    "title": "Almost done with Level 9! 🎉",
    "body": "Pailin has a fun day at a beach bonfire!"
  },
  "10": {
    "title": "Almost done with Level 10! 🎉",
    "body": "Pailin hands out candy on Halloween!"
  },
  "11": {
    "title": "Almost done with Level 11! 🎉",
    "body": "Pailin learns about Tyler’s plans for the future"
  },
  "12": {
    "title": "Almost done with Level 12! 🎉",
    "body": "Are Pailin and Tyler going to make things official??"
  },
  "13": {
    "title": "Almost done with Level 13! 🎉",
    "body": "Jerald has something important to talk to Pailin about…"
  },
  "14": {
    "title": "Almost done with Level 14! 🎉",
    "body": "See how Pailin’s first shift at the museum goes!"
  },
  "15": {
    "title": "Almost done with Level 15! 🎉",
    "body": "Pailin and Tyler talk about what's next for their relationship"
  },
  "16": {
    "title": "Your last lesson! 👋🏼",
    "body": "You’re so close! Finish your last lesson with Pailin Abroad!"
  }
};

export const genericReminderCopy: readonly DailyReminderCopy[] = [
  {
    "title": "Pailin's waiting for you! 💫",
    "body": "Continue your next English lesson"
  },
  {
    "title": "Time for your next lesson! ⏰",
    "body": "See what Pailin's up to today"
  },
  {
    "title": "What will Pailin do next? 🌎",
    "body": "Continue your next English lesson!"
  },
  {
    "title": "Your lesson of the day ✨",
    "body": "Pailin is waiting for you in your next lesson!"
  }
];

export const inactivityReminderCopy: readonly InactivityReminderCopy[] = [
  {
    "inactiveDays": 2,
    "title": "Your next lesson awaits 💬",
    "body": "Come see what Pailin will do next!"
  },
  {
    "inactiveDays": 5,
    "title": "It’s been a few days! 🙋🏻‍♀️",
    "body": "Come see what Pailin has been up to"
  },
  {
    "inactiveDays": 7,
    "title": "Pailin misses you! 🥹",
    "body": "Just a few minutes can get you back on track with your English"
  }
];

export const getLessonReminderCopy = (
  lessonExternalId: string,
  language: DailyReminderLanguage,
) =>
  language === 'th'
    ? thaiLessonReminderCopy[lessonExternalId]
    : lessonReminderCopy[lessonExternalId];

export const getCheckpointReminderCopy = (
  level: number,
  language: DailyReminderLanguage,
) =>
  language === 'th'
    ? thaiCheckpointReminderCopy[level]
    : checkpointReminderCopy[level];

export const getGenericReminderCopy = (index: number, language: DailyReminderLanguage) => {
  const copy = language === 'th' ? thaiGenericReminderCopy : genericReminderCopy;
  return copy[((index % copy.length) + copy.length) % copy.length];
};

export const getInactivityReminderCopy = (
  inactiveDays: number,
  language: DailyReminderLanguage,
) => {
  const copy = language === 'th' ? thaiInactivityReminderCopy : inactivityReminderCopy;
  return [...copy].reverse().find((reminder) => inactiveDays >= reminder.inactiveDays);
};
