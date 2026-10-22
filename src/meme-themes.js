/**
 * src/meme-themes.js
 * The public-facing personality: Nigerian educational humour and Christian
 * encouragement, as WhatsApp Status posts.
 *
 * The bot already posts to Status (index.js -> postWhatsAppStatus). What it
 * lacked was a *voice* for those posts: it pulled a random English-language
 * Reddit meme with an unrelated title, which is why it read like a generic
 * account. Here each theme carries
 *
 *   • the subreddits worth pulling an image from,
 *   • a bank of captions written in the owner's own register (Nigerian campus
 *     humour / Christian encouragement), and
 *   • optional image-generation prompts for when no stock image fits.
 *
 * Captions are the point. The image is decoration; the words are what makes
 * people forward it to a class group.
 */

/** Safe, wholesome subreddits. Anything NSFW is rejected downstream. */
export const THEMES = {
  campus: {
    label: 'Nigerian campus humour',
    weight: 3,
    subreddits: ['wholesomememes', 'memes', 'me_irl'],
    captions: [
      "When the lecturer says he won't repeat himself and the whole class suddenly remembers how to read 📚😭",
      'POV: the timetable finally drops and two of your courses are clashing 😩',
      'Me opening the PDF 45 minutes before the exam like it is a Bible verse 🙏📖',
      "Course registration portal: “session timed out”. Me: which session, exactly? 😭",
      'Group project: six members, one laptop, zero shame 💀',
      "Lecturer: “Any question?” Class: silence. After class: 47 questions 😂",
      'When your matric number finally appears on the notice board 🎉🎉',
      'Sleeping through a 7am lecture is a spiritual battle, not a choice 😴',
      'That moment the exam question comes from the one topic you skipped 📖😭',
      'Fees paid ✅ Hostel allocated ❌ Faith activated 🙏',
      "“Submit before 11:59pm” — and it is 11:58pm 😅",
      'The way a 2-unit course can carry 8 units of stress 📚',
      "When the class rep says “the test is next week” and nobody believes him 😂",
      'Reading with your eyes while your mind is at the hostel 🛌📖',
      'Small group chat. Big assignment. One person doing everything 🫠',
    ],
    imagePrompts: [
      'A warm, friendly cartoon of a Nigerian university student surrounded by textbooks at night, humourous but wholesome, flat illustration',
      'A clean flat-illustration meme scene of students in a lecture hall reacting to a surprise test, Nigerian campus setting, warm colours',
    ],
  },

  faith: {
    label: 'Christian encouragement',
    weight: 2,
    subreddits: ['wholesomememes', 'memes'],
    captions: [
      'Grace said yes before you even asked 🙏✨',
      'When the choir hits that key change and heaven leans in 🎶🙌',
      'Me: I will pray for five minutes. Also me: two hours later, still on my knees 🙏',
      'The peace that passes understanding is not the absence of deadlines 😅🙏',
      'God’s timing: always on time, never on my timetable 🕰️🙏',
      'Faith is walking into the exam hall without the past questions 🙏📚',
      'Testimony service: 45 minutes. Me: still standing, still grateful 🙌',
      'Small faith. Big God. That is the whole equation 🙏',
      'He did not bring you this far to leave you at the registration desk 🙏😅',
      'You are not behind. You are being prepared 🕊️',
      'Somebody needs to hear this today: it is already settled in Christ 🙏✨',
      'Your quiet prayers are doing louder work than you think 🕊️',
    ],
    imagePrompts: [
      'A serene flat illustration of sunrise over a Nigerian campus chapel, hopeful and warm, no text',
      'A gentle illustration of open hands lifted in prayer with soft golden light, minimal, no text',
    ],
  },

  wholesome: {
    label: 'General wholesome',
    weight: 1,
    subreddits: ['wholesomememes'],
    captions: [
      'A small reminder to be kind to yourself today 🤍',
      'You showed up. That already counts ✨',
      'Someone out there is grateful you exist today 🙏',
      'Progress, not perfection 🤍',
    ],
    imagePrompts: [
      'A soft, warm, wholesome flat illustration with gentle colours and no text',
    ],
  },
};

/** Themes weighted so campus humour dominates without silencing the rest. */
export function pickTheme(rng = Math.random) {
  const entries = Object.entries(THEMES);
  const totalWeight = entries.reduce((sum, [, t]) => sum + t.weight, 0);
  let roll = rng() * totalWeight;
  for (const [key, theme] of entries) {
    roll -= theme.weight;
    if (roll <= 0) return { key, theme };
  }
  const [key, theme] = entries[entries.length - 1];
  return { key, theme };
}

/** Random image subreddit for a theme. */
export function pickSubreddit(theme, rng = Math.random) {
  const list = theme?.subreddits?.length ? theme.subreddits : ['wholesomememes'];
  return list[Math.floor(rng() * list.length) % list.length];
}

/** Caption for a Status post. */
export function buildCaption(theme, rng = Math.random) {
  const bank = theme?.captions?.length ? theme.captions : THEMES.wholesome.captions;
  return bank[Math.floor(rng() * bank.length) % bank.length];
}

/** Prompt for AI image generation, when enabled. */
export function buildImagePrompt(theme, rng = Math.random) {
  const bank = theme?.imagePrompts?.length ? theme.imagePrompts : THEMES.wholesome.imagePrompts;
  return bank[Math.floor(rng() * bank.length) % bank.length];
}

/**
 * Full plan for one Status post: which theme, which subreddit to pull from,
 * the caption, and an optional generation prompt.
 */
export function planStatusPost({ rng = Math.random } = {}) {
  const { key, theme } = pickTheme(rng);
  return {
    themeKey: key,
    themeLabel: theme.label,
    subreddit: pickSubreddit(theme, rng),
    caption: buildCaption(theme, rng),
    imagePrompt: buildImagePrompt(theme, rng),
  };
}

/** Every subreddit across every theme — handy for health checks and tests. */
export function allSubreddits() {
  const set = new Set();
  for (const theme of Object.values(THEMES)) {
    for (const sub of theme.subreddits) set.add(sub);
  }
  return [...set];
}
