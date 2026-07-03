import { getProjects } from '@/lib/data';

export default async function sitemap() {
  const baseUrl = 'https://gloryadeniran.cv';

  // Base routes
  const routes = [
    '',
    '/about',
    '/work',
    '/experience',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'monthly',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Dynamic project routes
  try {
    const projects = await getProjects().catch(() => []);
    // Projects is structured by categories, let's extract all project items
    const allProjects = Object.values(projects).flat();
    
    const projectRoutes = allProjects.map((project) => ({
      url: `${baseUrl}/work/${project.id}`,
      lastModified: new Date().toISOString().split('T')[0],
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
    
    return [...routes, ...projectRoutes];
  } catch (e) {
    console.error("Error generating dynamic sitemap:", e);
    return routes;
  }
}
