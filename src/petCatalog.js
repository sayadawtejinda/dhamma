// Pets: the shop's catalog and the little bits of pet care both the Pet app (PetApp.jsx) and the
// wandering pets on the student's home page (PetHome.jsx) need, kept here so they can never drift apart.
//
// Where a pet lives: the student's own profile doc (students/{uid}.pets) -- the home page already
// listens to that document, so the pets cost no extra Firebase reads there. Each pet is
//   { id, kind, name, boughtAt, fedAt }   (times in ms)
// and everything else (hungry or not, asleep or awake, where it walks) is worked out on the device
// from those two times and the clock -- nothing is written while a pet just lives. A write happens
// only when a pet is bought, renamed or fed.

export const PET_MIN_PRICE = 12000;
export const MAX_PETS = 6;
// Pet food, sold in the Pet Shop for coins. One meal feeds one pet once (any pet eats any food; the picture of the
// food just changes with the animal). Every pet comes with a few free meals. The stock is one number on the student's
// profile (students/{uid}.petFood), so it costs no extra reads.
export const STARTER_MEALS = 3;
export const FOOD_PACKS = [
  { id: 'meal1', meals: 1, price: 100, label: '1 meal', icon: '🍖' },
  { id: 'meal7', meals: 7, price: 600, label: '7 meals', icon: '🍖🍖' },
  { id: 'meal30', meals: 30, price: 2400, label: '30 meals', icon: '🥩' },
];




// How long after being fed a pet stays full, and when it starts to ask for food.
export const PET_PECKISH_AFTER_H = 6;   // starts to ask now and then
export const PET_HUNGRY_AFTER_H = 14;   // asks all the time (never dies or sickens -- it is only sad until fed)
export const PET_FEED_COOLDOWN_H = 3;   // too soon after a meal: "I'm full!"

// faces: which way the emoji picture looks by default ('left' | 'right'), so the pet can be turned the way it walks.
// moves: how it travels -- walk | run | hop | scamper | waddle | fly. acts: what it does between walks, with a
// weight (higher = more often). says: what it says. toy: what it plays with. food: what it is fed.
export const PET_KINDS = {
  dog: {
    emoji: '🐕', name: 'Puppy', price: 12000, faces: 'left', food: '🦴', toy: '🎾', says: ['Woof! 🐾', 'Woof woof!'],
    blurb: 'Loves to run, fetch his ball and be fed a bone.', moves: ['walk', 'run'], speed: 90,
    acts: { walk: 3, run: 2, play: 5, sit: 2, sleep: 1, talk: 1 },
  },
  cat: {
    emoji: '🐈', name: 'Kitty', price: 12000, faces: 'left', food: '🐟', toy: '🧶', says: ['Meow~', 'Purrr... 💗'],
    blurb: 'Walks slowly, grooms herself and naps a lot.', moves: ['walk'], speed: 45,
    acts: { walk: 2, sit: 3, groom: 3, play: 3, sleep: 4, talk: 1 },
  },
  bird: {
    emoji: '🐦', name: 'Birdie', price: 12000, faces: 'left', food: '🌾', toy: '🪶', says: ['Tweet tweet! 🎵', 'Chirp! 🎶'],
    blurb: 'Hops, flies around and sings. Likes seeds.', moves: ['hop', 'fly'], speed: 80,
    acts: { hop: 3, fly: 3, talk: 3, sit: 2, sleep: 1 },
  },
  squirrel: {
    emoji: '🐿️', name: 'Squirrel', price: 14000, faces: 'left', food: '🌰', toy: '🌰', says: ['Chit chit!', 'Chitter chitter!'],
    blurb: 'Scampers in quick bursts and nibbles acorns.', moves: ['scamper'], speed: 120,
    acts: { scamper: 4, sit: 3, play: 2, talk: 1, sleep: 1 },
  },
  rabbit: {
    emoji: '🐇', name: 'Bunny', price: 14000, faces: 'right', food: '🥕', toy: '🥕', says: ['*sniff sniff*', 'Hop hop!'],
    blurb: 'Hops about and loves carrots.', moves: ['hop'], speed: 70,
    acts: { hop: 4, sit: 3, play: 1, sleep: 2, groom: 1 },
  },
  hamster: {
    emoji: '🐹', name: 'Hammy', price: 12000, faces: 'left', food: '🌻', toy: '🎡', says: ['Squeak!', 'Squeak squeak!'],
    blurb: 'Tiny and busy. Stuffs its cheeks with sunflower seeds.', moves: ['scamper'], speed: 100,
    acts: { scamper: 3, sit: 3, play: 3, sleep: 3, groom: 1 },
  },
  turtle: {
    emoji: '🐢', name: 'Turtle', price: 12000, faces: 'left', food: '🥬', toy: '🫧', says: ['...slowly...', 'Hello, friend 🐢'],
    blurb: 'Slow and calm. Eats lettuce.', moves: ['walk'], speed: 16,
    acts: { walk: 3, sit: 4, sleep: 3, talk: 1 },
  },
  fox: {
    emoji: '🦊', name: 'Foxy', price: 18000, faces: 'left', food: '🍇', toy: '🍂', says: ['Yip yip!', 'Ring-ding-ding!'],
    blurb: 'Clever and quick. Pounces on falling leaves.', moves: ['walk', 'run'], speed: 100,
    acts: { walk: 3, run: 2, play: 3, sit: 2, sleep: 2, talk: 1 },
  },
  parrot: {
    emoji: '🦜', name: 'Parrot', price: 20000, faces: 'left', food: '🍎', toy: '🪶', says: ['Hello! 👋', 'Pretty bird!', 'Squawk!'],
    blurb: 'Colourful and talkative. Says hello to you.', moves: ['hop', 'fly'], speed: 80,
    acts: { hop: 2, fly: 2, talk: 5, sit: 2, sleep: 1 },
  },
  penguin: {
    emoji: '🐧', name: 'Penguin', price: 20000, faces: 'left', food: '🐟', toy: '❄️', says: ['Honk!', 'Waddle waddle!'],
    blurb: 'Waddles about and loves fish.', moves: ['waddle'], speed: 50,
    acts: { waddle: 4, sit: 2, play: 3, sleep: 2, talk: 1 },
  },
  panda: {
    emoji: '🐼', name: 'Panda', price: 25000, faces: 'left', food: '🎋', toy: '🎋', says: ['Munch munch...', 'Nom nom 🎋'],
    blurb: 'Sits and munches bamboo, then rolls over for a nap.', moves: ['walk'], speed: 30,
    acts: { walk: 2, sit: 4, play: 2, sleep: 4, talk: 1 },
  },
  elephant: {
    emoji: '🐘', name: 'Elephant', price: 40000, faces: 'left', food: '🍌', toy: '💦', says: ['Toot toot! 🎺', 'Trumpet!'],
    blurb: 'Big and gentle. Sprays water with its trunk.', moves: ['walk'], speed: 28,
    acts: { walk: 3, sit: 3, play: 3, sleep: 2, talk: 2 },
  },
};

