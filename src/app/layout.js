import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const space = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-space"
});
const mono = JetBrains_Mono({ 
  subsets: ["latin"], 
  weight: ['400', '500', '700'],
  variable: "--font-mono"
});

export const metadata = {
  title: "Glory Adeniran | Product Designer & Vibe Coder",
  description: "Portfolio of Glory Adeniran - Product Designer and Vibe Coder crafting premium digital experiences through Graphic Design, Web Design, Apps and interactive Front-End.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${space.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className={space.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
