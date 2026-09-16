/**
 * lib/survey-segmentation.js
 * Analyzes prayer survey responses to derive a spiritual segment tag
 * and return targeted spiritual next steps and YouVersion tracks.
 */

export const SEGMENTS = {
  PERFORMANCE_BURNOUT: 'PERFORMANCE_BURNOUT',
  GENTLE_REBUILD: 'GENTLE_REBUILD',
  FOUNDATIONAL_STUDY: 'FOUNDATIONAL_STUDY',
  GENERAL_GROWTH: 'GENERAL_GROWTH',
};

export const SEGMENT_METADATA = {
  [SEGMENTS.PERFORMANCE_BURNOUT]: {
    id: SEGMENTS.PERFORMANCE_BURNOUT,
    title: 'Resting Beyond Performance',
    subtitle: 'Releasing Stopwatch Pressure & Returning to Unfiltered Communion',
    coreTheme: 'Freedom from religious legalism and timing expectations',
    scriptureAnchor: 'Matthew 11:28 ("Come to me, all you who are weary and burdened, and I will give you rest.")',
    summary: 'You may be feeling the weight of religious expectations, minimum duration goals, or mental exhaustion. Prayer was never intended as an endurance test against a stopwatch, but as honest fellowship in grace.',
    actionSteps: [
      'Replace duration targets with frequency of small, honest check-ins throughout the day.',
      'Acknowledge physical tiredness directly in prayer without shame or guilt.',
      'Allow silence and resting in God’s presence without demanding words or performance.',
    ],
    youVersionTracks: [
      {
        title: 'Rest For The Weary (Dr. Tony Evans)',
        description: 'A dedicated devotional exploring Jesus’ invitation in Matthew 11:28 to lay down exhausting burdens.',
        url: 'https://www.bible.com/reading-plans/14660',
      },
      {
        title: 'Pray: 14 Daily Moments to Quiet Your Mind',
        description: 'Simple daily reflections and guided prayers to release stopwatch pressure and rest in God’s peace.',
        url: 'https://www.bible.com/reading-plans/39445',
      },
    ],
  },
  [SEGMENTS.GENTLE_REBUILD]: {
    id: SEGMENTS.GENTLE_REBUILD,
    title: 'Gentle Rebuilding of Intimacy',
    subtitle: 'Navigating Dryness, Distance & Sincere Questions',
    coreTheme: 'Rebuilding relational confidence from honest beginnings',
    scriptureAnchor: 'Jeremiah 29:13 ("You will seek me and find me when you seek me with all your heart.")',
    summary: 'Whether you are actively exploring faith or navigating a dry season where God feels distant, honest questions and vulnerable transparency are welcome at the throne of grace.',
    actionSteps: [
      'Speak your doubts and perceived distance plainly to God; He welcomes genuine honesty.',
      'Start with a 2-minute daily rhythm of gratitude rather than an overwhelming commitment.',
      'Remember that God’s presence is anchored in His promise, not fluctuating feelings.',
    ],
    youVersionTracks: [
      {
        title: 'Silent Seasons: Finding God in Dry Times',
        description: 'A 7-day devotional on navigating spiritual dryness and rediscovering peace when God feels distant.',
        url: 'https://www.bible.com/reading-plans/17696',
      },
      {
        title: 'Talking to Jesus: Conversational Prayer',
        description: 'A practical, beginner-friendly guide to building an honest, unhurried relationship with Christ.',
        url: 'https://www.bible.com/reading-plans/14603',
      },
    ],
  },
  [SEGMENTS.FOUNDATIONAL_STUDY]: {
    id: SEGMENTS.FOUNDATIONAL_STUDY,
    title: 'Foundational Scriptural Clarity',
    subtitle: 'Transforming Scripture from a Checklist into Living Bread',
    coreTheme: 'Practical scripture interpretation and contextual understanding',
    scriptureAnchor: 'Psalm 119:105 ("Your word is a lamp for my feet, a light on my path.")',
    summary: 'Reading Scripture can feel daunting when passages seem complex, abstract, or purely routine. Shifting from reading for quantity to reading for clarity brings fresh joy to the Word.',
    actionSteps: [
      'Focus on one small passage or paragraph daily, asking: "What does this reveal about God?"',
      'Leverage modern study tools and accessible translations (such as NLT or ESV study notes).',
      'Keep a brief reflection journal to write down one key observation each day.',
    ],
    youVersionTracks: [
      {
        title: 'BibleProject: How to Read the Bible',
        description: 'A 19-day visual series on understanding biblical design, literary styles, and real-life clarity.',
        url: 'https://www.bible.com/reading-plans/29316',
      },
      {
        title: '21 Days in the Gospel of John (Levi Lusko)',
        description: 'A chapter-by-chapter discovery of Jesus’ life, words, and grace for everyday believers.',
        url: 'https://www.bible.com/reading-plans/4351',
      },
    ],
  },
  [SEGMENTS.GENERAL_GROWTH]: {
    id: SEGMENTS.GENERAL_GROWTH,
    title: 'Deepening Fellowship & Relational Maturity',
    subtitle: 'Nurturing Lifelong Communion and Relational Fruitfulness',
    coreTheme: 'Sustained intimacy and community impact',
    scriptureAnchor: 'Philippians 4:6-7 ("Do not be anxious about anything, but in every situation, present your requests to God.")',
    summary: 'You have an established foundation and desire deeper, more consistent relational communion that overflows into every dimension of daily life and community.',
    actionSteps: [
      'Incorporate listening and meditative prayer alongside verbal petitions.',
      'Anchor your prayer rhythms into everyday routines (walking, driving, resting).',
      'Encourage fellow believers by modeling vulnerability and grace in prayer.',
    ],
    youVersionTracks: [
      {
        title: 'Pray: 14 Daily Moments to Quiet Your Mind',
        description: 'Cultivating unbroken awareness, stillness, and peace in God’s companionship.',
        url: 'https://www.bible.com/reading-plans/39445',
      },
      {
        title: 'Rest For The Weary (Dr. Tony Evans)',
        description: 'Moving from religious routine into deeper spiritual rest and transformative communion.',
        url: 'https://www.bible.com/reading-plans/14660',
      },
    ],
  },
};

