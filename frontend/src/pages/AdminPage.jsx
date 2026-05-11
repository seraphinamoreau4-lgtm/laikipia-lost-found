import { useState, useEffect } from 'react';
import { Users, Package, Flag, FileText, CheckCircle, X, ShieldCheck, Eye, BarChart3 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { adminAPI, itemsAPI } from '../services/api';

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 18px', border: 'none', cursor: 'pointer',
      borderBottom: `3px solid ${active ? 'var(--navy)' : 'transparent'}`,
      background: 'transparent', color: active ? 'var(--navy)' : 'var(--text-muted)',
      fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: active ? 600 : 400,
      transition: 'all 0.2s', position: 'relative'
    }}>
      {icon} {label}
      {badge > 0 && (
        <span style={{ background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 6px' }}>{badge}</span>
      )}
    </button>
  );
}

// ── USERS TAB ────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ search, limit: 30 });
      setUsers(res.data.data.users);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const toggleActive = async (id, current) => {
    const user = users.find(u => u.id === id);
    try {
      await adminAPI.updateUser(id, { role: user.role, is_active: !current });
      toast.success(`User ${current ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const changeRole = async (id, role) => {
    const user = users.find(u => u.id === id);
    try {
      await adminAPI.updateUser(id, { role, is_active: user.is_active });
      toast.success('Role updated');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input className="form-input" style={{ maxWidth: 340 }} placeholder="Search by name, email or student ID…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--cream-dark)' }}>
              {['User', 'Student ID', 'Role', 'Items', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--navy)', fontSize: 12, letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--cream-dark)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{u.full_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{u.email}</div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.student_id || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                    style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--navy)', cursor: 'pointer' }}>
                    {['student', 'staff', 'security', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.item_count}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {format(new Date(u.created_at), 'MMM d, yyyy')}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button className={`btn btn-sm ${u.is_active ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => toggleActive(u.id, u.is_active)}
                    style={{ fontSize: 11, padding: '5px 10px' }}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CLAIMS TAB ───────────────────────────────────────────────
function ClaimsTab({ onCountChange }) {
  const [claims, setClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getClaims({ status: statusFilter });
      setClaims(res.data.data);
      if (statusFilter === 'pending') onCountChange(res.data.data.length);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const review = async (id, status) => {
    try {
      await adminAPI.reviewClaim(id, { status, admin_note: note });
      toast.success(`Claim ${status}`);
      setNote('');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="btn btn-sm"
            style={{
              textTransform: 'capitalize', fontFamily: 'var(--font-body)',
              background: statusFilter === s ? 'var(--navy)' : 'white',
              color: statusFilter === s ? 'white' : 'var(--text-secondary)',
              border: '1.5px solid', borderColor: statusFilter === s ? 'var(--navy)' : 'var(--border)'
            }}>{s}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading claims…</div>
        : claims.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><h3>No {statusFilter} claims</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {claims.map(claim => (
              <div key={claim.id} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Item</div>
                    <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{claim.item_title}</div>
                    <span className={`badge badge-${claim.item_type}`} style={{ marginTop: 4 }}>{claim.item_type}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Claimant</div>
                    <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{claim.claimant_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{claim.claimant_student_id}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--cream-dark)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>PROOF OF OWNERSHIP</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{claim.proof_description}</p>
                </div>

                {claim.status === 'pending' && (
                  <div>
                    <input className="form-input" style={{ marginBottom: 10, fontSize: 13 }}
                      placeholder="Admin note (optional)…" value={note} onChange={e => setNote(e.target.value)} />
                    <div className="flex gap-3">
                      <button className="btn btn-sm" onClick={() => review(claim.id, 'approved')}
                        style={{ background: '#065F46', color: 'white', border: 'none', flex: 1, justifyContent: 'center' }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button className="btn btn-sm" onClick={() => review(claim.id, 'rejected')}
                        style={{ background: '#B91C1C', color: 'white', border: 'none', flex: 1, justifyContent: 'center' }}>
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {claim.status !== 'pending' && (
                  <div className={`badge ${claim.status === 'approved' ? 'badge-approved' : 'badge-rejected'}`} style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    fontSize: 13, fontWeight: 600
                  }}>
                    {claim.status === 'approved' ? '✅' : '❌'} {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                    {claim.admin_note && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {claim.admin_note}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    itemsAPI.getStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  if (!stats) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading statistics…</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Lost Reports', value: stats.total_lost, color: 'var(--navy)' },
          { label: 'Total Found Reports', value: stats.total_found, colorClass: 'stat-color-success' },
          { label: 'Resolved Items', value: stats.total_resolved, colorClass: 'stat-color-gold' },
          { label: 'Recovery Rate', value: `${stats.recovery_rate}%`, colorClass: 'stat-color-purple' },
          { label: 'Today\'s Reports', value: stats.today_items, colorClass: 'stat-color-info' },
          { label: 'Registered Users', value: stats.total_users, colorClass: 'stat-color-navy' },
          { label: 'Pending Claims', value: stats.pending_claims, colorClass: 'stat-color-danger' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '18px 20px' }}>
            <div className={s.colorClass} style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category Breakdown */}
      {stats.category_breakdown?.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 20 }}>Category Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.category_breakdown.map(cat => {
              const total = (cat.lost_count || 0) + (cat.found_count || 0);
              const maxTotal = Math.max(...stats.category_breakdown.map(c => (c.lost_count || 0) + (c.found_count || 0)));
              const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 500 }}>{cat.icon} {cat.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.lost_count || 0} lost · {cat.found_count || 0} found</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--cream-dark)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cat.color || 'var(--navy)', borderRadius: 99, transition: 'width 0.6s var(--ease)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {stats.recent_activity?.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>Recent Activity</h3>
          </div>
          {stats.recent_activity.map((a, i) => (
            <div key={a.id} style={{ padding: '12px 20px', borderBottom: i < stats.recent_activity.length - 1 ? '1px solid var(--cream-dark)' : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{a.category_icon || '📦'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {a.reporter_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
              </div>
              <span className={`badge badge-${a.type}`}>{a.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AUDIT LOG TAB ────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAuditLog().then(r => setLogs(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const actionColors = { CREATE_ITEM: '#065F46', DELETE_ITEM: '#B91C1C', UPDATE_ITEM: '#92400E' };

  const getActionClass = (action) => {
    switch (action) {
      case 'CREATE_ITEM': return 'badge-create';
      case 'DELETE_ITEM': return 'badge-delete';
      case 'UPDATE_ITEM': return 'badge-update';
      default: return 'badge';
    }
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--cream-dark)' }}>
            {['Action', 'User', 'Entity', 'IP', 'Time'].map(h => (
              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--navy)', fontSize: 11, letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
            : logs.map(log => (
              <tr key={log.id} style={{ borderTop: '1px solid var(--cream-dark)' }}>
                <td style={{ padding: '10px 14px' }}>
                  <span className={`badge ${getActionClass(log.action)}`} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--navy)', fontWeight: 500 }}>{log.full_name || '—'}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{log.entity_type} #{log.entity_id}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.ip_address || '—'}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ── MAIN ADMIN PAGE ──────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingClaims, setPendingClaims] = useState(0);

  return (
    <div style={{ padding: '32px 0 60px' }}>
      <div className="container">
        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} color="var(--gold-light)" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--navy)', lineHeight: 1 }}>Admin Panel</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Laikipia University Lost & Found — Management Console</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '2px solid var(--border)', marginBottom: 24, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={15} />} label="Overview" />
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={15} />} label="Users" />
          <TabButton active={activeTab === 'claims'} onClick={() => setActiveTab('claims')} icon={<Flag size={15} />} label="Claims" badge={pendingClaims} />
          <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<FileText size={15} />} label="Audit Log" />
        </div>

        {/* Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'claims' && <ClaimsTab onCountChange={setPendingClaims} />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
