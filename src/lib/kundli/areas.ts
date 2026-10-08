/**
 * The 17 life areas of the Mahakundli. Each is answered separately from the
 * chart. Sensitive areas (health, children, marriage) are framed as themes
 * and timing periods for reflection — never as diagnoses or event predictions.
 */
export const LIFE_AREAS = [
  {
    id: "marriage",
    icon: "♥",
    title: "Marriage",
    question: "What should you check before deciding on marriage?",
    houses: "7th house, Venus, Jupiter",
  },
  {
    id: "career",
    icon: "↗",
    title: "Job & career",
    question: "Should you switch now, or will the same pressure follow you?",
    houses: "10th & 6th houses, Saturn, Sun",
  },
  {
    id: "money",
    icon: "₹",
    title: "Money",
    question: "Why does money come in but still not feel secure?",
    houses: "2nd & 11th houses, Jupiter",
  },
  {
    id: "business",
    icon: "△",
    title: "Business",
    question: "Is this the time to grow, take a partner, or protect your cash?",
    houses: "7th & 10th houses, Mercury",
  },
  {
    id: "love",
    icon: "❀",
    title: "Love & relationships",
    question: "What do you really need from a partner?",
    houses: "5th & 7th houses, Venus, Moon",
  },
  {
    id: "family",
    icon: "⌂",
    title: "Family",
    question: "Where do you stand with your family, and how to keep peace?",
    houses: "2nd & 4th houses, Moon",
  },
  {
    id: "children",
    icon: "✿",
    title: "Children",
    question: "What kind of parent does your chart describe?",
    houses: "5th house, Jupiter",
  },
  {
    id: "property",
    icon: "▣",
    title: "Property & home",
    question: "Which periods traditionally favour home and property?",
    houses: "4th house, Mars, Saturn",
  },
  {
    id: "health",
    icon: "✚",
    title: "Health & energy",
    question: "How does your energy rise and fall, and how to protect it?",
    houses: "1st & 6th houses, Sun, Moon",
  },
  {
    id: "education",
    icon: "✎",
    title: "Education & learning",
    question: "How do you learn best, and is more study right for you?",
    houses: "4th, 5th & 9th houses, Mercury",
  },
  {
    id: "travel",
    icon: "✈",
    title: "Travel & abroad",
    question: "Does your chart lean towards settling far from home?",
    houses: "9th & 12th houses, Rahu",
  },
  {
    id: "friends",
    icon: "☺",
    title: "Friends & network",
    question: "Who helps you rise, and whom should you be careful with?",
    houses: "11th house, Mercury",
  },
  {
    id: "nature",
    icon: "◉",
    title: "Your true nature",
    question: "What does your Lagna and Moon say about who you are?",
    houses: "Lagna, Moon",
  },
  {
    id: "strengths",
    icon: "★",
    title: "Strengths & blind spots",
    question: "What is your biggest strength, and what holds you back?",
    houses: "Lagna lord, strongest grahas",
  },
  {
    id: "spiritual",
    icon: "☸",
    title: "Inner path",
    question: "What brings you peace and meaning?",
    houses: "9th & 12th houses, Ketu, Jupiter",
  },
  {
    id: "dasha",
    icon: "◷",
    title: "Your running dasha",
    question: "What is your current dasha asking of you?",
    houses: "Vimshottari dasha",
  },
  {
    id: "next3",
    icon: "⟳",
    title: "The next 3 years",
    question: "Which major transits shape the next three years?",
    houses: "Saturn, Jupiter, Rahu transits",
  },
] as const;

export type LifeAreaId = (typeof LIFE_AREAS)[number]["id"];
export const LIFE_AREA_IDS = LIFE_AREAS.map((a) => a.id) as [LifeAreaId, ...LifeAreaId[]];
export const lifeArea = (id: string) => LIFE_AREAS.find((a) => a.id === id) ?? null;
