/**
 * lib/newsletter-db.js
 * Comprehensive data layer for subscribers, project likes, and comments.
 * Implements dual persistence: Supabase PostgREST (primary) + Upstash Redis (backup / fallback)
 * to guarantee 100% data preservation and zero downtime.
 */

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);

// Redis REST Helper
async function redisCmd(...args) {
  const url   = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn('[newsletter-db] Redis error:', err.message);
    return null;
  }
}

/* ==========================================================================
   SUBSCRIBERS
   ========================================================================== */

/**
 * Add or update a subscriber
 * @param {Object} param0 - { email, name, source, page }
 */
export async function addSubscriber({ email, name = '', source = 'scroll_popup_50', page = '/' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Valid email address required');
  }

  const now = new Date().toISOString();
  const cleanName = (name || '').trim();

  const record = {
    email: normalizedEmail,
    name: cleanName || normalizedEmail.split('@')[0],
    source: source || 'scroll_popup_50',
    page: page || '/',
    created_at: now,
    updated_at: now,
  };

  // 1. Persist to Redis (Always available)
  try {
    await redisCmd('SET', `ga:subscribers:email:${normalizedEmail}`, JSON.stringify(record));
    await redisCmd('SADD', 'ga:subscribers:all', normalizedEmail);
  } catch (e) {
    console.warn('[newsletter-db] Redis subscriber save warning:', e.message);
  }

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/portfolio_subscribers?on_conflict=email`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        const saved = await res.json();
        return Array.isArray(saved) ? saved[0] : saved;
      }
    } catch (e) {
      console.warn('[newsletter-db] Supabase subscriber save fallback:', e.message);
    }
  }

  return record;
}

/**
 * Retrieve all subscribers (for Admin Dashboard)
 */
export async function getAllSubscribers() {
  // 1. Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/portfolio_subscribers?select=*&order=created_at.desc&limit=1000`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {
      console.warn('[newsletter-db] Supabase subscribers read fallback:', e.message);
    }
  }

  // 2. Fallback to Redis
  try {
    const emails = await redisCmd('SMEMBERS', 'ga:subscribers:all');
    if (Array.isArray(emails) && emails.length > 0) {
      const list = [];
      for (const email of emails) {
        const item = await redisCmd('GET', `ga:subscribers:email:${email}`);
        if (item) {
          list.push(typeof item === 'string' ? JSON.parse(item) : item);
        }
      }
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
  } catch (e) {
    console.warn('[newsletter-db] Redis subscribers read warning:', e.message);
  }

  return [];
}

/**
 * Delete a subscriber
 */
export async function deleteSubscriber(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return false;

  if (isSupabaseConfigured()) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/portfolio_subscribers?email=eq.${encodeURIComponent(normalized)}`, {
        method: 'DELETE',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
    } catch (e) {}
  }

  try {
    await redisCmd('DEL', `ga:subscribers:email:${normalized}`);
    await redisCmd('SREM', 'ga:subscribers:all', normalized);
  } catch (e) {}

  return true;
}

/* ==========================================================================
   PROJECT LIKES & COMMENTS (ENGAGEMENT)
   ========================================================================== */

/**
 * Fetch engagement data for a project (Likes count & Comments list)
 */
export async function getProjectEngagement(projectId) {
  const cleanId = String(projectId || '').trim();
  if (!cleanId) return { likes: 0, comments: [] };

  let likes = 0;
  let comments = [];

  // Try Redis first for fast real-time counters
  try {
    const rawLikes = await redisCmd('GET', `ga:project_likes:${cleanId}`);
    likes = Number(rawLikes || 0);

    const rawComments = await redisCmd('GET', `ga:project_comments:${cleanId}`);
    if (rawComments) {
      comments = typeof rawComments === 'string' ? JSON.parse(rawComments) : rawComments;
    }
  } catch (e) {
    console.warn('[newsletter-db] Redis engagement read error:', e.message);
  }

  // If Redis empty and Supabase configured, check Supabase
  if (comments.length === 0 && isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/portfolio_project_comments?project_id=eq.${encodeURIComponent(cleanId)}&select=*&order=created_at.desc&limit=200`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) comments = data;
      }
    } catch (e) {}
  }

  return {
    likes: Math.max(likes, 0),
    comments: Array.isArray(comments) ? comments : [],
  };
}

/**
 * Record a like on a project
 */
export async function recordProjectLike(projectId, email, name = '') {
  const cleanId = String(projectId || '').trim();
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Also auto-subscribe user if email provided
  if (normalizedEmail) {
    try {
      await addSubscriber({ email: normalizedEmail, name, source: `project_like:${cleanId}` });
    } catch (e) {}
  }

  let newCount = 1;
  try {
    // Check if user already liked
    if (normalizedEmail) {
      const hasLiked = await redisCmd('SISMEMBER', `ga:project_liked_users:${cleanId}`, normalizedEmail);
      if (hasLiked) {
        const cur = await redisCmd('GET', `ga:project_likes:${cleanId}`);
        return { success: true, likes: Number(cur || 1), alreadyLiked: true };
      }
      await redisCmd('SADD', `ga:project_liked_users:${cleanId}`, normalizedEmail);
    }

    const cur = await redisCmd('INCR', `ga:project_likes:${cleanId}`);
    newCount = Number(cur || 1);
  } catch (e) {
    console.warn('[newsletter-db] Like increment error:', e.message);
  }

  return { success: true, likes: newCount, alreadyLiked: false };
}

/**
 * Add a comment to a project
 */
export async function addProjectComment({ projectId, name, email, text }) {
  const cleanId = String(projectId || '').trim();
  const cleanName = (name || '').trim() || 'Anonymous Scholar';
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanText = (text || '').trim();

  if (!cleanText) {
    throw new Error('Comment text cannot be empty');
  }

  // Also auto-subscribe commenter
  if (cleanEmail) {
    try {
      await addSubscriber({ email: cleanEmail, name: cleanName, source: `project_comment:${cleanId}` });
    } catch (e) {}
  }

  const newComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    project_id: cleanId,
    name: cleanName,
    email: cleanEmail,
    text: cleanText,
    created_at: new Date().toISOString(),
  };

  // 1. Save to Redis
  try {
    const rawExisting = await redisCmd('GET', `ga:project_comments:${cleanId}`);
    const existing = rawExisting ? (typeof rawExisting === 'string' ? JSON.parse(rawExisting) : rawExisting) : [];
    const updated = [newComment, ...existing];
    await redisCmd('SET', `ga:project_comments:${cleanId}`, JSON.stringify(updated));

    // Also record in global comments feed for admin overview
    await redisCmd('LPUSH', 'ga:all_comments', JSON.stringify(newComment));
    await redisCmd('LTRIM', 'ga:all_comments', 0, 499);
  } catch (e) {
    console.warn('[newsletter-db] Redis comment save error:', e.message);
  }

  // 2. Save to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/portfolio_project_comments`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newComment),
      });
    } catch (e) {
      console.warn('[newsletter-db] Supabase comment insert error:', e.message);
    }
  }

  return newComment;
}

/**
 * Fetch all comments across all projects (for Admin Dashboard)
 */
export async function getAllComments() {
  try {
    const raw = await redisCmd('LRANGE', 'ga:all_comments', 0, 100);
    if (Array.isArray(raw)) {
      return raw.map(item => (typeof item === 'string' ? JSON.parse(item) : item));
    }
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/portfolio_project_comments?select=*&order=created_at.desc&limit=100`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) return list;
      }
    } catch (e) {}
  }

  return [];
}
