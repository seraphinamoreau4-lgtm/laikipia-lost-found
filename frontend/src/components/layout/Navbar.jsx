import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, X, MessageCircle, LayoutDashboard, PlusCircle, LogOut, User, ShieldCheck } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { notificationsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) loadNotifications();
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      const notifs = res.data.data;
      setNotifications(notifs.slice(0, 8));
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/browse', label: 'Browse Items' },
    { to: '/report', label: 'Report Item' },
  ];

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 8px rgba(15,31,61,0.06)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: 64, gap: 24 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img src="/laikipia.logo.jpg" alt="Laikipia University logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--navy)', lineHeight: 1.1 }}>Lost & Found</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>LAIKIPIA UNIVERSITY</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="flex gap-2" style={{ flex: 1 }}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className="btn btn-ghost"
              style={{ color: location.pathname === l.to ? 'var(--navy)' : 'var(--text-secondary)', fontWeight: location.pathname === l.to ? 600 : 400 }}>
              {l.label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link to="/dashboard" className="btn btn-ghost"
              style={{ color: location.pathname === '/dashboard' ? 'var(--navy)' : 'var(--text-secondary)' }}>
              Dashboard
            </Link>
          )}
          {isAuthenticated && ['admin', 'security'].includes(user?.role) && (
            <Link to="/admin" className="btn btn-ghost"
              style={{ color: location.pathname === '/admin' ? 'var(--navy)' : 'var(--text-secondary)' }}>
              Admin
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Messages */}
              <Link to="/messages" className="btn btn-ghost" style={{ padding: '8px 10px', position: 'relative' }}>
                <MessageCircle size={20} />
              </Link>

              {/* Notifications */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button className="btn btn-ghost" style={{ padding: '8px 10px', position: 'relative' }}
                  onClick={() => setNotifOpen(!notifOpen)}>
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 4, right: 4, background: 'var(--gold)',
                      color: 'white', borderRadius: '99px', fontSize: 10, fontWeight: 700,
                      minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', border: '2px solid white'
                    }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 340, background: 'white', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', zIndex: 200,
                    overflow: 'hidden'
                  }}>
                    <div className="flex justify-between items-center" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                      {unreadCount > 0 && <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={handleMarkAllRead}>Mark all read</button>}
                    </div>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications yet</div>
                      ) : notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '12px 16px', borderBottom: '1px solid var(--cream-dark)',
                          background: n.is_read ? 'white' : 'var(--gold-pale)',
                          cursor: 'default'
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.body}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Report button */}
              <Link to="/report" className="btn btn-gold btn-sm">
                <PlusCircle size={16} /> Report
              </Link>

              {/* Avatar menu */}
              <Link to="/profile" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px 6px 6px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--cream-dark)',
                cursor: 'pointer', textDecoration: 'none'
              }}>
                <div className="avatar avatar-sm" style={{ background: 'var(--navy)', color: 'var(--gold-light)', fontSize: 11, fontWeight: 700 }}>
                  {user?.avatar_url ? <img src={user.avatar_url} alt={user.full_name} /> : getInitials(user?.full_name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)', maxWidth: 100 }} className="truncate">
                  {user?.full_name?.split(' ')[0]}
                </span>
              </Link>

              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '8px 12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }} title="Logout">
                <LogOut size={18} />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
