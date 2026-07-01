import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";
import Scene3D from "@/components/Scene3D";
import MusicPlayer from "@/components/MusicPlayer";
import AccentColorAnimator from "@/components/AccentColorAnimator";
import settingsData from "@/data/settings.json";

export default function SiteLayout({ children }) {
  return (
    <>
      <AccentColorAnimator />

      <Preloader />
      {/* Fixed 3D background behind everything */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }}>
        <Scene3D />
      </div>
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
