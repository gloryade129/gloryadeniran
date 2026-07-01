import { getProjects, getSettings } from '@/lib/data';
import HomeClient from './home-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const [projectsData, settingsData] = await Promise.all([
    getProjects(),
    getSettings(),
  ]);
  return <HomeClient initialProjects={projectsData} initialSettings={settingsData} />;
}
