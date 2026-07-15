export function GeneratingPulse({ size = 100 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div className="pulse-ring" style={{ width: size, height: size }} />
      <div className="pulse-ring pulse-ring-delay" style={{ width: size, height: size }} />
      <div
        className="pulse-core"
        style={{ width: size * 0.7, height: size * 0.7 }}
      >
        <span style={{ fontSize: size * 0.22 }}>纹韵</span>
      </div>

      <style>{`
        .pulse-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: transparent;
          border-radius: 50%;
          border: 2px solid #1e3a5f;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1e3a5f;
          font-family: 'Ma Shan Zheng', cursive;
          animation: breathe 1.8s ease-in-out infinite;
          z-index: 2;
        }
        .pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid #1e3a5f;
          border-radius: 50%;
          opacity: 0;
          animation: ripple 1.8s ease-out infinite;
        }
        .pulse-ring-delay {
          animation-delay: 0.6s;
        }
        @keyframes breathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
