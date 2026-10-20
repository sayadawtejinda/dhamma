// The badges a student can earn (shown on the Home page shelf and when someone visits it). Plain data, no JSX, because the weekly
// script (scripts/compute-badges.mjs) imports it too: the script works out who earned what from files already on GitHub and writes
// public/badges.json (no Firebase reads); the app only draws the badges listed there for each student.
//
// shape: how the badge is drawn (every group has its own look); metal: bronze | silver | gold; icon: the picture in the middle.

import { STAGE_NAMES, WEEK_MILESTONES } from './bodhiLevels.js';

export const BADGE_GROUPS = [
  { id: 'trophy', title: 'Trophies' },
  { id: 'attend', title: 'Coming to class' },
  { id: 'heart', title: 'Hearts' },
  { id: 'shrine', title: 'Shrine Room' },
  { id: 'nature', title: 'Nature World & Avatar' },
  { id: 'poems', title: 'Myanmar Poems' },
  { id: 'reader', title: 'Myanmar Reader' },
  { id: 'games', title: 'Learning games' },
  { id: 'ss', title: 'Smart Study' },
  { id: 'abhi', title: 'Abhidhamma' },
  { id: 'ds', title: 'Dhammaschool' },
  { id: 'festival', title: 'Festivals' },
  { id: 'all', title: 'Special' },
];

