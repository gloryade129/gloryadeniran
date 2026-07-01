import { getSettings } from '@/lib/data';
import ContactClient from './contact-client';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const settingsData = await getSettings();
  return <ContactClient initialSettings={settingsData} />;
}
