import { Bell, Megaphone, MessageCircle, Pin } from "lucide-react";
import { PageHeader } from "../ui";

/** Center Net is paused: show an animated construction screen until it is switched back on. */
export function CenterNetPage() {
  return (
    <div>
      <PageHeader title="Center Net" description="Team announcements and updates" />
      <div className="relative flex min-h-[26rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-900/30 bg-[#1a1410] px-6 py-16 text-center">
        <style>{`
          @keyframes cn-swing { 0%,100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
          @keyframes cn-trolley { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-14px); } }
          @keyframes cn-brick { 0% { opacity: 0; transform: translateY(-14px); } 25%,100% { opacity: 1; transform: translateY(0); } }
          @keyframes cn-dot { 0%,80%,100% { opacity: .2; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.15); } }
          @keyframes cn-glow { 0%,100% { opacity: .25; } 50% { opacity: .6; } }
          @keyframes cn-stripe { to { background-position: 40px 0; } }
          @media (prefers-reduced-motion: reduce) { .cn-anim { animation: none !important; } }
        `}</style>
        <div className="cn-anim pointer-events-none absolute h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" style={{ animation: "cn-glow 4s ease-in-out infinite" }} />
        <div className="relative mb-6 h-40 w-56">
          <svg viewBox="0 0 160 110" className="h-full w-full" role="img" aria-label="Under construction">
            {/* crane tower and jib */}
            <rect x="38" y="22" width="6" height="68" fill="#f59e0b" />
            <path d="M38 90 L44 22 M44 90 L38 22" stroke="#b45309" strokeWidth="1.2" />
            <rect x="14" y="16" width="118" height="6" rx="1" fill="#f59e0b" />
            <rect x="14" y="10" width="14" height="6" fill="#78716c" />
            <path d="M41 6 L41 16 M41 6 L120 16 M41 6 L16 16" stroke="#fbbf24" strokeWidth="1.2" />
            {/* trolley, cable and swinging load */}
            <g className="cn-anim" style={{ animation: "cn-trolley 5s ease-in-out infinite" }}>
              <rect x="108" y="22" width="10" height="5" fill="#78716c" />
              <g className="cn-anim" style={{ transformOrigin: "113px 27px", animation: "cn-swing 2.5s ease-in-out infinite" }}>
                <line x1="113" y1="27" x2="113" y2="52" stroke="#d6d3d1" strokeWidth="1.2" />
                <rect x="104" y="52" width="18" height="9" fill="#c2410c" />
                <path d="M104 56.5 H122 M113 52 V56.5 M108.5 56.5 V61 M117.5 56.5 V61" stroke="#1a1410" strokeWidth=".8" />
              </g>
            </g>
            {/* wall being built */}
            {[0, 1, 2, 3].map(i => (
              <rect key={`a${i}`} className="cn-anim" x={78 + i * 17} y="82" width="16" height="8" fill="#c2410c" style={{ animation: `cn-brick 4s ${i * 0.5}s infinite backwards` }} />
            ))}
            {[0, 1, 2].map(i => (
              <rect key={`b${i}`} className="cn-anim" x={86 + i * 17} y="74" width="16" height="8" fill="#ea580c" style={{ animation: `cn-brick 4s ${2 + i * 0.5}s infinite backwards` }} />
            ))}
            <rect x="8" y="90" width="144" height="4" rx="1" fill="#44403c" />
            {/* hard hat */}
            <path d="M12 86 a10 10 0 0 1 20 0 z" fill="#fbbf24" />
            <rect x="10" y="85.5" width="24" height="3" rx="1" fill="#f59e0b" />
            <rect x="20" y="75" width="4" height="6" fill="#f59e0b" />
          </svg>
        </div>
        <div
          className="cn-anim relative mb-6 h-3 w-56 rounded"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg,#f59e0b 0 10px,#1a1410 10px 20px)",
            backgroundSize: "40px 100%",
            animation: "cn-stripe 1.2s linear infinite",
          }}
        />
        <h2 className="relative text-2xl font-bold text-white md:text-3xl">Center Net is under construction</h2>
        <p className="relative mt-3 flex items-center justify-center gap-1 text-lg text-amber-100/70">
          Check back soon
          {[0, 1, 2].map(i => (
            <span key={i} className="cn-anim inline-block h-1.5 w-1.5 rounded-full bg-amber-400" style={{ animation: `cn-dot 1.4s ${i * 0.2}s infinite ease-in-out` }} />
          ))}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-900/30 bg-[#1a1410] p-6">
        <h3 className="text-lg font-semibold text-white">What happens when Center Net launches</h3>
        <p className="mt-1 text-sm text-amber-100/60">
          Center Net becomes the one place where the whole team hears from management. Here is what you can expect:
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { icon: Megaphone, title: "Announcements", text: "Anyone on the team can post updates for everyone: rota changes, specials, deliveries, reminders." },
            { icon: Pin, title: "Pinned posts", text: "Important notices can be pinned so they stay at the top until they are no longer needed." },
            { icon: MessageCircle, title: "Comments", text: "Everyone on the team can reply to a post, ask questions and confirm they have seen it." },
            { icon: Bell, title: "Always up to date", text: "New posts show as soon as you open the portal, so nothing gets lost in group chats." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-amber-900/30 bg-[#231a14] p-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <div className="font-medium text-white">{title}</div>
                <p className="mt-0.5 text-sm text-amber-100/60">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
