// The ten Bodhi Tree levels (a title and a badge artwork for each), by weeks of attendance. Shared by the Bodhi Tree app and the
// badge shelf on the Home page (the shelf shows the student's current level badge).
// Student rank/title (not a description of the tree itself). The teacher's
// thresholds are in WEEKS of attendance (1/3/5/7/9/13/20/30/40/50) -- since
// treeAgeDays is already "attended weeks x 7" (see getWeekKey/attendedWeeks
// above), a week threshold converts to a day threshold by x7.
// Counted in the weeks of attendance of the CURRENT YEAR (the tree starts again every January): all ten levels within 40 weeks.
export const WEEK_MILESTONES = [1, 3, 5, 7, 9, 13, 19, 26, 33, 40];
export const MILESTONES = WEEK_MILESTONES.map(w => w * 7);
export const STAGE_NAMES = [
  'Little Planter',
  'Sprout Caretaker',
  'Budding Gardener',
  'Plant Lover',
  'Green Custodian',
  'Nature Guardian',
  'Bodhi Protector',
  'Tree Mentor',
  'Wisdom Cultivator',
  'Bodhi Master',
];
export const getStageIndex = (days) => {
  const clamped = Math.max(0, Math.min(MILESTONES[MILESTONES.length - 1], days));
  let idx = 0;
  for (let i = 0; i < MILESTONES.length; i++) if (clamped >= MILESTONES[i]) idx = i;
  return idx;
};
export const getStageName = (days) => STAGE_NAMES[getStageIndex(days)];
export const getNextMilestone = (days) => MILESTONES.find(m => m > days) || null;

