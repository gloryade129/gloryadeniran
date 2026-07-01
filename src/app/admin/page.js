'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Glory@135';

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (form.user === ADMIN_USER && form.pass === ADMIN_PASS) {
        sessionStorage.setItem('ga_admin', '1');
        router.push('/admin/dashboard');
      } else {
        setError('ACCESS_DENIED — Invalid credentials.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className={styles.page}>
      <div className="grain" aria-hidden="true" />
      <div className={styles.box}>
        <div className={styles.header}>
          <div className="eyebrow" style={{ marginBottom: '24px' }}>
            <span className="eyebrow-bar" />
            <span className="eyebrow-tag">[ADMIN]</span>
            GLORY_ADENIRAN PORTAL
          </div>
          <h1 className={styles.title}>Dashboard<br /><em>Access.</em></h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="user" className="mono">Username</label>
            <input
              id="user"
              type="text"
              autoComplete="username"
              value={form.user}
              onChange={e => setForm(f => ({ ...f, user: e.target.value }))}
              placeholder="admin"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pass" className="mono">Passcode</label>
            <input
              id="pass"
              type="password"
              autoComplete="current-password"
              value={form.pass}
              onChange={e => setForm(f => ({ ...f, pass: e.target.value }))}
              placeholder="••••••••"
              className={styles.input}
              required
            />
          </div>

          {error && (
            <p className={`${styles.error} mono`}>{error}</p>
          )}

          <button type="submit" className={`shiny-cta ${styles.submit}`} disabled={loading}>
            <span>{loading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD →'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
