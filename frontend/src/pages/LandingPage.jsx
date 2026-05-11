import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Sparkles, Shield, Clock, Users, CheckCircle, MapPin, BookOpen, Laptop, Key, CreditCard, Shirt, Trophy } from 'lucide-react';
import { itemsAPI } from '../services/api';

// ─── HERO SECTION ─────────────────────────────────────────────
function Hero() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_lost: 0, total_found: 0, total_resolved: 0 });
  const [count, setCount] = useState({ lost: 0, found: 0, resolved: 0 });

  useEffect(() => {
    itemsAPI.getStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  // Count-up animation
  useEffect(() => {
    const targets = { lost: stats.total_lost, found: stats.total_found, resolved: stats.total_resolved };
    const duration = 1800;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount({
        lost: Math.round(targets.lost * ease),
        found: Math.round(targets.found * ease),
        resolved: Math.round(targets.resolved * ease),
      });
      if (progress < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stats]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/browse?search=${encodeURIComponent(search)}`);
  };

  return (
    <section style={{
      background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 60%, #1a3d6e 100%)',
      color: 'white',
      padding: '80px 0 100px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(212,146,42,0.08) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 40%),
                          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
        {/* University Logo */}
        <div style={{ marginBottom: 32 }}>
          <img src="/laikipia.logo.jpg" alt="Laikipia University" style={{ 
            height: 80, 
            width: 'auto',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }} />
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(212,146,42,0.15)', border: '1px solid rgba(212,146,42,0.3)',
          borderRadius: 99, padding: '6px 16px', marginBottom: 32,
          fontSize: 13, fontWeight: 500, color: 'var(--gold-light)'
        }}>
          <Sparkles size={14} />
          AI-Powered Item Matching Technology
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 72px)',
          color: 'white', lineHeight: 1.1, marginBottom: 24, maxWidth: 800, margin: '0 auto 24px'
        }}>
          Find What Matters.<br />
          <em style={{ color: 'var(--gold-light)' }}>Return What Belongs.</em>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 19px)', color: 'rgba(255,255,255,0.75)',
          maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.7
        }}>
          Laikipia University's centralized lost & found platform. Report lost items, post found ones, and let our AI connect them automatically.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{
          display: 'flex', maxWidth: 560, margin: '0 auto 64px',
          background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
          padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for a lost item…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: 'var(--navy)', background: 'transparent', fontFamily: 'var(--font-body)' }}
            />
          </div>
          <button type="submit" className="btn btn-gold" style={{ borderRadius: 'var(--radius-lg)', padding: '12px 24px' }}>
            Search <ArrowRight size={16} />
          </button>
        </form>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 4vw, 64px)',
          flexWrap: 'wrap'
        }}>
          {[
            { num: count.lost, label: 'Items Reported Lost' },
            { num: count.found, label: 'Items Found & Posted' },
            { num: count.resolved, label: 'Successful Reunions' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)',
                color: 'var(--gold-light)', lineHeight: 1
              }}>{s.num.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0 }}>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="var(--cream)"/>
        </svg>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ──────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon: '✍️', title: 'Report Your Item', desc: 'Fill in details about your lost or found item — description, location, category, and any photos.' },
    { icon: '🤖', title: 'AI Scans for Matches', desc: 'Our Claude-powered AI instantly compares your report against all existing items and scores potential matches.' },
    { icon: '🔔', title: 'Get Notified', desc: 'Receive real-time alerts when a high-confidence match is found — no more manual searching.' },
    { icon: '🤝', title: 'Connect & Recover', desc: 'Message the other party securely, submit a claim, and get your item back through our verified process.' },
  ];

  return (
    <section style={{ padding: '80px 0', background: 'var(--surface)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Simple Process</p>
          <h2 className="section-title">How It Works</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            From report to reunion in four easy steps
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, position: 'relative' }}>
          {steps.map((s, i) => (
            <div key={i} className="animate-fade-in" style={{ textAlign: 'center', animationDelay: `${i * 0.1}s` }}>
              <div style={{
                width: 72, height: 72, borderRadius: 'var(--radius-lg)',
                background: i % 2 === 0 ? 'var(--navy)' : 'var(--gold-pale)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 20px',
                boxShadow: i % 2 === 0 ? '0 8px 24px rgba(15,31,61,0.2)' : '0 8px 24px rgba(212,146,42,0.2)'
              }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>STEP {i + 1}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--navy)', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── RECENT ITEMS ──────────────────────────────────────────────
function RecentItems() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState('lost');

  useEffect(() => {
    itemsAPI.getAll({ type, limit: 6, status: 'open' })
      .then(r => setItems(r.data.data.items))
      .catch(() => {});
  }, [type]);

  const categoryIcons = { '💻': '#3B82F6', '📚': '#F59E0B', '🔑': '#10B981', '👜': '#EC4899', '🪪': '#8B5CF6' };

  return (
    <section style={{ padding: '80px 0', background: 'var(--cream)' }}>
      <div className="container">
        <div className="flex justify-between items-center" style={{ marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Recent Reports</p>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Latest Items</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="type-tab-bar">
              <button className={`type-tab ${type === 'lost' ? 'active-lost' : ''}`} onClick={() => setType('lost')}>Lost</button>
              <button className={`type-tab ${type === 'found' ? 'active-found' : ''}`} onClick={() => setType('found')}>Found</button>
            </div>
            <Link to="/browse" className="btn btn-outline btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No items yet</h3>
            <p>Be the first to report an item</p>
          </div>
        ) : (
          <div className="items-grid">
            {items.map((item, i) => (
              <Link key={item.id} to={`/items/${item.id}`} style={{ textDecoration: 'none' }}>
                <div className="card card-hover animate-fade-in" style={{ overflow: 'hidden', animationDelay: `${i * 0.08}s` }}>
                  <div style={{
                    height: 140, background: 'var(--cream-dark)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40, position: 'relative', overflow: 'hidden'
                  }}>
                    {item.primary_image
                      ? <img src={item.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ opacity: 0.4 }}>{item.category_icon || '📦'}</span>
                    }
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: item.type === 'lost' ? 'var(--navy)' : '#065F46',
                      color: 'white', fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 99, letterSpacing: '0.06em'
                    }}>{item.type === 'lost' ? 'LOST' : 'FOUND'}</div>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                      {item.category_icon} {item.category_name}
                    </div>
                    <h4 style={{ fontSize: 15, fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 6, lineHeight: 1.3 }} className="truncate">{item.title}</h4>
                    <div className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <MapPin size={12} /> {item.location_name || item.location_detail || 'Unknown location'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── FEATURES SECTION ──────────────────────────────────────────
function Features() {
  const features = [
    { icon: <Sparkles size={22} />, title: 'AI-Powered Matching', desc: 'Claude AI analyzes item descriptions, categories, and locations to automatically pair lost and found reports.' },
    { icon: <Shield size={22} />, title: 'Secure & Verified', desc: 'Claims go through an admin review process. Only verified Laikipia University members can submit reports.' },
    { icon: <Clock size={22} />, title: 'Real-Time Alerts', desc: 'Instant notifications when a match is found, a message arrives, or your claim is reviewed.' },
    { icon: <Users size={22} />, title: 'Direct Messaging', desc: 'Communicate privately and securely with the person who found (or lost) your item.' },
    { icon: <Search size={22} />, title: 'Smart Search', desc: 'Filter by category, location, date range, and more. Find exactly what you\'re looking for.' },
    { icon: <CheckCircle size={22} />, title: 'Resolution Tracking', desc: 'Track the status of every item from open report to successful recovery with full audit trail.' },
  ];

  return (
    <section style={{ padding: '80px 0', background: 'var(--navy)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ color: 'var(--gold-light)', fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Platform Features</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 48px)', color: 'white', marginBottom: 12 }}>
            Everything You Need
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Built specifically for the Laikipia University campus community
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: '28px 24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-lg)',
              transition: 'background 0.2s, border-color 0.2s',
              cursor: 'default'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(212,146,42,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: 'rgba(212,146,42,0.15)', color: 'var(--gold-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18
              }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'white', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA SECTION ───────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ padding: '80px 0', background: 'var(--gold-pale)', borderTop: '1px solid var(--sand)' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 24 }}>🎓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 48px)', color: 'var(--navy)', marginBottom: 16 }}>
          Lost something on campus?
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Join hundreds of Laikipia University students and staff who've already recovered their belongings through our platform.
        </p>
        <div className="flex justify-between items-center" style={{ justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg">
            Create Free Account <ArrowRight size={18} />
          </Link>
          <Link to="/browse" className="btn btn-outline btn-lg">
            Browse Items
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: 60, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white'
            }}>LU</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'white' }}>Lost & Found</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>LAIKIPIA UNIVERSITY</div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/browse" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>Browse</Link>
            <Link to="/login" className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Sign In</Link>
            <Link to="/register" className="btn btn-gold btn-sm">Register</Link>
          </div>
        </div>
      </div>
      <div style={{ paddingTop: 60 }}>
        <Hero />
        <HowItWorks />
        <RecentItems />
        <Features />
        <CTA />
        <footer style={{
          background: 'var(--navy)', color: 'rgba(255,255,255,0.5)',
          padding: '20px 0', textAlign: 'center', fontSize: 12
        }}>
          © 2026 Laikipia University — BICT 328 Group 1 · Department of Computing & Informatics
        </footer>
      </div>
    </div>
  );
}
