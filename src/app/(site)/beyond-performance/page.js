import SurveyWizard from '@/components/beyond-performance/SurveyWizard';
import styles from '@/components/beyond-performance/survey.module.css';

export const metadata = {
  title: 'Beyond Performance: Redefining Prayer & Bible Connection | Glory Adeniran',
  description: 'An honest, confidential survey exploring spiritual burnout, timing legalism, and returning to genuine fellowship with God in prayer and Scripture study.',
  openGraph: {
    title: 'Beyond Performance: Redefining Prayer & Bible Connection',
    description: 'An honest, confidential survey exploring spiritual burnout, timing legalism, and returning to genuine fellowship with God in prayer and Scripture study.',
    url: 'https://gloryadeniran.cv/beyond-performance',
    siteName: 'Glory Adeniran Portfolio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beyond Performance: Redefining Prayer & Bible Connection',
    description: 'An honest, confidential survey exploring spiritual burnout, timing legalism, and returning to genuine fellowship with God.',
  },
};

export default function BeyondPerformancePage() {
  return (
    <div className={styles.pageContainer}>
      {/* Background Watermark Title matching Glory Adeniran portfolio style */}
      <div className={styles.bgTitle} aria-hidden="true">
        BEYOND<br />PERFORMANCE
      </div>

      <div className={styles.contentWrap}>
        <SurveyWizard />
      </div>
    </div>
  );
}
