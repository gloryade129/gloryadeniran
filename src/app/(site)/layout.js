import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";
import MusicPlayer from "@/components/MusicPlayer";
import AccentColorAnimator from "@/components/AccentColorAnimator";
import settingsData from "@/data/settings.json";

export default function SiteLayout({ children }) {
  return (
    <>
      <AccentColorAnimator />

      <Preloader />
      {/* CSS glow background layers */}
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-glow-2" aria-hidden="true" />
      <SmoothScroll>
        <Navigation />
        <main>
          {children}
        </main>
        <Footer />
      </SmoothScroll>
      {settingsData.musicEnabled && <MusicPlayer />}
    </>
  );
}
