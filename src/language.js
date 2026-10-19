/**
 * src/language.js
 * Lightweight, dependency-free language detection for the languages the
 * community actually uses: English, Nigerian Pidgin, Yoruba, Hausa and Igbo.
 *
 * This is intentionally heuristic — it is good enough to tell the model
 * "reply in the member's language" without paying for another API call.
 * It never throws and defaults to English when it is unsure.
 */

const LANGUAGE_LABELS = {
  en: 'English',
  pcm: 'Nigerian Pidgin',
  yo: 'Yoruba',
  ha: 'Hausa',
  ig: 'Igbo',
};

// Distinctive phrases carry more weight than single, ambiguous words.
const MARKERS = {
  pcm: {
    phrases: [
      'no wahala', 'how far', 'wetin dey', 'wetin happen', 'abeg', 'make i',
      'make we', 'e don', 'don dey', 'e go', 'no be', 'na so', 'shey',
      'which kind', 'small small', 'sharp sharp', 'person wey', 'wey dey',
      'i wan', 'you wan', 'dem dey', 'una', 'japa', 'gist', 'yarn',
    ],
    words: [
      'dey', 'wetin', 'wahala', 'comot', 'sabi', 'abeg', 'oya', 'pikin',
      'chop', 'waka', 'plenti', 'fit', 'abi', 'biko', 'sha', 'sef',
      'naija', 'okada', 'danfo', 'suya',
    ],
    weightPhrase: 3,
    weightWord: 2,
  },
  yo: {
    phrases: [
      'bawo ni', 'e kaaro', 'e kaasan', 'e kaale', 'e ku ise', 'e ku iro',
      'mo fe', 'mo ni', 'mo wa', 'o da', 'o dabo', 'jowo', 'ma binu',
      'ese gan', 'ore mi', 'omo mi', 'iya mi', 'baba mi', 'kilode', 'kini',
      'tani', 'e jo', 'e se', 'pele', 'jare', 'o ti', 'ko si', 'sugbon',
      'nitori', 'lati', 'pupo', 'dara', 'buru', 'oruko', 'ounje', 'owo mi',
      'ile mi', 'mo dupe', 'e seun', 'e pele', 'kaabo',
    ],
    words: [
      'yoruba', 'abeg', 'sha', 'omo', 'oti', 'wa', 'ni', 'ko', 'pe', 'fun',
      'iya', 'baba', 'ore', 'ile', 'owo', 'ounje', 'omi', 'dara', 'buru',
      'pupo', 'sugbon', 'nitori', 'jare', 'pele', 'bawo', 'kini', 'tani',
      'kilode', 'jowo', 'ese',
    ],
    weightPhrase: 3,
    weightWord: 1,
  },
  ha: {
    phrases: [
      'ina kwana', 'ina wuni', 'barka da', 'don allah', 'na gode', 'nagode',
      'yaya ne', 'me ya', 'ba komai', 'ka ji', 'ki ji', 'ya yi', 'za ka',
      'za mu', 'ina son', 'kana son', 'kina son', 'muna son', 'sannu da',
      'ranka ya', 'allahu', 'malam', 'aboki na', 'yaya kake', 'yaya kike',
    ],
    words: [
      'sannu', 'nagode', 'barka', 'ranka', 'aboki', 'kudi', 'abinci',
      'malam', 'yau', 'gobe', 'gida', 'ruwa', 'yara', 'mata', 'miji',
      'yaya', 'zan', 'kina', 'kana', 'muna', 'ina', 'don', 'allah',
    ],
    weightPhrase: 3,
    weightWord: 1,
  },
  ig: {
    phrases: [
      'kedu ka', 'kedu ihe', 'gini mere', 'achoro m', 'choro m', 'ndewo',
      'daalu', 'imela', 'biko', 'nwanne', 'ndo', 'eziokwu', 'chukwu',
      'nne m', 'nna m', 'ulo m', 'ego m', 'mmiri m', 'nri m', 'anyi',
      'gini', 'ole mgbe', 'ka o', 'na e', 'i mere', 'o mere', 'nke a',
      'nke ahụ', 'nke ahu',
    ],
    words: [
      'ndewo', 'kedu', 'daalu', 'imela', 'biko', 'nwanne', 'chukwu',
      'eziokwu', 'ndo', 'gini', 'nne', 'nna', 'ulo', 'ego', 'mmiri',
      'nri', 'anyi', 'nke', 'ime', 'afo', 'aka', 'isi', 'mba', 'ehee',
      'igbo', 'oyibo',
    ],
    weightPhrase: 3,
    weightWord: 1,
  },
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'are', 'was', 'were', 'this', 'that',
  'with', 'have', 'has', 'had', 'but', 'not', 'can', 'will', 'would', 'should',
  'what', 'when', 'where', 'who', 'how', 'why', 'from', 'they', 'them', 'our',
  'please', 'just', 'like', 'about', 'into', 'than', 'then', 'there', 'here',
]);

