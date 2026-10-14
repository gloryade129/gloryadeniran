/**
 * src/name-extractor.js
 * Intelligent Contact Name Extraction Engine for God's Virtue
 * 
 * Accurately extracts a member's real name when they respond to welcome prompts,
 * introduce themselves in DMs or groups, and formats it cleanly for contact storage.
 */

const COMMON_FILLERS = new Set([
  'hi', 'hello', 'hey', 'amen', 'hallelujah', 'ok', 'okay', 'yes', 'no',
  'yeah', 'yep', 'nope', 'thanks', 'thank you', 'good morning', 'good afternoon',
  'good evening', 'good day', 'praise god', 'bless you', 'welcome', 'ping',
  'help', 'admin', 'bot', 'cool', 'alright', 'sure', 'fine', 'who are you',
  'who is this', 'what is this', 'lol', 'haha', 'lmao', 'bye', 'good night', 'status',
  'morning', 'evening', 'afternoon', 'night', 'true', 'false', 'done',
  'oh', 'ohh', 'ohhh', 'yes ooo', 'yes o', 'abeg', 'bro', 'boss', 'scholar',
  'balling', 'pissed', 'now am balling', 'antigravity', 'gods virtue', "god's virtue"
]);

const NON_NAME_WORDS = new Set([
  'the', 'at', 'with', 'from', 'for', 'in', 'on', 'to', 'of', 'and', 'but',
  'or', 'so', 'yet', 'nor', 'yes', 'no', 'amen', 'ooo', 'o', 'oh', 'ohh',
  'ohhh', 'bro', 'boss', 'broda', 'sir', 'ma', 'dear', 'abeg', 'nah', 'guy',
  'guyz', 'man', 'lol', 'haha', 'lmao', 'pissed', 'balling', 'scholar',
  'why', 'what', 'how', 'when', 'who', 'where', 'good', 'bad', 'please',
  'thanks', 'thank', 'now', 'am', 'are', 'is', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'not', 'can', 'could',
  'will', 'would', 'should', 'all', 'any', 'some', 'me', 'my', 'you', 'your',
  'we', 'our', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their',
  'it', 'its', 'this', 'that', 'these', 'those', 'just', 'too', 'very', 'much'
]);

/**
 * Validates whether a candidate string looks like a genuine personal name
 */
function isValidNameCandidate(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim();
  if (clean.length < 2 || clean.length > 35) return false;

  // Must only contain letters, spaces, hyphens, periods, or apostrophes
  if (!/^[A-Za-zÀ-ÿ\s.'-]+$/.test(clean)) return false;

  const lower = clean.toLowerCase();
  if (COMMON_FILLERS.has(lower)) return false;

  // Split into words and verify each word
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return false;

  for (const w of words) {
    const cleanW = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanW || NON_NAME_WORDS.has(cleanW)) return false;
    // Names should start with capital letter or be reasonable
    if (w.length < 2) return false;
  }

  // Should not contain repeated identical characters like "aaaa"
  if (/(.)\1{3,}/.test(clean)) return false;

  return true;
}

/**
 * Formats name with proper title capitalization
 * e.g. "dr. emmanuel adebayo" -> "Dr. Emmanuel Adebayo"
 */
function formatProperName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Preserve special titles like Dr. or titles with punctuation
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Extracts an introduced name from incoming message text
 * 
 * @param {string} text - The raw text of the incoming message
 * @param {boolean} isQuotingBot - Whether this message quotes a bot message (like the welcome prompt)
 * @param {boolean} isDm - Whether this message was sent in a direct 1-on-1 DM
 * @returns {string|null} - The cleanly formatted name, or null if no name detected
 */
export function extractIntroducedName(text = '', isQuotingBot = false, isDm = false) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();

  // Pattern 1: Explicit introduction formulas (e.g. "My name is John", "I am Sarah Williams", "Call me Pastor Emmanuel")
  const explicitPatterns = [
    /^(?:hello|hi|good\s+(?:morning|afternoon|evening)|peace|greetings)?[,\s]*(?:my\s+name\s+is|my\s+names\s+are|my\s+name's)\s+([A-Za-zÀ-ÿ.'-]+(?:\s+[A-Za-zÀ-ÿ.'-]+){0,3})/i,
    /^(?:hello|hi|good\s+(?:morning|afternoon|evening)|peace|greetings)?[,\s]*(?:i\s+am|i'm|im|i\s+be)\s+([A-Za-zÀ-ÿ.'-]+(?:\s+[A-Za-zÀ-ÿ.'-]+){0,3})/i,
    /^(?:call\s+me|you\s+can\s+call\s+me|this\s+is)\s+([A-Za-zÀ-ÿ.'-]+(?:\s+[A-Za-zÀ-ÿ.'-]+){0,3})/i,
    /^(?:name|full\s+name)\s*[:=-]\s*([A-Za-zÀ-ÿ.'-]+(?:\s+[A-Za-zÀ-ÿ.'-]+){0,3})/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (isValidNameCandidate(candidate)) {
        return formatProperName(candidate);
      }
    }
  }

  // Pattern 2: Direct name response (when in DM or directly replying/quoting the bot)
  // E.g., user just replies: "Peter Adebayo", "Grace", "Pastor Bankole"
  if (isDm || isQuotingBot) {
    const words = clean.split(/\s+/);
    if (words.length >= 1 && words.length <= 4) {
      if (isValidNameCandidate(clean)) {
        return formatProperName(clean);
      }
    }
  }

  return null;
}
