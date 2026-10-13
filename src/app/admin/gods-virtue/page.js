'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GodsVirtuePanel from '@/components/admin/GodsVirtuePanel';
import styles from '../dashboard/dashboard.module.css';

export default function GodsVirtueAdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isAuthed = typeof window !== 'undefined' && sessionStorage.getItem('ga_admin');
    if (!isAuthed) {
      router.replace('/admin');
    } else {
      const t = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(t);
    }
  }, [router]);

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--mono)',
        color: 'var(--gray-2)',
        fontSize: 13
      }}>
        Loading admin console...
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarLogo}>
            GLORY<span style={{ color: 'var(--lime)' }}>.</span>
          </div>
          <nav className={styles.sidebarNav}>
            <Link href="/admin/dashboard" className={styles.navBtn}>
              <span className="mono">&larr; BACK TO DASHBOARD</span>
            </Link>
            <div style={{ height: 12 }} />
            <div className={`${styles.navBtn} ${styles.navBtnActive}`}>
              <span className="mono">GOD&apos;S VIRTUE (AI BOT)</span>
            </div>
            <Link href="/admin/beyond-performance" className={styles.navBtn}>
              <span className="mono">BEYOND PERFORMANCE</span>
            </Link>
          </nav>
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem('ga_admin');
            router.replace('/admin');
          }}
          className={styles.logoutBtn}
        >
          <span className="mono">[DISCONNECT]</span>
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <span className={styles.topbarBreadcrumb}>ADMIN / WHATSAPP / GOD&apos;S VIRTUE</span>
            <h1 className={styles.topbarTitle}>
              God&apos;s Virtue <em style={{ fontStyle: 'italic', color: 'var(--lime)', fontWeight: 400 }}>Engine.</em>
            </h1>
          </div>
          <div className={styles.topbarRight}>
            <a
              href="https://gloryadeniran.cv"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.topbarAction}
            >
              <span className="mono">VIEW SITE &nearr;</span>
            </a>
          </div>
        </header>

        <div className={styles.contentArea}>
          <GodsVirtuePanel />
        </div>
      </main>
    </div>
  );
}