// What a pet says in its speech bubble: short, easy English (15 for every animal -- 9 that every pet says and 6 of its own),
// plus what it says when hungry, when thanked with food and when cuddled. Nothing here is stored or read: the bubble just
// picks one at random on the device.
const CORE_PHRASES = ['Thank you!', "I'm hungry.", 'Love you! ❤️', 'Hello!', 'Good morning!', "Let's play!", "I'm happy! 😊", "I'm sleepy.", 'Good night!'];
const OWN_PHRASES = {
  dog: ['Woof! Woof!', 'Throw the ball!', 'Walk with me!', 'I want a bone.', 'Good boy!', 'You are my best friend.'],
  cat: ['Meow~', 'Pet me, please.', 'I like fish.', 'Purr... purr...', 'I am a good cat.', 'Where is my yarn?'],
  bird: ['Tweet tweet!', 'I can fly!', 'Look at me!', 'I like seeds.', 'La la la! 🎵', 'The sky is blue.'],
  squirrel: ['Chit chit!', 'I found an acorn!', 'I like nuts.', 'Climb with me!', 'Look at my tail!', 'I am quick!'],
  rabbit: ['Hop hop!', 'I like carrots.', 'I can jump high!', 'My ears are long.', 'Soft and fluffy!', 'Hide and seek?'],
  hamster: ['Squeak squeak!', 'I like seeds.', 'I am so small.', 'My cheeks are full!', 'I can run fast!', 'Run, run, run!'],
  turtle: ['Slow and steady.', 'No hurry.', 'I like lettuce.', 'My shell is my home.', 'One step at a time.', 'Let me rest.'],
  fox: ['Yip yip!', 'I am clever.', 'Catch me if you can!', 'My tail is fluffy.', 'I like grapes.', "Let's explore!"],
  parrot: ['Hello! Hello!', 'Pretty bird!', 'Say it with me!', 'I can talk!', 'I like apples.', 'Squawk!'],
  penguin: ['Honk honk!', 'I love fish.', 'I like the snow.', 'Waddle waddle!', "Let's slide!", 'Brrr, it is cold.'],
  panda: ['Munch munch.', 'I love bamboo.', 'I am a big baby.', 'Hug me!', 'Roly-poly!', 'Nom nom nom.'],
  elephant: ['Toot toot!', 'I am big!', 'I never forget.', 'I like bananas.', 'Splash splash!', 'My ears are big.'],
};
Object.keys(PET_KINDS).forEach(k => { PET_KINDS[k].phrases = [...CORE_PHRASES, ...(OWN_PHRASES[k] || [])]; });
export const HUNGRY_PHRASES = ["I'm hungry! 🍖", 'Food, please!', 'Feed me, please!', "I'm so hungry...", 'Can I have some food?'];
export const THANKS_PHRASES = ['Thank you! 😋', 'Yummy! Thank you!', 'Thank you so much!', 'Delicious!', 'Thank you, friend!'];
export const LOVE_PHRASES = ['Love you! ❤️', 'I like you!', 'You are my friend!', 'Hug!', 'You are kind.', 'I am happy! 😊'];

export const petKindOf = (pet) => PET_KINDS[pet?.kind] || PET_KINDS.dog;

// 0 = full, 1 = peckish, 2 = hungry
export const petHunger = (pet, now = Date.now()) => {
  const since = pet?.fedAt || pet?.boughtAt || now;
  const hours = (now - since) / 3600000;
  return hours < PET_PECKISH_AFTER_H ? 0 : hours < PET_HUNGRY_AFTER_H ? 1 : 2;
};
export const petCanEat = (pet, now = Date.now()) => (now - (pet?.fedAt || 0)) / 3600000 >= PET_FEED_COOLDOWN_H;

export const newPetId = (kind) => `${kind}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const formatCoins = (n) => Number(n || 0).toLocaleString('en-US');
