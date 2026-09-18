/**
 * Break activity suggestions for healthy break habits
 */
import { BreakActivitySuggestion } from '../types';

export const BREAK_ACTIVITIES: BreakActivitySuggestion[] = [
  // Stretching activities
  {
    id: 'stretch_neck',
    title: 'Neck Stretches',
    description: 'Gently tilt your head side to side, forward and back. Hold each position for 15 seconds.',
    durationMinutes: 2,
    category: 'stretch'
  },
  {
    id: 'stretch_shoulders',
    title: 'Shoulder Rolls',
    description: 'Roll your shoulders backward 10 times, then forward 10 times. Release tension.',
    durationMinutes: 2,
    category: 'stretch'
  },
  {
    id: 'stretch_back',
    title: 'Back Extension',
    description: 'Stand up, place hands on lower back, and gently arch backward. Hold for 30 seconds.',
    durationMinutes: 2,
    category: 'stretch'
  },
  {
    id: 'stretch_wrists',
    title: 'Wrist & Hand Stretches',
    description: 'Extend arms, pull fingers back gently. Rotate wrists clockwise and counter-clockwise.',
    durationMinutes: 2,
    category: 'stretch'
  },
  {
    id: 'stretch_full',
    title: 'Full Body Stretch',
    description: 'Reach arms overhead, stand on tiptoes, then bend to touch toes. Repeat 3 times.',
    durationMinutes: 3,
    category: 'stretch'
  },
  
  // Hydration reminders
  {
    id: 'hydrate_water',
    title: 'Drink Water',
    description: 'Take a moment to drink a full glass of water. Stay hydrated for better focus.',
    durationMinutes: 1,
    category: 'hydrate'
  },
  {
    id: 'hydrate_tea',
    title: 'Herbal Tea Break',
    description: 'Prepare a cup of caffeine-free herbal tea. Enjoy mindfully away from screens.',
    durationMinutes: 5,
    category: 'hydrate'
  },
  
  // Breathing exercises
  {
    id: 'breathe_box',
    title: 'Box Breathing',
    description: 'Inhale 4 counts, hold 4, exhale 4, hold 4. Repeat 5 cycles for calm focus.',
    durationMinutes: 2,
    category: 'breathe'
  },
  {
    id: 'breathe_478',
    title: '4-7-8 Breathing',
    description: 'Inhale through nose for 4, hold for 7, exhale through mouth for 8. Repeat 4 times.',
    durationMinutes: 3,
    category: 'breathe'
  },
  {
    id: 'breathe_deep',
    title: 'Deep Belly Breaths',
    description: 'Place hand on belly. Breathe deeply so your hand rises. 10 slow breaths.',
    durationMinutes: 2,
    category: 'breathe'
  },
  
  // Walking/movement
  {
    id: 'walk_short',
    title: 'Quick Walk',
    description: 'Walk around your room or down the hall. Get blood flowing.',
    durationMinutes: 3,
    category: 'walk'
  },
  {
    id: 'walk_stairs',
    title: 'Stair Climb',
    description: 'Go up and down a flight of stairs for energizing movement.',
    durationMinutes: 3,
    category: 'walk'
  },
  {
    id: 'walk_outside',
    title: 'Fresh Air Break',
    description: 'Step outside for fresh air. Look at distant objects to rest your eyes.',
    durationMinutes: 5,
    category: 'walk'
  },
  
  // Rest/relaxation
  {
    id: 'rest_eyes',
    title: 'Eye Rest (20-20-20)',
    description: 'Look at something 20 feet away for 20 seconds. Follow the 20-20-20 rule.',
    durationMinutes: 1,
    category: 'rest'
  },
  {
    id: 'rest_palming',
    title: 'Palming',
    description: 'Rub hands together to warm them, then gently cup over closed eyes. Relax for 1 minute.',
    durationMinutes: 2,
    category: 'rest'
  },
  {
    id: 'rest_meditate',
    title: 'Mini Meditation',
    description: 'Sit quietly, close eyes, and focus on your breath. Let thoughts pass without judgment.',
    durationMinutes: 5,
    category: 'rest'
  },
  {
    id: 'rest_gratitude',
    title: 'Gratitude Moment',
    description: 'Think of 3 things you are grateful for right now. Boosts mood and motivation.',
    durationMinutes: 2,
    category: 'rest'
  }
];

export function getRandomBreakActivity(category?: BreakActivitySuggestion['category']): BreakActivitySuggestion {
  const filtered = category 
    ? BREAK_ACTIVITIES.filter(a => a.category === category)
    : BREAK_ACTIVITIES;
  
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}

export function getBreakActivitiesByCategory(
  category: BreakActivitySuggestion['category']
): BreakActivitySuggestion[] {
  return BREAK_ACTIVITIES.filter(a => a.category === category);
}

export function getSuggestedActivitiesForBreakDuration(
  availableMinutes: number
): BreakActivitySuggestion[] {
  return BREAK_ACTIVITIES
    .filter(a => a.durationMinutes <= availableMinutes)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}
