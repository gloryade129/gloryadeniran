import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";
import Scene3D from "@/components/Scene3D";
import MusicPlayer from "@/components/MusicPlayer";
import settingsData from "@/data/settings.json";

export default function SiteLayout({ children }) {
  return (
    <>
      {/* Apple liquid glass SVG distortion filter — referenced globally */}
      <svg style={{ display: 'none' }} aria-hidden="true">
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale="120" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

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
