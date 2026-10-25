import { useMemo, useState, type FormEvent } from "react";
import {
  ChevronDown,
  Clock,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCategories, useMenuItems, useOpeningHours } from "@/lib/queries";
import { formatPrice, hhmm, londonNow } from "@/lib/format";
import { siteImage } from "@/lib/siteImages";
import type { MenuItem, OpeningHours } from "@/lib/types";

// ---------------------------------------------------------------------------
// Links (same as calabartastee.com, plus WhatsApp ordering)
// ---------------------------------------------------------------------------
const JUST_EAT = "https://www.just-eat.co.uk/restaurants-calabar-tastee-edinburgh/menu";
const DELIVEROO = "https://deliveroo.co.uk/menu/edinburgh/southwest-edinburgh/calabar-tastee";
const UBER_EATS =
  "https://www.ubereats.com/gb/store/calabar-tastee-ltd/wuNvMxhtVYiznuI7zMf89A?srsltid=AYCX9vLZXLaIcjySn-GNbOJEKLe-Q2fLJ06-9XgEdR0yPe0Sb9-N1-uf";
const WHATSAPP_ORDER =
  "https://wa.me/447401352398?text=Hi%20Calabar%20Tastee%2C%20I%27d%20like%20to%20place%20an%20order%3A";
const WHATSAPP_CHAT = "https://wa.me/447961711422";
const REVIEW = "https://search.google.com/local/writereview?placeid=ChIJOXxbh_PHh0gRPZ67hHj811M";
const DIRECTIONS = "https://www.google.com/maps/dir/?api=1&destination=185+Dalry+Road+Edinburgh+EH11+2EB";
const MAP_EMBED = "https://www.google.com/maps?q=185+Dalry+Road,+Edinburgh+EH11+2EB&output=embed";
const FEEDBACK_SCRIPT =
  "https://script.google.com/macros/s/AKfycbzw4iAKHVAvRfH29JejD6vyCjHeV9SDu6ou52Y--sqXMIPpuIjBj_krNUf9D8bvx1kFHg/exec";

const NAV = ["Home", "About", "Menu", "Contact"];

const scrollTo = (id: string) => document.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth" });

// ---------------------------------------------------------------------------
// Opening status (London time, from the opening hours in the portal)
// ---------------------------------------------------------------------------
type Status = { status: "open" | "opening_soon" | "closing_soon" | "closed"; label: string };
const CLOSED_LABEL = "We are currently closed - see opening hours below";

function getOpeningStatus(hours: OpeningHours[]): Status {
  const { day, minutes } = londonNow();
  const today = hours.find(h => h.day === day);
  if (!today || today.is_closed || !today.open_time || !today.close_time) return { status: "closed", label: CLOSED_LABEL };
  const [oh, om] = hhmm(today.open_time).split(":").map(Number);
  const [ch, cm] = hhmm(today.close_time).split(":").map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  if (minutes < open - 30) return { status: "closed", label: CLOSED_LABEL };
  if (minutes < open) return { status: "opening_soon", label: `Opening soon (${hhmm(today.open_time)})` };
  if (minutes < close - 30) return { status: "open", label: `Open until ${hhmm(today.close_time)}` };
  if (minutes < close) return { status: "closing_soon", label: `Closing soon (${hhmm(today.close_time)})` };
  return { status: "closed", label: CLOSED_LABEL };
}

const statusColors: Record<Status["status"], string> = {
  open: "bg-green-500",
  opening_soon: "bg-amber-500",
  closing_soon: "bg-amber-500",
  closed: "bg-red-500",
};

