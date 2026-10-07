'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectCardEngagement({ project }) {
  const projectId = project?.id;
  const projectTitle = project?.title || 'Project';

  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showLikePrompt, setShowLikePrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  // Load engagement & local storage
  useEffect(() => {
    if (!projectId) return;

    // Check local storage for subscriber email & past likes
    try {
      const email = localStorage.getItem('glory_subscriber_email') || '';
      const name = localStorage.getItem('glory_subscriber_name') || '';
      setSavedEmail(email);
      if (name) setAuthorName(name);
      if (email) setAuthorEmail(email);

      const likedProjects = JSON.parse(localStorage.getItem('glory_liked_projects') || '[]');
      if (likedProjects.includes(projectId)) {
        setHasLiked(true);
      }
    } catch (e) {}

    // Fetch initial metrics
    fetch(`/api/projects/engagement?projectId=${encodeURIComponent(projectId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLikes(data.likes || 0);
          setViews(data.views || 0);
          setComments(Array.isArray(data.comments) ? data.comments : []);
        }
      })
      .catch(() => {});

    // Record unique view impression
    try {
      let visitorId = sessionStorage.getItem('glory_visitor_session');
      if (!visitorId) {
        visitorId = 'v_' + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('glory_visitor_session', visitorId);
      }
      fetch('/api/projects/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectTitle,
          action: 'view',
          visitorId,
        }),
      })
        .then(r => r.json())
        .then(res => {
          if (res.views) setViews(res.views);
        })
        .catch(() => {});
    } catch (e) {}
  }, [projectId, projectTitle]);

  // Actual like execution helper
  const performLike = async (email, name) => {
    // Optimistic UI update
    setHasLiked(true);
    setLikes(prev => prev + 1);

    try {
      const res = await fetch('/api/projects/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectTitle,
          action: 'like',
          email: email || '',
          name: name || '',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLikes(data.likes);
        try {
          const likedProjects = JSON.parse(localStorage.getItem('glory_liked_projects') || '[]');
          if (!likedProjects.includes(projectId)) {
            likedProjects.push(projectId);
            localStorage.setItem('glory_liked_projects', JSON.stringify(likedProjects));
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // Handle Like click
  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasLiked) return;

    const email = savedEmail || authorEmail;
    if (!email) {
      // Prompt user for email for the record
      setShowLikePrompt(true);
      return;
    }

    performLike(email, authorName);
  };

  // Confirm Like when email is supplied via prompt
  const handleLikeSubmitWithEmail = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authorEmail || !authorEmail.includes('@')) return;

    const cleanEmail = authorEmail.trim().toLowerCase();
    const cleanName = (authorName || '').trim();

    try {
      localStorage.setItem('glory_subscriber_email', cleanEmail);
      if (cleanName) localStorage.setItem('glory_subscriber_name', cleanName);
    } catch (err) {}

    setSavedEmail(cleanEmail);
    setShowLikePrompt(false);
    performLike(cleanEmail, cleanName);
  };

  // Handle Share click
  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const url = typeof window !== 'undefined' ? `${window.location.origin}/work/${projectId}` : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${projectTitle} · Glory Adeniran`,
          text: `Check out ${projectTitle} by Glory Adeniran`,
          url,
        });
        return;
      } catch (err) {}
    }

    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Toggle comments drawer
  const toggleComments = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCommentsOpen(prev => !prev);
  };

  // Submit new comment
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const email = savedEmail || authorEmail;
      const res = await fetch('/api/projects/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectTitle,
          action: 'comment',
          name: authorName,
          email,
          text: commentText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setCommentText('');

        if (email && !savedEmail) {
          try {
            localStorage.setItem('glory_subscriber_email', email.trim().toLowerCase());
            if (authorName) localStorage.setItem('glory_subscriber_name', authorName.trim());
          } catch (e) {}
          setSavedEmail(email.trim().toLowerCase());
        }
      }
    } catch (err) {
      console.error('Comment submission error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div 
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(12, 17, 29, 0.72)',
        padding: '12px 18px',
        fontSize: '12px',
        color: '#94A3B8',
        borderRadius: '0 0 24px 24px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── METRICS COUNTER ROW (Facebook Header Style) ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '12px',
          color: '#94A3B8',
          fontFamily: 'var(--font, sans-serif)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span 
            style={{ 
              width: '18px', 
              height: '18px', 
              borderRadius: '50%', 
              background: '#2563EB', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
            </svg>
          </span>
          <span style={{ fontWeight: 500, color: hasLiked ? '#60A5FA' : '#CBD5E1' }}>
            {likes} {likes === 1 ? 'Like' : 'Likes'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: '#94A3B8' }}>
          <span 
            onClick={toggleComments}
            style={{ cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.target.style.color = '#F8FAFC'}
            onMouseLeave={(e) => e.target.style.color = '#94A3B8'}
          >
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
          <span>·</span>
          <span>
            {views.toLocaleString()} {views === 1 ? 'view' : 'views'}
          </span>
        </div>
      </div>

      {/* ── ACTION BAR (Facebook Style: Like / Comment / Share) ── */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          paddingTop: '8px',
        }}
      >
        {/* Like Action */}
        <button
          onClick={handleLike}
          type="button"
          style={{
            background: hasLiked ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 10px',
            color: hasLiked ? '#60A5FA' : '#94A3B8',
            fontWeight: 500,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { if (!hasLiked) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
          onMouseLeave={(e) => { if (!hasLiked) e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={hasLiked ? '#3B82F6' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          <span>{hasLiked ? 'Liked' : 'Like'}</span>
        </button>

        {/* Comment Action */}
        <button
          onClick={toggleComments}
          type="button"
          style={{
            background: isCommentsOpen ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 10px',
            color: isCommentsOpen ? '#F8FAFC' : '#94A3B8',
            fontWeight: 500,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          onMouseLeave={(e) => { if (!isCommentsOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Comment</span>
        </button>

        {/* Share Action */}
        <button
          onClick={handleShare}
          type="button"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 10px',
            color: copied ? '#34D399' : '#94A3B8',
            fontWeight: 500,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>{copied ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      {/* ── EMAIL PROMPT FOR LIKE (If visitor hasn't subscribed / entered email yet) ── */}
      <AnimatePresence>
        {showLikePrompt && !savedEmail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              overflow: 'hidden',
              marginTop: '12px',
              padding: '12px 14px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.22)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#93C5FD' }}>
                Record your appreciation
              </span>
              <button 
                type="button" 
                onClick={() => setShowLikePrompt(false)} 
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#CBD5E1', lineHeight: '1.4' }}>
              Please enter your email so your support is credited and recorded. It will only be asked once.
            </p>
            <form onSubmit={handleLikeSubmitWithEmail} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Your Name (optional)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                />
                <input
                  type="email"
                  required
                  placeholder="Your Email (required)"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                </svg>
                <span>Confirm & Like</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INLINE EXPANDABLE COMMENTS FEED (Facebook Style) ── */}
      <AnimatePresence>
        {isCommentsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              overflow: 'hidden',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              marginTop: '10px',
              paddingTop: '12px',
            }}
          >
            {/* Quick Comment Input */}
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {!savedEmail && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Victor)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Your Email (for record)"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  style={{
                    background: commentText.trim() ? '#2563EB' : 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: commentText.trim() ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Comments List */}
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#64748B', fontSize: '11px', fontStyle: 'italic' }}>
                No comments yet. Be the first to share your impression!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                {comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563EB, #38BDF8)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {(c.name || 'A')[0].toUpperCase()}
                    </div>
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        flex: 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '11.5px', color: '#F1F5F9' }}>
                          {c.name || 'Anonymous'}
                        </span>
                        <span style={{ fontSize: '9.5px', color: '#64748B' }}>
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#CBD5E1', lineHeight: '1.5' }}>
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
