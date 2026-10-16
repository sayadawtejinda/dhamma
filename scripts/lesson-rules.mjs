// The lesson-writing rules, copied word for word from the teacher's "smartstudy Quiz - fixed" Canvas app:
// the reading levels (word and sentence limits), the checks on a level's text and on a quiz, and the quiz rules.
// make-lessons.mjs uses them so the lessons it makes follow exactly the same rules as in that app.

const AGE_LEVELS = {
  storyteller: "Storytellers (Ages 5+ / Beginner)",
  explorer: "Explorers (Ages 6-8)",
  adventurer: "Adventurers (Ages 9-11)",
  voyager: "Voyagers (Ages 12+)"
};

// ---------- Reading levels: one place that says what each age can read ----------
// The word and sentence limits are CHECKED after Gemini answers; if it goes over,
// it is asked again (see generateLevelContent).
const LEVEL_SPECS = {
  storyteller: {
    who: 'a 5-year-old who is just learning to read, and who has a very short attention span',
    minWords: 40, maxWords: 80, maxSentenceWords: 8, maxSentences: 10,
    rules: [
      'Choose the ONE most important idea of the lesson and tell only that. Leave everything else out; it is fine to drop most of the details.',
      'Use only everyday words a 5-year-old already says (home, mum, dog, sun, kind, share). No long words, no abstract words, no Pali or foreign words unless the lesson is about that one word; if so, use just one and explain it at once in a few simple words.',
      'Very short sentences of 3 to 8 words. One idea per sentence. Plain statements, no clauses, no "which", "although", "because of".',
      'Talk about things a child can see, do or feel (a boy, a bird, sharing food, feeling happy). Give any characters short, easy names.',
      'It is good to repeat the key word or a short phrase once or twice, like in a picture book.',
      'No numbers or dates, no lists, no quotation marks, no questions.'
    ]
  },
  explorer: {
    who: 'a child of 6 to 8 who reads simple books on their own',
    minWords: 90, maxWords: 170, maxSentenceWords: 12, maxSentences: 16,
    rules: [
      'Keep the main idea and two or three of the most important details. Leave out the rest.',
      'Simple, common words. At most one or two new words, each explained right away in a few simple words.',
      'Short sentences of 5 to 12 words, one idea each. A simple "because" is fine.',
      'Concrete, easy-to-picture events. No long descriptions.',
      'No lists, no quotation marks.'
    ]
  },
  adventurer: {
    who: 'a child of 9 to 11 who reads chapter books',
    minWords: 170, maxWords: 300, maxSentenceWords: 20, maxSentences: 20,
    rules: [
      'Keep the main idea, the key details and the reason or lesson behind it.',
      'Clear everyday language with a few new words, each easy to understand from the sentence.',
      'Sentences of 8 to 20 words. Cause and effect may be explained ("so", "because", "then").',
      'No lists, no quotation marks.'
    ]
  },
  voyager: {
    who: 'a young person of 12 or older who reads confidently',
    minWords: 280, maxWords: 450, maxSentenceWords: 28, maxSentences: 26,
    rules: [
      'Keep all the important facts and also explain the reason, meaning or lesson behind them, with some nuance.',
      'Richer vocabulary is welcome, but the text must stay clear and never read like an academic paper.',
      'Sentences of up to 28 words. Link the ideas smoothly.',
      'No lists, no quotation marks.'
    ]
  }
};

