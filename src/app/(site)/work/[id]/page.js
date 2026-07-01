import { getProjects } from '@/lib/data';
import { notFound } from 'next/navigation';
import ProjectClient from './project-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateStaticParams() {
  try {
    const projectsData = await getProjects();
    const allProjects = Object.values(projectsData).flat();
    return allProjects.map((p) => ({ id: p.id }));
  } catch {
    return [];
  }
}

export default async function ProjectDetailPage({ params }) {
  const { id } = await params;
  let project = null;
  try {
    const projectsData = await getProjects();
    const allProjects = Object.values(projectsData).flat();
    project = allProjects.find((p) => p.id === id);
  } catch (error) {
    console.error('Failed to load project details:', error);
  }

  if (!project) notFound();

  return <ProjectClient project={project} />;
}
