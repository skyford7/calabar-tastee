import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { ExternalLink, MapPin, Phone, Clock, Mail, ChevronDown, GraduationCap } from "lucide-react";

const categories = ["All", "Drinks", "Swallow", "Soups", "Main Course", "Sides", "Grills & Pepper Soups"];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const { data: menuItems } = trpc.menu.list.useQuery();
  const { data: hoursStatus } = trpc.hours.status.useQuery();
  const { data: allHours } = trpc.hours.list.useQuery();

  const filtered = activeCategory === "All"
    ? menuItems
    : menuItems?.filter(m => m.category === activeCategory);

  const statusColors: Record<string, string> = {
    open: "bg-green-500",
    opening_soon: "bg-amber-500",
    closing_soon: "bg-amber-500",
    closed: "bg-red-500",
  };

  const randomLetters = ["A", "K", "I", "N"];

  return (
    <div className="min-h-screen bg-[#1a1410]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1410]/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <a href="/" className="text-xl md:text-2xl font-bold text-gradient font-['Playfair_Display']">Calabar Tastee</a>
            <div className="hidden md:flex items-center gap-8">
              {["Home", "About", "Menu", "Contact"].map(link => (
                <a key={link} href={`#${link.toLowerCase()}`} onClick={e => { e.preventDefault(); document.querySelector(`#${link.toLowerCase()}`)?.scrollIntoView({ behavior: "smooth" }); }} className="text-amber-100/80 hover:text-amber-400 transition-colors text-sm font-medium">{link}</a>
              ))}
              <div className="flex gap-2">
                <a href="https://www.just-eat.co.uk/restaurants-calabar-tastee-edinburgh" target="_blank" rel="noreferrer" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1"><ExternalLink className="w-3 h-3" />Just Eat</a>
                <a href="https://deliveroo.co.uk/menu/edinburgh/southwest-edinburgh/calabar-tastee" target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1"><ExternalLink className="w-3 h-3" />Deliveroo</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <img src="/restaurant-hero.jpg" alt="Calabar Tastee" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#1a1410]" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600/20 border border-amber-500/30 mb-6">
            <span className={`w-2 h-2 rounded-full animate-pulse ${statusColors[hoursStatus?.status || "closed"]}`} />
            <span className="text-amber-300 text-sm font-medium">{hoursStatus?.label || "Checking hours..."}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600/20 border border-blue-500/40 mb-6 animate-bounce">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 text-sm font-semibold">10% OFF for Students - Present Valid Student ID</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
            Taste the Soul of <span className="block text-gradient">Nigeria in Edinburgh</span>
          </h1>
          <p className="text-lg sm:text-xl text-amber-100/80 max-w-2xl mx-auto mb-8">
            Experience authentic Calabar flavors crafted with love. From our famous Jollof Rice to traditional soups, every dish tells a story of Nigerian heritage.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-10 text-amber-100/70 text-sm">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-500" /><span>185 Dalry Road, Edinburgh EH11 2EB</span></div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-amber-500" /><span>07961 711422</span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /><span>Eat In, Takeaway & Delivery</span></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a href="https://www.just-eat.co.uk/restaurants-calabar-tastee-edinburgh" target="_blank" rel="noreferrer" className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 text-lg font-semibold rounded-full flex items-center justify-center gap-2 animate-pulse">
              <ExternalLink className="w-5 h-5" />Order on Just Eat
            </a>
            <a href="https://deliveroo.co.uk/menu/edinburgh/southwest-edinburgh/calabar-tastee" target="_blank" rel="noreferrer" className="border border-green-500/50 text-green-400 hover:bg-green-600/20 px-8 py-4 text-lg rounded-full flex items-center justify-center gap-2">
              <ExternalLink className="w-5 h-5" />Order on Deliveroo
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 text-amber-100/60 text-sm">
            <div className="flex -space-x-2">
              {randomLetters.map((l, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-[#1a1410] flex items-center justify-center text-xs font-bold text-white">{l}</div>
              ))}
            </div>
            <span>Join 500+ happy customers</span>
          </div>
        </div>
        <button onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-amber-400/60 hover:text-amber-400 transition-colors animate-bounce"><ChevronDown className="w-8 h-8" /></button>
      </section>

      {/* About */}
      <section id="about" className="py-20 md:py-28 bg-[#1a1410] relative">
        <div className="absolute inset-0 bg-pattern opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img src="/about-image-1.jpg" alt="Calabar Tastee Food" className="rounded-2xl shadow-2xl w-full h-48 md:h-64 object-cover translate-y-8" />
                <img src="/about-image-2.jpg" alt="Calabar Tastee Dishes" className="rounded-2xl shadow-2xl w-full h-48 md:h-64 object-cover" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-6 py-3 rounded-full shadow-xl font-bold text-lg">Est. 2026</div>
            </div>
            <div>
              <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider">About Us</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-3 mb-6">
                Bringing the <span className="text-gradient">Flavors of Calabar</span> to Scotland
              </h2>
              <p className="text-amber-100/70 text-lg leading-relaxed mb-6">
                Calabar Tastee is Edinburgh&apos;s premier destination for authentic Nigerian cuisine. Located on Dalry Road, we specialize in traditional Calabar dishes that celebrate the rich culinary heritage of South-South Nigeria.
              </p>
              <p className="text-amber-100/70 text-lg leading-relaxed mb-8">
                From our signature Edikaikong soup to the famous Nigerian Jollof Rice, every dish is prepared with authentic recipes and the finest ingredients. We offer eat-in, takeaway, and delivery options.
              </p>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center"><div className="text-3xl md:text-4xl font-bold text-amber-500">40+</div><div className="text-amber-100/60 text-sm">Menu Items</div></div>
                <div className="text-center"><div className="text-3xl md:text-4xl font-bold text-amber-500">500+</div><div className="text-amber-100/60 text-sm">Happy Customers</div></div>
                <div className="text-center"><div className="text-3xl md:text-4xl font-bold text-amber-500">5★</div><div className="text-amber-100/60 text-sm">Rating</div></div>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mt-16">
            {[
              { icon: "Utensils", title: "Authentic Recipes", desc: "Traditional Calabar dishes passed down through generations, prepared with authentic Nigerian spices and techniques." },
              { icon: "Heart", title: "Made with Love", desc: "Every dish is crafted with care and passion, bringing the warmth of Nigerian hospitality to Edinburgh." },
              { icon: "Award", title: "Quality Ingredients", desc: "We use only the finest fresh ingredients and imported Nigerian spices for that true authentic taste." },
            ].map((f, i) => (
              <div key={i} className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6 hover:border-amber-500/50 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon === "Utensils" ? <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></> :
                     f.icon === "Heart" ? <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/> :
                     <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>}
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-amber-100/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="py-20 md:py-28 bg-[#14100c] relative">
        <div className="absolute inset-0 bg-pattern opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider">Our Menu</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">Authentic <span className="text-gradient">Nigerian Dishes</span></h2>
            <p className="text-amber-100/70 text-lg max-w-2xl mx-auto">Explore our selection of traditional Calabar and Nigerian dishes. Spice levels can be adjusted to your preference.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === c ? 'bg-amber-600 text-white' : 'bg-[#231a14] text-amber-100/70 hover:bg-amber-900/30 hover:text-amber-300'}`}>{c}</button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered?.map(item => (
              <div key={item.id} className="bg-[#1a1410] border border-amber-900/30 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all group flex flex-col">
                <div className="relative h-48 overflow-hidden flex-shrink-0">
                  <img src={item.imagePath || '/placeholder.jpg'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {item.isPopular && <span className="flex items-center gap-1 px-2 py-1 bg-amber-600 text-white text-xs font-semibold rounded-full">⭐ Popular</span>}
                    {item.isSpicy && <span className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">🔥 Spicy</span>}
                    {item.isPreorder && <span className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">⏰ Pre-order</span>}
                    {item.dietary && <span className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">{item.dietary}</span>}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-semibold text-lg leading-tight">{item.name}</h3>
                    <span className="text-amber-500 font-bold text-lg flex-shrink-0 ml-2">{item.price}</span>
                  </div>
                  <p className="text-amber-100/60 text-sm flex-grow">{item.description}</p>
                  <div className="flex gap-2 mt-auto pt-4">
                    <a href="https://www.just-eat.co.uk/restaurants-calabar-tastee-edinburgh" target="_blank" rel="noreferrer" className="flex-1 text-center text-xs py-2 border border-amber-600/50 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1"><ExternalLink className="w-3 h-3" />Just Eat</a>
                    <a href="https://deliveroo.co.uk/menu/edinburgh/southwest-edinburgh/calabar-tastee" target="_blank" rel="noreferrer" className="flex-1 text-center text-xs py-2 border border-green-600/50 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1"><ExternalLink className="w-3 h-3" />Deliveroo</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Form */}
      <section id="feedback" className="py-20 md:py-28 bg-[#1a1410] relative">
        <div className="absolute inset-0 bg-pattern opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider">Your Voice Matters</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">Send Us Your <span className="text-gradient">Feedback</span></h2>
            <p className="text-amber-100/70 text-lg max-w-2xl mx-auto">Share your thoughts, complaints, or suggest new menu items. We value every piece of feedback!</p>
          </div>
          <FeedbackForm />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 md:py-28 bg-[#1a1410] relative">
        <div className="absolute inset-0 bg-pattern opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider">Get in Touch</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">Visit <span className="text-gradient">Calabar Tastee</span></h2>
            <p className="text-amber-100/70 text-lg max-w-2xl mx-auto">Find us on Dalry Road in Edinburgh. Eat-in, takeaway, and delivery available.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-6 md:p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center flex-shrink-0"><MapPin className="w-6 h-6 text-amber-500" /></div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Address</h4>
                    <p className="text-amber-100/70">185 Dalry Road<br />Edinburgh, Scotland<br />EH11 2EB</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center flex-shrink-0"><Mail className="w-6 h-6 text-amber-500" /></div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Email</h4>
                    <p className="text-amber-100/70"><a href="mailto:calabartastee@gmail.com" className="hover:text-amber-400 transition-colors">calabartastee@gmail.com</a><br /><a href="mailto:contact@calabartastee.com" className="hover:text-amber-400 transition-colors">contact@calabartastee.com</a></p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center flex-shrink-0"><Phone className="w-6 h-6 text-green-500" /></div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Phone / WhatsApp</h4>
                    <p className="text-amber-100/70"><a href="tel:07961711422" className="hover:text-amber-400 transition-colors">07961 711422</a></p>
                    <a href="https://wa.me/447961711422" target="_blank" rel="noreferrer" className="text-green-500 text-sm hover:text-green-400 transition-colors">Chat on WhatsApp →</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center flex-shrink-0"><Clock className="w-6 h-6 text-amber-500" /></div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Opening Hours</h4>
                    <div className="text-amber-100/70 space-y-1">
                      {allHours?.filter(h => !h.isClosed).map(h => (
                        <div key={h.day} className="flex flex-col sm:flex-row sm:justify-between sm:gap-4">
                          <span className="capitalize">{h.dayLabel}</span>
                          <span className="font-medium">{h.openTime} - {h.closeTime}</span>
                        </div>
                      ))}
                      {allHours?.filter(h => h.isClosed).map(h => (
                        <div key={h.day} className="flex flex-col sm:flex-row sm:justify-between sm:gap-4">
                          <span className="capitalize">{h.dayLabel}</span>
                          <span className="text-red-400 font-medium">Closed</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-6 md:p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Find Us</h3>
              <div className="relative rounded-xl overflow-hidden bg-[#14100c] h-64 md:h-80 mb-6">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2233.8!2d-3.2318!3d55.9389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTXCsDU2JzIwLjAiTiAzwrAxMyc1NC40Ilc!5e0!3m2!1sen!2suk!4v1" width="100%" height="100%" style={{ border: 0, filter: 'grayscale(30%) invert(90%)' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Calabar Tastee Location" />
              </div>
              <div className="space-y-3">
                <a href="https://www.google.com/maps/dir/?api=1&destination=185+Dalry+Road+Edinburgh+EH11+2EB" target="_blank" rel="noreferrer" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">🧭 Get Directions</a>
                <a href="https://search.google.com/local/writereview?placeid=ChIJOXxbh_PHh0gRPZ67hHj811M" target="_blank" rel="noreferrer" className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">⭐ Write a Review on Google</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d0a08] border-t border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gradient font-['Playfair_Display'] mb-4">Calabar Tastee</h3>
              <p className="text-amber-100/60 text-sm leading-relaxed mb-4">Bringing the authentic flavors of Calabar, Nigeria to Edinburgh. Eat-in, takeaway, and delivery available.</p>
              <div className="flex items-start gap-2 text-amber-100/60 text-sm"><MapPin className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /><span>185 Dalry Road, Edinburgh EH11 2EB</span></div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {["Home", "About", "Menu", "Contact"].map(l => <li key={l}><a href={`#${l.toLowerCase()}`} onClick={e => { e.preventDefault(); document.querySelector(`#${l.toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="text-amber-100/60 hover:text-amber-400 transition-colors text-sm">{l}</a></li>)}
                <li><a href="https://search.google.com/local/writereview?placeid=ChIJOXxbh_PHh0gRPZ67hHj811M" target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400 transition-colors text-sm flex items-center gap-1">Write a Review <ExternalLink className="w-3 h-3" /></a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Us</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-100/60 text-sm"><Mail className="w-4 h-4 text-amber-500" /><a href="mailto:calabartastee@gmail.com" className="hover:text-amber-400 transition-colors">calabartastee@gmail.com</a></div>
                <div className="flex items-center gap-2 text-amber-100/60 text-sm"><Mail className="w-4 h-4 text-amber-500" /><a href="mailto:contact@calabartastee.com" className="hover:text-amber-400 transition-colors">contact@calabartastee.com</a></div>
                <div className="flex items-center gap-2 text-amber-100/60 text-sm"><Phone className="w-4 h-4 text-amber-500" /><a href="tel:07961711422" className="hover:text-amber-400 transition-colors">07961 711422</a></div>
                <div className="flex items-center gap-2 text-amber-100/60 text-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg><a href="https://www.tiktok.com/@calabartastee" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">@calabartastee</a></div>
                <div className="flex items-center gap-2 text-amber-100/60 text-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg><a href="https://www.instagram.com/calabartastee" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">@calabartastee</a></div>
              </div>
            </div>
          </div>
          <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-4 mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center">
              <span className="text-white font-semibold">Opening Hours:</span>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-amber-100/70 text-sm">
                <span>Mon - Sat: <span className="text-amber-400 font-medium">12:00 PM - 7:00 PM</span></span>
                <span className="hidden sm:inline">|</span>
                <span>Sunday: <span className="text-red-400 font-medium">Closed</span></span>
              </div>
            </div>
          </div>
          <div className="border-t border-amber-900/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-amber-100/40 text-sm text-center md:text-left">© {new Date().getFullYear()} Calabar Tastee. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="https://www.just-eat.co.uk/restaurants-calabar-tastee-edinburgh" target="_blank" rel="noreferrer" className="text-amber-100/40 hover:text-amber-400 text-sm flex items-center gap-1">Just Eat <ExternalLink className="w-3 h-3" /></a>
              <a href="https://deliveroo.co.uk/menu/edinburgh/southwest-edinburgh/calabar-tastee" target="_blank" rel="noreferrer" className="text-amber-100/40 hover:text-amber-400 text-sm flex items-center gap-1">Deliveroo <ExternalLink className="w-3 h-3" /></a>
            </div>
            <p className="text-amber-100/40 text-sm flex items-center gap-1">Made with <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> in Edinburgh</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeedbackForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("https://script.google.com/macros/s/AKfycbyiIME95w-TiSbOPYtQad7YNnYOLXIQueeUkP8Kx50NlT5FhZjQ78vBpQmVUEQmoJuf/exec", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || "Thank you for your feedback!" });
      if (data.success) setForm({ name: "", phone: "", email: "", comment: "" });
    } catch {
      setResult({ success: false, message: "Failed to submit. Please try again." });
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-[#231a14] border border-amber-900/30 rounded-2xl p-8 max-w-2xl mx-auto">
      {result && (
        <div className={`mb-6 p-4 rounded-lg ${result.success ? 'bg-green-600/20 border border-green-600/30 text-green-400' : 'bg-red-600/20 border border-red-600/30 text-red-400'}`}>
          {result.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-amber-100/60 mb-1">Name <span className="text-red-400">*</span></label>
          <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="block text-sm text-amber-100/60 mb-1">Phone Number</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="block text-sm text-amber-100/60 mb-1">Email <span className="text-red-400">*</span></label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="block text-sm text-amber-100/60 mb-1">Comment / Complaint / Menu Request <span className="text-red-400">*</span></label>
          <textarea required rows={4} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Share your feedback, complaint, or suggest a new menu item..." className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 resize-none" />
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
          {submitting ? "Sending..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}
