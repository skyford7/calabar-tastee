import { PageHeader } from "../ui";

/** Center Net is paused: show an animated maintenance screen until it is switched back on. */
export function CenterNetPage() {
  return (
    <div>
      <PageHeader title="Center Net" description="Team announcements and updates" />
      <div className="relative flex min-h-[26rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-900/30 bg-[#1a1410] px-6 py-16 text-center">
        <style>{`
          @keyframes cn-spin { to { transform: rotate(360deg); } }
          @keyframes cn-spin-rev { to { transform: rotate(-360deg); } }
          @keyframes cn-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes cn-dot { 0%,80%,100% { opacity: .2; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.15); } }
          @keyframes cn-glow { 0%,100% { opacity: .25; } 50% { opacity: .6; } }
          @media (prefers-reduced-motion: reduce) { .cn-anim { animation: none !important; } }
        `}</style>
        <div className="cn-anim pointer-events-none absolute h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" style={{ animation: "cn-glow 4s ease-in-out infinite" }} />
        <div className="relative mb-8 h-32 w-32" style={{ animation: "cn-float 3.5s ease-in-out infinite" }}>
          <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Maintenance in progress">
            <g className="cn-anim" style={{ transformOrigin: "50px 50px", animation: "cn-spin 8s linear infinite" }}>
              <circle cx="50" cy="50" r="30" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="10 7.5" />
              <circle cx="50" cy="50" r="22" fill="#1a1410" />
            </g>
            <g className="cn-anim" style={{ transformOrigin: "50px 50px", animation: "cn-spin-rev 5s linear infinite" }}>
              <circle cx="50" cy="50" r="13" fill="none" stroke="#fbbf24" strokeWidth="5" strokeDasharray="6 4.5" />
            </g>
            <circle cx="50" cy="50" r="4" fill="#f59e0b" />
          </svg>
        </div>
        <h2 className="relative text-2xl font-bold text-white md:text-3xl">Center Net is under maintenance</h2>
        <p className="relative mt-3 flex items-center justify-center gap-1 text-lg text-amber-100/70">
          Check back soon
          {[0, 1, 2].map(i => (
            <span key={i} className="cn-anim inline-block h-1.5 w-1.5 rounded-full bg-amber-400" style={{ animation: `cn-dot 1.4s ${i * 0.2}s infinite ease-in-out` }} />
          ))}
        </p>
      </div>
    </div>
  );
}
