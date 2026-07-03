import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  let cssContent = '';
  try {
    const settings = await getSettings();
    cssContent = settings?.customCSS || '';
  } catch (err) {
    console.error("Error loading custom CSS:", err);
  }

  return new Response(cssContent, {
    headers: {
      'Content-Type': 'text/css',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600'
    }
  });
}