const countWords = (t) => (String(t || '').trim().match(/\S+/g) || []).length;
const splitSentences = (t) => String(t || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

// Gemini's raw text often has quote marks around everything, a title line,
// stray line breaks in front of full stops, or markdown marks. Tidy it first.
const cleanLessonText = (raw) => {
  let t = String(raw || '').replace(/\r/g, '');
  t = t.replace(/\n+\s*([.,!?;:])/g, '$1');            // "years\n. One day" -> "years. One day"
  t = t.replace(/[*_#`]+/g, '');                       // markdown marks
  t = t.replace(/[“”"]/g, '');               // quotation marks
  t = t.replace(/^\s*(title|lesson)\s*:.*\n/i, '');    // a "Title: ..." line
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return t;
};

// Longest allowed text: the level's own maximum, but not much longer than the
// teacher's original (up to 15% more is fine, so a 280-word original can give 320).
const levelMaxWords = (level, masterWordCount) => {
  const spec = LEVEL_SPECS[level];
  return masterWordCount ? Math.min(spec.maxWords, Math.max(spec.minWords, Math.round(masterWordCount * 1.15))) : spec.maxWords;
};

// Returns a list of problems (empty list = the text is fine for that age).
const checkLevelText = (text, level, masterWordCount) => {
  const spec = LEVEL_SPECS[level];
  const problems = [];
  const words = countWords(text);
  const sents = splitSentences(text);
  const longestSentence = Math.max(0, ...sents.map(countWords));
  // never longer than the teacher's own text, even if the spec would allow it
  const maxAllowed = levelMaxWords(level, masterWordCount);
  if (words > maxAllowed) problems.push(`it has ${words} words; the maximum is ${maxAllowed}`);
  if (words < Math.min(spec.minWords, masterWordCount || spec.minWords) * 0.6) problems.push(`it has only ${words} words; it should have about ${spec.minWords} to ${spec.maxWords}`);
  if (sents.length > spec.maxSentences) problems.push(`it has ${sents.length} sentences; the maximum is ${spec.maxSentences}`);
  if (longestSentence > spec.maxSentenceWords + 3) problems.push(`one sentence has ${longestSentence} words; sentences must be at most ${spec.maxSentenceWords} words`);
  return problems;
};

// ---------- Quiz checks ----------
const qNorm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const qStem = (w) => w.replace(/(ing|ed|es|s)$/, '');
const qWordSet = (t) => new Set(qNorm(t).split(' ').filter(w => w.length > 2).map(qStem));
const qSimilarity = (a, b) => {
  const A = qWordSet(a), B = qWordSet(b);
  let shared = 0; A.forEach(w => { if (B.has(w)) shared++; });
  return shared / Math.max(1, A.size + B.size - shared);
};

// Makes every "correct" answer EXACTLY one of the options (fixes e.g. "Roll off"
// vs "It rolls off"). Returns the cleaned question, or null if it cannot be fixed.
const alignAnswer = (q) => {
  if (q.type === 'tf') {
    const c = qNorm(q.correct);
    if (c === 'true' || c === 'false') return { type: 'tf', text: q.text, correct: c === 'true' ? 'True' : 'False' };
    return null;
  }
  const opts = (q.options || []).map(o => String(o).trim());
  if (opts.length !== 4 || new Set(opts.map(qNorm)).size !== 4) return null;
  const exact = opts.find(o => qNorm(o) === qNorm(q.correct));
  if (exact) return { type: 'mcq', text: q.text, options: opts, correct: exact };
  const contain = (a, b) => { const A = qWordSet(a), B = qWordSet(b); let sh = 0; A.forEach(w => { if (B.has(w)) sh++; }); return sh / Math.max(1, Math.min(A.size, B.size)); };
  const scored = opts.map(o => ({ o, s: contain(o, q.correct) })).sort((x, y) => y.s - x.s);
  // accept only a clear winner, so a wrong guess is never marked correct
  return scored[0].s >= 0.6 && scored[0].s > (scored[1] ? scored[1].s : 0) ? { type: 'mcq', text: q.text, options: opts, correct: scored[0].o } : null;
};

const checkQuiz = (questions, level) => {
  const problems = [];
  if (!Array.isArray(questions) || questions.length !== 10) return [`there are ${Array.isArray(questions) ? questions.length : 0} questions; there must be exactly 10`];
  const mcq = questions.filter(q => q.type === 'mcq').length;
  if (mcq !== 5) problems.push(`there are ${mcq} multiple-choice questions; there must be exactly 5 (and 5 true/false)`);
  questions.forEach((q, i) => { if (!alignAnswer(q)) problems.push(`question ${i + 1}: the correct answer is missing from the options, or the 4 options are not different`); });
  for (let i = 0; i < questions.length; i++) for (let j = i + 1; j < questions.length; j++) {
    if (qSimilarity(questions[i].text, questions[j].text) >= 0.7) problems.push(`questions ${i + 1} and ${j + 1} ask about the same thing; every question must ask about a different detail`);
  }
  const maxQ = { storyteller: 12, explorer: 18, adventurer: 26, voyager: 40 }[level];
  questions.forEach((q, i) => { if (countWords(q.text) > maxQ) problems.push(`question ${i + 1} is too long for this age (${countWords(q.text)} words, max ${maxQ})`); });
  return problems;
};

const quizSchema = { type: "ARRAY", items: { type: "OBJECT", properties: { type: { type: "STRING", enum: ["mcq", "tf"] }, text: { type: "STRING" }, correct: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } } }, required: ["type", "text", "correct"], propertyOrdering: ["type", "text", "options", "correct"] } };

const baseRules = `You write quizzes for children. Make a quiz of EXACTLY 10 questions from the lesson text you are given: exactly 5 multiple-choice questions ("mcq", each with exactly 4 DIFFERENT options and exactly one correct answer) and exactly 5 true/false questions ("tf", with correct = "True" or "False" and no options).
RULES:
- Every question must be answerable from the lesson text alone, and must be about a DIFFERENT detail. Never ask the same thing twice, even in other words. If the text is short, ask about different parts: who, what, where, what happened, how someone felt, what they did, what they learned.
- For every mcq, the value of "correct" must be copied EXACTLY, letter for letter, from one of its 4 options. The wrong options must be clearly wrong but believable.
- About half of the true/false statements should be false, but a false statement must still be clearly wrong according to the text.
- Put the questions in the order the facts appear in the text.
- Use only words from the lesson text or very simple words.`;
const levelRules = {
  storyteller: `The reader is a 5-year-old. Every question is at most 8 words. Every answer option is 1 to 3 words. True/false statements are at most 8 words. Ask only about things that are plainly said in the text.`,
  explorer: `The reader is 6 to 8 years old. Questions are at most 12 words and options at most 5 words. Keep it simple.`,
  adventurer: `The reader is 9 to 11 years old. Questions are at most 18 words. Standard difficulty; a few questions may ask why something happened.`,
  voyager: `The reader is 12 or older. Questions are at most 28 words. Challenging: some questions may ask for the reason, the meaning or the lesson.`
};


export { AGE_LEVELS, LEVEL_SPECS, countWords, splitSentences, cleanLessonText, levelMaxWords, checkLevelText, alignAnswer, checkQuiz, baseRules, levelRules, quizSchema };
