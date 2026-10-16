// The four age versions of an Abhidhamma lesson (storytellers, explorers, adventurers, voyagers), each with its
// English title, the lesson in Burmese and in English with the picture names placed after the paragraphs, 10
// discussion questions and a 10-question quiz. The prompt is the one in the teacher's "abhiddha app" Canvas app.
import { gemini } from './gemini.mjs';

export const AGE_GROUPS = {
  storytellers: { label: 'Storytellers (Ages 5-)', length: 'short (approx 150 words)' },
  explorers: { label: 'Explorers (Ages 6-8)', length: 'medium (approx 300 words)' },
  adventurers: { label: 'Adventurers (Ages 9-11)', length: 'long (approx 450 words)' },
  voyagers: { label: 'Voyagers (Ages 12+)', length: 'detailed (approx 600 words)' },
};
const TONES = {
  storytellers: 'TONE: Very simple, playful, and warm.',
  explorers: 'TONE: Simple, clear, and engaging.',
  adventurers: 'TONE: Conversational and descriptive.',
  voyagers: 'TONE: Mature, reflective, and detailed.',
};
const SYSTEM = 'You are an expert curriculum developer. You strictly return JSON. You ALWAYS include the exact image filenames from the source text into your generated text.';

const parseJson = (text) => JSON.parse(String(text).replace(/^```json\s*|\s*```$/g, '').trim());

const problemsOf = (v, imageNames) => {
  const p = [];
  if (!v || typeof v !== 'object') return ['not an object'];
  if (!v.englishTitle) p.push('no englishTitle');
  if (!v.burmese || !v.english) p.push('missing the burmese or english text');
  if (!Array.isArray(v.discussionQuestions) || v.discussionQuestions.length !== 10) p.push('there must be exactly 10 discussion questions');
  const qs = v.quiz && v.quiz.questions;
  if (!Array.isArray(qs) || qs.length !== 10) p.push('the quiz must have exactly 10 questions');
  else qs.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length !== 4) p.push(`quiz question ${i + 1} needs exactly 4 options`);
    else if (!Number.isInteger(q.correctAnswerIndex) || q.correctAnswerIndex < 0 || q.correctAnswerIndex > 3) p.push(`quiz question ${i + 1} has no valid correctAnswerIndex`);
  });
  const missing = imageNames.filter(n => !String(v.burmese || '').includes(n) || !String(v.english || '').includes(n));
  if (missing.length) p.push(`the picture names ${missing.join(', ')} are missing from the text`);
  return p;
};

export async function makeVariant(key, title, content, group) {
  const conf = AGE_GROUPS[group];
  const imageNames = [...String(content).matchAll(/\b\d{4,6}\.(?:png|jpg|jpeg)\b/gi)].map(m => m[0]);
  const base = `
    Base Title: "${title}"
    Base Content: "${content}"

    INSTRUCTIONS FOR AGE GROUP: ${group} (${conf.label})
    1. Analyze the Base Content for image filenames (e.g., 000101.png) AND LINKS (e.g., YouTube URLs).
    2. Generate a version of this lesson. Length: ${conf.length}. ${TONES[group]}
    3. Provide an "englishTitle" and 10 "discussionQuestions" in English.
    4. PRESERVE LINKS. Use formatting: **bold**, *italics*, ==highlight==.
    5. CRITICAL: Split the content into paragraphs. You MUST insert exactly one image filename from the Base Content after EACH paragraph in BOTH the burmese and english text. DO NOT SKIP IMAGES.
    6. Generate EXACTLY 10 multiple-choice questions for the quiz (English Only). Each question MUST have EXACTLY 4 options.
    7. IMPORTANT LANGUAGE RULE: Use very simple language appropriate for children. Strictly minimize the use of complex Pali words or difficult vocabulary in the Burmese text.

    Respond strictly with this JSON structure:
    {
        "englishTitle": "string",
        "burmese": "string (with image filenames interspersed)",
        "english": "string (with image filenames interspersed)",
        "discussionQuestions": ["string", "string", "string", "string", "string", "string", "string", "string", "string", "string"],
        "quiz": {
          "questions": [
            {
              "question": "string",
              "options": ["string", "string", "string", "string"],
              "correctAnswerIndex": 0
            }
          ]
        }
    }
    `;
  let problems = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const fix = attempt === 0 ? '' : `\n\nYour previous answer was rejected because ${problems.join('; ')}. Write the whole JSON again and fix this.`;
    let v = null;
    try {
      v = parseJson(await gemini(key, {
        contents: [{ parts: [{ text: base + fix }] }],
        systemInstruction: { parts: [{ text: SYSTEM }] },
        generationConfig: { responseMimeType: 'application/json' },
      }));
    } catch (e) { problems = ['the answer was not valid JSON']; continue; }
    problems = problemsOf(v, imageNames);
    if (!problems.length) return v;
  }
  throw new Error(`${group}: ${problems.slice(0, 3).join('; ')}`);
}
