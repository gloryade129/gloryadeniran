/**
 * lib/data.js
 * Uses Upstash Redis REST API directly via fetch.
 * No SDK — no serialization quirks, full control.
 *
 * Required env vars (set in Vercel dashboard):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import projectsJSON from '@/data/projects.json';
import settingsJSON from '@/data/settings.json';
import experienceJSON from '@/data/experience.json';

const KEYS = {
  projects:   'ga:projects',
  settings:   'ga:settings',
  experience: 'ga:experience',
};

// Execute any Redis command via the REST API
async function redisCmd(...args) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('UPSTASH env vars not set');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store', // Always skip Next.js fetch cache
  });

  if (!res.ok) throw new Error(`Redis HTTP error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`Redis error: ${data.error}`);
  return data.result;
}

async function kvGet(key, fallback) {
  try {
    const result = await redisCmd('GET', key);
    if (result === null) {
      // Key doesn't exist yet — seed with static JSON
      await redisCmd('SET', key, JSON.stringify(fallback));
      return fallback;
    }
    // result is always a string from Redis; parse it back to object
    return typeof result === 'string' ? JSON.parse(result) : result;
  } catch (err) {
    console.error(`[data.js] kvGet(${key}) failed:`, err.message);
    return fallback; // Graceful fallback to static data
  }
}

async function kvSet(key, data) {
  try {
    await redisCmd('SET', key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`[data.js] kvSet(${key}) failed:`, err.message);
    return false;
  }
}

export const getProjects   = () => kvGet(KEYS.projects,   projectsJSON);
export const setProjects   = (d) => kvSet(KEYS.projects,   d);

export const getSettings   = () => kvGet(KEYS.settings,   settingsJSON);
export const setSettings   = (d) => kvSet(KEYS.settings,   d);

export const getExperience = () => kvGet(KEYS.experience, experienceJSON);
export const setExperience = (d) => kvSet(KEYS.experience, d);
