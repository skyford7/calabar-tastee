import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import {
  Phone, MapPin, Clock, Star, ChefHat, UtensilsCrossed, Menu as MenuIcon, X,
  Flame, Leaf, AlertTriangle, ArrowRight, Facebook, Instagram,
  Send, Award, TrendingUp, ShoppingBag
} from "lucide-react";

function getOpeningStatus(hoursData: any[]) {
  const now = new Date();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayName = dayNames[now.getDay()];
  const todayHours = hoursData.find((h) => h.day === todayName);

  if (!todayHours || todayHours.is_closed) {
    return { status: "closed", label: "We are currently closed. See opening hours below." };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = (todayHours.open_time || "12:00").split(":").map(Number);
  const [closeH, closeM] = (todayHours.close_time || "19:00").split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes < openMinutes - 60) {
    return { status: "closed", label: `We open today at ${todayHours.open_time}` };
  } else if (currentMinutes < openMinutes) {
    return { status: "opening_soon", label: `Opening soon at ${todayHours.open_time}` };
  } else if (currentMinutes >= openMinutes && currentMinutes < closeMinutes - 30) {
    return { status: "open", label: "We are currently open" };
  } else if (currentMinutes >= closeMinutes - 30 && currentMinutes < closeMinutes) {
    return { status: "closing_soon", label: `Closing soon at ${todayHours.close_time}` };
  } else {
    return { status: "closed", label: `We are currently closed. See opening hours below.` };
  }
}

