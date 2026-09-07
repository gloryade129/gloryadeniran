export default function Loading() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '2px',
        background: 'var(--border-md)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'var(--lime)',
          animation: 'shimmerPulse 1.2s infinite ease-in-out',
        }} />
      </div>
      <span className="mono" style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--gray-2)' }}>
        INITIALIZING...
      </span>
      <style>{`
        @keyframes shimmerPulse {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
