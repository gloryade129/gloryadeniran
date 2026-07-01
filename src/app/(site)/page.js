import { getProjects, getSettings } from '@/lib/data';
import HomeClient from './home-client';

export const revalidate = 0; // Always fetch fresh data — no cache

export default async function Home() {
  const [projectsData, settingsData] = await Promise.all([
    getProjects(),
    getSettings(),
  ]);
  return <HomeClient initialProjects={projectsData} initialSettings={settingsData} />;
}
