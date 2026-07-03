import { getSettings } from '@/lib/data';
import ContactClient from './contact-client';

export const metadata = {
  title: "Contact Glory Adeniran | Hire a Product Designer & Developer",
  description: "Get in touch with Glory Adeniran for project inquiries, visual identity design, custom web design, mobile UI/UX, or frontend coding services.",
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const settingsData = await getSettings();
  return <ContactClient initialSettings={settingsData} />;
}