/**
 * Derives the assigned segment based on survey data
 * @param {Object} data - Survey submission data
 * @returns {string} - Segment identifier
 */
export function deriveSegment(data = {}) {
  const {
    prayer_friction_points = [],
    prayer_reality = '',
    faith_status = '',
    bible_reading_status = '',
  } = data;

  const frictionList = Array.isArray(prayer_friction_points) ? prayer_friction_points : [];
  const frictionJoined = frictionList.join(' ').toLowerCase();
  const prayerRealityLower = (prayer_reality || '').toLowerCase();
  const faithLower = (faith_status || '').toLowerCase();
  const bibleLower = (bible_reading_status || '').toLowerCase();

  // Rule 1: Performance Burnout
  // Triggered by duration pressure, forced stopwatch routines, mental fatigue/sleepiness, or feeling inadequate
  const hasDurationPressure = frictionJoined.includes('duration') || frictionJoined.includes('minimum');
  const hasRoutineBurnout = frictionJoined.includes('burnout') || 
                            frictionJoined.includes('fatigue') || 
                            prayerRealityLower.includes('burnout') ||
                            prayerRealityLower.includes('exhaustion') ||
                            prayerRealityLower.includes('inconsistent') ||
                            frictionJoined.includes('inadequate');

  if (hasDurationPressure || hasRoutineBurnout) {
    return SEGMENTS.PERFORMANCE_BURNOUT;
  }

  // Rule 2: Gentle Rebuild
  // Triggered by exploring faith, feeling distant/disconnected, or inactive prayer reality
  const isExploringOrDistant = faithLower.includes('exploring') || 
                              faithLower.includes('distant') || 
                              faithLower.includes('disconnected') ||
                              faithLower.includes('dry') ||
                              prayerRealityLower.includes('inactive') ||
                              prayerRealityLower.includes('distance');

  if (isExploringOrDistant) {
    return SEGMENTS.GENTLE_REBUILD;
  }

  // Rule 3: Foundational Study
  // Triggered by difficulty understanding scripture, checklist obligation, or reliance on clips
  const hasBibleStruggle = bibleLower.includes('difficult') || 
                          bibleLower.includes('interpret') || 
                          bibleLower.includes('obligation') || 
                          bibleLower.includes('routine') || 
                          bibleLower.includes('infrequent') ||
                          bibleLower.includes('third-party') ||
                          bibleLower.includes('summaries');

  if (hasBibleStruggle) {
    return SEGMENTS.FOUNDATIONAL_STUDY;
  }

  // Rule 4: General Growth (Default Fallback)
  return SEGMENTS.GENERAL_GROWTH;
}

export function getSegmentMetadata(segmentKey) {
  return SEGMENT_METADATA[segmentKey] || SEGMENT_METADATA[SEGMENTS.GENERAL_GROWTH];
}
