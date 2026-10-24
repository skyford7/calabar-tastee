import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCategories, useMenuItems, useOpeningHours } from "@/lib/queries";
import { formatPrice, hhmm, londonNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MenuItem, OpeningHours } from "@/lib/types";
import {
  Phone,
  MapPin,
  Clock,
  Star,
  ChefHat,
  UtensilsCrossed,
  Menu as MenuIcon,
  X,
  Flame,
  Leaf,
  AlertTriangle,
  ArrowRight,
  Instagram,
  Send,
  Award,
  TrendingUp,
  MessageCircle,
  GraduationCap,
  Navigation,
} from "lucide-react";

// Ordering platforms
const UBER_EATS_URL =
  "https://www.ubereats.com/gb/store/calabar-tastee-ltd/wuNvMxhtVYiznuI7zMf89A?srsltid=AYCX9vLZXLaIcjySn-GNbOJEKLe-Q2fLJ06-9XgEdR0yPe0Sb9-N1-uf";
const DELIVEROO_URL =
  "https://deliveroo.co.uk/menu/edinburgh/southwest-edinburgh/calabar-tastee";
const JUST_EAT_URL =
  "https://www.just-eat.co.uk/restaurants-calabar-tastee-edinburgh/menu";
const WHATSAPP_URL =
  "https://wa.me/447401352398?text=Hi%20Calabar%20Tastee%2C%20I%27d%20like%20to%20place%20an%20order%3A";

// Contact + location
const PHONE_DISPLAY = "+44 7961 711422";
const PHONE_TEL = "+447961711422";
const ADDRESS = "185 Dalry Road, Edinburgh EH11 2EB";
const MAPS_EMBED =
  "https://www.google.com/maps?q=185%20Dalry%20Road%2C%20Edinburgh%20EH11%202EB&output=embed";
const MAPS_DIRECTIONS =
  "https://www.google.com/maps/dir/?api=1&destination=185%20Dalry%20Road%2C%20Edinburgh%20EH11%202EB";

// Socials (match live site)
const INSTAGRAM_URL = "https://www.instagram.com/calabartastee";
const TIKTOK_URL = "https://www.tiktok.com/@calabartastee";

// Feedback → forwarded to the company inbox via Google Apps Script (same as live site)
const FEEDBACK_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzw4iAKHVAvRfH29JejD6vyCjHeV9SDu6ou52Y--sqXMIPpuIjBj_krNUf9D8bvx1kFHg/exec";
const FEEDBACK_CATEGORIES = ["Feedback", "Complaint", "Menu Suggestion"] as const;

type OrderSize = "sm" | "lg";

/** The four ordering options shown on the hero and under every dish. */
function OrderButtons({ size = "sm" }: { size?: OrderSize }) {
  const pad = size === "lg" ? "px-4 py-3 text-sm" : "px-2 py-2 text-xs";
  const links: { label: string; href: string; className: string }[] = [
    { label: "Uber Eats", href: UBER_EATS_URL, className: "bg-[#06C167] text-black hover:brightness-110" },
    { label: "Deliveroo", href: DELIVEROO_URL, className: "bg-[#00CCBC] text-black hover:brightness-110" },
    { label: "Just Eat", href: JUST_EAT_URL, className: "bg-[#FF8000] text-white hover:brightness-110" },
    { label: "WhatsApp", href: WHATSAPP_URL, className: "bg-[#25D366] text-black hover:brightness-110" },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-2", size === "lg" && "sm:grid-cols-4 sm:gap-3")}>
      {links.map(l => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all",
            pad,
            l.className
          )}
        >
          {l.label === "WhatsApp" ? <MessageCircle className="h-4 w-4" /> : null}
          {l.label}
        </a>
      ))}
    </div>
  );
}

