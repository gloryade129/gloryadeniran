import SurveyWizard from '@/components/beyond-performance/SurveyWizard';
import styles from '@/components/beyond-performance/survey.module.css';

export const metadata = {
  title: 'Beyond Performance: Redefining Prayer & Bible Connection | Glory Adeniran (God\'s Virtue)',
  description: 'An honest, confidential survey exploring spiritual burnout, stopwatch legalism, and returning to genuine fellowship with God in prayer and Scripture study. Free personalized study tracks and guidance.',
  keywords: [
    'prayer burnout',
    'christian prayer legalism',
    'stopwatch prayer pressure',
    'how to pray without guilt',
    'overcoming spiritual exhaustion',
    'bible study for beginners',
    'how to read the bible with joy',
    'talking with God simply',
    'Glory Adeniran',
    'God\'s Virtue',
    'spiritual survey',
  ],
  authors: [{ name: 'Glory Adeniran (God\'s Virtue)', url: 'https://gloryadeniran.cv' }],
  creator: 'Glory Adeniran',
  openGraph: {
    title: 'Beyond Performance: Redefining Prayer & Bible Connection',
    description: 'Break free from prayer burnout, stopwatch timing pressure, and spiritual guilt. Share your honest reflections and receive tailored study plans.',
    url: 'https://gloryadeniran.cv/beyond-performance',
    siteName: 'Glory Adeniran Portfolio',
    images: [
      {
        url: '/images/Put_an_I_watch_to_202606282357.jpeg',
        width: 1200,
        height: 630,
        alt: 'Beyond Performance: Redefining Prayer & Bible Connection · Glory Adeniran',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beyond Performance: Redefining Prayer & Bible Connection',
    description: 'Break free from prayer burnout and stopwatch timing pressure. Return to genuine fellowship with God.',
    images: ['/images/Put_an_I_watch_to_202606282357.jpeg'],
  },
  alternates: {
    canonical: 'https://gloryadeniran.cv/beyond-performance',
  },
};

export default function BeyondPerformancePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SpecialAnnouncement',
    name: 'Beyond Performance: Redefining Prayer & Bible Connection',
    description: 'An honest spiritual survey exploring prayer burnout, legalism, and returning to genuine fellowship with God.',
    url: 'https://gloryadeniran.cv/beyond-performance',
    announcementMarkup: 'Prayer was never designed to be an exhausting performance or a stopwatch endurance test.',
    creator: {
      '@type': 'Person',
      name: 'Glory Adeniran',
      alternateName: "God's Virtue",
      url: 'https://gloryadeniran.cv',
      jobTitle: 'Product Designer & Creative Lead',
    },
  };

  return (
    <div className={styles.pageContainer}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Background Watermark Title */}
      <div className={styles.bgTitle} aria-hidden="true">
        BEYOND<br />PERFORMANCE
      </div>

      <div className={styles.contentWrap}>
        <SurveyWizard />
      </div>
    </div>
  );
}
