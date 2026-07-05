import { getProjects, getSettings } from '@/lib/data';
import HomeClient from './home-client';

export const metadata = {
  title: "Glory Adeniran | Top Product Designer & Graphic Designer in Nigeria",
  description: "Official portfolio of Glory Adeniran. Creative Lead at Global Graphics and top Product Designer in Nigeria. Specializing in mobile app UI/UX, premium branding, graphics, and interactive frontend development.",
  keywords: [
    "Glory Adeniran",
    "Product Designer Nigeria",
    "Graphic Designer Nigeria",
    "UI/UX Designer Nigeria",
    "Graphic Designer in Ilorin",
    "Global Graphics Creative Lead",
    "Vibe Coder Portfolio",
    "Mobile App UI/UX Designer Kwara",
    "Brand Identity Designer Nigeria",
    "Creative Director Nigeria"
  ],
  openGraph: {
    title: "Glory Adeniran | Top Product Designer & Graphic Designer in Nigeria",
    description: "Creative Lead at Global Graphics and top Product Designer in Nigeria. Specializing in mobile app UI/UX, premium branding, graphics, and interactive frontend development.",
    url: "https://gloryadeniran.cv",
    siteName: "Glory Adeniran Portfolio",
    images: [
      {
        url: "/images/og-preview.png",
        width: 1200,
        height: 630,
        alt: "Glory Adeniran | Product Designer & Graphic Designer Nigeria",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const [projectsData, settingsData] = await Promise.all([
    getProjects(),
    getSettings(),
  ]);
  return <HomeClient initialProjects={projectsData} initialSettings={settingsData} />;
}
