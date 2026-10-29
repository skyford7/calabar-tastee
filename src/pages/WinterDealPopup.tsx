import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

const WHATSAPP_DEAL =
  "https://wa.me/447401352398?text=" +
  encodeURIComponent("Hi Calabar Tastee, I'd like the Coffee + Lotus Biscoff winter deal: ");
const SEEN_KEY = "ct-winter-deal-seen";

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage unavailable — the popup may show again on reload, which is fine */
  }
}

/** Winter-deal marketing popup: opens shortly after the site loads, once per visit. */
export function WinterDealPopup() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (alreadySeen()) return;
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const seeMenu = () => {
    close();
    document.querySelector("#menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="winter-deal-title"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/40 bg-[#14100c] shadow-2xl shadow-black/60"
      >
        <button
          ref={closeRef}
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-amber-100 hover:bg-black/80"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src="/photos/coffee-biscoff.webp"
          alt="Hot coffee in a Calabar Tastee cup with Lotus Biscoff biscuits"
          className="h-56 w-full object-cover sm:h-64"
        />
        <div className="space-y-3 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">Winter deal</p>
          <h2 id="winter-deal-title" className="font-serif text-2xl text-white sm:text-3xl">
            Coffee + Lotus Biscoff
          </h2>
          <p className="text-amber-100/70">Warm up with a hot coffee and Lotus Biscoff biscuits.</p>
          <p className="text-xl font-semibold text-amber-300">
            Small cup £3 <span className="text-amber-100/40">•</span> Large cup £4
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <a
              href={WHATSAPP_DEAL}
              target="_blank"
              rel="noreferrer"
              onClick={markSeen}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-medium text-white hover:brightness-110"
            >
              <MessageCircle className="h-4 w-4" /> Order on WhatsApp
            </a>
            <button
              onClick={seeMenu}
              className="flex-1 rounded-full border border-amber-500/50 px-5 py-3 text-sm font-medium text-amber-300 hover:bg-amber-500/10"
            >
              See the menu
            </button>
          </div>
          <p className="pt-1 text-xs text-amber-100/40">185 Dalry Road, EH11 2EB • 07961 711422</p>
        </div>
      </div>
    </div>
  );
}
