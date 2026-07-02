'use client';

import { useState } from 'react';
import styles from './contact.module.css';

export default function ContactClient({ initialSettings = {} }) {
  const { profile = {}, services = [] } = initialSettings;
  const [form, setForm] = useState({ name: '', email: '', phone: '', project: '', message: '' });
  const [sent, setSent] = useState(false);

  const [sending, setSending] = useState(false);

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PROJECT_INQUIRY',
          content: `${form.project}: ${form.message}`,
          from: `${form.name} <${form.email}>`,
          phone: form.phone || ''
        })
      });
      setSent(true);
    } catch (err) {
      console.error(err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="grain" aria-hidden="true" />

      <section className={styles.hero}>
        <div className="container">
          <p className="eyebrow">
            <span className="eyebrow-bar" aria-hidden="true" />
            <span className="eyebrow-tag">[CONTACT]</span>
            Let's Work Together
          </p>
          <h1>Start a<br /><em style={{ fontStyle: 'normal', color: 'var(--lime)' }}>Project.</em></h1>
        </div>
      </section>

      <section className={styles.body}>
        <div className={`container ${styles.grid}`}>

          {/* ── Left info ── */}
          <div className={styles.info}>
            <div className={`${styles.infoCard} card`}>
              <p className="mono" style={{ color: 'var(--gray-2)', fontSize: '10px', marginBottom: '20px' }}>AVAILABILITY</p>
              <div className={styles.statusRow}>
                <div className="btn-dot" />
                <span style={{ fontSize: '14px' }}>{profile.availability}</span>
              </div>
              <p style={{ color: 'var(--gray-2)', fontSize: '13px', marginTop: '12px', lineHeight: 1.7 }}>
                Response within 24 hours. Currently based in {profile.location}.
              </p>
            </div>

            <div className={`${styles.infoCard} card`}>
              <p className="mono" style={{ color: 'var(--gray-2)', fontSize: '10px', marginBottom: '20px' }}>SOCIAL & CONTACT</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a href="https://wa.me/2349168047236" target="_blank" rel="noreferrer" className={styles.socialLink} style={{ color: 'var(--lime)', fontWeight: '600' }}>
                  WhatsApp DM ↗
                </a>
                <a href={profile.instagram} target="_blank" rel="noreferrer" className={styles.socialLink}>
                  Instagram ↗
                </a>
                <a href={profile.facebook} target="_blank" rel="noreferrer" className={styles.socialLink}>
                  Facebook ↗
                </a>
              </div>
            </div>

            <div className={`${styles.infoCard} card`}>
              <p className="mono" style={{ color: 'var(--gray-2)', fontSize: '10px', marginBottom: '20px' }}>SERVICES</p>
              {services.map(s => (
                <div key={s} className={styles.serviceRow}>
                  <span className="btn-dot" style={{ width: '4px', height: '4px' }} />
                  <span style={{ fontSize: '13px', color: 'var(--gray-1)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Contact Form ── */}
          <div className={styles.formWrap}>
            {sent ? (
              <div className={`${styles.successMsg} card`}>
                <div className={styles.successIcon}>✦</div>
                <h2>Message Received.</h2>
                <p style={{ color: 'var(--gray-2)', marginTop: '12px', fontSize: '15px' }}>
                  Thank you for reaching out! I'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="card" style={{ marginBottom: '24px', border: '1px solid rgba(0,145,255,0.2)', background: 'rgba(0,145,255,0.02)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: 'var(--white)' }}>Prefer Instant Chat?</h3>
                      <p style={{ fontSize: '11px', color: 'var(--gray-2)' }}>Skip the form and message me directly on WhatsApp for a faster response.</p>
                    </div>
                    <a 
                      href="https://wa.me/2349168047236" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="shiny-cta shiny-cta--compact"
                      style={{ 
                        background: 'var(--lime)', 
                        borderColor: 'var(--lime)',
                        color: 'var(--black)',
                        textDecoration: 'none'
                      }}
                    >
                      <span>WhatsApp DM &nbsp;→</span>
                    </a>
                  </div>
                </div>

                <p className="mono" style={{ color: 'var(--gray-2)', marginBottom: '32px', fontSize: '10px' }}>SEND_MESSAGE</p>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="name" className="mono">Your Name</label>
                    <input id="name" type="text" value={form.name} onChange={update('name')} placeholder="John Doe" className={styles.input} required />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="email" className="mono">Email</label>
                    <input id="email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" className={styles.input} required />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="phone" className="mono">Phone Number (Optional, for WhatsApp reply)</label>
                  <input id="phone" type="tel" value={form.phone || ''} onChange={update('phone')} placeholder="+234..." className={styles.input} />
                </div>

                <div className={styles.field}>
                  <label htmlFor="project" className="mono">Project Type</label>
                  <select id="project" value={form.project} onChange={update('project')} className={styles.input} required>
                    <option value="">Select a service...</option>
                    <option>Graphic Design</option>
                    <option>Website Design</option>
                    <option>App Design</option>
                    <option>Vibe Coding</option>
                    <option>Brand Identity</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="message" className="mono">Message</label>
                  <textarea
                    id="message"
                    rows={6}
                    value={form.message}
                    onChange={update('message')}
                    placeholder="Tell me about your project..."
                    className={styles.input}
                    required
                  />
                </div>

                <button type="submit" className="shiny-cta" style={{ width: '100%', height: '52px', fontSize: '14px' }} disabled={sending}>
                  <span>{sending ? 'Sending...' : 'Send Message →'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
