import type { Pillar } from './types';

export interface PillarInfo {
  id: Pillar;
  name: string;
  wellness: string;
  color: string;
  builds: string;
  suggestions: string[];
}

export const PILLAR_INFO: Record<Pillar, PillarInfo> = {
  vitality: {
    id: 'vitality',
    name: 'Vitality',
    wellness: 'Physical',
    color: '#5a9e4b',
    builds: 'Trees and a running track',
    suggestions: ['Exercise', '7+ hours of sleep', 'Eat well', 'Drink water'],
  },
  mind: {
    id: 'mind',
    name: 'Mind',
    wellness: 'Intellectual',
    color: '#4f7cc9',
    builds: 'A library, bookshops, a school',
    suggestions: ['Read 20 minutes', 'Course or tutorial', 'Puzzle', 'Language practice'],
  },
  heart: {
    id: 'heart',
    name: 'Heart',
    wellness: 'Emotional',
    color: '#d9668f',
    builds: 'Ponds, flower beds, a cozy café',
    suggestions: ['Journal', 'Therapy', 'Name a feeling', 'Screen-free hour'],
  },
  spirit: {
    id: 'spirit',
    name: 'Spirit',
    wellness: 'Spiritual',
    color: '#9b6fd1',
    builds: 'Lanterns, a shrine, a stargazing hill',
    suggestions: ['Meditate', 'Gratitude list', 'Time in nature', 'Reflection'],
  },
  bond: {
    id: 'bond',
    name: 'Bond',
    wellness: 'Social',
    color: '#e8913a',
    builds: 'Houses with lights on, a town square',
    suggestions: ['Call a friend or family', 'Quality time', 'Send a kind message'],
  },
  craft: {
    id: 'craft',
    name: 'Craft',
    wellness: 'Occupational',
    color: '#8a6a4f',
    builds: 'Workshops, a clock tower, a studio',
    suggestions: ['Deep work block', 'Practice a skill', 'Side project'],
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    wellness: 'Financial',
    color: '#d4b03a',
    builds: 'Market stalls, a bank, a harbor',
    suggestions: ['Log spending', 'Review budget', 'Save something', 'No-spend day'],
  },
  harmony: {
    id: 'harmony',
    name: 'Harmony',
    wellness: 'Environmental',
    color: '#3fa7a0',
    builds: 'Gardens, clean streets, windmills',
    suggestions: ['Tidy up', 'Cook at home', 'Go outside', 'Do a chore'],
  },
};

/** Starter habits: the first two suggestions of each pillar. */
export const STARTER_HABITS: { name: string; pillar: Pillar }[] = Object.values(PILLAR_INFO).flatMap(
  (p) => p.suggestions.slice(0, 2).map((name) => ({ name, pillar: p.id })),
);
