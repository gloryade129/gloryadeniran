'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectEngagement({ projectId, projectTitle }) {
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Comment input state
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Like email modal state (for visitors who haven't subscribed yet)
  const [isLikeModalOpen, setIsLikeModalOpen] = useState(false);
  const [likeName, setLikeName] = useState('');
  const [likeEmail, setLikeEmail] = useState('');
  const [likeError, setLikeError] = useState('');

  // Share popover state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check locally saved subscriber
    const localEmail = localStorage.getItem('glory_subscriber_email') || '';
    const localName = localStorage.getItem('glory_subscriber_name') || '';
    setSavedEmail(localEmail);
    if (localName) setAuthorName(localName);
    if (localEmail) setAuthorEmail(localEmail);

    // Check if user already liked this project in this browser
    const localLiked = localStorage.getItem(`glory_liked_${projectId}`);
    if (localLiked) setHasLiked(true);

    // Fetch live engagement data from API
    fetch(`/api/projects/engagement?projectId=${encodeURIComponent(projectId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLikes(data.likes || 0);
          setComments(data.comments || []);
        }
      })
      .catch((err) => console.warn('Failed to load engagement:', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Handle Like Click
  const handleLikeClick = async () => {
    if (hasLiked) return;

    // If visitor has no saved email, prompt them first
    if (!savedEmail) {
      setIsLikeModalOpen(true);
      return;
    }

    // Otherwise record like directly
    await submitLike(savedEmail, authorName);
  };

  const submitLike = async (emailToUse, nameToUse) => {
    try {
      const res = await fetch('/api/projects/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'like',
          email: emailToUse,
          name: nameToUse,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLikes(data.likes);
        setHasLiked(true);
        localStorage.setItem(`glory_liked_${projectId}`, 'true');
        if (emailToUse) {
          localStorage.setItem('glory_subscriber_email', emailToUse);
          setSavedEmail(emailToUse);
        }
        if (nameToUse) localStorage.setItem('glory_subscriber_name', nameToUse);
        setIsLikeModalOpen(false);
      }
    } catch (err) {
      console.warn('Like submission error:', err);
    }
  };

  const handleLikeModalSubmit = (e) => {
    e.preventDefault();
    if (!likeEmail || !likeEmail.includes('@')) {
      setLikeError('Please enter a valid email address');
      return;
    }
    submitLike(likeEmail.trim().toLowerCase(), likeName.trim());
  };

  // Handle Share Click
  const handleShareClick = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = projectTitle || 'Glory Adeniran Design';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out ${title} by Glory Adeniran:`,
          url,
        });
        return;
      } catch (e) {}
    }

    setIsShareOpen(!isShareOpen);
  };

  const copyShareLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const emailToSubmit = savedEmail || authorEmail.trim().toLowerCase();
    if (!emailToSubmit || !emailToSubmit.includes('@')) {
      alert('Please enter your email address just for the record.');
      return;
    }

    setSubmittingComment(true);

    try {
      const res = await fetch('/api/projects/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'comment',
          name: authorName.trim() || 'Anonymous Scholar',
          email: emailToSubmit,
          text: commentText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.comment) {
        setComments([data.comment, ...comments]);
        setCommentText('');

        // Save email & name locally
        localStorage.setItem('glory_subscriber_email', emailToSubmit);
        setSavedEmail(emailToSubmit);
        if (authorName.trim()) {
          localStorage.setItem('glory_subscriber_name', authorName.trim());
        }
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <section 
      style={{ 
        marginTop: '64px', 
        paddingTop: '48px', 
        borderTop: '1px solid var(--border)',
        position: 'relative'
      }}
    >
      {/* ── ENGAGEMENT ACTION BAR ── */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '40px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Like Button */}
          <button
            onClick={handleLikeClick}
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: hasLiked ? 'rgba(239, 68, 68, 0.15)' : 'var(--chip-bg, rgba(255, 255, 255, 0.05))',
              border: hasLiked ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
              color: hasLiked ? '#EF4444' : 'var(--white, #F8FAFC)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'var(--font)',
              transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            <motion.span
              animate={hasLiked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
              style={{ fontSize: '16px' }}
            >
              {hasLiked ? '❤️' : '🤍'}
            </motion.span>
            <span>{likes} {likes === 1 ? 'Like' : 'Likes'}</span>
          </button>

          {/* Share Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleShareClick}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '9999px',
                background: 'var(--chip-bg, rgba(255, 255, 255, 0.05))',
                border: '1px solid var(--border)',
                color: 'var(--white, #F8FAFC)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'var(--font)',
                transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
              }}
            >
              <span>↗</span>
              <span>Share Project</span>
            </button>

            {/* Share Popover Menu */}
            <AnimatePresence>
              {isShareOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    zIndex: 50,
                    width: '240px',
                    background: 'var(--bg-surface, #131B2E)',
                    border: '1px solid var(--border-md, rgba(255, 255, 255, 0.15))',
                    borderRadius: '20px',
                    padding: '8px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <button
                    onClick={copyShareLink}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--white, #F8FAFC)',
                      fontSize: '13px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--chip-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{copied ? '✓ Link Copied!' : 'Copy Link'}</span>
                    <span style={{ fontSize: '11px', color: 'var(--gray-2)' }}>🔗</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Check out ${projectTitle || 'this project'} by Glory Adeniran: ` + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--white, #F8FAFC)',
                      fontSize: '13px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--chip-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>Share on WhatsApp</span>
                    <span>💬</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${projectTitle || 'this design'} by @gloryadeniran129: ` + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--white, #F8FAFC)',
                      fontSize: '13px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--chip-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>Share on X (Twitter)</span>
                    <span>🐦</span>
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Comment Count Badge */}
        <div style={{ color: 'var(--gray-2, #94A3B8)', fontSize: '13px', fontFamily: 'var(--mono)' }}>
          💬 {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </div>
      </div>

      {/* ── COMMENT SUBMISSION FORM ── */}
      <div 
        style={{
          background: 'var(--bg-card, rgba(16, 24, 44, 0.72))',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '28px 24px',
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>💬</span>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Join the Discussion</h3>
        </div>

        <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* If visitor is not yet subscribed, request name & email */}
          {!savedEmail ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <input
                  type="text"
                  placeholder="Your Name (e.g. Samuel)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: 'var(--chip-bg, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border)',
                    color: 'var(--white, #fff)',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  placeholder="Your Email (just for the record)"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: 'var(--chip-bg, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border)',
                    color: 'var(--white, #fff)',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--gray-2, #94A3B8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✓ Commenting as</span>
              <strong style={{ color: 'var(--white, #fff)' }}>{authorName || savedEmail.split('@')[0]}</strong>
              <span>({savedEmail})</span>
            </div>
          )}

          <textarea
            required
            rows={3}
            placeholder="What do you think about this project? Share your critique, feedback, or impressions..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: '16px',
              background: 'var(--chip-bg, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--border)',
              color: 'var(--white, #fff)',
              fontSize: '14px',
              fontFamily: 'var(--font)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: '1.6',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--gray-2)', fontFamily: 'var(--mono)' }}>
              * Email is recorded so Glory can reply &amp; update you on new drops.
            </span>
            <button
              type="submit"
              disabled={submittingComment}
              className="shiny-cta"
              style={{ height: '42px', padding: '0 24px', fontSize: '13px' }}
            >
              <span>{submittingComment ? 'Posting...' : 'Post Comment →'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── COMMENTS LIST ── */}
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-1)', marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
          Community Thoughts ({comments.length})
        </h4>

        {comments.length === 0 ? (
          <div 
            style={{ 
              padding: '36px 20px', 
              textAlign: 'center', 
              background: 'var(--chip-bg)', 
              borderRadius: '20px', 
              border: '1px dashed var(--border)',
              color: 'var(--gray-2)'
            }}
          >
            <p style={{ margin: 0, fontSize: '14px' }}>
              No comments yet. Be the first to share your feedback with Glory! ✦
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {comments.map((cmt) => (
              <div
                key={cmt.id}
                style={{
                  padding: '20px',
                  borderRadius: '20px',
                  background: 'var(--bg-card, rgba(16, 24, 44, 0.6))',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  gap: '14px',
                }}
              >
                {/* Avatar initial circle */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563EB 0%, #0091FF 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {(cmt.name || 'A')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--white, #F8FAFC)' }}>
                      {cmt.name || 'Anonymous Scholar'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-2)', fontFamily: 'var(--mono)' }}>
                      {cmt.created_at ? new Date(cmt.created_at).toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-1, #CBD5E1)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {cmt.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LIKE EMAIL MODAL (for first-time likers) ── */}
      <AnimatePresence>
        {isLikeModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backgroundColor: 'rgba(10, 14, 23, 0.7)',
              backdropFilter: 'blur(10px)',
            }}
            onClick={() => setIsLikeModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                width: '100%',
                maxWidth: '420px',
                background: 'var(--bg-surface, #131B2E)',
                border: '1px solid var(--border-md)',
                borderRadius: '24px',
                padding: '32px 28px',
                textAlign: 'center',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>❤️</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px' }}>
                Leave Your Mark!
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--gray-2)', lineHeight: '1.6', margin: '0 0 20px' }}>
                Please enter your email so your support is recorded for the project. You'll also receive updates when Glory launches new work.
              </p>

              <form onSubmit={handleLikeModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={likeName}
                  onChange={(e) => setLikeName(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: 'var(--chip-bg)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <input
                  type="email"
                  required
                  placeholder="Your Email Address"
                  value={likeEmail}
                  onChange={(e) => setLikeEmail(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: 'var(--chip-bg)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {likeError && <div style={{ color: '#EF4444', fontSize: '12px' }}>{likeError}</div>}
                
                <button type="submit" className="shiny-cta" style={{ height: '44px', width: '100%', marginTop: '6px' }}>
                  <span>Confirm &amp; Like Project ❤️</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLikeModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gray-2)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
