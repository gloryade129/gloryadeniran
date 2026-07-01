import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import ProjectClient from './project-client';

export async function generateStaticParams() {
  const filePath = path.join(process.cwd(), 'src', 'data', 'projects.json');
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const projectsData = JSON.parse(fileContent);
    const allProjects = Object.values(projectsData).flat();
    return allProjects.map((p) => ({ id: p.id }));
  } catch (error) {
    return [];
  }
}

export default async function ProjectDetailPage({ params }) {
  const { id } = await params;
  const filePath = path.join(process.cwd(), 'src', 'data', 'projects.json');
  
  let project = null;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const projectsData = JSON.parse(fileContent);
    const allProjects = Object.values(projectsData).flat();
    project = allProjects.find((p) => p.id === id);
  } catch (error) {
    console.error('Failed to load project details:', error);
  }

  if (!project) {
    notFound();
  }

  return <ProjectClient project={project} />;
}
