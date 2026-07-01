export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--lime)'
    }}>
      <span className="mono" style={{ fontSize: '12px', letterSpacing: '0.1em' }}>LOADING_EXPERIENCE...</span>
    </div>
  );
}
