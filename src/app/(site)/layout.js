import Header from "@/components/once-ui/Header";
import Footer from "@/components/once-ui/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";
import MusicPlayer from "@/components/MusicPlayer";
import AccentColorAnimator from "@/components/AccentColorAnimator";
import PageTransition from "@/components/PageTransition";
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
        <Header />
        <main style={{ minHeight: "80vh", paddingTop: "2rem", paddingBottom: "4rem" }}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <Footer />
      </SmoothScroll>
      
      {settingsData.musicEnabled && <MusicPlayer />}
    </>
  );
}
