/**
 * lib/data.js
 * Centralised data-access layer.
 * Reads/writes from Upstash Redis with a graceful fallback
 * to the static JSON files baked into the bundle if Redis is not configured.
 *
 * Required env vars (set in Vercel dashboard + .env.local):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from '@upstash/redis';
import projectsJSON from '@/data/projects.json';
import settingsJSON from '@/data/settings.json';
import experienceJSON from '@/data/experience.json';

const KEYS = {
  projects:   'ga:projects',
  settings:   'ga:settings',
  experience: 'ga:experience',
};

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null; // Not configured — will use static fallback
  }
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function kvGet(key, fallback) {
  const redis = getRedis();
  if (!redis) return fallback;
  try {
    const data = await redis.get(key);
    if (data == null) {
      // First run — seed Redis with the static data from the repo
      await redis.set(key, JSON.stringify(fallback));
      return fallback;
    }
    // Upstash auto-parses JSON strings
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return fallback;
  }
}

async function kvSet(key, data) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export const getProjects   = () => kvGet(KEYS.projects,   projectsJSON);
export const setProjects   = (d) => kvSet(KEYS.projects,   d);

export const getSettings   = () => kvGet(KEYS.settings,   settingsJSON);
export const setSettings   = (d) => kvSet(KEYS.settings,   d);

export const getExperience = () => kvGet(KEYS.experience, experienceJSON);
export const setExperience = (d) => kvSet(KEYS.experience, d);