// thresholds are used by the script; `master: true` marks "finished everything" badges (drawn with a sparkle)
export const BADGE_DEFS = [
  // trophies: cups, and a crown for the legends
  { id: 'trophy-10', group: 'trophy', shape: 'cup', metal: 'bronze', icon: '', name: 'Trophy Rookie', desc: '10 trophies' },
  { id: 'trophy-50', group: 'trophy', shape: 'cup', metal: 'silver', icon: '', name: 'Trophy Hunter', desc: '50 trophies' },
  { id: 'trophy-100', group: 'trophy', shape: 'cup', metal: 'gold', icon: '', name: 'Trophy Champion', desc: '100 trophies' },
  { id: 'trophy-200', group: 'trophy', shape: 'shield', metal: 'gold', icon: '🏆', name: 'Trophy Hero', desc: '200 trophies' },
  { id: 'trophy-250', group: 'trophy', shape: 'crown', metal: 'gold', icon: '', name: 'Trophy Legend', desc: '250 trophies', master: true },
  { id: 'trophy-300', group: 'trophy', shape: 'burst', metal: 'gold', icon: '🏆', name: 'Trophy Titan', desc: '300 trophies', master: true },
  { id: 'trophy-400', group: 'trophy', shape: 'rosette', metal: 'gold', icon: '🏆', name: 'Trophy Grandmaster', desc: '400 trophies', master: true },
  { id: 'trophy-500', group: 'trophy', shape: 'crest', metal: 'gold', icon: '💎', name: 'Trophy Immortal', desc: '500 trophies', master: true },
  // coming to class: football
  { id: 'weeks-10', group: 'attend', shape: 'soccer', metal: 'bronze', icon: '', name: 'Regular Player', desc: 'Came to class in 10 weeks' },
  { id: 'weeks-25', group: 'attend', shape: 'soccer', metal: 'silver', icon: '', name: 'Star Player', desc: 'Came to class in 25 weeks' },
  { id: 'weeks-50', group: 'attend', shape: 'soccer', metal: 'gold', icon: '', name: 'Team Captain', desc: 'Came to class in 50 weeks', master: true },
  // hearts
  { id: 'hearts-10', group: 'heart', shape: 'heart', metal: 'bronze', icon: '💕', name: 'Loved', desc: '10 hearts received' },
  { id: 'hearts-50', group: 'heart', shape: 'heart', metal: 'silver', icon: '💖', name: 'Beloved', desc: '50 hearts received' },
  { id: 'hearts-100', group: 'heart', shape: 'heart', metal: 'gold', icon: '💝', name: 'Everyone\'s Friend', desc: '100 hearts received', master: true },
  // shrine room
  { id: 'lotus-100', group: 'shrine', shape: 'flower', metal: 'bronze', icon: '🪷', name: 'Lotus Seed', desc: '100 lotus flowers' },
  { id: 'lotus-500', group: 'shrine', shape: 'flower', metal: 'silver', icon: '🪷', name: 'Lotus Bloom', desc: '500 lotus flowers' },
  { id: 'lotus-1000', group: 'shrine', shape: 'flower', metal: 'gold', icon: '🪷', name: 'Lotus Master', desc: '1,000 lotus flowers', master: true },
  { id: 'lotus-2000', group: 'shrine', shape: 'lotusgate', metal: 'gold', icon: '🪷', name: 'Golden Lotus', desc: '2,000 lotus flowers', master: true },
  { id: 'lotus-3000', group: 'shrine', shape: 'badge8', metal: 'gold', icon: '🪷', name: 'Lotus Pond Keeper', desc: '3,000 lotus flowers', master: true },
  { id: 'lotus-4000', group: 'shrine', shape: 'rosette', metal: 'gold', icon: '🪷', name: 'Lotus Sage', desc: '4,000 lotus flowers', master: true },
  { id: 'lotus-5000', group: 'shrine', shape: 'crown', metal: 'gold', icon: '', name: 'Lotus Legend', desc: '5,000 lotus flowers', master: true },
  { id: 'shrine-visits', group: 'shrine', shape: 'feet', metal: 'bronze', icon: '', name: 'Friendly Visitor', desc: 'Visited 10 friends\' Shrine Rooms' },
  { id: 'shrine-visits-25', group: 'shrine', shape: 'feet', metal: 'silver', icon: '', name: 'Dhamma Friend', desc: 'Visited 25 friends\' Shrine Rooms' },
  { id: 'shrine-visits-50', group: 'shrine', shape: 'feet', metal: 'gold', icon: '', name: 'Altar Explorer', desc: 'Visited 50 friends\' Shrine Rooms' },
  { id: 'shrine-visits-75', group: 'shrine', shape: 'feet', metal: 'gold', icon: '', name: 'Pilgrim of Friendship', desc: 'Visited 75 friends\' Shrine Rooms', master: true },
  // nature & avatar
  { id: 'nature-gift-5', group: 'nature', shape: 'gift', metal: 'bronze', icon: '', name: 'Little Gifter', desc: 'Sent Nature World gifts to 5 friends' },
  { id: 'nature-gift-15', group: 'nature', shape: 'gift', metal: 'silver', icon: '', name: 'Generous Friend', desc: 'Sent Nature World gifts to 15 friends' },
  { id: 'nature-gift-30', group: 'nature', shape: 'gift', metal: 'gold', icon: '', name: 'Gift Giver', desc: 'Sent Nature World gifts to 30 friends' },
  { id: 'nature-gift-50', group: 'nature', shape: 'burst', metal: 'gold', icon: '🎁', name: 'Gift Star', desc: 'Sent Nature World gifts to 50 friends', master: true },
  { id: 'nature-gift-100', group: 'nature', shape: 'rosette', metal: 'gold', icon: '🎁', name: 'Heart of Giving', desc: 'Sent Nature World gifts to 100 friends', master: true },
  { id: 'nature-gift-200', group: 'nature', shape: 'crest', metal: 'gold', icon: '💝', name: 'Dana Master', desc: 'Sent Nature World gifts to 200 friends', master: true },
  { id: 'nature-5', group: 'nature', shape: 'tree', metal: 'bronze', icon: '', name: 'Gardener', desc: 'Planted 8 trees' },
  { id: 'nature-15', group: 'nature', shape: 'tree', metal: 'silver', icon: '', name: 'Tree Tender', desc: 'Planted 15 trees' },
  { id: 'nature-12', group: 'nature', shape: 'tree', metal: 'gold', icon: '', name: 'Forest Keeper', desc: 'Planted 30 trees', master: true },
  { id: 'nature-25', group: 'nature', shape: 'leaf', metal: 'gold', icon: '🌳', name: 'Grove Guardian', desc: 'Planted 60 trees', master: true },
  { id: 'avatar-10', group: 'nature', shape: 'shirt', metal: 'silver', icon: '', name: 'Stylist', desc: 'Got 10 Avatar items' },
  { id: 'avatar-25', group: 'nature', shape: 'shirt', metal: 'gold', icon: '', name: 'Fashion Star', desc: 'Got 20 Avatar items', master: true },
  // poems: singing
  { id: 'poems-10', group: 'poems', shape: 'music', metal: 'bronze', icon: '', name: 'Little Singer', desc: 'Recited 10 poems' },
  { id: 'poems-25', group: 'poems', shape: 'music', metal: 'silver', icon: '', name: 'Sweet Voice', desc: 'Recited 25 poems' },
  { id: 'poem-master', group: 'poems', shape: 'mic', metal: 'gold', icon: '', name: 'Poem Master', desc: 'Recited all 48 poems', master: true },
  // reader
  { id: 'reader-10', group: 'reader', shape: 'book', metal: 'bronze', icon: '📖', name: 'Reader', desc: 'Reached chapter 10' },
  { id: 'reader-20', group: 'reader', shape: 'book', metal: 'silver', icon: '📖', name: 'Bookworm', desc: 'Reached chapter 20' },
  { id: 'reader-master', group: 'reader', shape: 'book', metal: 'gold', icon: '🎓', name: 'Myanmar Reader Master', desc: 'Finished all 29 chapters', master: true },
  // games
  { id: 'vowels-basic', group: 'games', shape: 'rocket', metal: 'bronze', icon: '', name: 'Vowel Starter', desc: 'Finished the basic vowel games' },
  { id: 'vowels-pro', group: 'games', shape: 'rocket', metal: 'gold', icon: '', name: 'Vowel Master', desc: 'Finished 10 vowel games', master: true },
  { id: 'numbers-2', group: 'games', shape: 'target', metal: 'silver', icon: '', name: 'Number Learner', desc: 'Finished 2 number levels' },
  { id: 'numbers-master', group: 'games', shape: 'golf', metal: 'gold', icon: '', name: 'Hole in One', desc: 'Finished all 4 number levels', master: true },
  { id: 'consonants-6', group: 'games', shape: 'quill', metal: 'silver', icon: '', name: 'Consonant Explorer', desc: 'Finished 6 consonant games' },
  { id: 'animals-master', group: 'games', shape: 'paw', metal: 'gold', icon: '🐘', name: 'Animal Sound Master', desc: 'Won all 5 Animal Sound trophies', master: true },
  // Smart Study: by the number of lessons finished (all classes together)
  { id: 'ss-10', group: 'ss', shape: 'bulb', metal: 'bronze', icon: '', name: 'Quiz Starter', desc: '10 Smart Study lessons' },
  { id: 'ss-25', group: 'ss', shape: 'bulb', metal: 'silver', icon: '', name: 'Quiz Explorer', desc: '25 Smart Study lessons' },
  { id: 'ss-50', group: 'ss', shape: 'bulb', metal: 'gold', icon: '', name: 'Quiz Scholar', desc: '50 Smart Study lessons' },
  { id: 'ss-100', group: 'ss', shape: 'bolt', metal: 'gold', icon: '🧠', name: 'Quiz Expert', desc: '100 Smart Study lessons' },
  { id: 'ss-200', group: 'ss', shape: 'cap', metal: 'gold', icon: '', name: 'Quiz Master', desc: '200 Smart Study lessons', master: true },
  // Abhidhamma: by the number of lessons finished
  { id: 'abhi-10', group: 'abhi', shape: 'wheel', metal: 'bronze', icon: '', name: 'Abhidhamma Student', desc: '10 Abhidhamma lessons' },
  { id: 'abhi-30', group: 'abhi', shape: 'wheel', metal: 'silver', icon: '', name: 'Abhidhamma Learner', desc: '30 Abhidhamma lessons' },
  { id: 'abhi-60', group: 'abhi', shape: 'wheel', metal: 'gold', icon: '', name: 'Abhidhamma Scholar', desc: '60 Abhidhamma lessons' },
  { id: 'abhi-100', group: 'abhi', shape: 'lotusgate', metal: 'gold', icon: '🙏', name: 'Abhidhamma Master', desc: '100 Abhidhamma lessons', master: true },
  // Dhammaschool: by the number of chapters finished, and a big badge for every finished grade (40 chapters each)
  { id: 'ds-5', group: 'ds', shape: 'school', metal: 'bronze', icon: '', name: 'Dhammaschool Pupil', desc: '5 Dhammaschool chapters' },
  { id: 'ds-20', group: 'ds', shape: 'school', metal: 'silver', icon: '', name: 'Dhammaschool Student', desc: '20 Dhammaschool chapters' },
  { id: 'ds-50', group: 'ds', shape: 'school', metal: 'gold', icon: '', name: 'Dhammaschool Scholar', desc: '50 Dhammaschool chapters' },
  { id: 'ds-100', group: 'ds', shape: 'cap', metal: 'gold', icon: '', name: 'Dhammaschool Master', desc: '100 Dhammaschool chapters', master: true },
  // festivals: good deeds (a kind thought, paying respect) -- all festivals together
  { id: 'deeds-25', group: 'festival', shape: 'heart', metal: 'bronze', icon: '🙏', name: 'Kind Heart', desc: '25 good deeds in the festivals' },
  { id: 'deeds-50', group: 'festival', shape: 'lamp', metal: 'silver', icon: '', name: 'Gentle Spirit', desc: '50 good deeds in the festivals' },
  { id: 'deeds-100', group: 'festival', shape: 'flower', metal: 'gold', icon: '🙏', name: 'Merit Maker', desc: '100 good deeds in the festivals' },
  { id: 'deeds-200', group: 'festival', shape: 'burst', metal: 'gold', icon: '🙏', name: 'Light of Kindness', desc: '200 good deeds in the festivals', master: true },
  { id: 'deeds-300', group: 'festival', shape: 'heart', metal: 'gold', icon: '💛', name: 'Heart of Gold', desc: '300 good deeds in the festivals', master: true },
  { id: 'deeds-500', group: 'festival', shape: 'crown', metal: 'gold', icon: '', name: 'Sadhu Master', desc: '500 good deeds in the festivals', master: true },
  // festivals: keeping the traditions (lighting the festival lamps)
  { id: 'lamps-10', group: 'festival', shape: 'lamp', metal: 'bronze', icon: '', name: 'Lamp Lighter', desc: '10 festival traditions (lamps, pumpkins, water...)' },
  { id: 'lamps-50', group: 'festival', shape: 'lamp', metal: 'silver', icon: '', name: 'Keeper of the Flame', desc: '50 festival traditions' },
  { id: 'lamps-100', group: 'festival', shape: 'lamp', metal: 'gold', icon: '', name: 'Festival Light', desc: '100 festival traditions' },
  { id: 'lamps-200', group: 'festival', shape: 'burst', metal: 'gold', icon: '🪔', name: 'Guardian of Tradition', desc: '200 festival traditions', master: true },
  { id: 'lamps-500', group: 'festival', shape: 'crest', metal: 'gold', icon: '🪔', name: 'Light of the Dhamma', desc: '500 festival traditions', master: true },
  // special
  { id: 'all-rounder', group: 'all', shape: 'burst', metal: 'gold', icon: '🌟', name: 'All-Rounder', desc: 'Earned 20 badges', master: true },
];

