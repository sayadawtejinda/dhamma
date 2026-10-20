// The badges a student can earn (shown on the Home page shelf and when someone visits it). Plain data, no JSX, because the weekly
// script (scripts/compute-badges.mjs) imports it too: the script works out who earned what from files already on GitHub and writes
// public/badges.json (no Firebase reads); the app only draws the badges listed there for each student.
//
// shape: how the badge is drawn (every group has its own look); metal: bronze | silver | gold; icon: the picture in the middle.

export const BADGE_GROUPS = [
  { id: 'trophy', title: 'Trophies' },
  { id: 'attend', title: 'Coming to class' },
  { id: 'heart', title: 'Hearts' },
  { id: 'shrine', title: 'Shrine Room' },
  { id: 'nature', title: 'Nature & Avatar' },
  { id: 'poems', title: 'Myanmar Poems' },
  { id: 'reader', title: 'Myanmar Reader' },
  { id: 'games', title: 'Learning games' },
  { id: 'ss', title: 'Smart Study' },
  { id: 'abhi', title: 'Abhidhamma' },
  { id: 'ds', title: 'Dhammaschool' },
  { id: 'all', title: 'Special' },
];

// thresholds are used by the script; `master: true` marks "finished everything" badges (drawn with a sparkle)
export const BADGE_DEFS = [
  // trophies
  { id: 'trophy-10', group: 'trophy', shape: 'shield', metal: 'bronze', icon: '🏆', name: 'Trophy Rookie', desc: '10 trophies' },
  { id: 'trophy-50', group: 'trophy', shape: 'shield', metal: 'silver', icon: '🏆', name: 'Trophy Hunter', desc: '50 trophies' },
  { id: 'trophy-100', group: 'trophy', shape: 'shield', metal: 'gold', icon: '🏆', name: 'Trophy Champion', desc: '100 trophies' },
  { id: 'trophy-250', group: 'trophy', shape: 'crest', metal: 'gold', icon: '👑', name: 'Trophy Legend', desc: '250 trophies', master: true },
  // coming to class
  { id: 'weeks-10', group: 'attend', shape: 'hexagon', metal: 'bronze', icon: '🌱', name: 'Sprout', desc: 'Came to class in 10 weeks' },
  { id: 'weeks-25', group: 'attend', shape: 'hexagon', metal: 'silver', icon: '🌿', name: 'Growing Tree', desc: 'Came to class in 25 weeks' },
  { id: 'weeks-50', group: 'attend', shape: 'hexagon', metal: 'gold', icon: '🌳', name: 'Great Bodhi', desc: 'Came to class in 50 weeks', master: true },
  // hearts
  { id: 'hearts-10', group: 'heart', shape: 'heart', metal: 'bronze', icon: '💕', name: 'Loved', desc: '10 hearts received' },
  { id: 'hearts-50', group: 'heart', shape: 'heart', metal: 'silver', icon: '💖', name: 'Beloved', desc: '50 hearts received' },
  { id: 'hearts-100', group: 'heart', shape: 'heart', metal: 'gold', icon: '💝', name: 'Everyone\'s Friend', desc: '100 hearts received', master: true },
  // shrine room
  { id: 'lotus-100', group: 'shrine', shape: 'flower', metal: 'bronze', icon: '🪷', name: 'Lotus Seed', desc: '100 lotus flowers' },
  { id: 'lotus-500', group: 'shrine', shape: 'flower', metal: 'silver', icon: '🪷', name: 'Lotus Bloom', desc: '500 lotus flowers' },
  { id: 'lotus-1000', group: 'shrine', shape: 'flower', metal: 'gold', icon: '🪷', name: 'Lotus Master', desc: '1,000 lotus flowers', master: true },
  { id: 'shrine-visits', group: 'shrine', shape: 'circle', metal: 'silver', icon: '👣', name: 'Friendly Visitor', desc: 'Visited 10 friends\' Shrine Rooms' },
  { id: 'shrine-gifts', group: 'shrine', shape: 'circle', metal: 'gold', icon: '🎁', name: 'Gift Giver', desc: 'Gave gifts to 5 friends' },
  // nature & avatar
  { id: 'nature-5', group: 'nature', shape: 'leaf', metal: 'bronze', icon: '🌲', name: 'Gardener', desc: 'Planted 8 trees' },
  { id: 'nature-12', group: 'nature', shape: 'leaf', metal: 'gold', icon: '🌴', name: 'Forest Keeper', desc: 'Planted 20 trees', master: true },
  { id: 'avatar-10', group: 'nature', shape: 'diamond', metal: 'silver', icon: '👗', name: 'Stylist', desc: 'Owns 20 Avatar items' },
  { id: 'avatar-25', group: 'nature', shape: 'diamond', metal: 'gold', icon: '✨', name: 'Fashion Star', desc: 'Owns 35 Avatar items', master: true },
  // poems
  { id: 'poems-10', group: 'poems', shape: 'scroll', metal: 'bronze', icon: '📜', name: 'Poem Lover', desc: 'Recited 10 poems' },
  { id: 'poems-25', group: 'poems', shape: 'scroll', metal: 'silver', icon: '📜', name: 'Poem Star', desc: 'Recited 25 poems' },
  { id: 'poem-master', group: 'poems', shape: 'scroll', metal: 'gold', icon: '🎓', name: 'Poem Master', desc: 'Recited all 48 poems', master: true },
  // reader
  { id: 'reader-10', group: 'reader', shape: 'book', metal: 'bronze', icon: '📖', name: 'Reader', desc: 'Reached chapter 10' },
  { id: 'reader-20', group: 'reader', shape: 'book', metal: 'silver', icon: '📖', name: 'Bookworm', desc: 'Reached chapter 20' },
  { id: 'reader-master', group: 'reader', shape: 'book', metal: 'gold', icon: '🎓', name: 'Myanmar Reader Master', desc: 'Finished all 29 chapters', master: true },
  // games
  { id: 'vowels-basic', group: 'games', shape: 'badge8', metal: 'bronze', icon: '🔤', name: 'Vowel Starter', desc: 'Finished the basic vowel games' },
  { id: 'vowels-pro', group: 'games', shape: 'badge8', metal: 'gold', icon: '🔤', name: 'Vowel Master', desc: 'Finished 10 vowel games', master: true },
  { id: 'numbers-2', group: 'games', shape: 'ticket', metal: 'silver', icon: '🔢', name: 'Number Learner', desc: 'Finished 2 number levels' },
  { id: 'numbers-master', group: 'games', shape: 'ticket', metal: 'gold', icon: '🔢', name: 'Number Master', desc: 'Finished all 4 number levels', master: true },
  { id: 'consonants-6', group: 'games', shape: 'badge8', metal: 'silver', icon: '🅰️', name: 'Consonant Explorer', desc: 'Finished 6 consonant games' },
  { id: 'animals-master', group: 'games', shape: 'paw', metal: 'gold', icon: '🐘', name: 'Animal Sound Master', desc: 'Won all 5 Animal Sound trophies', master: true },
  // Smart Study: by the number of lessons finished (all classes together)
  { id: 'ss-10', group: 'ss', shape: 'bolt', metal: 'bronze', icon: '💡', name: 'Quiz Starter', desc: '10 Smart Study lessons' },
  { id: 'ss-25', group: 'ss', shape: 'bolt', metal: 'silver', icon: '💡', name: 'Quiz Explorer', desc: '25 Smart Study lessons' },
  { id: 'ss-50', group: 'ss', shape: 'bolt', metal: 'silver', icon: '🧠', name: 'Quiz Scholar', desc: '50 Smart Study lessons' },
  { id: 'ss-100', group: 'ss', shape: 'bolt', metal: 'gold', icon: '🧠', name: 'Quiz Expert', desc: '100 Smart Study lessons' },
  { id: 'ss-200', group: 'ss', shape: 'bolt', metal: 'gold', icon: '🎓', name: 'Quiz Master', desc: '200 Smart Study lessons', master: true },
  // Abhidhamma: by the number of lessons finished
  { id: 'abhi-10', group: 'abhi', shape: 'lotusgate', metal: 'bronze', icon: '☸️', name: 'Abhidhamma Student', desc: '10 Abhidhamma lessons' },
  { id: 'abhi-30', group: 'abhi', shape: 'lotusgate', metal: 'silver', icon: '☸️', name: 'Abhidhamma Learner', desc: '30 Abhidhamma lessons' },
  { id: 'abhi-60', group: 'abhi', shape: 'lotusgate', metal: 'gold', icon: '🪷', name: 'Abhidhamma Scholar', desc: '60 Abhidhamma lessons' },
  { id: 'abhi-100', group: 'abhi', shape: 'lotusgate', metal: 'gold', icon: '🙏', name: 'Abhidhamma Master', desc: '100 Abhidhamma lessons', master: true },
  // Dhammaschool: by the number of chapters finished, and a big badge for every finished grade (40 chapters each)
  { id: 'ds-5', group: 'ds', shape: 'pennant', metal: 'bronze', icon: '🏫', name: 'Dhammaschool Pupil', desc: '5 Dhammaschool chapters' },
  { id: 'ds-20', group: 'ds', shape: 'pennant', metal: 'silver', icon: '🏫', name: 'Dhammaschool Student', desc: '20 Dhammaschool chapters' },
  { id: 'ds-50', group: 'ds', shape: 'pennant', metal: 'gold', icon: '📚', name: 'Dhammaschool Scholar', desc: '50 Dhammaschool chapters' },
  { id: 'ds-100', group: 'ds', shape: 'pennant', metal: 'gold', icon: '🎓', name: 'Dhammaschool Master', desc: '100 Dhammaschool chapters', master: true },
  // special
  { id: 'all-rounder', group: 'all', shape: 'burst', metal: 'gold', icon: '🌟', name: 'All-Rounder', desc: 'Earned 20 badges', master: true },
];

// one badge per Dhammaschool grade: finishing every chapter of the grade (id 'ds-grade:GRADE-3')
export const dynamicBadge = (id) => {
  if (id.startsWith('ds-grade:')) {
    const g = id.slice(9);
    const label = g.replace(/^GRADE-?/i, 'Grade ') || g;
    return { id, group: 'ds', shape: 'crest', metal: 'gold', icon: '🎓', name: `${label} Champion`, desc: `Finished every chapter of ${label}`, master: true };
  }
  return null;
};

const BY_ID = new Map(BADGE_DEFS.map(b => [b.id, b]));
export const badgeMeta = (id) => BY_ID.get(id) || dynamicBadge(id);
