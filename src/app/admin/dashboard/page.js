'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { upload } from '@vercel/blob/client';
import styles from './dashboard.module.css';

const isVideoUrl = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');
};

const HoverVideo = ({ src, className, style }) => {
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.warn('Video play failed:', e));
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      playsInline
      loop
      preload="metadata"
      style={style || { width: '100%', height: '100%', objectFit: 'cover' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [projectsData, setProjectsData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [experienceData, setExperienceData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Editor States
  const [editingProject, setEditingProject] = useState(null);
  const [editingExp, setEditingExp] = useState(null);
  
  // AI Reply States
  const [replyingMessage, setReplyingMessage] = useState(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyText, setReplyText] = useState('');

  // AI Assistant States
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "SYSTEM ONLINE.\nHello Admin. I am Antigravity, your dashboard co-pilot. I can modify projects, experience entries, or update settings on your command. What would you like to build or modify today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatKeyConfigured, setChatKeyConfigured] = useState(true);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const docInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  const chatFileInputRef = useRef(null);

  // Check API key configuration on mount
  useEffect(() => {
    fetch('/api/admin/chat')
      .then(res => res.json())
      .then(data => setChatKeyConfigured(data.configured))
      .catch(err => console.error("Error checking assistant key status:", err));
  }, []);

  // Scroll chat window to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading]);

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    const fileToSend = attachedFile;
    
    setChatInput('');
    setAttachedFile(null);
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg, attachment: fileToSend }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: chatHistory.slice(1), // omit the greeting
          message: userMsg,
          fileAttachment: fileToSend
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.configured === false) {
          setChatKeyConfigured(false);
        }
        throw new Error(data.error || "Failed to get reply");
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      
      if (data.actionExecuted) {
        setMessage("Assistant executed site edits...");
        setTimeout(() => setMessage(''), 3000);
        await fetchData(); // reload states from API/Redis
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `[ERROR] — ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
      });
      if (newBlob.url) {
        setAttachedFile({
          url: newBlob.url,
          name: file.name,
          mimeType: file.type
        });
      }
    } catch (err) {
      console.error("Chat file upload failed:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('ga_admin')) {
      router.replace('/admin');
    } else {
      fetchData();
    }
  }, [router]);

  const fetchData = async () => {
    try {
      const [projRes, setRes, expRes, msgRes] = await Promise.all([
        fetch('/api/admin/projects'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/experience'),
        fetch('/api/admin/messages')
      ]);
      setProjectsData(await projRes.json());
      setSettingsData(await setRes.json());
      setExperienceData(await expRes.json());
      setMessages(await msgRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToApi = async (endpoint, data, successMsg) => {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setMessage(successMsg);
        setTimeout(() => setMessage(''), 3000);
        return true;
      }
    } catch (error) {
      console.error(`Error saving to ${endpoint}:`, error);
    } finally {
      setSaving(false);
    }
    return false;
  };

  const handleImageUpload = async (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setSaving(true);
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
      });
      if (newBlob.url) callback(newBlob.url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImageUpload = async (e, callback) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setSaving(true);
      const uploadPromises = files.map(async (file) => {
        const newBlob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/upload',
        });
        return newBlob.url;
      });
      const urls = await Promise.all(uploadPromises);
      callback(urls);
    } catch (error) {
      console.error('Bulk upload failed:', error);
      alert('Bulk upload failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMessage = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      await fetch('/api/admin/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setMessages(messages.filter(m => m.id !== id));
    } catch (err) { console.error(err); }
  };

  const openReplyModal = (msg) => {
    setReplyingMessage(msg);
    setReplySubject(`Re: Project Inquiry — Glory Adeniran`);
    
    // Extract client name and original content details
    const nameMatch = msg.from?.match(/(.*)<(.*)>/);
    const clientName = nameMatch ? nameMatch[1].trim() : (msg.from || 'there');
    const content = msg.content || '';
    
    const projectMatch = content.match(/([^:]+):/);
    const project = projectMatch ? projectMatch[1].trim() : 'Project';
    const body = content.includes(':') ? content.split(':').slice(1).join(':').trim() : content;

    // Set dynamic default draft (Creative Hype mode)
    const defaultDraft = `Yo ${clientName}! Glory here. ✦\n\nHyped that you reached out about cooking up some next-level ${project} magic! I just read your message:\n"${body}"\n\nI'm already brainstorming how we can make this project absolutely stand out. Let's chat on WhatsApp to iron out the details, or let me know a time that works for you to hop on a quick call!\n\nBest,\nGlory`;
    
    setReplyText(defaultDraft);
  };

  const sendReplyEmail = async (e) => {
    e.preventDefault();
    if (!replyingMessage) return;
    const emailMatch = replyingMessage.from?.match(/<([^>]+)>/) || replyingMessage.from?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
    const toEmail = emailMatch ? emailMatch[1] : replyingMessage.from;

    try {
      setSaving(true);
      const res = await fetch('/api/admin/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject: replySubject,
          replyText: replyText,
          originalMessage: replyingMessage.content
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reply');
      }
      setMessage('REPLY DISPATCHED SUCCESSFULLY ✓');
      setTimeout(() => setMessage(''), 3000);
      setReplyingMessage(null);
    } catch (err) {
      console.error(err);
      alert('Error sending reply: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('ga_admin');
    router.push('/admin');
  };

  if (loading || !projectsData || !settingsData) {
    return (
      <div className={styles.page}>
        <div className="grain" aria-hidden="true" />
        <div className={styles.main} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="mono">ESTABLISHING_ENCRYPTED_CONNECTION...</p>
        </div>
      </div>
    );
  }

  const allProjects = Object.values(projectsData).flat();

  return (
    <div className={styles.page}>
      <div className="grain" aria-hidden="true" />

      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={styles.toast}>
            <p className="mono">✓ {message.toUpperCase()}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PROJECT MODAL ── */}
      <AnimatePresence>
        {editingProject && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className="mono">PROJECT_EDITOR</h2>
                <button onClick={() => setEditingProject(null)} className={styles.closeBtn}>✕</button>
              </div>
              <form className={styles.modalContent} onSubmit={(e) => {
                e.preventDefault();
                const newData = { ...projectsData };
                const cat = editingProject.category;
                const proj = editingProject.project;
                if (editingProject.isNew) newData[cat] = [proj, ...newData[cat]];
                else newData[cat] = newData[cat].map(p => p.id === proj.id ? proj : p);
                saveToApi('/api/admin/projects', newData, 'Project Saved').then(ok => {
                  if (ok) {
                    setProjectsData(newData);
                    setEditingProject(null);
                  }
                });
              }}>
                <div className={styles.formGrid}>
                  <div className={styles.settingField}>
                    <label className="mono">TITLE</label>
                    <input className={styles.settingInput} value={editingProject.project.title} onChange={e => setEditingProject({...editingProject, project: {...editingProject.project, title: e.target.value}})} required />
                  </div>
                  <div className={styles.settingField}>
                    <label className="mono">SUBCATEGORY</label>
                    <input className={styles.settingInput} value={editingProject.project.subcategory} onChange={e => setEditingProject({...editingProject, project: {...editingProject.project, subcategory: e.target.value}})} required />
                  </div>
                  <div className={`${styles.settingField} ${styles.fullWidth}`}>
                    <label className="mono">SHORT DESCRIPTION</label>
                    <textarea className={styles.settingInput} style={{ height: '60px' }} value={editingProject.project.description} onChange={e => setEditingProject({...editingProject, project: {...editingProject.project, description: e.target.value}})} required />
                  </div>
                  <div className={`${styles.settingField} ${styles.fullWidth}`}>
                    <label className="mono">DETAILED STORY</label>
                    <textarea className={styles.settingInput} style={{ height: '100px' }} value={editingProject.project.details || ''} onChange={e => setEditingProject({...editingProject, project: {...editingProject.project, details: e.target.value}})} placeholder="Describe the project story, timeline, disciplines, etc." />
                  </div>
                  <div className={styles.settingField}>
                    <label className="mono">COVER (IMAGE / VIDEO)</label>
                    {editingProject.project.image && (
                      <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', border: '1px solid var(--border)' }}>
                        {isVideoUrl(editingProject.project.image) ? (
                          <HoverVideo src={editingProject.project.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Image src={editingProject.project.image} alt="Cover Preview" fill style={{ objectFit: 'cover' }} unoptimized />
                        )}
                        <button 
                          type="button" 
                          onClick={() => setEditingProject({...editingProject, project: {...editingProject.project, image: ''}})} 
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(249, 66, 61, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className={styles.settingInput} value={editingProject.project.image || ''} placeholder="Upload file or paste URL" onChange={e => setEditingProject({...editingProject, project: {...editingProject.project, image: e.target.value}})} />
                      <button type="button" onClick={() => fileInputRef.current.click()} className="btn-secondary">UPLOAD</button>
                    </div>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={(e) => handleImageUpload(e, (path) => setEditingProject({...editingProject, project: {...editingProject.project, image: path}}))} />
                  </div>
                  <div className={styles.settingField}>
                    <label className="mono">MAIN ACTION LINK</label>
                    <input className={styles.settingInput} value={editingProject.project.link || ''} onChange={e => setEditingProject({...editingProject, project: {...editingProject.project, link: e.target.value}})} placeholder="e.g. https://globalgraphics.crevado.com/" />
                  </div>

                  {/* ADDITIONAL GALLERY IMAGES */}
                  <div className={`${styles.settingField} ${styles.fullWidth}`}>
                    <label className="mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>ADDITIONAL GALLERY IMAGES / VIDEOS</span>
                      <button type="button" onClick={() => galleryInputRef.current.click()} className="btn-secondary" style={{ fontSize: '10px', padding: '4px 8px' }}>+ UPLOAD ASSETS</button>
                    </label>
                    <input type="file" ref={galleryInputRef} style={{ display: 'none' }} accept="image/*,video/*" multiple onChange={(e) => handleBulkImageUpload(e, (paths) => {
                      const currentImages = editingProject.project.images || [];
                      setEditingProject({...editingProject, project: {...editingProject.project, images: [...currentImages, ...paths]}});
                    })} />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', marginTop: '10px' }}>
                      {(editingProject.project.images || []).map((imgUrl, idx) => (
                        <div key={idx} style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '80px' }}>
                          {isVideoUrl(imgUrl) ? (
                            <HoverVideo src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Image src={imgUrl} alt="" fill style={{ objectFit: 'cover' }} unoptimized />
                          )}
                          <button type="button" onClick={() => {
                            const filtered = editingProject.project.images.filter((_, i) => i !== idx);
                            setEditingProject({...editingProject, project: {...editingProject.project, images: filtered}});
                          }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(249, 66, 61, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', zIndex: 10 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DOCUMENTS & LINKS */}
                  <div className={`${styles.settingField} ${styles.fullWidth}`}>
                    <label className="mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>DOCUMENTS & LINKS</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => docInputRef.current.click()} className="btn-secondary" style={{ fontSize: '10px', padding: '4px 8px' }}>+ UPLOAD FILE</button>
                        <button type="button" onClick={() => {
                          const currentLinks = editingProject.project.links || [];
                          setEditingProject({...editingProject, project: {...editingProject.project, links: [...currentLinks, { label: 'New Link', url: '' }]}});
                        }} className="btn-secondary" style={{ fontSize: '10px', padding: '4px 8px' }}>+ ADD URL LINK</button>
                      </div>
                    </label>
                    <input type="file" ref={docInputRef} style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      handleImageUpload(e, (path) => {
                        const currentLinks = editingProject.project.links || [];
                        setEditingProject({...editingProject, project: {...editingProject.project, links: [...currentLinks, { label: file.name, url: path }]}});
                      });
                    }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(editingProject.project.links || []).map((lnk, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '8px', alignItems: 'center' }}>
                          <input className={styles.settingInput} style={{ fontSize: '12px' }} value={lnk.label} placeholder="Label (e.g. PDF Guide)" onChange={e => {
                            const updated = [...editingProject.project.links];
                            updated[idx].label = e.target.value;
                            setEditingProject({...editingProject, project: {...editingProject.project, links: updated}});
                          }} required />
                          <input className={styles.settingInput} style={{ fontSize: '12px' }} value={lnk.url} placeholder="URL or File Path" onChange={e => {
                            const updated = [...editingProject.project.links];
                            updated[idx].url = e.target.value;
                            setEditingProject({...editingProject, project: {...editingProject.project, links: updated}});
                          }} required />
                          <button type="button" onClick={() => {
                            const filtered = editingProject.project.links.filter((_, i) => i !== idx);
                            setEditingProject({...editingProject, project: {...editingProject.project, links: filtered}});
                          }} className="btn-secondary" style={{ color: '#F9423D', padding: '10px 12px' }}>✕</button>
                        </div>
                      ))}
                      {(editingProject.project.links || []).length === 0 && (
                        <p className="mono" style={{ fontSize: '10px', opacity: 0.5 }}>No documents or links added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" className="shiny-cta" style={{ width: '100%', marginTop: '24px' }} disabled={saving}>
                  {saving ? 'PROCESSING...' : 'SAVE PROJECT'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EXPERIENCE MODAL ── */}
      <AnimatePresence>
        {editingExp && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className="mono">EXPERIENCE_EDITOR</h2>
                <button onClick={() => setEditingExp(null)} className={styles.closeBtn}>✕</button>
              </div>
              <form className={styles.modalContent} onSubmit={(e) => {
                e.preventDefault();
                let newData;
                if (editingExp.isNew) newData = [editingExp.item, ...experienceData];
                else newData = experienceData.map(item => item.id === editingExp.item.id ? editingExp.item : item);
                saveToApi('/api/admin/experience', newData, 'Experience Updated').then(ok => ok && setEditingExp(null));
                setExperienceData(newData);
              }}>
                <div className={styles.formGrid}>
                  <div className={styles.settingField}><label className="mono">ROLE</label><input className={styles.settingInput} value={editingExp.item.role} onChange={e => setEditingExp({...editingExp, item: {...editingExp.item, role: e.target.value}})} required /></div>
                  <div className={styles.settingField}><label className="mono">COMPANY</label><input className={styles.settingInput} value={editingExp.item.company} onChange={e => setEditingExp({...editingExp, item: {...editingExp.item, company: e.target.value}})} required /></div>
                  <div className={styles.settingField}><label className="mono">PERIOD</label><input className={styles.settingInput} value={editingExp.item.period} onChange={e => setEditingExp({...editingExp, item: {...editingExp.item, period: e.target.value}})} required /></div>
                  <div className={`${styles.settingField} ${styles.fullWidth}`}><label className="mono">DESCRIPTION</label><textarea className={styles.settingInput} style={{ height: '80px' }} value={editingExp.item.description} onChange={e => setEditingExp({...editingExp, item: {...editingExp.item, description: e.target.value}})} required /></div>
                </div>
                <button type="submit" className="shiny-cta" style={{ width: '100%', marginTop: '24px' }}>SAVE EXPERIENCE</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── AI REPLY MODAL ── */}
      <AnimatePresence>
        {replyingMessage && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={styles.modal} style={{ maxWidth: '640px' }}>
              <div className={styles.modalHeader}>
                <h2 className="mono">AI_EMAIL_RESPONDER</h2>
                <button onClick={() => setReplyingMessage(null)} className={styles.closeBtn}>✕</button>
              </div>
              <form className={styles.modalContent} onSubmit={sendReplyEmail}>
                
                {/* AI suggestion panel buttons */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                  <p className="mono" style={{ color: 'var(--lime)', fontSize: '10px', marginBottom: '12px', letterSpacing: '0.08em' }}>SELECT_AI_REPLY_VIBE</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ fontSize: '11px', padding: '6px 12px', height: 'auto' }}
                      onClick={() => {
                        const nameMatch = replyingMessage.from?.match(/(.*)<(.*)>/);
                        const clientName = nameMatch ? nameMatch[1].trim() : (replyingMessage.from || 'there');
                        const content = replyingMessage.content || '';
                        const projectMatch = content.match(/([^:]+):/);
                        const project = projectMatch ? projectMatch[1].trim() : 'Project';
                        const body = content.includes(':') ? content.split(':').slice(1).join(':').trim() : content;
                        
                        setReplyText(`Yo ${clientName}! Glory here. ✦\n\nHyped that you reached out about cooking up some next-level ${project} magic! I just read your message:\n"${body}"\n\nI'm already brainstorming how we can make this project absolutely stand out. Let's chat on WhatsApp to iron out the details, or let me know a time that works for you to hop on a quick call!\n\nBest,\nGlory`);
                      }}
                    >
                      🌟 Creative Hype
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ fontSize: '11px', padding: '6px 12px', height: 'auto' }}
                      onClick={() => {
                        const nameMatch = replyingMessage.from?.match(/(.*)<(.*)>/);
                        const clientName = nameMatch ? nameMatch[1].trim() : (replyingMessage.from || 'there');
                        const content = replyingMessage.content || '';
                        const projectMatch = content.match(/([^:]+):/);
                        const project = projectMatch ? projectMatch[1].trim() : 'Project';
                        const body = content.includes(':') ? content.split(':').slice(1).join(':').trim() : content;
                        
                        setReplyText(`Dear ${clientName},\n\nThank you for reaching out. I have reviewed your inquiry regarding the ${project} design request.\n\nYour message details:\n"${body}"\n\nI am confident that we can deliver a premium, high-impact design solution tailored specifically to your goals. Please let me know your availability for a brief introductory call this week, or feel free to message me on WhatsApp to align further.\n\nSincerely,\nGlory Adeniran\nCreative Lead`);
                      }}
                    >
                      💼 Professional
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ fontSize: '11px', padding: '6px 12px', height: 'auto' }}
                      onClick={() => {
                        const nameMatch = replyingMessage.from?.match(/(.*)<(.*)>/);
                        const clientName = nameMatch ? nameMatch[1].trim() : (replyingMessage.from || 'there');
                        const content = replyingMessage.content || '';
                        const projectMatch = content.match(/([^:]+):/);
                        const project = projectMatch ? projectMatch[1].trim() : 'Project';
                        
                        setReplyText(`Hi ${clientName},\n\nThanks for reaching out! Your ideas for the ${project} sound fantastic.\n\nLet's cut through the back-and-forth and jump on a quick 10-minute discovery call to align on details and pricing. \n\nYou can suggest a time that works best for you, or click this link to chat with me instantly on WhatsApp: https://wa.me/2349168047236\n\nLooking forward to working together!\n\nCheers,\nGlory`);
                      }}
                    >
                      ⚡ Quick Call Invitation
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={`${styles.settingField} ${styles.fullWidth}`}>
                    <label className="mono">RECIPIENT EMAIL</label>
                    <input className={styles.settingInput} value={replyingMessage.from} readOnly disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div className={`${styles.settingField} ${styles.fullWidth}`}>
                    <label className="mono">SUBJECT</label>
                    <input className={styles.settingInput} value={replySubject} onChange={e => setReplySubject(e.target.value)} required />
                  </div>
                  <div className={`${styles.settingField} ${styles.fullWidth}`}>
                    <label className="mono">REPLY MESSAGE (EDITABLE)</label>
                    <textarea 
                      className={styles.settingInput} 
                      style={{ height: '220px', resize: 'vertical', lineHeight: '1.6', fontFamily: 'var(--font)' }} 
                      value={replyText} 
                      onChange={e => setReplyText(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <button type="submit" className="shiny-cta" style={{ width: '100%', marginTop: '24px' }} disabled={saving}>
                  {saving ? 'SENDING EMAIL...' : 'SEND REPLY via BREVO →'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarLogo}>GLORY<span style={{ color: 'var(--lime)' }}>.</span></div>
          <nav className={styles.sidebarNav}>
            {[
              { id: 'overview', label: 'OVERVIEW' },
              { id: 'portfolio', label: 'PORTFOLIO' },
              { id: 'experience', label: 'EXPERIENCE' },
              { id: 'home', label: 'HOME_UI' },
              { id: 'inbox', label: 'INBOX', count: messages.length },
              { id: 'profile', label: 'PUBLIC_INFO' },
              { id: 'settings', label: 'ECOSYSTEM' },
              { id: 'assistant', label: 'AI_COCKPIT' },
            ].map(t => (
              <button key={t.id} className={`${styles.navBtn} ${activeTab === t.id ? styles.navBtnActive : ''}`} onClick={() => setActiveTab(t.id)}>
                <span className="mono">{t.label} {t.count > 0 && `(${t.count})`}</span>
              </button>
            ))}
          </nav>
        </div>
        <button className={styles.logoutBtn} onClick={logout}><span className="mono">TERMINATE_SESSION →</span></button>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>{activeTab.replace('_', ' ').toUpperCase()}</h1>
          <div className={styles.liveStatus}><div className="btn-dot" /><span className="mono">V3.0.0_DYNAMIC</span></div>
        </header>

        <div className={styles.content}>
          {activeTab === 'overview' && (
            <>
              <div className={styles.statsGrid}>
                {[
                  { label: 'Projects', value: allProjects.length, tag: 'LIVE', tab: 'portfolio' },
                  { label: 'Inbox', value: messages.length, tag: 'UNREAD', tab: 'inbox' },
                  { label: 'Exp', value: experienceData.length, tag: 'YEARS', tab: 'experience' },
                  { label: 'Status', value: 'OPTIMAL', tag: 'HEALTH', tab: 'settings' },
                ].map(s => (
                  <div 
                    key={s.label} 
                    className={`${styles.statCard} card`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => s.tab && setActiveTab(s.tab)}
                  >
                    <span className="mono" style={{ color: 'var(--gray-2)', fontSize: '10px' }}>{s.tag}</span>
                    <div className={styles.statValue}>{s.value}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className={styles.sectionTitle}><p className="mono">LATEST_MESSAGES</p></div>
              <div className={styles.projectList}>
                {messages.slice(0, 3).map(m => (
                  <div 
                    key={m.id} 
                    className={`${styles.projectRow} card`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveTab('inbox')}
                  >
                    <div className={styles.projectRowInfo}>
                      <p className={styles.projectRowTitle}>{m.content}</p>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--lime)' }}>{m.type} — FROM {m.from}</span>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="mono" style={{ opacity: 0.5 }}>Inbox is empty.</p>}
              </div>
            </>
          )}

          {activeTab === 'portfolio' && (
            <>
              {Object.keys(projectsData).map(cat => {
                const catInfo = settingsData.categories?.find(c => c.key === cat) || { label: cat.replace('_', ' ').toUpperCase() };
                return (
                  <div key={cat} className={styles.catSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <p className="mono" style={{ color: 'var(--lime)' }}>{catInfo.label.toUpperCase()}</p>
                      <button className="btn-secondary" onClick={() => setEditingProject({ category: cat, isNew: true, project: { id: Date.now().toString(), title: '', subcategory: '', description: '', image: '/images/brand.png', link: '', images: [], links: [], details: '' } })}>+ ADD</button>
                    </div>
                    {projectsData[cat].map(p => (
                      <div key={p.id} className={`${styles.projectRow} card`}>
                         <div className={styles.projectRowImg}><Image src={p.image} alt="" fill style={{ objectFit: 'cover' }} /></div>
                         <div className={styles.projectRowInfo}><p>{p.title}</p><span className="mono" style={{ fontSize: '10px', color: 'var(--gray-2)' }}>{p.subcategory}</span></div>
                         <div className={styles.projectRowActions}>
                          <button className="btn-secondary" onClick={() => setEditingProject({ category: cat, isNew: false, project: { details: '', ...p, images: p.images || [], links: p.links || [] } })}>EDIT</button>
                          <button className="btn-secondary" style={{ color: '#F9423D' }} onClick={() => { if(confirm('Delete?')) { const d = {...projectsData}; d[cat] = d[cat].filter(x => x.id !== p.id); setProjectsData(d); saveToApi('/api/admin/projects', d, 'Deleted'); } }}>DEL</button>
                         </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'experience' && (
            <>
              <button className="shiny-cta" style={{ marginBottom: '24px', width: '100%' }} onClick={() => setEditingExp({ isNew: true, item: { id: Date.now().toString(), role: '', company: '', period: '', description: '' } })}>+ ADD EXPERIENCE ENTRY</button>
              <div className={styles.projectList}>
                {experienceData.map(exp => (
                  <div key={exp.id} className={`${styles.projectRow} card`}>
                    <div className={styles.projectRowInfo}><p>{exp.role}</p><span className="mono" style={{ color: 'var(--lime)', fontSize: '10px' }}>{exp.company} | {exp.period}</span></div>
                    <div className={styles.projectRowActions}>
                      <button className="btn-secondary" onClick={() => setEditingExp({ isNew: false, item: {...exp} })}>EDIT</button>
                      <button className="btn-secondary" style={{ color: '#F9423D' }} onClick={() => { if(confirm('Delete?')) { const d = experienceData.filter(x => x.id !== exp.id); setExperienceData(d); saveToApi('/api/admin/experience', d, 'Deleted'); } }}>DEL</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'home' && (
            <div className={styles.formGrid}>
              <div className={`${styles.settingsCard} card`} style={{ gridColumn: 'span 2' }}>
                <p className="mono" style={{ color: 'var(--lime)', marginBottom: '20px' }}>HERO_HEADLINES</p>
                <div className={styles.settingField}><label className="mono">HEADLINE_1</label><input className={styles.settingInput} value={settingsData.hero.headline_1} onChange={e => setSettingsData({...settingsData, hero: {...settingsData.hero, headline_1: e.target.value}})} /></div>
                <div className={styles.settingField}><label className="mono">ROTATING_TEXTS_1 (COMMA_SEPARATED)</label><input className={styles.settingInput} value={settingsData.hero.rotate_1.join(', ')} onChange={e => setSettingsData({...settingsData, hero: {...settingsData.hero, rotate_1: e.target.value.split(',').map(s => s.trim())}})} /></div>
                <div className={styles.settingField}><label className="mono">HEADLINE_2</label><input className={styles.settingInput} value={settingsData.hero.headline_2} onChange={e => setSettingsData({...settingsData, hero: {...settingsData.hero, headline_2: e.target.value}})} /></div>
                <div className={styles.settingField}><label className="mono">ROTATING_TEXTS_2 (COMMA_SEPARATED)</label><input className={styles.settingInput} value={settingsData.hero.rotate_2.join(', ')} onChange={e => setSettingsData({...settingsData, hero: {...settingsData.hero, rotate_2: e.target.value.split(',').map(s => s.trim())}})} /></div>
              </div>
              <div className={`${styles.settingsCard} card`} style={{ gridColumn: 'span 2' }}>
                <p className="mono" style={{ color: 'var(--lime)', marginBottom: '20px' }}>QUICK_STATS</p>
                {settingsData.hero.stats.map((stat, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <input className={styles.settingInput} value={stat.val} onChange={e => {
                      const newStats = [...settingsData.hero.stats];
                      newStats[i].val = e.target.value;
                      setSettingsData({...settingsData, hero: {...settingsData.hero, stats: newStats}});
                    }} />
                    <input className={styles.settingInput} value={stat.label} onChange={e => {
                      const newStats = [...settingsData.hero.stats];
                      newStats[i].label = e.target.value;
                      setSettingsData({...settingsData, hero: {...settingsData.hero, stats: newStats}});
                    }} />
                  </div>
                ))}
              </div>
              <div className={`${styles.settingsCard} card`} style={{ gridColumn: 'span 2' }}>
                <p className="mono" style={{ color: 'var(--lime)', marginBottom: '20px' }}>BOTTOM_CTA</p>
                <div className={styles.settingField}><label className="mono">HEADING</label><input className={styles.settingInput} value={settingsData.cta.heading} onChange={e => setSettingsData({...settingsData, cta: {...settingsData.cta, heading: e.target.value}})} /></div>
                <div className={styles.settingField}><label className="mono">DESCRIPTION</label><input className={styles.settingInput} value={settingsData.cta.text} onChange={e => setSettingsData({...settingsData, cta: {...settingsData.cta, text: e.target.value}})} /></div>
              </div>
              <button className="shiny-cta" style={{ width: '100%', gridColumn: 'span 2' }} onClick={() => saveToApi('/api/admin/settings', settingsData, 'Home UI Updated')}>UPDATE HOME PAGE</button>
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className={styles.projectList}>
              {messages.map(m => {
                const emailMatch = m.from?.match(/<([^>]+)>/) || m.from?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
                const email = emailMatch ? emailMatch[1] : m.from;
                const cleanPhone = m.phone ? m.phone.replace(/[^0-9]/g, '') : '';
                const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

                return (
                  <div key={m.id} className={`${styles.projectRow} card`} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div className={styles.projectRowInfo} style={{ flex: 1 }}>
                        <p style={{ fontSize: '15px', marginBottom: '8px', lineHeight: 1.6 }}>{m.content}</p>
                        <div className="mono" style={{ fontSize: '10px', color: 'var(--gray-2)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span>TYPE: {m.type}</span>
                          <span>FROM: {m.from}</span>
                          {m.phone && <span>PHONE: {m.phone}</span>}
                          <span>DATE: {new Date(m.date).toLocaleString()}</span>
                        </div>
                      </div>
                      <button className="btn-secondary" style={{ color: '#F9423D', alignSelf: 'flex-start' }} onClick={() => deleteMessage(m.id)}>DELETE</button>
                    </div>

                    {m.type === 'PROJECT_INQUIRY' && (
                      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px', flexWrap: 'wrap' }}>
                        <button onClick={() => openReplyModal(m)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>✉ Reply via Email</span>
                        </button>
                        {whatsappUrl && (
                          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#25D366', borderColor: '#25D366' }}>
                            <span>💬 Chat on WhatsApp</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && <p className="mono" style={{ opacity: 0.5, textAlign: 'center', padding: '40px' }}>No messages or requests yet.</p>}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={styles.formGrid}>
              <div className={`${styles.settingsCard} card`} style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                  <div className={styles.profileImg} style={{ borderRadius: '50%' }}>
                    <Image src={settingsData.profile.image} alt="" fill style={{ objectFit: 'contain' }} unoptimized />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="mono" style={{ color: 'var(--gray-2)', fontSize: '10px' }}>PROFILE_AVATAR</p>
                    <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={() => profileInputRef.current.click()}>CHANGE PHOTO</button>
                    <input type="file" ref={profileInputRef} style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (path) => { 
                      const newData = {...settingsData, profile: {...settingsData.profile, image: path}};
                      setSettingsData(newData);
                      saveToApi('/api/admin/settings', newData, 'Profile Photo Updated');
                    })} />
                  </div>
                </div>
              </div>
              <div className={`${styles.settingsCard} card`} style={{ gridColumn: 'span 2' }}>
                <div className={styles.settingField}><label className="mono">DISPLAY_NAME</label><input className={styles.settingInput} value={settingsData.profile.name} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, name: e.target.value}})} /></div>
                <div className={styles.settingField}><label className="mono">ROLE_TITLE</label><input className={styles.settingInput} value={settingsData.profile.title} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, title: e.target.value}})} /></div>
                <div className={styles.settingField}><label className="mono">BIO</label><textarea className={styles.settingInput} style={{ height: '120px' }} value={settingsData.profile.bio} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, bio: e.target.value}})} /></div>
                <button className="shiny-cta" style={{ width: '100%' }} onClick={() => saveToApi('/api/admin/settings', settingsData, 'Profile Updated')}>SAVE CHANGES</button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className={`${styles.settingsCard} card`}>
               <div className={styles.settingField}><label className="mono">EMAIL</label><input className={styles.settingInput} value={settingsData.profile.email} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, email: e.target.value}})} /></div>
               <div className={styles.settingField}><label className="mono">LOCATION</label><input className={styles.settingInput} value={settingsData.profile.location} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, location: e.target.value}})} /></div>
               <div className={styles.settingField}><label className="mono">INSTAGRAM</label><input className={styles.settingInput} value={settingsData.profile.instagram} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, instagram: e.target.value}})} /></div>
               <div className={styles.settingField}><label className="mono">FACEBOOK</label><input className={styles.settingInput} value={settingsData.profile.facebook} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, facebook: e.target.value}})} /></div>
               <div className={styles.settingField}><label className="mono">AVAILABILITY</label><input className={styles.settingInput} value={settingsData.profile.availability} onChange={e => setSettingsData({...settingsData, profile: {...settingsData.profile, availability: e.target.value}})} /></div>
               <div className={styles.settingField} style={{ marginTop: '12px' }}>
                 <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                   <input 
                     type="checkbox" 
                     checked={settingsData.musicEnabled} 
                     onChange={e => setSettingsData({...settingsData, musicEnabled: e.target.checked})}
                     style={{ width: '18px', height: '18px', accentColor: 'var(--lime)' }}
                   />
                   ENABLE_SITE_MUSIC (SPOTIFY_PLAYER)
                 </label>
               </div>
               <div className={styles.field} style={{ marginTop: '20px' }}>
                 <p className="mono" style={{ color: 'var(--lime)', fontSize: '10px', marginBottom: '12px' }}>SERVICES (COMMA_SEPARATED)</p>
                 <textarea className={styles.settingInput} value={settingsData.services.join(', ')} onChange={e => setSettingsData({...settingsData, services: e.target.value.split(',').map(s => s.trim())})} style={{ height: '60px' }} />
               </div>
               <div className={styles.field} style={{ marginTop: '20px' }}>
                 <p className="mono" style={{ color: 'var(--lime)', fontSize: '10px', marginBottom: '12px' }}>TOOLS_ARSENAL (COMMA_SEPARATED)</p>
                 <textarea className={styles.settingInput} value={settingsData.tools.join(', ')} onChange={e => setSettingsData({...settingsData, tools: e.target.value.split(',').map(s => s.trim())})} style={{ height: '80px' }} />
               </div>
               <button className="shiny-cta" style={{ width: '100%', marginTop: '24px' }} onClick={() => saveToApi('/api/admin/settings', settingsData, 'Ecosystem Updated')}>SAVE ECOSYSTEM SETTINGS</button>
            </div>
          )}

          {activeTab === 'assistant' && (
            <div className={styles.assistantContainer}>
              <div className={styles.quickActions}>
                <button type="button" className={styles.quickActionBtn} onClick={() => setChatInput("Show me all current projects")}>LIST_PROJECTS</button>
                <button type="button" className={styles.quickActionBtn} onClick={() => setChatInput("Add a website design project named 'Antigravity Workspace' with description 'Modern workflow builder'")}>ADD_PROJECT_TEMPLATE</button>
                <button type="button" className={styles.quickActionBtn} onClick={() => setChatInput("Change my availability setting to 'OPEN FOR VIBE CODING'")}>SET_AVAILABILITY</button>
                <button type="button" className={styles.quickActionBtn} onClick={() => setChatInput("Update my profile title to 'Creative Agentic Developer'")}>UPDATE_ROLE_TITLE</button>
              </div>

              {!chatKeyConfigured ? (
                <div className={styles.setupCard}>
                  <h3 className={styles.setupTitle}>[API_KEY_REQUIRED] — Configuration Missing</h3>
                  <p className="mono" style={{ fontSize: '12px', color: 'var(--gray-2)', lineHeight: '1.6' }}>
                    Antigravity requires a Google Gemini Developer API Key to process natural language instructions and run workspace updates.
                  </p>
                  <ul className={styles.setupSteps + " mono"} style={{ fontSize: '11px', color: 'var(--gray-2)' }}>
                    <li>Get a free Gemini API Key from the <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>Google AI Studio</a>.</li>
                    <li>Open your project files and locate (or create) a file named <code>.env.local</code> in the root directory.</li>
                    <li>Add the following environment variable to the file:<br />
                      <code style={{ display: 'block', margin: '8px 0', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>GEMINI_API_KEY=your_actual_api_key_here</code>
                    </li>
                    <li>Restart your local development server (or deploy to Vercel and inject it in Environment Variables).</li>
                  </ul>
                  <button type="button" className="shiny-cta" style={{ marginTop: '24px' }} onClick={async () => {
                    const res = await fetch('/api/admin/chat');
                    const d = await res.json();
                    if (d.configured) {
                      setChatKeyConfigured(true);
                      setChatHistory(prev => [...prev, { role: 'assistant', content: "[SYSTEM] — API Key detected! Terminal is fully operational." }]);
                    } else {
                      alert("Still could not find GEMINI_API_KEY. Make sure the development server is restarted after creating .env.local.");
                    }
                  }}>
                    <span>RE-VERIFY CONNECTION</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.chatWindow} ref={chatScrollRef}>
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`${styles.chatMessage} ${msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant}`}>
                        <div className={styles.msgHeader}>
                          <span className="mono">[{msg.role === 'user' ? 'ADMIN_USER' : 'ANTIGRAVITY_AI'}]</span>
                        </div>
                        <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                          {msg.content.split('\n').map((line, li) => {
                            if (line.startsWith('- ') || line.startsWith('* ')) {
                              return <li key={li} className="mono" style={{ marginLeft: '12px', listStyleType: 'square' }}>{line.slice(2)}</li>;
                            }
                            if (line.match(/^\d+\.\s/)) {
                              return <li key={li} className="mono" style={{ marginLeft: '12px' }}>{line}</li>;
                            }
                            return <p key={li} className="mono" style={{ margin: '4px 0' }}>{line}</p>;
                          })}
                          
                          {/* Attached asset preview in message bubble */}
                          {msg.attachment && msg.attachment.mimeType?.startsWith('image/') && (
                            <div className={styles.chatAttachmentBubble}>
                              <img src={msg.attachment.url} alt="" style={{ maxWidth: '240px', maxHeight: '180px', borderRadius: '4px', marginTop: '8px', border: '1px solid var(--border)' }} />
                            </div>
                          )}
                          {msg.attachment && msg.attachment.mimeType?.startsWith('video/') && (
                            <div className={styles.chatAttachmentBubble}>
                              <video src={msg.attachment.url} controls muted style={{ maxWidth: '240px', maxHeight: '180px', borderRadius: '4px', marginTop: '8px', border: '1px solid var(--border)' }} />
                            </div>
                          )}
                          {msg.attachment && !msg.attachment.mimeType?.startsWith('image/') && !msg.attachment.mimeType?.startsWith('video/') && (
                            <div className={styles.chatAttachmentBubble} style={{ marginTop: '8px', fontSize: '11px', opacity: 0.8 }}>
                              📎 {msg.attachment.name}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className={`${styles.chatMessage} ${styles.chatMessageAssistant}`}>
                        <div className={styles.msgHeader}>
                          <span className="mono">[ANTIGRAVITY_AI]</span>
                        </div>
                        <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
                          <span className="mono">THINKING_AND_VIBING</span>
                          <span className={styles.cursorBlink} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attachment Preview Banner */}
                  {attachedFile && (
                    <div className={styles.attachedPreviewBar}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--lime)' }}>
                        📎 ATTACHED: {attachedFile.name} {uploadingFile ? '(UPLOADING...)' : '(READY)'}
                      </span>
                      <button type="button" className={styles.removeAttachBtn} onClick={() => setAttachedFile(null)}>✕</button>
                    </div>
                  )}
                  {uploadingFile && !attachedFile && (
                    <div className={styles.attachedPreviewBar}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--gray-2)' }}>
                        ⚡ UPLOADING FILE TO BLOB STORAGE...
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleSendChat} className={styles.chatInputForm}>
                    <button 
                      type="button" 
                      className={styles.attachBtn} 
                      onClick={() => chatFileInputRef.current.click()} 
                      disabled={chatLoading || uploadingFile}
                      title="Attach Image/Video"
                    >
                      <span>📎</span>
                    </button>
                    <input 
                      type="file" 
                      ref={chatFileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleChatFileUpload} 
                      accept="image/*,video/*" 
                    />
                    
                    <input
                      type="text"
                      className={styles.chatInput}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={uploadingFile ? "Uploading attachment..." : "e.g. Redesign the site theme to dark blue, or use this image to add a project"}
                      disabled={chatLoading || uploadingFile}
                    />
                    <button type="submit" className={styles.chatSendBtn} disabled={chatLoading || uploadingFile || !chatInput.trim()}>
                      <span>EXECUTE →</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
