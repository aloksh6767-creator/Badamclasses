export default function GlassCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-card/70 p-5 shadow-glow backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