// one badge per Dhammaschool grade: finishing every chapter of the grade (id 'ds-grade:GRADE-3')
export const dynamicBadge = (id) => {
  // The Bodhi Tree: 'bodhi-level:2026:6' = level 7 reached in 2026 (the current year's level; each new level replaces the one before,
  // and every January it starts again); 'bodhi-year:2026:8' = the GOLD badge of the level a student finished 2026 on, with the year on it
  // (kept for ever). The old form 'bodhi-level:6' (no year) counts as 2026.
  if (id.startsWith('bodhi-level:') || id.startsWith('bodhi-year:')) {
    const parts = id.split(':');
    const isYear = parts[0] === 'bodhi-year';
    const year = parts.length >= 3 ? Number(parts[1]) : 2026;
    const i = Number(parts[parts.length - 1]);
    if (!(i >= 0 && i < STAGE_NAMES.length) || !year) return null;
    if (isYear) return { id, group: 'attend', shape: 'bodhiyear', level: i, year, metal: 'gold', icon: '', name: `${year} ${STAGE_NAMES[i]}`, desc: `Reached Bodhi Tree level ${i + 1} (${STAGE_NAMES[i]}) in ${year}`, master: true };
    return { id, group: 'attend', shape: 'bodhi', level: i, year, metal: 'gold', icon: '', name: STAGE_NAMES[i], desc: `Bodhi Tree level ${i + 1} (${WEEK_MILESTONES[i]} weeks of coming to class in ${year})`, master: i === STAGE_NAMES.length - 1 };
  }
  if (id.startsWith('ds-grade:')) {
    const g = id.slice(9);
    const label = g.replace(/^GRADE-?/i, 'Grade ') || g;
    return { id, group: 'ds', shape: 'crest', metal: 'gold', icon: '🎓', name: `${label} Champion`, desc: `Finished every chapter of ${label}`, master: true };
  }
  return null;
};

const BY_ID = new Map(BADGE_DEFS.map(b => [b.id, b]));
export const badgeMeta = (id) => BY_ID.get(id) || dynamicBadge(id);
