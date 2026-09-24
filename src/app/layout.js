import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "@/resources/custom.css";
import "./globals.css";
import { Providers } from "@/components/once-ui/Providers";

export const metadata = {
  metadataBase: new URL('https://gloryadeniran.cv'),
  title: "Glory Adeniran | Product Designer & Vibe Coder",
  description: "Portfolio of Glory Adeniran - Product Designer and Vibe Coder crafting premium digital experiences through Graphic Design, Web Design, Apps and interactive Front-End.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  openGraph: {
    title: "Glory Adeniran | Product Designer & Vibe Coder",
    description: "Portfolio of Glory Adeniran - Product Designer and Vibe Coder crafting premium digital experiences.",
    url: "https://gloryadeniran.cv",
    siteName: "Glory Adeniran Portfolio",
    images: [
      {
        url: "/images/Put_an_I_watch_to_202606282357.jpeg",
        width: 1200,
        height: 630,
        alt: "Glory Adeniran | Product Designer & Vibe Coder",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glory Adeniran | Product Designer & Vibe Coder",
    description: "Portfolio of Glory Adeniran - Product Designer and Vibe Coder crafting premium digital experiences.",
    images: ["/images/Put_an_I_watch_to_202606282357.jpeg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
        />
        <link rel="stylesheet" href="/api/custom-style.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "Glory Adeniran",
              "jobTitle": "Product Designer & Lead Creative",
              "worksFor": {
                "@type": "Organization",
                "name": "Global Graphics"
              },
              "url": "https://gloryadeniran.cv",
              "sameAs": [
                "https://www.instagram.com/gloryadeniran129/",
                "https://www.facebook.com/adeniranglo/"
              ],
              "image": "https://gloryadeniran.cv/images/Put_an_I_watch_to_202606282357.jpeg",
              "description": "Portfolio of Glory Adeniran - Product Designer and Creative Lead at Global Graphics crafting premium digital experiences through Web Design, Apps and interactive Front-End.",
              "knowsAbout": [
                "Product Design",
                "Graphic Design",
                "UI/UX Design",
                "Web Design",
                "Mobile App Design",
                "Brand Identity",
                "Frontend Development",
                "Vibe Coding"
              ],
              "alumniOf": {
                "@type": "EducationalOrganization",
                "name": "University of Ilorin"
              },
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Ilorin",
                "addressRegion": "Kwara",
                "addressCountry": "NG"
              }
            })
          }}
        />
      </head>
      <body
        data-theme="dark"
        data-brand="blue"
        data-accent="cyan"
        data-neutral="slate"
        data-border="rounded"
        data-surface="translucent"
        data-solid="contrast"
        data-transition="all"
        data-scaling="100"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
