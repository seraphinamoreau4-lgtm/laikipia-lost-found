import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Building2, BadgeCheck, Edit3, Save, X, Lock, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { authAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import ItemCard from '../components/items/ItemCard';

export default function ProfilePage() {
  const { user, updateUser, fetchMe, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '', department: user?.department || '' });
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [meData, setMeData] = useState(null);

  useEffect(() => {
    authAPI.me().then(r => setMeData(r.data.data)).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await authAPI.updateProfile(form);
      updateUser(form);
      toast.success('Profile updated!');
      setEditing(false);
      fetchMe();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (passForm.new_password !== passForm.confirm) { toast.error("Passwords don't match"); return; }
    if (passForm.new_password.length < 8) { toast.error('Min 8 characters'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ current_password: passForm.current_password, new_password: passForm.new_password });
      toast.success('Password changed!');
      setChangingPass(false);
      setPassForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const data = meData || user;

  return (
    <div style={{ padding: '36px 0 60px' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--navy)', marginBottom: 28 }}>My Profile</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left — Avatar & stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: '28px 24px', textAlign: 'center' }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%', background: 'var(--navy)',
                color: 'var(--gold-light)', fontSize: 32, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', border: '4px solid var(--gold-pale)'
              }}>{initials}</div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--navy)', marginBottom: 4 }}>{user?.full_name}</h2>
              {user?.student_id && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{user.student_id}</p>}
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: user?.role === 'admin' ? 'var(--navy)' : 'var(--gold-pale)',
                color: user?.role === 'admin' ? 'white' : 'var(--gold)',
                textTransform: 'capitalize'
              }}>{user?.role}</span>

              <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                {[
                  { label: 'Lost', value: data?.lost_count || 0 },
                  { label: 'Found', value: data?.found_count || 0 },
                  { label: 'Resolved', value: data?.resolved_count || 0 },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--navy)' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {data?.created_at && (
                <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 12 }}>
                  Member since {format(new Date(data.created_at), 'MMMM yyyy')}
                </p>
              )}
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 12 }}>Quick Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/report?type=lost" className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}>Report Lost Item</Link>
                <Link to="/report?type=found" className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}>Report Found Item</Link>
                <Link to="/messages" className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}>Messages</Link>
                <button onClick={() => { logout(); window.location.href = '/'; }} className="btn btn-danger btn-sm" style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Right — Profile form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Info Card */}
            <div className="card" style={{ padding: '28px 28px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>Personal Information</h3>
                {!editing ? (
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}><X size={14} /></button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={loading}>
                      {loading ? <div className="spinner" /> : <Save size={14} />} Save
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {editing ? (
                  <>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Full Name</label>
                      <input className="form-input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254 700 000 000" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <input className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                    </div>
                  </>
                ) : (
                  [
                    { icon: <User size={15} />, label: 'Full Name', value: user?.full_name },
                    { icon: <Mail size={15} />, label: 'Email', value: user?.email },
                    { icon: <BadgeCheck size={15} />, label: 'Student ID', value: user?.student_id || 'N/A' },
                    { icon: <Building2 size={15} />, label: 'Department', value: user?.department || 'Not set' },
                    { icon: <Phone size={15} />, label: 'Phone', value: user?.phone || 'Not set' },
                    { icon: <BadgeCheck size={15} />, label: 'Role', value: user?.role },
                  ].map((field, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}>{field.icon}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{field.label}</div>
                        <div style={{ fontSize: 14, color: 'var(--navy)', fontWeight: 500 }}>{field.value}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Change Password */}
            <div className="card" style={{ padding: '24px 28px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: changingPass ? 20 : 0 }}>
                <div className="flex items-center gap-3">
                  <Lock size={18} color="var(--text-muted)" />
                  <h3 style={{ fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>Change Password</h3>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setChangingPass(!changingPass)}>
                  {changingPass ? <><X size={14} /> Cancel</> : 'Change'}
                </button>
              </div>

              {changingPass && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Current Password', key: 'current_password' },
                    { label: 'New Password', key: 'new_password' },
                    { label: 'Confirm New Password', key: 'confirm' },
                  ].map(f => (
                    <div key={f.key} className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input className="form-input" type="password" value={passForm[f.key]}
                        onChange={e => setPassForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <button className="btn btn-primary" onClick={handleChangePassword} disabled={loading} style={{ alignSelf: 'flex-start' }}>
                    {loading ? <><div className="spinner" /> Saving…</> : 'Update Password'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
