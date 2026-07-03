import { getProjects } from '@/lib/data';
import { notFound } from 'next/navigation';
import ProjectClient from './project-client';

export async function generateMetadata({ params }) {
  const { id } = await params;
  let project = null;
  try {
    const projectsData = await getProjects();
    const allProjects = Object.values(projectsData).flat();
    project = allProjects.find((p) => p.id === id);
  } catch (error) {
    console.error('Failed to load project details for metadata:', error);
  }

  if (!project) return { title: 'Project Overview | Glory Adeniran' };

  return {
    title: `${project.title} | Glory Adeniran Case Study`,
    description: project.description ? project.description.substring(0, 155) + '...' : `Detailed overview for ${project.title} designed by Glory Adeniran.`,
    openGraph: {
      title: `${project.title} | Glory Adeniran Case Study`,
      description: project.description ? project.description.substring(0, 155) + '...' : `Detailed overview for ${project.title} designed by Glory Adeniran.`,
      images: project.image ? [{ url: project.image }] : [],
    }
  };
}

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