export function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [feedback, setFeedback] = useState({ name: "", phone: "", email: "", comment: "" });
  const [feedbackSent, setFeedbackSent] = useState(false);

  const menuQuery = trpc.menu.list.useQuery();
  const hoursQuery = trpc.hours.list.useQuery();
  const feedbackMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setFeedbackSent(true);
      setFeedback({ name: "", phone: "", email: "", comment: "" });
      setTimeout(() => setFeedbackSent(false), 5000);
    },
  });

  const menuItems = menuQuery.data || [];
  const hoursData = hoursQuery.data || [];

  const status = getOpeningStatus(hoursData);
  const statusColor = status.status === "open" ? "bg-green-500" : status.status === "closing_soon" ? "bg-amber-500" : "bg-red-500";

  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map((i) => i.category))];
    return ["All", ...cats];
  }, [menuItems]);

  const filteredItems = activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory);
  const bestSellers = menuItems.filter((i) => i.is_best_seller);

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.name && feedback.email && feedback.comment) {
      feedbackMutation.mutate(feedback);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const NavLinks = () => (
    <>
      <button onClick={() => scrollTo("menu")} className="text-sm font-medium text-amber-100/80 hover:text-amber-400 transition-colors">Menu</button>
      <button onClick={() => scrollTo("bestsellers")} className="text-sm font-medium text-amber-100/80 hover:text-amber-400 transition-colors">Best Sellers</button>
      <button onClick={() => scrollTo("hours")} className="text-sm font-medium text-amber-100/80 hover:text-amber-400 transition-colors">Hours</button>
      <button onClick={() => scrollTo("contact")} className="text-sm font-medium text-amber-100/80 hover:text-amber-400 transition-colors">Contact</button>
    </>
  );

  return (
    <div className="min-h-screen bg-[#1a1410] text-amber-50">
      {/* Top Bar */}
      <div className="bg-[#231a14] border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-10 text-xs text-amber-100/60">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> 074 0135 2398</span>
              <span className="hidden sm:inline flex items-center gap-1"><MapPin className="w-3 h-3" /> 26 Oakfield Avenue, Glasgow, G12 8LS</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/calabartasteescotland/" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="https://www.instagram.com/calabartasteescotland/" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors"><Instagram className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#1a1410]/95 backdrop-blur border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <ChefHat className="w-8 h-8 text-amber-500" />
              <span className="text-xl font-bold text-amber-400">Calabar Tastee</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <NavLinks />
              <a href="https://www.ubereats.com/gb/store/calabar-tastee-ltd/wuNvMxhtVYiznuI7zMf89A" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <ShoppingBag className="w-4 h-4" /> Order Now
              </a>
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#231a14] border-b border-amber-900/30 px-4 py-4 space-y-3">
            <NavLinks />
            <a href="https://www.ubereats.com/gb/store/calabar-tastee-ltd/wuNvMxhtVYiznuI7zMf89A" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium w-full justify-center">
              <ShoppingBag className="w-4 h-4" /> Order Now
            </a>
          </div>
        )}
      </nav>

      {/* Status Bar */}
      <div className="bg-[#231a14] border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
            <span className="text-amber-100/70">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative py-20 sm:py-28 bg-[#231a14] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
            <Star className="w-4 h-4" /> Authentic Nigerian & West African Cuisine
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
            Taste the Soul of <span className="text-amber-500">Calabar</span>
          </h1>
          <p className="text-lg sm:text-xl text-amber-100/70 max-w-2xl mx-auto mb-10">
            From traditional Efik recipes to beloved Nigerian classics, we bring the rich flavours of West Africa to Glasgow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://www.ubereats.com/gb/store/calabar-tastee-ltd/wuNvMxhtVYiznuI7zMf89A" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg">
              <ShoppingBag className="w-5 h-5" /> Order on Uber Eats
            </a>
            <button onClick={() => scrollTo("menu")} className="flex items-center gap-2 border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 px-8 py-4 rounded-xl font-semibold transition-colors text-lg">
              View Menu <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
        </div>
      </section>

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section id="bestsellers" className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-amber-500 text-sm font-medium mb-2">
                <Award className="w-4 h-4" /> Customer Favourites
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Best Sellers</h2>
              <p className="text-amber-100/60 mt-2">Our most loved dishes, ordered again and again</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {bestSellers.map((item) => (
                <div key={item.id} className="group bg-[#231a14] border border-amber-900/30 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all">
                  <div className="h-48 bg-[#2a1f18] relative flex items-center justify-center overflow-hidden">
                    <UtensilsCrossed className="w-12 h-12 text-amber-700/50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#231a14] to-transparent opacity-60" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-amber-500 text-[#1a1410] text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" /> Best Seller
                      </span>
                      {item.is_spicy && (
                        <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Spicy
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white mb-1">{item.name}</h3>
                    <p className="text-sm text-amber-100/50 line-clamp-2 mb-3">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-500 font-bold text-lg">{item.price}</span>
                      <a href="https://www.ubereats.com/gb/store/calabar-tastee-ltd/wuNvMxhtVYiznuI7zMf89A" target="_blank" rel="noreferrer" className="text-xs bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> Order
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Menu */}
      <section id="menu" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-amber-500 text-sm font-medium mb-2">
              <UtensilsCrossed className="w-4 h-4" /> Our Menu
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Full Menu</h2>
            <p className="text-amber-100/60 mt-2">Authentic flavours, carefully prepared</p>
          </div>

          <div className="flex overflow-x-auto gap-2 pb-4 mb-8 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-amber-600 text-white"
                    : "bg-[#231a14] border border-amber-900/30 text-amber-100/70 hover:text-amber-400 hover:border-amber-500/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="group bg-[#231a14] border border-amber-900/30 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all">
                <div className="h-48 bg-[#2a1f18] relative flex items-center justify-center overflow-hidden">
                  <UtensilsCrossed className="w-12 h-12 text-amber-700/50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#231a14] to-transparent opacity-60" />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {item.is_popular && (
                      <span className="bg-amber-500 text-[#1a1410] text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Popular
                      </span>
                    )}
                    {item.is_spicy && (
                      <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Flame className="w-3 h-3" /> Spicy
                      </span>
                    )}
                    {item.is_preorder && (
                      <span className="bg-blue-500/20 text-blue-400 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Pre-order
                      </span>
                    )}
                    {item.dietary && (
                      <span className="bg-green-500/20 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Leaf className="w-3 h-3" /> {item.dietary}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-white mb-1">{item.name}</h3>
                  <p className="text-sm text-amber-100/50 line-clamp-2 mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500 font-bold text-lg">{item.price}</span>
                    <a href="https://www.ubereats.com/gb/store/calabar-tastee-ltd/wuNvMxhtVYiznuI7zMf89A" target="_blank" rel="noreferrer" className="text-xs bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" /> Order
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Opening Hours */}
      <section id="hours" className="py-16 bg-[#231a14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-amber-500 text-sm font-medium mb-2">
              <Clock className="w-4 h-4" /> Visit Us
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Opening Hours</h2>
            <p className="text-amber-100/60 mt-2">26 Oakfield Avenue, Glasgow, G12 8LS</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {hoursData.map((h) => {
              const now = new Date();
              const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
              const isToday = dayNames[now.getDay()] === h.day;
              return (
                <div key={h.id} className={`bg-[#1a1410] border rounded-xl p-4 ${isToday ? "border-amber-500/50" : "border-amber-900/20"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${isToday ? "text-amber-400" : "text-amber-100/70"}`}>{h.day_label}</span>
                    {isToday && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Today</span>}
                  </div>
                  <div className="text-sm text-amber-100/50">
                    {h.is_closed ? "Closed" : `${h.open_time} - ${h.close_time}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">What Our Customers Say</h2>
            <p className="text-amber-100/60 mt-2">Join 500+ happy customers</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Sarah M.", text: "The best Nigerian food in Glasgow! The Edikaikong is absolutely authentic.", img: "/customer1.jpg" },
              { name: "James O.", text: "As a Nigerian living in Scotland, finding Calabar Tastee was a blessing. Tastes like home.", img: "/customer2.jpg" },
              { name: "Adebola K.", text: "Jollof rice is fire! The spice levels are perfect and the plantain is always crispy.", img: "/customer3.jpg" },
              { name: "Chioma N.", text: "The Egusi soup reminds me of my grandmother's cooking. Highly recommend!", img: "/customer4.jpg" },
              { name: "David R.", text: "Ordered through Uber Eats and the food was still piping hot. The goat pepper soup is incredible.", img: "/customer5.jpg" },
              { name: "Emily T.", text: "First time trying Nigerian food and I'm hooked. The staff was so helpful explaining the menu.", img: "/customer6.jpg" },
            ].map((review, i) => (
              <div key={i} className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={review.img}
                    alt={review.name}
                    className="w-10 h-10 rounded-full object-cover border border-amber-900/30"
                  />
                  <div>
                    <div className="font-medium text-white text-sm">{review.name}</div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3 h-3 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-amber-100/60">"{review.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Feedback */}
      <section id="contact" className="py-16 bg-[#231a14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <div className="inline-flex items-center gap-2 text-amber-500 text-sm font-medium mb-2">
                <Phone className="w-4 h-4" /> Get in Touch
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Contact Us</h2>
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Address</div>
                    <div className="text-sm text-amber-100/60">26 Oakfield Avenue, Glasgow, G12 8LS</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Phone</div>
                    <div className="text-sm text-amber-100/60">074 0135 2398</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Opening Hours</div>
                    <div className="text-sm text-amber-100/60">Mon - Sat: 12:00 PM - 7:00 PM</div>
                    <div className="text-sm text-amber-100/60">Sunday: Closed</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://www.facebook.com/calabartasteescotland/" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-[#1a1410] border border-amber-900/30 flex items-center justify-center hover:bg-amber-600/20 transition-colors">
                  <Facebook className="w-5 h-5 text-amber-400" />
                </a>
                <a href="https://www.instagram.com/calabartasteescotland/" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-[#1a1410] border border-amber-900/30 flex items-center justify-center hover:bg-amber-600/20 transition-colors">
                  <Instagram className="w-5 h-5 text-amber-400" />
                </a>
              </div>
              <div className="mt-6 bg-[#1a1410] border border-amber-900/30 rounded-xl p-4 text-center">
                <p className="text-xs text-amber-100/50 mb-3">Scan to visit our website</p>
                <img src="/qr-code.png" alt="QR Code" className="w-32 h-32 mx-auto rounded-lg" />
              </div>
            </div>

            <div className="bg-[#1a1410] border border-amber-900/30 rounded-2xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-white mb-4">Send Feedback</h3>
              {feedbackSent ? (
                <div className="bg-green-600/20 border border-green-600/30 text-green-400 px-4 py-4 rounded-xl text-sm">
                  Thank you! Your feedback has been sent.
                </div>
              ) : (
                <form onSubmit={handleFeedback} className="space-y-4">
                  <input
                    placeholder="Your Name"
                    value={feedback.name}
                    onChange={(e) => setFeedback({ ...feedback, name: e.target.value })}
                    className="w-full bg-[#231a14] border border-amber-900/30 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={feedback.email}
                    onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
                    className="w-full bg-[#231a14] border border-amber-900/30 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <input
                    placeholder="Phone (optional)"
                    value={feedback.phone}
                    onChange={(e) => setFeedback({ ...feedback, phone: e.target.value })}
                    className="w-full bg-[#231a14] border border-amber-900/30 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                  <textarea
                    placeholder="Your message or feedback..."
                    value={feedback.comment}
                    onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                    rows={4}
                    className="w-full bg-[#231a14] border border-amber-900/30 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={feedbackMutation.isPending}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {feedbackMutation.isPending ? "Sending..." : "Send Feedback"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1410] border-t border-amber-900/30 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-amber-500" />
              <span className="font-bold text-amber-400">Calabar Tastee</span>
            </div>
            <p className="text-sm text-amber-100/40">© 2025 Calabar Tastee Ltd. All rights reserved.</p>
            <a href="/admin/login" className="text-xs text-amber-100/30 hover:text-amber-400 transition-colors">Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
