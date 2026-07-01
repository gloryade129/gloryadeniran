import { getProjects } from '@/lib/data';
import WorkClient from './work-client';

export const revalidate = 0;

export default async function WorkPage() {
  const projectsData = await getProjects();
  return <WorkClient initialData={projectsData} />;
}
