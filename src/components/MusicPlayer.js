'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MusicPlayer.module.css';

const VIBES = [
  { id: 'hits',      playlistId: '37i9dQZF1DXcBW7VeQL7yI', name: 'Christian Hits', mood: '🙌 Praise & Worship', color: '#C9E265' },
  { id: 'gospel',    playlistId: '37i9dQZF1DXcb6CQIjdqKy', name: 'Gospel Hits',    mood: '🔥 Contemporary Gospel', color: '#ff7043' },
  { id: 'lofi',      playlistId: '2I3NsbYB812N5f1nbTXfna', name: 'Lofi Worship',   mood: '🌙 Focus & Prayer',    color: '#80d4ff' },
  { id: 'favorites', playlistId: '3skpbZ2neM3yA2RMwH6WcH', name: 'Gospel Favorites', mood: '🎹 Soulful Praise', color: '#e040fb' },
];

const SUGGESTIONS = [
  { name: 'Oceans (Where Feet May Fail)', artist: 'Hillsong UNITED', id: '2V6tP5R89T06iZ7a72uBfC' },
  { name: 'What A Beautiful Name', artist: 'Hillsong Worship', id: '058G1wH4142f3rK1gS4v2E' },
  { name: '10,000 Reasons', artist: 'Matt Redman', id: '0nk8bY5D4z9zKk2W96e2a2' }
];

export default function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('playlists');
  const [activeIdx, setActiveIdx] = useState(0);
  const [currentSrc, setCurrentSrc] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Request state
  const [requestText, setRequestText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const rand = Math.floor(Math.random() * VIBES.length);
    setActiveIdx(rand);
    setCurrentSrc(`https://open.spotify.com/embed/playlist/${VIBES[rand].playlistId}?utm_source=generator&theme=0`);
    setMounted(true);
    setTimeout(() => setIsOpen(true), 3000);
  }, []);

  const handleSendRequest = async (e) => {
    if (e.key !== 'Enter' || !requestText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SONG_REQUEST',
          content: requestText,
          from: 'Website Guest'
        })
      });
      if (res.ok) {
        setRequestText('');
        alert('Request sent to Glory!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      setCurrentSrc('');
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Wait for state to update then set src
      setTimeout(() => {
        const vibe = VIBES[activeIdx];
        setCurrentSrc(`https://open.spotify.com/embed/playlist/${vibe.playlistId}?utm_source=generator&theme=0`);
      }, 50);
    }
  };

  const playVibe = (i) => {
    setActiveIdx(i);
    setCurrentSrc(`https://open.spotify.com/embed/playlist/${VIBES[i].playlistId}?utm_source=generator&theme=0`);
    setIsPlaying(true);
  };

  const playTrack = (id) => {
    setActiveIdx(-1); // No active vibe
    setCurrentSrc(`https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`);
    setIsPlaying(true);
  };

  if (!mounted) return null;

  const vibe = activeIdx >= 0 ? VIBES[activeIdx] : { name: 'Direct Track', mood: 'Custom', color: '#1DB954' };

  return (
    <div className={styles.wrapper} data-fixed="true">
      {/* Persistent Hidden Iframe (Keeps playing when panel is closed) */}
      <div className={styles.persistentIframe} style={{ 
        display: isPlaying ? 'block' : 'none',
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1
      }}>
        {currentSrc && (
          <iframe
            src={currentSrc}
            width="0"
            height="0"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        )}
      </div>

      {/* Floating pill */}
      <div className={styles.pillGroup}>
        <button 
          className={`${styles.pillControl} ${!isPlaying ? styles.pillPaused : ''}`} 
          onClick={togglePlay}
          title={isPlaying ? "Pause Music" : "Resume Music"}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          className={`${styles.pill} ${isOpen ? styles.pillActive : ''}`}
          onClick={() => setIsOpen(v => !v)}
        >
          <span className={styles.pillIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </span>
          <span className={styles.pillLabel}>
            {isPlaying && isOpen ? <span className={styles.equalizer}><span/><span/><span/><span/></span> : 'PLAYER'}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={styles.panel}
          >
            {/* Header */}
            <div className={styles.panelHeader}>
              <div className={styles.panelTabs}>
                <button className={`${styles.tabBtn} ${activeTab === 'playlists' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('playlists')}>VIBES</button>
                <button className={`${styles.tabBtn} ${activeTab === 'suggested' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('suggested')}>SUGGESTED</button>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
            </div>

            {activeTab === 'playlists' ? (
              <>
                <div className={styles.trackInfo}>
                  <div className={styles.trackViz} style={{ '--track-color': vibe?.color || '#1DB954' }}><div className={styles.orb} /></div>
                  <div><div className={styles.trackTitle}>{vibe?.name}</div><div className={styles.trackMood}>{vibe?.mood}</div></div>
                </div>

                {/* Visible Iframe for interaction */}
                {isPlaying && currentSrc ? (
                  <iframe
                    className={styles.spotifyFrame}
                    src={currentSrc}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.pausedState} onClick={togglePlay}>
                    <p className="mono">MUSIC_PAUSED</p>
                    <span style={{ fontSize: '24px' }}>▶</span>
                  </div>
                )}

                <div className={styles.trackList}>
                  {VIBES.map((v, i) => (
                    <button
                      key={v.id}
                      className={`${styles.trackItem} ${i === activeIdx ? styles.trackItemActive : ''}`}
                      style={{ '--track-color': v.color }}
                      onClick={() => playVibe(i)}
                    >
                      <span className={styles.trackDot} />
                      <div className={styles.trackItemTitle}>{v.name}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.suggestedList}>
                <p className="mono" style={{ fontSize: '9px', color: 'var(--gray-2)', marginBottom: '12px' }}>HANDPICKED_FOR_YOU</p>
                {SUGGESTIONS.map(s => (
                  <div key={s.name} className={styles.suggestedItem}>
                    <div className={styles.suggestedInfo}>
                      <p>{s.name}</p>
                      <span>{s.artist}</span>
                    </div>
                    <button className={styles.playBtn} onClick={() => playTrack(s.id)}>▶</button>
                  </div>
                ))}
                <div className={styles.customSection} style={{ marginTop: '12px' }}>
                  <p className="mono" style={{ fontSize: '9px', color: 'var(--gray-2)' }}>{sending ? 'SENDING...' : 'HAVE_A_REQUEST?'}</p>
                  <input 
                    placeholder="Song name & Press Enter" 
                    className={styles.customInput} 
                    value={requestText}
                    onChange={e => setRequestText(e.target.value)}
                    onKeyDown={handleSendRequest}
                    disabled={sending}
                  />
                </div>
              </div>
            )}

            {currentSrc && (
              <a href={currentSrc.replace('/embed', '').split('?')[0]} target="_blank" rel="noreferrer" className={styles.spotifyLink}>
                OPEN FULL SPOTIFY ↗
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
