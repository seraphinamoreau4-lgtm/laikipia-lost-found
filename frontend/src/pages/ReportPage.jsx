import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle, MapPin, Calendar, Tag, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemsAPI, metaAPI } from '../services/api';

function StepIndicator({ current, steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, transition: 'all 0.3s',
              background: i < current ? 'var(--success)' : i === current ? 'var(--navy)' : 'var(--cream-dark)',
              color: i <= current ? 'white' : 'var(--text-muted)',
              border: `2px solid ${i < current ? 'var(--success)' : i === current ? 'var(--navy)' : 'var(--border)'}`,
            }}>
              {i < current ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: i === current ? 'var(--navy)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? 'var(--success)' : 'var(--border)', margin: '0 8px', marginBottom: 22, transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ImageDropzone({ images, onChange }) {
  const onDrop = useCallback(accepted => {
    const newFiles = [...images, ...accepted].slice(0, 5);
    onChange(newFiles);
  }, [images, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 5,
  });

  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div>
      <div {...getRootProps()} style={{
        border: `2px dashed ${isDragActive ? 'var(--navy)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center',
        cursor: 'pointer', background: isDragActive ? 'rgba(30,58,95,0.04)' : 'var(--cream-dark)',
        transition: 'all 0.2s'
      }}>
        <input {...getInputProps()} />
        <Upload size={32} color={isDragActive ? 'var(--navy)' : 'var(--text-muted)'} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 4, fontSize: 15 }}>
          {isDragActive ? 'Drop images here' : 'Drag & drop photos here'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to select · up to 5 images · max 5MB each</p>
      </div>

      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {images.map((file, i) => (
            <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
              <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)' }} />
              {i === 0 && (
                <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 9, background: 'var(--navy)', color: 'white', borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>PRIMARY</span>
              )}
              <button onClick={() => remove(i)} style={{
                position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STEPS = ['Item Type', 'Item Details', 'Location & Date', 'Photos & Submit'];

export default function ReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    type: searchParams.get('type') || 'lost',
    title: '',
    description: '',
    category_id: '',
    location_id: '',
    location_detail: '',
    date_occurred: new Date().toISOString().split('T')[0],
    is_valuable: false,
    reward_offered: false,
    reward_amount: '',
    contact_phone: '',
  });

  useEffect(() => {
    metaAPI.getCategories().then(r => setCategories(r.data.data)).catch(() => {});
    metaAPI.getLocations().then(r => setLocations(r.data.data)).catch(() => {});
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) { toast.error('Please enter a title'); return false; }
      if (!form.description.trim() || form.description.length < 20) { toast.error('Description must be at least 20 characters'); return false; }
      if (!form.category_id) { toast.error('Please select a category'); return false; }
    }
    if (step === 2) {
      if (!form.date_occurred) { toast.error('Please enter the date'); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => Math.min(s + 1, 3)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      images.forEach(img => fd.append('images', img));
      const res = await itemsAPI.create(fd);
      toast.success('Item reported successfully! AI matching is running…');
      navigate(`/items/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--navy)', marginBottom: 8 }}>
            Report an Item
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
            Fill in the details below. Our AI will automatically scan for matches.
          </p>
        </div>

        <div className="card" style={{ padding: '36px 40px' }}>
          <StepIndicator current={step} steps={STEPS} />

          {/* ── STEP 0: Type ── */}
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--navy)', marginBottom: 8 }}>
                What are you reporting?
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Choose whether you lost an item or found one belonging to someone else.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                {[
                  { type: 'lost', emoji: '🔍', title: 'I Lost Something', desc: 'I am looking for something I misplaced on campus.' },
                  { type: 'found', emoji: '✅', title: 'I Found Something', desc: 'I found an item that belongs to someone else.' },
                ].map(opt => (
                  <div key={opt.type} onClick={() => set('type', opt.type)}
                    style={{
                      padding: '28px 24px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                      border: `2.5px solid ${form.type === opt.type ? (opt.type === 'lost' ? 'var(--navy)' : 'var(--success)') : 'var(--border)'}`,
                      background: form.type === opt.type ? (opt.type === 'lost' ? 'rgba(15,31,61,0.04)' : 'rgba(45,155,110,0.04)') : 'white',
                      transition: 'all 0.2s', textAlign: 'center'
                    }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>{opt.emoji}</div>
                    <h3 style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--navy)', marginBottom: 8 }}>{opt.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{opt.desc}</p>
                    {form.type === opt.type && (
                      <div style={{ marginTop: 14 }}>
                        <CheckCircle size={20} color={opt.type === 'lost' ? 'var(--navy)' : 'var(--success)'} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ── STEP 1: Details ── */}
          {step === 1 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--navy)', marginBottom: 4 }}>Item Details</h2>
                <p style={{ color: 'var(--text-muted)' }}>Be as specific as possible — it helps AI find better matches.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Item Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder={form.type === 'lost' ? 'e.g. Blue HP Laptop with sticker' : 'e.g. Found a black wallet near cafeteria'} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.title.length}/200 characters</span>
              </div>

              <div className="form-group">
                <label className="form-label">Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {categories.map(c => (
                    <div key={c.id} onClick={() => set('category_id', String(c.id))}
                      style={{
                        padding: '10px 12px', border: '1.5px solid', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                        borderColor: form.category_id === String(c.id) ? 'var(--navy)' : 'var(--border)',
                        background: form.category_id === String(c.id) ? 'var(--navy)' : 'white',
                        color: form.category_id === String(c.id) ? 'white' : 'var(--text-secondary)'
                      }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea className="form-textarea" rows={5} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Include colour, brand, size, unique marks, serial numbers, contents, anything that makes it identifiable…" />
                <span style={{ fontSize: 11, color: form.description.length < 20 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {form.description.length} characters (minimum 20)
                </span>
              </div>

              {/* Valuable + Reward */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{
                  padding: '14px 16px', border: '1.5px solid', borderRadius: 'var(--radius-md)',
                  borderColor: form.is_valuable ? 'var(--gold)' : 'var(--border)',
                  background: form.is_valuable ? 'var(--gold-pale)' : 'white',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10
                }} onClick={() => set('is_valuable', !form.is_valuable)}>
                  <input type="checkbox" checked={form.is_valuable} readOnly style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>💎 Mark as Valuable</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>High priority listing</div>
                  </div>
                </div>

                {form.type === 'lost' && (
                  <div style={{
                    padding: '14px 16px', border: '1.5px solid', borderRadius: 'var(--radius-md)',
                    borderColor: form.reward_offered ? 'var(--success)' : 'var(--border)',
                    background: form.reward_offered ? '#D1FAE5' : 'white',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10
                  }} onClick={() => set('reward_offered', !form.reward_offered)}>
                    <input type="checkbox" checked={form.reward_offered} readOnly style={{ width: 16, height: 16, accentColor: 'var(--success)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>🏆 Offer Reward</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Incentivize finders</div>
                    </div>
                  </div>
                )}
              </div>

              {form.reward_offered && (
                <div className="form-group">
                  <label className="form-label">Reward Amount (KSh)</label>
                  <input className="form-input" type="number" min="0" value={form.reward_amount}
                    onChange={e => set('reward_amount', e.target.value)} placeholder="e.g. 500" style={{ maxWidth: 200 }} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Contact Phone Number</label>
                <input className="form-input" type="tel" value={form.contact_phone}
                  onChange={e => set('contact_phone', e.target.value)}
                  placeholder="+254 7XX XXX XXX or leave blank to use profile phone" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {form.type === 'lost' ? 'This phone will be shown to finders who want to contact you' : 'Optional - for verification purposes'}
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 2: Location & Date ── */}
          {step === 2 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--navy)', marginBottom: 4 }}>Location & Date</h2>
                <p style={{ color: 'var(--text-muted)' }}>Where and when was the item {form.type === 'lost' ? 'last seen' : 'found'}?</p>
              </div>

              <div className="form-group">
                <label className="form-label"><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />Campus Location</label>
                <select className="form-select" value={form.location_id} onChange={e => set('location_id', e.target.value)}>
                  <option value="">Select a location…</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} — {l.building}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Specific Location Detail</label>
                <input className="form-input" value={form.location_detail} onChange={e => set('location_detail', e.target.value)}
                  placeholder="e.g. Near the main entrance, Row 3 seat 7, left in the charging area…" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Optional but very helpful</span>
              </div>

              <div className="form-group">
                <label className="form-label"><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />Date {form.type === 'lost' ? 'Lost' : 'Found'} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" type="date" value={form.date_occurred}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => set('date_occurred', e.target.value)} style={{ maxWidth: 240 }} />
              </div>

              {/* Summary card */}
              <div style={{ padding: '16px 20px', background: 'var(--cream-dark)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>📋 Summary so far</h4>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><strong>Type:</strong> {form.type === 'lost' ? '🔍 Lost item' : '✅ Found item'}</div>
                  <div><strong>Title:</strong> {form.title || '—'}</div>
                  <div><strong>Category:</strong> {categories.find(c => String(c.id) === form.category_id)?.name || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Photos & Submit ── */}
          {step === 3 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--navy)', marginBottom: 4 }}>Photos & Submit</h2>
                <p style={{ color: 'var(--text-muted)' }}>Add photos to greatly improve match accuracy. Then review and submit.</p>
              </div>

              <ImageDropzone images={images} onChange={setImages} />

              {/* Final review */}
              <div style={{ background: 'var(--navy)', borderRadius: 'var(--radius-lg)', padding: '24px', color: 'white' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 16, color: 'var(--gold-light)' }}>Final Review</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div><span style={{ opacity: 0.6 }}>Type:</span> <strong>{form.type === 'lost' ? 'Lost Item' : 'Found Item'}</strong></div>
                  <div><span style={{ opacity: 0.6 }}>Category:</span> <strong>{categories.find(c => String(c.id) === form.category_id)?.name || '—'}</strong></div>
                  <div style={{ gridColumn: '1 / -1' }}><span style={{ opacity: 0.6 }}>Title:</span> <strong>{form.title}</strong></div>
                  <div><span style={{ opacity: 0.6 }}>Location:</span> <strong>{locations.find(l => String(l.id) === form.location_id)?.name || 'Not specified'}</strong></div>
                  <div><span style={{ opacity: 0.6 }}>Date:</span> <strong>{form.date_occurred}</strong></div>
                  <div><span style={{ opacity: 0.6 }}>Photos:</span> <strong>{images.length} uploaded</strong></div>
                  {form.is_valuable && <div>💎 <strong>Marked as Valuable</strong></div>}
                  {form.reward_offered && <div>🏆 <strong>Reward: KSh {form.reward_amount}</strong></div>}
                </div>
              </div>

              <div style={{ padding: '14px 16px', background: 'var(--gold-pale)', border: '1px solid var(--sand)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 10 }}>
                <Sparkles size={15} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  After submitting, our <strong>AI matching engine</strong> will immediately scan all existing items and notify you of any high-confidence matches.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-outline" onClick={prevStep} disabled={step === 0}>← Back</button>
            <div className="flex items-center gap-3">
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i <= step ? 'var(--navy)' : 'var(--border)', transition: 'background 0.2s' }} />
              ))}
            </div>
            {step < 3 ? (
              <button className="btn btn-primary" onClick={nextStep}>Continue →</button>
            ) : (
              <button className="btn btn-gold" onClick={handleSubmit} disabled={loading} style={{ minWidth: 160, justifyContent: 'center' }}>
                {loading ? <><div className="spinner" /> Submitting…</> : '🚀 Submit Report'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
