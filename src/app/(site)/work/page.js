import { getProjects } from '@/lib/data';
import WorkClient from './work-client';

export const metadata = {
  title: "Design Portfolio & Case Studies | Glory Adeniran",
  description: "Explore the branding designs, custom website layouts, graphics packaging, and mobile application UI/UX projects designed by Glory Adeniran.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WorkPage() {
  const projectsData = await getProjects();
  return <WorkClient initialData={projectsData} />;
}
