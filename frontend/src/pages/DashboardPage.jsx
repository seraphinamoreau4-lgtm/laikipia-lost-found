import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, TrendingUp, Package, CheckCircle, Clock, Sparkles, Eye, ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { itemsAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import ItemCard from '../components/items/ItemCard';

function StatCard({ icon, label, value, sub, colorClass = 'stat-icon-default', bg = 'white' }) {
  return (
    <div className="card" style={{ padding: '22px 24px', background: bg }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <div className={colorClass} style={{ opacity: 0.7 }}>{icon}</div>
      </div>
      <div className={colorClass} style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [myItems, setMyItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [itemsRes, statsRes] = await Promise.all([
          itemsAPI.getAll({ user_id: user.id, limit: 20, status: 'all' }),
          itemsAPI.getStats()
        ]);
        setMyItems(itemsRes.data.data.items);
        setStats(statsRes.data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user.id]);

  const filtered = myItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'lost') return item.type === 'lost';
    if (activeTab === 'found') return item.type === 'found';
    if (activeTab === 'resolved') return item.status === 'resolved';
    return true;
  });

  const myLost = myItems.filter(i => i.type === 'lost').length;
  const myFound = myItems.filter(i => i.type === 'found').length;
  const myResolved = myItems.filter(i => i.status === 'resolved').length;
  const myMatches = myItems.reduce((sum, i) => sum + (i.match_count || 0), 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ padding: '36px 0 60px' }}>
      <div className="container">
        {/* Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--navy)', marginBottom: 4 }}>
              {greeting()}, {user?.full_name?.split(' ')[0]} 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              {user?.student_id && <span style={{ fontWeight: 500, color: 'var(--navy-soft)' }}>{user.student_id} · </span>}
              {user?.department || 'Laikipia University'} · {user?.role}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/browse" className="btn btn-outline">
              <Search size={16} /> Browse Items
            </Link>
            <Link to="/report" className="btn btn-primary">
              <PlusCircle size={16} /> Report Item
            </Link>
          </div>
        </div>

        {/* My Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard icon={<Package size={20} />} label="My Lost Reports" value={myLost} sub="Items reported lost" />
          <StatCard icon={<CheckCircle size={20} />} label="My Found Reports" value={myFound} sub="Items I found" colorClass="stat-icon-success" />
          <StatCard icon={<TrendingUp size={20} />} label="Resolved" value={myResolved} sub="Successful reunions" colorClass="stat-icon-gold" />
          <StatCard icon={<Sparkles size={20} />} label="AI Matches" value={myMatches} sub="Potential matches found" colorClass="stat-icon-purple" />
        </div>

        {/* Platform Stats teaser */}
        {stats && (
          <div style={{
            background: 'linear-gradient(135deg, var(--navy), var(--navy-mid))',
            borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: 32,
            display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center'
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Campus-wide</p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'white', marginBottom: 0 }}>Platform Overview</h3>
            </div>
            {[
              { label: 'Total Lost', value: stats.total_lost },
              { label: 'Total Found', value: stats.total_found },
              { label: 'Resolved', value: stats.total_resolved },
              { label: 'Recovery Rate', value: `${stats.recovery_rate}%` },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold-light)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
            <Link to="/browse" className="btn btn-gold btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
        )}

        {/* My Items */}
        <div>
          <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--navy)' }}>My Reports</h2>
            <div className="flex gap-2">
              {['all', 'lost', 'found', 'resolved'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="btn btn-sm"
                  style={{
                    background: activeTab === tab ? 'var(--navy)' : 'white',
                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                    border: '1.5px solid', borderColor: activeTab === tab ? 'var(--navy)' : 'var(--border)',
                    textTransform: 'capitalize', fontFamily: 'var(--font-body)'
                  }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 300, background: 'var(--cream-dark)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s ease infinite' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No items {activeTab !== 'all' ? `in "${activeTab}"` : 'reported yet'}</h3>
              <p>Start by reporting a lost or found item</p>
              <Link to="/report" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
                <PlusCircle size={16} /> Report Your First Item
              </Link>
            </div>
          ) : (
            <div className="items-grid">
              {filtered.map(item => <ItemCard key={item.id} item={item} showMatchCount />)}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {stats?.recent_activity?.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--navy)', marginBottom: 16 }}>Campus Activity</h2>
            <div className="card" style={{ overflow: 'hidden' }}>
              {stats.recent_activity.map((activity, i) => (
                <Link key={activity.id} to={`/items/${activity.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', textDecoration: 'none',
                  borderBottom: i < stats.recent_activity.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                  transition: 'background 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-dark)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: activity.type === 'lost' ? 'rgba(15,31,61,0.08)' : 'rgba(45,155,110,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}>
                    {activity.category_icon || (activity.type === 'lost' ? '🔍' : '✅')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{activity.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      by {activity.reporter_name} · {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <span className={`badge badge-${activity.type}`}>{activity.type}</span>
                  <span className={`badge badge-${activity.status}`}>{activity.status}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