// One badge SVG per title tier (teacher-supplied artwork, same order as
// STAGE_NAMES). width/height are stripped so each scales to its container
// via CSS instead of being locked to the original 200x200 -- the badge
// shows small next to the tree and full-size in the tap-to-expand popup.
const stripFixedSize = (svg) => svg.replace(/\s(width|height)="\d+"/g, '');
export const LEVEL_BADGES_SVG = [
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E8F5E9" stroke="#81C784" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
  <ellipse cx="100" cy="140" rx="35" ry="10" fill="#8D6E63"/>
  <path d="M100,140 L100,105" stroke="#388E3C" stroke-width="5" stroke-linecap="round"/>
  <path d="M100,120 Q80,100 70,105 Q70,85 100,105 Z" fill="#4CAF50"/>
  <path d="M100,110 Q120,90 130,95 Q130,75 100,95 Z" fill="#66BB6A"/>
  <path id="textPath1" d="M 25,100 A 75,75 0 0,1 175,100" fill="none"/>
  <text font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1B5E20" text-anchor="middle">
    <textPath href="#textPath1" startOffset="50%">LEVEL 1: LITTLE PLANTER</textPath>
  </text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E8F5E9" stroke="#66BB6A" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
  <path d="M100,135 L100,90" stroke="#388E3C" stroke-width="6" stroke-linecap="round"/>
  <path d="M100,110 Q75,90 70,70 Q95,75 100,100 Z" fill="#4CAF50"/>
  <path d="M100,100 Q125,80 130,60 Q105,65 100,90 Z" fill="#81C784"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#4CAF50"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 2: SPROUT CARETAKER</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FFFDE7" stroke="#FBC02D" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#FDD835" stroke-width="2"/>
  <path d="M75,110 L82,140 L118,140 L125,110 Z" fill="#8D6E63"/>
  <path d="M100,110 L100,75" stroke="#388E3C" stroke-width="5"/>
  <circle cx="100" cy="70" r="12" fill="#81C784"/>
  <path d="M100,95 Q80,85 75,95 Q90,105 100,95 Z" fill="#4CAF50"/>
  <path d="M100,90 Q120,80 125,90 Q110,100 100,90 Z" fill="#4CAF50"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#FBC02D"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#333333" text-anchor="middle">LVL 3: BUDDING GARDENER</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FCE4EC" stroke="#EC407A" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#F48FB1" stroke-width="2"/>
  <path d="M100,135 C100,135 60,105 60,80 C60,65 72,55 85,55 C93,55 98,60 100,65 C102,60 107,55 115,55 C128,55 140,65 140,80 C140,105 100,135 100,135 Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
  <path d="M100,70 L100,120" stroke="#A5D6A7" stroke-width="2"/>
  <rect x="20" y="145" width="160" height="26" rx="6" fill="#EC407A"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 4: PLANT LOVER</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E0F2F1" stroke="#00897B" stroke-width="8"/>
  <circle cx="100" cy="100" r="80" fill="#B2DFDB"/>
  <path d="M100,50 L135,65 V100 C135,125 100,140 100,140 C100,140 65,125 65,100 V65 Z" fill="#26A69A"/>
  <circle cx="100" cy="88" r="18" fill="#004D40"/>
  <rect x="97" y="95" width="6" height="15" fill="#8D6E63"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#00897B"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 5: GREEN CUSTODIAN</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E8F5E9" stroke="#2E7D32" stroke-width="8"/>
  <circle cx="100" cy="90" r="35" fill="#81C784"/>
  <path d="M100,55 C80,70 80,110 100,125 C120,110 120,70 100,55 Z" fill="#388E3C"/>
  <rect x="96" y="120" width="8" height="18" fill="#5D4037"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#2E7D32"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 6: NATURE GUARDIAN</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#EFEBE9" stroke="#8D6E63" stroke-width="8"/>
  <circle cx="100" cy="100" r="80" fill="#D7CCC8" stroke="#6D4C41" stroke-width="2"/>
  <path d="M100,50 C120,70 130,90 120,110 C110,122 104,125 100,125 C96,125 90,122 80,110 C70,90 80,70 100,50 Z" fill="#388E3C"/>
  <path d="M100,50 Q100,40 100,35" stroke="#1B5E20" stroke-width="2"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#6D4C41"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 7: BODHI PROTECTOR</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#ECEFF1" stroke="#78909C" stroke-width="8"/>
  <circle cx="100" cy="80" r="30" fill="#4CAF50"/>
  <circle cx="80" cy="95" r="22" fill="#388E3C"/>
  <circle cx="120" cy="95" r="22" fill="#388E3C"/>
  <rect x="94" y="100" width="12" height="35" fill="#4E342E"/>
  <polygon points="100,35 103,42 110,42 105,46 107,53 100,49 93,53 95,46 90,42 97,42" fill="#FFD54F"/>
  <rect x="20" y="145" width="160" height="26" rx="6" fill="#546E7A"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 8: TREE MENTOR</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FFF8E1" stroke="#FFB300" stroke-width="8"/>
  <path d="M100,45 L100,135 M55,90 L145,90 M68,58 L132,122 M132,58 L68,122" stroke="#FFE082" stroke-width="3" stroke-dasharray="4,4"/>
  <path d="M100,55 C122,75 130,95 120,115 C110,126 104,130 100,130 C96,130 90,126 80,115 C70,95 78,75 100,55 Z" fill="#2E7D32" stroke="#FFB300" stroke-width="2"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#FFB300"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 9: WISDOM CULTIVATOR</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FFF8E1" stroke="#FFD54F" stroke-width="8"/>
  <circle cx="100" cy="100" r="80" fill="#FFECB3" stroke="#FFA000" stroke-width="3"/>
  <polygon points="100,28 103,37 112,37 105,42 107,51 100,46 93,51 95,42 88,37 97,37" fill="#FFC107"/>
  <path d="M100,55 C125,80 135,105 125,125 C115,138 105,142 100,142 C95,142 85,138 75,125 C65,105 75,80 100,55 Z" fill="#2E7D32" stroke="#1B5E20" stroke-width="2"/>
  <path d="M100,55 Q100,45 100,40" stroke="#1B5E20" stroke-width="2" stroke-linecap="round"/>
  <path d="M100,70 L100,135 M100,90 L112,82 M100,102 L115,96 M100,114 L110,112 M100,90 L88,82 M100,102 L85,96 M100,114 L90,112" stroke="#A5D6A7" stroke-width="2" stroke-linecap="round"/>
  <rect x="20" y="145" width="160" height="26" rx="6" fill="#FFA000"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 10: BODHI MASTER</text>
</svg>`),
];

// the level (0-9) for a number of weeks of attendance, or -1 before the first week
export const levelForWeeks = (weeks) => { let idx = -1; for (let i = 0; i < WEEK_MILESTONES.length; i++) if (weeks >= WEEK_MILESTONES[i]) idx = i; return idx; };
