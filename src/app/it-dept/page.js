import { App as ItDeptPortalApp } from '@/components/it-dept/ItDeptPortalApp';
import '@/components/it-dept/it-portal.css';

export const metadata = {
  title: 'IT Department 200L Transition Portal | University of Ilorin (2025-2029 Set)',
  description: 'Official 100L to 200L Academic Retrospective, Class Leadership Review, Committee Recruitments, and Verified Scholar Pass Generator for Information Technology scholars.',
  keywords: [
    'IT Department',
    'Information Technology',
    'University of Ilorin',
    'UNILORIN IT',
    '2025-2029 Set',
    '200 Level Transition',
    'Glory Adeniran',
    'Class Representative',
    'ITSA',
    'Scholar Pass'
  ],
  authors: [{ name: 'Glory Adeniran (Class Rep)', url: 'https://gloryadeniran.cv' }],
  creator: 'Glory Adeniran',
  openGraph: {
    title: 'IT Dept 200L Transition Portal - University of Ilorin',
    description: 'Level up to 200L: Share your 100L reflections, evaluate class leadership, join committees, and generate your official IT Scholar Pass.',
    url: 'https://gloryadeniran.cv/it-dept',
    siteName: 'Information Technology Dept - 2025-2029 Set',
    images: [
      {
        url: 'https://gloryadeniran.cv/itsa-logo.png',
        width: 800,
        height: 800,
        alt: 'ITSA Department Logo - 200L Transition Portal',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'IT Dept 200L Transition Portal - University of Ilorin',
    description: 'Level up to 200L: Share reflections, review leadership, and unlock your 200L Scholar Pass.',
    images: ['https://gloryadeniran.cv/itsa-logo.png'],
  },
  alternates: {
    canonical: 'https://gloryadeniran.cv/it-dept',
  },
};

export default function ItDeptPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Information Technology Department (2025-2029 Set)',
    description: 'Official 100L to 200L Transition Portal and Student Directory System',
    url: 'https://gloryadeniran.cv/it-dept',
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'University of Ilorin',
    },
    founder: {
      '@type': 'Person',
      name: 'Glory Adeniran',
      jobTitle: 'Class Representative',
      url: 'https://gloryadeniran.cv',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ItDeptPortalApp />
    </>
  );
}
