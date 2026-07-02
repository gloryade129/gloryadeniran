import { NextResponse } from 'next/server';

export async function GET() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: 'UPSTASH env vars missing', url: !!url, token: !!token });
  }

  async function cmd(...args) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
    });
    const data = await res.json();
    return data.result;
  }

  try {
    // Check what keys exist and how many projects are in Redis
    const projectsRaw = await cmd('GET', 'ga:projects');
    let projectCount = 'key not found in Redis';
    let projectTitles = [];

    if (projectsRaw) {
      const parsed = typeof projectsRaw === 'string' ? JSON.parse(projectsRaw) : projectsRaw;
      const all = Object.values(parsed).flat();
      projectCount = all.length;
      projectTitles = all.map(p => p.title);
    }

    return NextResponse.json({
      redis_connected: true,
      ga_projects_key_exists: !!projectsRaw,
      project_count: projectCount,
      project_titles: projectTitles,
    });
  } catch (err) {
    return NextResponse.json({ redis_connected: false, error: err.message });
  }
}