function getOpeningStatus(hoursData: OpeningHours[]) {
  const { day: todayName, minutes: currentMinutes } = londonNow();
  const todayHours = hoursData.find(h => h.day === todayName);

  if (!todayHours || todayHours.is_closed) {
    return { status: "closed", label: "We are currently closed. See opening hours below." };
  }
  const openLabel = hhmm(todayHours.open_time);
  const closeLabel = hhmm(todayHours.close_time);
  const [openH, openM] = (openLabel || "12:00").split(":").map(Number);
  const [closeH, closeM] = (closeLabel || "19:00").split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes < openMinutes - 60) return { status: "closed", label: `We open today at ${openLabel}` };
  if (currentMinutes < openMinutes) return { status: "opening_soon", label: `Opening soon at ${openLabel}` };
  if (currentMinutes < closeMinutes - 30) return { status: "open", label: "We are currently open" };
  if (currentMinutes < closeMinutes) return { status: "closing_soon", label: `Closing soon at ${closeLabel}` };
  return { status: "closed", label: "We are currently closed. See opening hours below." };
}

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-amber-900/30 bg-[#231a14] transition-all hover:border-amber-500/40">
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-[#2a1f18] sm:h-48">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <UtensilsCrossed className="h-12 w-12 text-amber-700/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#231a14] to-transparent opacity-60" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {item.is_best_seller && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-[#1a1410]">
              <Award className="h-3 w-3" /> Best Seller
            </span>
          )}
          {item.is_popular && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-[#1a1410]">
              <TrendingUp className="h-3 w-3" /> Popular
            </span>
          )}
          {item.is_spicy && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
              <Flame className="h-3 w-3" /> Spicy
            </span>
          )}
          {item.is_preorder && (
            <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
              <AlertTriangle className="h-3 w-3" /> Pre-order
            </span>
          )}
          {item.dietary && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
              <Leaf className="h-3 w-3" /> {item.dietary}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-bold text-white">{item.name}</h3>
          <span className="shrink-0 text-lg font-bold text-amber-500">{formatPrice(item.price)}</span>
        </div>
        {item.description && <p className="mb-4 line-clamp-2 text-sm text-amber-100/50">{item.description}</p>}
        <div className="mt-auto">
          <OrderButtons />
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [feedback, setFeedback] = useState({ name: "", phone: "", email: "", comment: "", category: "Feedback" });
  const [feedbackSent, setFeedbackSent] = useState(false);

  const menuQuery = useMenuItems();
  const hoursQuery = useOpeningHours();
  const categoriesQuery = useCategories();
  const feedbackMutation = useMutation({
    mutationFn: async (input: typeof feedback) => {
      // 1) Email the company inbox via the Google Apps Script (opaque no-cors response)
      try {
        await fetch(FEEDBACK_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email.trim(),
            comment: `[${input.category}] ${input.comment.trim()}`,
            honeypot: "",
          }),
        });
      } catch {
        /* non-fatal — still store in the portal below */
      }
      // 2) Store in Supabase so staff/admin see it in the portal
      const { error } = await supabase.from("feedback").insert({
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim() || null,
        comment: input.comment.trim(),
        category: input.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFeedbackSent(true);
      setFeedback({ name: "", phone: "", email: "", comment: "", category: "Feedback" });
      setTimeout(() => setFeedbackSent(false), 5000);
    },
  });

  const menuItems: MenuItem[] = useMemo(() => menuQuery.data ?? [], [menuQuery.data]);
  const hoursData = hoursQuery.data ?? [];
  const categoryList = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryName = useMemo(() => new Map(categoryList.map(c => [c.id, c.name])), [categoryList]);

  const status = getOpeningStatus(hoursData);
  const statusColor =
    status.status === "open" ? "bg-green-500" : status.status === "closing_soon" ? "bg-amber-500" : "bg-red-500";

  const categories = useMemo(() => {
    const used = new Set(menuItems.map(i => i.category_id));
    return ["All", ...categoryList.filter(c => used.has(c.id)).map(c => c.name)];
  }, [menuItems, categoryList]);

  const filteredItems =
    activeCategory === "All" ? menuItems : menuItems.filter(i => categoryName.get(i.category_id) === activeCategory);
  const bestSellers = menuItems.filter(i => i.is_best_seller);

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.name && feedback.email && feedback.comment) feedbackMutation.mutate(feedback);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const navLinks = (
    <>
      <button onClick={() => scrollTo("menu")} className="text-sm font-medium text-amber-100/80 transition-colors hover:text-amber-400">Menu</button>
      <button onClick={() => scrollTo("founder")} className="text-sm font-medium text-amber-100/80 transition-colors hover:text-amber-400">Our Story</button>
      <button onClick={() => scrollTo("hours")} className="text-sm font-medium text-amber-100/80 transition-colors hover:text-amber-400">Hours</button>
      <button onClick={() => scrollTo("contact")} className="text-sm font-medium text-amber-100/80 transition-colors hover:text-amber-400">Contact</button>
    </>
  );

  return (
    <div className="min-h-screen bg-[#1a1410] text-amber-50">
      {/* Student discount banner */}
      <div className="bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-[#1a1410] sm:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4" /> 10% student discount — valid student ID must be presented.
        </span>
      </div>

      {/* Top bar: phone + address only */}
      <div className="border-b border-amber-900/30 bg-[#231a14]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 py-2 text-xs text-amber-100/60 sm:h-10 sm:flex-row sm:py-0">
          <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-1 hover:text-amber-400">
            <Phone className="h-3 w-3" /> {PHONE_DISPLAY}
          </a>
          <a href={MAPS_DIRECTIONS} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber-400">
            <MapPin className="h-3 w-3" /> {ADDRESS}
          </a>
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-amber-900/30 bg-[#1a1410]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-8 w-8 text-amber-500" />
              <span className="text-xl font-bold text-amber-400">Calabar Tastee</span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              {navLinks}
              <button onClick={() => scrollTo("menu")} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700">
                Order Now
              </button>
            </div>
            <button className="p-2 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="space-y-3 border-b border-amber-900/30 bg-[#231a14] px-4 py-4 md:hidden">
            {navLinks}
            <button onClick={() => scrollTo("menu")} className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white">Order Now</button>
          </div>
        )}
      </nav>

      {/* Status bar */}
      <div className="border-b border-amber-900/30 bg-[#231a14]">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className={`h-2 w-2 animate-pulse rounded-full ${statusColor}`} />
            <span className="text-amber-100/70">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#231a14] py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex animate-[fadeInUp_0.6s_ease-out] items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400">
            <Star className="h-4 w-4" /> Authentic Nigerian &amp; West African Cuisine
          </div>
          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Taste the Soul of <span className="text-amber-500">Calabar</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-amber-100/70 sm:text-xl">
            From traditional Efik recipes to beloved Nigerian classics, we bring the rich flavours of West Africa to Edinburgh.
          </p>
          <div className="mx-auto mb-4 max-w-xl">
            <p className="mb-2 text-sm font-medium text-amber-100/70">Order now on</p>
            <OrderButtons size="lg" />
          </div>
          <button onClick={() => scrollTo("menu")} className="mx-auto mt-4 flex items-center gap-2 rounded-xl border border-amber-500/40 px-6 py-3 font-semibold text-amber-300 transition-colors hover:bg-amber-500/10">
            View Menu <ArrowRight className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
        </div>
      </section>

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section id="bestsellers" className="py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-amber-500">
                <Award className="h-4 w-4" /> Customer Favourites
              </div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Best Sellers</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bestSellers.map(item => <MenuCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>
      )}

      {/* Menu */}
      <section id="menu" className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-amber-500">
              <UtensilsCrossed className="h-4 w-4" /> Our Menu
            </div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Full Menu</h2>
            <p className="mt-2 text-amber-100/60">Authentic flavours, carefully prepared</p>
          </div>

          {categories.length > 1 && (
            <div className="scrollbar-hide mb-8 flex gap-2 overflow-x-auto pb-4">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-amber-600 text-white"
                      : "border border-amber-900/30 bg-[#231a14] text-amber-100/70 hover:border-amber-500/30 hover:text-amber-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {menuQuery.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl border border-amber-900/30 bg-[#231a14]" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-900/40 py-16 text-center text-amber-100/50">
              Our menu is being updated — please order via the apps above, or call {PHONE_DISPLAY}.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map(item => <MenuCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </section>

      {/* Meet the Founder */}
      <section id="founder" className="bg-[#231a14] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <img
              src="/founder.jpg"
              alt="Calabar Tastee — Meet the Founder"
              loading="lazy"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              className="mx-auto w-full max-w-sm rounded-2xl border border-amber-900/30 shadow-xl"
            />
            <div className="text-center md:text-left">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-amber-500">
                <Star className="h-4 w-4" /> Meet the Founder
              </div>
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Calabar Tastee Edinburgh</h2>
              <p className="text-lg text-amber-100/70">
                Authentic Nigerian &amp; West African cuisine — passionate about bringing true flavours to Edinburgh.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Opening Hours */}
      <section id="hours" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-amber-500">
              <Clock className="h-4 w-4" /> Visit Us
            </div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Opening Hours</h2>
            <p className="mt-2 text-amber-100/60">{ADDRESS}</p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hoursData.map(h => {
              const isToday = londonNow().day === h.day;
              return (
                <div key={h.id} className={`rounded-xl border bg-[#231a14] p-4 ${isToday ? "border-amber-500/50" : "border-amber-900/20"}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`font-semibold ${isToday ? "text-amber-400" : "text-amber-100/70"}`}>{h.day_label}</span>
                    {isToday && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">Today</span>}
                  </div>
                  <div className="text-sm text-amber-100/50">
                    {h.is_closed ? "Closed" : `${hhmm(h.open_time)} - ${hhmm(h.close_time)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact / Feedback */}
      <section id="contact" className="bg-[#231a14] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-amber-500">
                <Phone className="h-4 w-4" /> Get in Touch
              </div>
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Contact Us</h2>
              <div className="mb-8 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600/20">
                    <MapPin className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Address</div>
                    <div className="text-sm text-amber-100/60">{ADDRESS}</div>
                    <a href={MAPS_DIRECTIONS} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-amber-400 hover:underline">
                      <Navigation className="h-3.5 w-3.5" /> Get directions
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600/20">
                    <Phone className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Phone</div>
                    <a href={`tel:${PHONE_TEL}`} className="text-sm text-amber-100/60 hover:text-amber-400">{PHONE_DISPLAY}</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600/20">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Opening Hours</div>
                    {hoursData.map(h => (
                      <div key={h.id} className="text-sm text-amber-100/60">
                        {h.day_label}: {h.is_closed ? "Closed" : `${hhmm(h.open_time)} – ${hhmm(h.close_time)}`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-900/30 bg-[#1a1410] p-6 sm:p-8">
              <h3 className="mb-4 text-xl font-bold text-white">Send us a message</h3>
              {feedbackSent ? (
                <div className="rounded-xl border border-green-600/30 bg-green-600/20 px-4 py-4 text-sm text-green-400">
                  Thank you! Your message has been sent.
                </div>
              ) : (
                <form onSubmit={handleFeedback} className="space-y-4">
                  {feedbackMutation.isError && (
                    <div className="rounded-xl border border-red-600/30 bg-red-600/20 px-4 py-3 text-sm text-red-300">
                      Sorry, your message couldn't be sent. Please try again or call us.
                    </div>
                  )}
                  <select value={feedback.category} onChange={e => setFeedback({ ...feedback, category: e.target.value })} className="w-full rounded-lg border border-amber-900/30 bg-[#231a14] px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none">
                    {FEEDBACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="Your Name" maxLength={100} value={feedback.name} onChange={e => setFeedback({ ...feedback, name: e.target.value })} className="w-full rounded-lg border border-amber-900/30 bg-[#231a14] px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" required />
                  <input type="email" placeholder="Email Address" maxLength={254} value={feedback.email} onChange={e => setFeedback({ ...feedback, email: e.target.value })} className="w-full rounded-lg border border-amber-900/30 bg-[#231a14] px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" required />
                  <input placeholder="Phone (optional)" maxLength={30} value={feedback.phone} onChange={e => setFeedback({ ...feedback, phone: e.target.value })} className="w-full rounded-lg border border-amber-900/30 bg-[#231a14] px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" />
                  <textarea placeholder="Share your feedback, complaint, or suggest a new menu item..." maxLength={2000} value={feedback.comment} onChange={e => setFeedback({ ...feedback, comment: e.target.value })} rows={4} className="w-full rounded-lg border border-amber-900/30 bg-[#231a14] px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" required />
                  <button type="submit" disabled={feedbackMutation.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50">
                    <Send className="h-4 w-4" />
                    {feedbackMutation.isPending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Directions map */}
      <section aria-label="Map" className="border-t border-amber-900/30">
        <iframe
          title="Calabar Tastee location"
          src={MAPS_EMBED}
          className="h-72 w-full border-0 sm:h-96"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-900/30 bg-[#1a1410] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-amber-500" />
                <span className="font-bold text-amber-400">Calabar Tastee</span>
              </div>
              <p className="text-sm text-amber-100/50">{ADDRESS}</p>
              <a href={`tel:${PHONE_TEL}`} className="text-sm text-amber-100/50 hover:text-amber-400">{PHONE_DISPLAY}</a>
            </div>
            <div className="flex items-center gap-3">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-900/30 bg-[#231a14] transition-colors hover:bg-amber-600/20">
                <Instagram className="h-5 w-5 text-amber-400" />
              </a>
              <a href={TIKTOK_URL} target="_blank" rel="noreferrer" aria-label="TikTok" className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-900/30 bg-[#231a14] transition-colors hover:bg-amber-600/20">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-amber-400" aria-hidden="true"><path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.34-1.48z"/></svg>
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-amber-900/20 pt-6 text-center text-sm text-amber-100/40">
            © {new Date().getFullYear()} Calabar Tastee Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