function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'’]+/gu, ' ')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects the dominant language of a message.
 * @returns {{ code: string, label: string, score: number, confidence: number }}
 */
export function detectLanguage(text = '') {
  const clean = normalize(text);
  if (!clean) return { code: 'en', label: LANGUAGE_LABELS.en, score: 0, confidence: 0 };

  // Emoji/number-only messages carry no language signal.
  const words = clean.split(' ').filter((w) => w.length > 0);
  if (words.length === 0) {
    return { code: 'en', label: LANGUAGE_LABELS.en, score: 0, confidence: 0 };
  }

  const scores = { pcm: 0, yo: 0, ha: 0, ig: 0 };
  const hits = { pcm: [], yo: [], ha: [], ig: [] };

  for (const [code, config] of Object.entries(MARKERS)) {
    for (const phrase of config.phrases) {
      const phraseRegex = new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
      if (phraseRegex.test(clean)) {
        scores[code] += config.weightPhrase;
        hits[code].push(phrase);
      }
    }
    for (const word of config.words) {
      // Word-boundary check so "ni" does not match inside "night".
      if (new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(clean)) {
        scores[code] += config.weightWord;
        hits[code].push(word);
      }
    }
  }

  // An English-heavy sentence should not be misclassified just because it
  // contains one borrowed word ("abeg" etc.). Count English function words.
  const englishHits = words.filter((w) => STOPWORDS.has(w)).length;
  const totalWords = Math.max(words.length, 1);
  const englishRatio = englishHits / totalWords;

  let best = 'en';
  let bestScore = 0;
  for (const [code, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = code;
      bestScore = score;
    }
  }

  // Require a real signal, and let a strongly English sentence win ties.
  if (bestScore < 2) {
    return { code: 'en', label: LANGUAGE_LABELS.en, score: bestScore, confidence: 0 };
  }
  if (englishRatio > 0.55 && bestScore < 5) {
    return { code: 'en', label: LANGUAGE_LABELS.en, score: bestScore, confidence: 0.3 };
  }

  const confidence = Math.min(1, bestScore / 8);
  return {
    code: best,
    label: LANGUAGE_LABELS[best],
    score: bestScore,
    confidence: Number(confidence.toFixed(2)),
    hits: hits[best].slice(0, 5),
  };
}

/**
 * Builds an always-safe prompt fragment telling the model which language to
 * reply in. Returns '' for English so we do not waste prompt tokens.
 */
export function buildLanguageInstruction(text = '') {
  const { code, label, confidence } = detectLanguage(text);
  if (code === 'en' || confidence < 0.2) return '';

  if (code === 'pcm') {
    return [
      '<language_rules>',
      "The member's latest message is written in Nigerian Pidgin.",
      'Reply in natural, warm Nigerian Pidgin — the way a well-spoken Nigerian would text a friend.',
      'Do not caricature the accent and do not overdo slang. Keep names, Bible references, technical terms and numbers exactly as they are.',
      '</language_rules>',
    ].join('\n');
  }

  return [
    '<language_rules>',
    `The member's latest message is written in ${label}.`,
    `Reply mainly in ${label}, in a natural and respectful tone. You may keep proper names, technical terms and numbers in English where that is clearer.`,
    'If you are not confident about a translation, say it simply rather than guessing.',
    '</language_rules>',
  ].join('\n');
}

/** Exposed for tests. */
export function languageLabel(code) {
  return LANGUAGE_LABELS[code] || LANGUAGE_LABELS.en;
}