function to12h(t: string | null): string {
  if (!t) return "";
  const [h, m] = hhmm(t).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

const SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

/** "Mon - Sat: 12:00 PM - 7:00 PM", "Sunday: Closed" */
function hoursSummary(hours: OpeningHours[]): { label: string; value: string; closed: boolean }[] {
  const out: { label: string; value: string; closed: boolean; days: OpeningHours[] }[] = [];
  for (const h of hours) {
    const value = h.is_closed ? "Closed" : `${to12h(h.open_time)} - ${to12h(h.close_time)}`;
    const last = out[out.length - 1];
    if (last && last.value === value) last.days.push(h);
    else out.push({ label: "", value, closed: h.is_closed, days: [h] });
  }
  return out.map(g => ({
    label:
      g.days.length === 1
        ? g.days[0].day_label
        : `${SHORT[g.days[0].day] ?? g.days[0].day_label} - ${SHORT[g.days[g.days.length - 1].day] ?? ""}`,
    value: g.value,
    closed: g.closed,
  }));
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function Photo({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-[#2a1f18] to-[#14100c] ${className ?? ""}`}>
        <UtensilsCrossed className="h-10 w-10 text-amber-700/40" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setBroken(true)} />;
}

/** Hides itself if the photo hasn't been uploaded yet. */
function SitePhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}

function OrderButtons({ compact = false }: { compact?: boolean }) {
  const base = `text-center text-xs ${compact ? "py-2" : "py-2.5"} rounded-lg transition-colors flex items-center justify-center gap-1 font-medium`;
  return (
    <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
      <a href={JUST_EAT} target="_blank" rel="noreferrer" className={`${base} border border-amber-600/50 text-amber-400 hover:bg-amber-600 hover:text-white`}>
        <ExternalLink className="h-3 w-3" />
        Just Eat
      </a>
      <a href={DELIVEROO} target="_blank" rel="noreferrer" className={`${base} border border-green-600/50 text-green-400 hover:bg-green-600 hover:text-white`}>
        <ExternalLink className="h-3 w-3" />
        Deliveroo
      </a>
      <a href={UBER_EATS} target="_blank" rel="noreferrer" className={`${base} border border-gray-600/50 text-gray-300 hover:bg-gray-800 hover:text-white`}>
        <ExternalLink className="h-3 w-3" />
        Uber
      </a>
      <a href={WHATSAPP_ORDER} target="_blank" rel="noreferrer" className={`${base} border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366] hover:text-white`}>
        <MessageCircle className="h-3 w-3" />
        WhatsApp
      </a>
    </div>
  );
}

function Badges({ item, bestSellerSection = false }: { item: MenuItem; bestSellerSection?: boolean }) {
  return (
    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
      {(bestSellerSection || item.is_best_seller) && (
        <span
          className={`flex items-center gap-1 rounded-full bg-amber-500 text-xs font-bold text-white ${bestSellerSection ? "px-3 py-1.5" : "px-2 py-1"}`}
        >
          👑 Best Seller
        </span>
      )}
      {!bestSellerSection && item.is_popular && !item.is_best_seller && (
        <span className="flex items-center gap-1 rounded-full bg-amber-600 px-2 py-1 text-xs font-semibold text-white">⭐ Popular</span>
      )}
      {item.is_spicy && (
        <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">🔥 Spicy</span>
      )}
      {item.is_preorder && (
        <span className="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">⏰ Pre-order</span>
      )}
      {!bestSellerSection && item.dietary && (
        <span className="flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white">{item.dietary}</span>
      )}
    </div>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-amber-900/30 bg-[#1a1410]">
          <div className="shimmer h-48" />
          <div className="space-y-3 p-5">
            <div className="shimmer h-5 w-2/3 rounded" />
            <div className="shimmer h-3 w-full rounded" />
            <div className="shimmer h-3 w-4/5 rounded" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="shimmer h-8 rounded-lg" />
              <div className="shimmer h-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

const CATEGORIES_FEEDBACK = ["Feedback", "Complaint", "Menu Suggestion"] as const;

function FeedbackForm() {
  const empty = { category: "Feedback", name: "", phone: "", email: "", comment: "" };
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    let emailed = false;
    let saved = false;
    try {
      // Forwards to the company inbox (same Google Apps Script as the live site).
      await fetch(FEEDBACK_SCRIPT, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          comment: `[${form.category}] ${form.comment.trim()}`,
          honeypot: "",
        }),
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
      });
      emailed = true;
    } catch {
      /* fall through — still saved below */
    }
    const { error } = await supabase.from("feedback").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      comment: form.comment.trim(),
      category: form.category,
    });
    saved = !error;
    if (emailed || saved) {
      setResult({ success: true, message: "Thank you for your feedback! We will get back to you soon." });
      setForm(empty);
    } else {
      setResult({ success: false, message: "Failed to submit. Please try again." });
    }
    setSubmitting(false);
  }

  const input =
    "w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500";

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-900/30 bg-[#231a14] p-8">
      {result && (
        <div
          className={`mb-6 rounded-lg p-4 ${result.success ? "border border-green-600/30 bg-green-600/20 text-green-400" : "border border-red-600/30 bg-red-600/20 text-red-400"}`}
        >
          {result.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-amber-100/60">
            Type <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES_FEEDBACK.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, category: c })}
                className={`min-h-[44px] rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${form.category === c ? "bg-amber-600 text-white" : "border border-amber-900/30 bg-[#1a1410] text-amber-100/70 hover:text-amber-300"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-amber-100/60">
            Name <span className="text-red-400">*</span>
          </label>
          <input type="text" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-amber-100/60">Phone Number</label>
          <input type="tel" maxLength={30} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-amber-100/60">
            Email <span className="text-red-400">*</span>
          </label>
          <input type="email" required maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-amber-100/60">
            {form.category === "Complaint" ? "Your complaint" : form.category === "Menu Suggestion" ? "Your menu suggestion" : "Your feedback"}{" "}
            <span className="text-red-400">*</span>
          </label>
          <textarea
            required
            rows={4}
            maxLength={2000}
            value={form.comment}
            onChange={e => setForm({ ...form, comment: e.target.value })}
            placeholder="Share your feedback, complaint, or suggest a new menu item..."
            className={`${input} resize-none`}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {submitting ? "Sending..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const InstagramIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuQuery = useMenuItems();
  const categoriesQuery = useCategories();
  const hoursQuery = useOpeningHours();

  const menuItems = useMemo(() => menuQuery.data ?? [], [menuQuery.data]);
  const hours = useMemo(() => hoursQuery.data ?? [], [hoursQuery.data]);
  const categoryNames = useMemo(() => new Map((categoriesQuery.data ?? []).map(c => [c.id, c.name])), [categoriesQuery.data]);
  const categories = useMemo(() => {
    const used = new Set(menuItems.map(i => i.category_id));
    return ["All", ...(categoriesQuery.data ?? []).filter(c => used.has(c.id)).map(c => c.name)];
  }, [menuItems, categoriesQuery.data]);

  const hoursStatus = getOpeningStatus(hours);
  const summary = hoursSummary(hours);
  const filtered = activeCategory === "All" ? menuItems : menuItems.filter(m => categoryNames.get(m.category_id) === activeCategory);
  const bestSellers = menuItems.filter(m => m.is_best_seller);
  const loadingMenu = menuQuery.isLoading;

  const navClick = (link: string) => {
    setMobileMenuOpen(false);
    scrollTo(link.toLowerCase());
  };

  return (
    <div className="site min-h-screen bg-[#1a1410]">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 bg-[#1a1410]/95 shadow-lg backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between md:h-20">
            <a href="/" className="text-gradient font-['Playfair_Display'] text-xl font-bold md:text-2xl">
              Calabar Tastee
            </a>
            <div className="hidden items-center gap-6 md:flex">
              {NAV.map(link => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  onClick={e => {
                    e.preventDefault();
                    navClick(link);
                  }}
                  className="text-sm font-medium text-amber-100/80 transition-colors hover:text-amber-400"
                >
                  {link}
                </a>
              ))}
              <div className="flex flex-wrap gap-2">
                <a href={JUST_EAT} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
                  <ExternalLink className="h-3 w-3" />
                  Just Eat
                </a>
                <a href={DELIVEROO} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  <ExternalLink className="h-3 w-3" />
                  Deliveroo
                </a>
                <a href={UBER_EATS} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full border border-gray-700 bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900">
                  <ExternalLink className="h-3 w-3" />
                  Uber Eats
                </a>
                <a href={WHATSAPP_ORDER} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:brightness-110">
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </a>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="-mr-2 p-2 text-amber-100 md:hidden" aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="mt-2 space-y-3 border-t border-amber-900/30 pb-4 pt-4 md:hidden">
              {NAV.map(link => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  onClick={e => {
                    e.preventDefault();
                    navClick(link);
                  }}
                  className="block py-2 text-base font-medium text-amber-100/80 transition-colors hover:text-amber-400"
                >
                  {link}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <a href={JUST_EAT} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-amber-600 px-4 py-3 text-sm font-medium text-white hover:bg-amber-700">
                  <ExternalLink className="h-4 w-4" />
                  Order on Just Eat
                </a>
                <a href={DELIVEROO} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700">
                  <ExternalLink className="h-4 w-4" />
                  Order on Deliveroo
                </a>
                <a href={UBER_EATS} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-gray-700 bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-900">
                  <ExternalLink className="h-4 w-4" />
                  Order on Uber Eats
                </a>
                <a href={WHATSAPP_ORDER} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-medium text-white hover:brightness-110">
                  <MessageCircle className="h-4 w-4" />
                  Order on WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3a2a1c] via-[#1f1712] to-[#0d0a08]">
          <SitePhoto src={siteImage("restaurant-hero.jpg")} alt="Calabar Tastee" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#1a1410]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-600/20 px-4 py-2">
            <span className={`h-2 w-2 animate-pulse rounded-full ${statusColors[hoursStatus.status]}`} />
            <span className="text-sm font-medium text-amber-300">{hoursStatus.label}</span>
          </div>
          <div className="mb-6 flex justify-center">
            <div className="inline-flex max-w-[90vw] animate-bounce items-center gap-2 rounded-full border border-blue-500/40 bg-blue-600/20 px-4 py-2 sm:px-5 sm:py-2.5">
              <GraduationCap className="h-5 w-5 flex-shrink-0 text-blue-400" />
              <span className="text-xs font-semibold text-blue-300 sm:text-sm">10% OFF for Students - Show ID</span>
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Taste the Soul of <span className="text-gradient block">Nigeria in Edinburgh</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-amber-100/80 sm:text-xl">
            Experience authentic Calabar flavors crafted with love. From our famous Jollof Rice to traditional soups, every dish tells a story of Nigerian heritage.
          </p>
          <div className="mb-10 flex flex-col flex-wrap justify-center gap-3 text-sm text-amber-100/70 sm:flex-row sm:gap-6">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>185 Dalry Road, Edinburgh</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <a href="tel:+447961711422">07961 711422</a>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>Eat In, Takeaway &amp; Delivery</span>
            </div>
          </div>
          <div className="mb-16 flex flex-col flex-wrap justify-center gap-4 sm:flex-row">
            <a href={JUST_EAT} target="_blank" rel="noreferrer" className="flex animate-pulse items-center justify-center gap-2 rounded-full bg-amber-600 px-8 py-4 text-lg font-semibold text-white hover:bg-amber-700">
              <ExternalLink className="h-5 w-5" />
              Order on Just Eat
            </a>
            <a href={DELIVEROO} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-green-500/50 px-8 py-4 text-lg text-green-400 hover:bg-green-600/20">
              <ExternalLink className="h-5 w-5" />
              Order on Deliveroo
            </a>
            <a href={UBER_EATS} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-gray-700 bg-black px-8 py-4 text-lg text-white hover:bg-gray-900">
              <ExternalLink className="h-5 w-5" />
              Order on Uber Eats
            </a>
            <a href={WHATSAPP_ORDER} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-[#25D366]/60 px-8 py-4 text-lg text-[#25D366] hover:bg-[#25D366]/15">
              <MessageCircle className="h-5 w-5" />
              Order on WhatsApp
            </a>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-amber-100/60">
            <div className="flex -space-x-3">
              {(["customer-1.jpg", "customer-2.jpg", "customer-3.jpg", "customer-4.jpg"] as const).map(f => (
                <SitePhoto key={f} src={siteImage(f)} alt="Happy customer" className="h-10 w-10 rounded-full border-2 border-[#1a1410] object-cover shadow-md" />
              ))}
            </div>
            <span className="font-medium">Join 500+ happy customers</span>
          </div>
        </div>
        <button onClick={() => scrollTo("contact")} className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-amber-400/60 transition-colors hover:text-amber-400" aria-label="Scroll down">
          <ChevronDown className="h-8 w-8" />
        </button>
      </section>

      {/* About */}
      <section id="about" className="relative bg-[#1a1410] py-20 md:py-28">
        <div className="bg-pattern absolute inset-0 opacity-50" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <Photo src={siteImage("about-image-1.jpg")} alt="Calabar Tastee Food" className="h-48 w-full translate-y-8 rounded-2xl object-cover shadow-2xl md:h-64" />
                <Photo src={siteImage("about-image-2.jpg")} alt="Calabar Tastee Dishes" className="h-48 w-full rounded-2xl object-cover shadow-2xl md:h-64" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-amber-600 px-6 py-3 text-lg font-bold text-white shadow-xl">Est. 2026</div>
            </div>
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-amber-500">About Us</span>
              <h2 className="mb-6 mt-3 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                Bringing the <span className="text-gradient">Flavors of Calabar</span> to Scotland
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-amber-100/70">
                Calabar Tastee is Edinburgh&apos;s premier destination for authentic Nigerian cuisine. Located on Dalry Road, we specialize in traditional Calabar dishes that celebrate the rich culinary heritage of South-South Nigeria.
              </p>
              <p className="mb-8 text-lg leading-relaxed text-amber-100/70">
                From our signature Edikaikong soup to the famous Nigerian Jollof Rice, every dish is prepared with authentic recipes and the finest ingredients. We offer eat-in, takeaway, and delivery options.
              </p>
              <div className="mb-8 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-500 md:text-4xl">40+</div>
                  <div className="text-sm text-amber-100/60">Menu Items</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-500 md:text-4xl">500+</div>
                  <div className="text-sm text-amber-100/60">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-500 md:text-4xl">5★</div>
                  <div className="text-sm text-amber-100/60">Rating</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              { icon: "Utensils", title: "Authentic Recipes", desc: "Traditional Calabar dishes passed down through generations, prepared with authentic Nigerian spices and techniques." },
              { icon: "Heart", title: "Made with Love", desc: "Every dish is crafted with care and passion, bringing the warmth of Nigerian hospitality to Edinburgh." },
              { icon: "Award", title: "Quality Ingredients", desc: "We use only the finest fresh ingredients and imported Nigerian spices for that true authentic taste." },
            ].map(f => (
              <div key={f.title} className="group rounded-xl border border-amber-900/30 bg-[#231a14] p-6 transition-all hover:border-amber-500/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/20">
                  <svg className="h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon === "Utensils" ? (
                      <>
                        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                        <path d="M7 2v20" />
                        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                      </>
                    ) : f.icon === "Heart" ? (
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    ) : (
                      <>
                        <circle cx="12" cy="8" r="7" />
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                      </>
                    )}
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-amber-100/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Founder */}
      <section id="founder" className="relative bg-[#14100c] py-20 md:py-28">
        <div className="bg-pattern absolute inset-0 opacity-30" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
            <div className="mx-auto w-full max-w-md">
              <Photo src={siteImage("founder.jpg")} alt="Meet the Founder of Calabar Tastee" className="aspect-[3/4] w-full rounded-2xl border border-amber-500/30 object-cover shadow-2xl shadow-amber-900/20" />
            </div>
            <div className="text-center md:text-left">
              <span className="text-sm font-semibold uppercase tracking-wider text-amber-500">Our Story</span>
              <h2 className="mb-6 mt-3 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                Meet the <span className="text-gradient">Founder</span>
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-amber-100/70">
                Calabar Tastee was founded with one goal: to bring the true taste of Calabar and Nigerian home cooking to Edinburgh. Every recipe on our menu carries that passion.
              </p>
              <p className="text-lg leading-relaxed text-amber-100/70">Authentic Nigerian &amp; West African cuisine, made with love on Dalry Road.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section id="bestsellers" className="relative bg-[#1a1410] py-20 md:py-28">
        <div className="bg-pattern absolute inset-0 opacity-50" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-500">Customer Favourites</span>
            <h2 className="mb-4 mt-3 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Our <span className="text-gradient">Best Sellers</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-amber-100/70">These are our most loved dishes. If it is your first time, you cannot go wrong with any of these!</p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loadingMenu ? (
              <SkeletonCards count={3} />
            ) : (
              bestSellers.map(item => (
                <div key={item.id} className="group flex flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-[#231a14] shadow-lg shadow-amber-900/10 transition-all hover:border-amber-400">
                  <div className="relative h-52 flex-shrink-0 overflow-hidden">
                    <Photo src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <Badges item={item} bestSellerSection />
                  </div>
                  <div className="flex flex-grow flex-col p-5">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-lg font-semibold leading-tight text-white">{item.name}</h3>
                      <span className="ml-2 flex-shrink-0 text-lg font-bold text-amber-500">{formatPrice(item.price)}</span>
                    </div>
                    <p className="flex-grow text-sm text-amber-100/60">{item.description}</p>
                    <OrderButtons />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="relative bg-[#14100c] py-20 md:py-28">
        <div className="bg-pattern absolute inset-0 opacity-30" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-500">Our Menu</span>
            <h2 className="mb-4 mt-3 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Authentic <span className="text-gradient">Nigerian Dishes</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-amber-100/70">Explore our selection of traditional Calabar and Nigerian dishes. Spice levels can be adjusted to your preference.</p>
          </div>
          <div className="scrollbar-hide -mx-1 mb-12 flex snap-x snap-mandatory justify-start gap-2 overflow-x-auto px-1 pb-2 sm:justify-center">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`min-h-[44px] flex-shrink-0 snap-start rounded-full px-5 py-2.5 text-sm font-medium transition-all ${activeCategory === c ? "bg-amber-600 text-white" : "bg-[#231a14] text-amber-100/70 hover:bg-amber-900/30 hover:text-amber-300"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loadingMenu ? (
              <SkeletonCards count={6} />
            ) : (
              filtered.map(item => (
                <div key={item.id} className="group flex flex-col overflow-hidden rounded-2xl border border-amber-900/30 bg-[#1a1410] transition-all hover:border-amber-500/50">
                  <div className="relative h-48 flex-shrink-0 overflow-hidden">
                    <Photo src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <Badges item={item} />
                  </div>
                  <div className="flex flex-grow flex-col p-5">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-lg font-semibold leading-tight text-white">{item.name}</h3>
                      <span className="ml-2 flex-shrink-0 text-lg font-bold text-amber-500">{formatPrice(item.price)}</span>
                    </div>
                    <p className="flex-grow text-sm text-amber-100/60">{item.description}</p>
                    <OrderButtons compact />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section id="feedback" className="relative bg-[#1a1410] py-20 md:py-28">
        <div className="bg-pattern absolute inset-0 opacity-50" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-500">Your Voice Matters</span>
            <h2 className="mb-4 mt-3 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Send Us Your <span className="text-gradient">Feedback</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-amber-100/70">Share your thoughts, complaints, or suggest new menu items. We value every piece of feedback!</p>
          </div>
          <FeedbackForm />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative bg-[#1a1410] py-20 md:py-28">
        <div className="bg-pattern absolute inset-0 opacity-50" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-500">Get in Touch</span>
            <h2 className="mb-4 mt-3 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Visit <span className="text-gradient">Calabar Tastee</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-amber-100/70">Find us on Dalry Road in Edinburgh. Eat-in, takeaway, and delivery available.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-amber-900/30 bg-[#231a14] p-6 md:p-8">
              <h3 className="mb-6 text-2xl font-bold text-white">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-600/20">
                    <MapPin className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-white">Address</h4>
                    <p className="text-amber-100/70">
                      185 Dalry Road
                      <br />
                      Edinburgh, Scotland
                      <br />
                      EH11 2EB
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-600/20">
                    <Mail className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-white">Email</h4>
                    <p className="text-amber-100/70">
                      <a href="mailto:calabartastee@gmail.com" className="transition-colors hover:text-amber-400">
                        calabartastee@gmail.com
                      </a>
                      <br />
                      <a href="mailto:contact@calabartastee.com" className="transition-colors hover:text-amber-400">
                        contact@calabartastee.com
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-600/20">
                    <Phone className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-white">Phone / WhatsApp</h4>
                    <p className="text-amber-100/70">
                      <a href="tel:+447961711422" className="transition-colors hover:text-amber-400">
                        07961 711422
                      </a>
                    </p>
                    <a href={WHATSAPP_CHAT} target="_blank" rel="noreferrer" className="text-sm text-green-500 transition-colors hover:text-green-400">
                      Chat on WhatsApp &rarr;
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-600/20">
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-1 font-semibold text-white">Opening Hours</h4>
                    <div className="space-y-1 text-amber-100/70">
                      {[...hours.filter(h => !h.is_closed), ...hours.filter(h => h.is_closed)].map(h => (
                        <div key={h.id} className="flex flex-col sm:flex-row sm:justify-between sm:gap-4">
                          <span className="capitalize">{h.day_label}</span>
                          {h.is_closed ? (
                            <span className="font-medium text-red-400">Closed</span>
                          ) : (
                            <span className="font-medium">
                              {hhmm(h.open_time)} - {hhmm(h.close_time)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-900/30 bg-[#231a14] p-6 md:p-8">
              <h3 className="mb-6 text-2xl font-bold text-white">Find Us</h3>
              <div className="relative mb-6 h-64 overflow-hidden rounded-xl bg-[#14100c] md:h-80">
                <iframe
                  src={MAP_EMBED}
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: "grayscale(30%) invert(90%)" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Calabar Tastee Location"
                />
              </div>
              <div className="space-y-3">
                <a href={DIRECTIONS} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 font-medium text-white transition-colors hover:bg-amber-700">
                  🧭 Get Directions
                </a>
                <a href={REVIEW} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 font-medium text-gray-900 transition-colors hover:bg-gray-100">
                  ⭐ Write a Review on Google
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-900/30 bg-[#0d0a08]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-gradient mb-4 font-['Playfair_Display'] text-2xl font-bold">Calabar Tastee</h3>
              <p className="mb-4 text-sm leading-relaxed text-amber-100/60">Bringing the authentic flavors of Calabar, Nigeria to Edinburgh. Eat-in, takeaway, and delivery available.</p>
              <div className="flex items-start gap-2 text-sm text-amber-100/60">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <span>185 Dalry Road, Edinburgh EH11 2EB</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Quick Links</h4>
              <ul className="space-y-2">
                {NAV.map(l => (
                  <li key={l}>
                    <a
                      href={`#${l.toLowerCase()}`}
                      onClick={e => {
                        e.preventDefault();
                        scrollTo(l.toLowerCase());
                      }}
                      className="text-sm text-amber-100/60 transition-colors hover:text-amber-400"
                    >
                      {l}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={REVIEW} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-amber-500 transition-colors hover:text-amber-400">
                    Write a Review <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Contact Us</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-amber-100/60">
                  <Mail className="h-4 w-4 text-amber-500" />
                  <a href="mailto:calabartastee@gmail.com" className="transition-colors hover:text-amber-400">
                    calabartastee@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-100/60">
                  <Mail className="h-4 w-4 text-amber-500" />
                  <a href="mailto:contact@calabartastee.com" className="transition-colors hover:text-amber-400">
                    contact@calabartastee.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-100/60">
                  <Phone className="h-4 w-4 text-amber-500" />
                  <a href="tel:+447961711422" className="transition-colors hover:text-amber-400">
                    07961 711422
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-100/60">
                  <TikTokIcon />
                  <a href="https://www.tiktok.com/@calabartastee" target="_blank" rel="noreferrer" className="transition-colors hover:text-amber-400">
                    @calabartastee
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-100/60">
                  <InstagramIcon />
                  <a href="https://www.instagram.com/calabartastee" target="_blank" rel="noreferrer" className="transition-colors hover:text-amber-400">
                    @calabartastee
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Directional map */}
          <div className="mb-8 overflow-hidden rounded-xl border border-amber-900/30 bg-[#231a14]">
            <div className="h-56 sm:h-64">
              <iframe
                src={MAP_EMBED}
                width="100%"
                height="100%"
                style={{ border: 0, filter: "grayscale(30%) invert(90%)" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map to Calabar Tastee"
              />
            </div>
            <a href={DIRECTIONS} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300">
              🧭 Get directions to 185 Dalry Road
            </a>
          </div>

          <div className="mb-8 rounded-xl border border-amber-900/30 bg-[#231a14] p-4">
            <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-6">
              <span className="font-semibold text-white">Opening Hours:</span>
              <div className="flex flex-col items-center gap-2 text-sm text-amber-100/70 sm:flex-row sm:gap-6">
                {summary.map((s, i) => (
                  <span key={s.label} className="flex items-center gap-2 sm:gap-6">
                    {i > 0 && <span className="hidden sm:inline">|</span>}
                    <span>
                      {s.label}: <span className={`font-medium ${s.closed ? "text-red-400" : "text-amber-400"}`}>{s.value}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-amber-900/30 pt-8 md:flex-row">
            <p className="text-center text-sm text-amber-100/40 md:text-left">&copy; {new Date().getFullYear()} Calabar Tastee. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href={JUST_EAT} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-amber-100/40 hover:text-amber-400">
                Just Eat <ExternalLink className="h-3 w-3" />
              </a>
              <a href={DELIVEROO} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-amber-100/40 hover:text-amber-400">
                Deliveroo <ExternalLink className="h-3 w-3" />
              </a>
              <a href={UBER_EATS} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-amber-100/40 hover:text-amber-400">
                Uber Eats <ExternalLink className="h-3 w-3" />
              </a>
              <a href={WHATSAPP_ORDER} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-amber-100/40 hover:text-amber-400">
                WhatsApp <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="flex items-center gap-1 text-sm text-amber-100/40">
              Made with{" "}
              <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>{" "}
              in Edinburgh
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
