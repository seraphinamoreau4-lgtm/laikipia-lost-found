import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, Eye, Sparkles, MessageCircle, Flag, ArrowLeft, CheckCircle, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { itemsAPI } from '../services/api';
import useAuthStore from '../store/authStore';

function ConfidenceBadge({ score }) {
  const color = score >= 70 ? '#065F46' : score >= 45 ? '#92400E' : '#1E40AF';
  const bg = score >= 70 ? '#D1FAE5' : score >= 45 ? '#FEF3C7' : '#DBEAFE';
  const label = score >= 70 ? 'High Match' : score >= 45 ? 'Possible Match' : 'Weak Match';
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
      {label} · {Math.round(score)}%
    </span>
  );
}

function ClaimModal({ item, onClose }) {
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [identityDocument, setIdentityDocument] = useState(null);
  const [verificationAnswers, setVerificationAnswers] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Proof, Step 2: Identity

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proof.trim()) { toast.error('Please describe your proof of ownership'); return; }
    if (step === 1) {
      setStep(2);
      return;
    }
    
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('proof_description', proof);
      if (proofImage) fd.append('proof_image', proofImage);
      fd.append('identity_document', identityDocument || '');
      fd.append('verification_answers', verificationAnswers);
      await itemsAPI.claim(item.id, fd);
      toast.success('Claim submitted! We will review your identity and notify you.');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,31,61,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '32px', maxWidth: 520, width: '100%', boxShadow: 'var(--shadow-xl)' }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--navy)', marginBottom: 8 }}>
          {step === 1 ? 'Submit a Claim' : 'Verify Your Identity'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          {step === 1 
            ? 'Prove that this item belongs to you. An admin will review your claim.' 
            : 'Upload your identity document and answer verification questions.'}
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Proof of Ownership *</label>
                <textarea className="form-textarea" rows={4} value={proof} onChange={e => setProof(e.target.value)}
                  placeholder="Describe unique features, serial numbers, contents, or anything that proves this is yours…" required />
              </div>
              <div className="form-group">
                <label className="form-label">Supporting Photo (optional)</label>
                <input type="file" accept="image/*" onChange={e => setProofImage(e.target.files[0])}
                  style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
              </div>
            </>
          )}
          
          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label">Identity Document * (Student/Staff ID)</label>
                <input type="file" accept="image/*" onChange={e => setIdentityDocument(e.target.files[0])}
                  required style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Upload a clear photo of your Student ID, Staff ID, or National ID to verify your identity.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Verification Questions</label>
                <textarea className="form-textarea" rows={3} value={verificationAnswers} onChange={e => setVerificationAnswers(e.target.value)}
                  placeholder="Answer: Where did you purchase this item? What are the unique characteristics? Any other identifying marks?" />
              </div>
            </>
          )}
          
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} 
              onClick={() => step === 2 ? setStep(1) : onClose()}>
              {step === 2 ? 'Back' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
              {loading ? <><div className="spinner" /> Submitting…</> : step === 1 ? 'Continue to Verification' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClaim, setShowClaim] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const res = await itemsAPI.getById(id);
      setItem(res.data.data);
    } catch {
      toast.error('Item not found');
      navigate('/browse');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await itemsAPI.update(id, { ...item, status });
      toast.success(`Item marked as ${status}`);
      fetchItem();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRematch = async () => {
    try {
      await itemsAPI.rematch(id);
      toast.success('AI re-matching initiated. Check back shortly!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto', width: 32, height: 32 }} />
        <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Loading item…</p>
      </div>
    );
  }

  if (!item) return null;

  const isOwner = user?.id === item.reporter_id;
  const isAdmin = ['admin', 'security'].includes(user?.role);
  const images = item.images || [];
  const displayImages = images.length > 0 ? images : [null];

  return (
    <div style={{ padding: '32px 0 60px' }}>
      <div className="container">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 20, padding: '8px 0' }}>
          <ArrowLeft size={16} /> Back to Browse
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
          {/* LEFT COLUMN */}
          <div>
            {/* Image gallery */}
            <div style={{
              background: 'var(--cream-dark)', borderRadius: 'var(--radius-xl)',
              overflow: 'hidden', marginBottom: 24, position: 'relative',
              border: '1px solid var(--border)'
            }}>
              <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {displayImages[activeImage]?.url ? (
                  <img src={displayImages[activeImage].url} alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: 80, opacity: 0.3 }}>{item.category_icon || '📦'}</div>
                )}
                {/* Status overlay */}
                {item.status === 'resolved' && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(6,95,70,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8
                  }}>
                    <CheckCircle size={48} color="white" />
                    <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: 24 }}>Resolved</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: 12, background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                  {images.map((img, i) => (
                    <div key={i} onClick={() => setActiveImage(i)}
                      style={{
                        width: 60, height: 60, borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden', cursor: 'pointer', border: '2px solid',
                        borderColor: activeImage === i ? 'var(--navy)' : 'transparent',
                        flexShrink: 0
                      }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Item info */}
            <div className="card" style={{ padding: '28px 32px', marginBottom: 24 }}>
              {/* Type + Status */}
              <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                <span className={`badge badge-${item.type}`}>{item.type === 'lost' ? '🔍 Lost' : '✅ Found'}</span>
                <span className={`badge badge-${item.status}`}>{item.status}</span>
                {item.is_valuable && <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>💎 Valuable</span>}
                {item.reward_offered && <span className="badge" style={{ background: '#FFF0F3', color: '#9D174D' }}>
                  🏆 Reward: KSh {parseFloat(item.reward_amount || 0).toLocaleString()}
                </span>}
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 36px)', color: 'var(--navy)', marginBottom: 16, lineHeight: 1.2 }}>
                {item.title}
              </h1>

              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, padding: '16px', background: 'var(--cream-dark)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Category</div>
                  <div style={{ fontSize: 14, color: 'var(--navy)', fontWeight: 500 }}>{item.category_icon} {item.category_name || 'Unknown'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Date {item.type === 'lost' ? 'Lost' : 'Found'}</div>
                  <div style={{ fontSize: 14, color: 'var(--navy)', fontWeight: 500 }}>{format(new Date(item.date_occurred), 'MMMM d, yyyy')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Location</div>
                  <div style={{ fontSize: 14, color: 'var(--navy)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} /> {item.location_name || item.location_detail || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Posted</div>
                  <div style={{ fontSize: 14, color: 'var(--navy)', fontWeight: 500 }}>
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>Description</h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 0 }}>
                {item.description}
              </p>

              {/* Views */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                <Eye size={14} /> {item.view_count || 0} views
              </div>
            </div>

            {/* AI Matches */}
            {item.matches?.length > 0 && (
              <div className="card" style={{ padding: '24px 28px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(212,146,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={16} color="var(--gold)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)' }}>AI-Suggested Matches</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.matches.length} potential match{item.matches.length !== 1 ? 'es' : ''} found</p>
                    </div>
                  </div>
                  {(isOwner || isAdmin) && (
                    <button className="btn btn-ghost btn-sm" onClick={handleRematch} title="Re-run AI matching">
                      <RefreshCw size={14} /> Re-run
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {item.matches.map(match => {
                    const reasoning = typeof match.ai_reasoning === 'string' ? JSON.parse(match.ai_reasoning || '{}') : (match.ai_reasoning || {});
                    return (
                      <Link key={match.id} to={`/items/${match.matched_item_id}`}
                        style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{
                          border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                          padding: '14px 16px', transition: 'all 0.15s',
                          display: 'flex', gap: 14, alignItems: 'flex-start',
                          cursor: 'pointer'
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-pale)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white'; }}>
                          {/* Image */}
                          <div style={{
                            width: 56, height: 56, borderRadius: 'var(--radius-sm)',
                            background: 'var(--cream-dark)', flexShrink: 0, overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                          }}>
                            {match.matched_image ? <img src={match.matched_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (match.matched_icon || '📦')}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{match.matched_title}</span>
                              <ConfidenceBadge score={match.confidence_score} />
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                              {match.matched_category} · {match.matched_location || 'Unknown location'} · {match.matched_date ? format(new Date(match.matched_date), 'MMM d') : ''}
                            </div>
                            {reasoning.reasoning && (
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '2px solid var(--gold)', paddingLeft: 8 }}>
                                {reasoning.reasoning}
                              </div>
                            )}
                            {reasoning.attributes?.length > 0 && (
                              <div className="flex gap-2" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                                {reasoning.attributes.map((a, i) => (
                                  <span key={i} style={{ fontSize: 10, background: 'var(--cream-dark)', padding: '2px 8px', borderRadius: 99, color: 'var(--text-secondary)', fontWeight: 500 }}>{a}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Reporter */}
            <div className="card" style={{ padding: '20px 22px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Reported By</h3>
              <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                <div className="avatar avatar-lg" style={{ background: 'var(--navy)', color: 'var(--gold-light)', fontSize: 18, fontWeight: 700 }}>
                  {item.reporter_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{item.reporter_name}</div>
                  {item.reporter_student_id && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.reporter_student_id}</div>}
                  {item.reporter_department && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.reporter_department}</div>}
                </div>
              </div>
              {(item.contact_phone || item.reporter_phone) && item.type === 'lost' && (
                <div style={{ 
                  padding: '12px 14px', 
                  background: 'rgba(212,146,42,0.1)', 
                  borderLeft: '3px solid var(--gold)',
                  borderRadius: '4px',
                  marginTop: 12 
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Contact Phone</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>
                    {item.contact_phone || item.reporter_phone || 'Not provided'}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {isAuthenticated && !isOwner && item.status === 'open' && (
              <div className="card" style={{ padding: '20px 22px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link to={`/messages/${item.reporter_id}`} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                    <MessageCircle size={16} /> Message Reporter
                  </Link>
                  {item.type === 'found' && (
                    <button className="btn btn-gold" style={{ justifyContent: 'center' }} onClick={() => setShowClaim(true)}>
                      <Flag size={16} /> This is Mine — Claim It
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Owner actions */}
            {(isOwner || isAdmin) && (
              <div className="card" style={{ padding: '20px 22px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Manage Item</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {item.status !== 'resolved' && (
                    <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center', color: 'var(--success)', borderColor: 'var(--success)' }}
                      onClick={() => handleStatusUpdate('resolved')}>
                      <CheckCircle size={14} /> Mark as Resolved
                    </button>
                  )}
                  {item.status === 'open' && (
                    <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}
                      onClick={() => handleStatusUpdate('archived')}>
                      Archive Item
                    </button>
                  )}
                  {item.status === 'resolved' && (
                    <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}
                      onClick={() => handleStatusUpdate('open')}>
                      Reopen Item
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* No-auth prompt */}
            {!isAuthenticated && (
              <div className="card" style={{ padding: '20px 22px', background: 'var(--gold-pale)', border: '1px solid var(--sand)' }}>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 10 }}>🔒</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 14 }}>
                  Sign in to message the reporter or submit a claim
                </p>
                <Link to="/login" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>Sign In</Link>
              </div>
            )}

            {/* Map placeholder */}
            {item.location_name && (
              <div className="card" style={{ padding: '20px 22px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Location</h3>
                <div style={{
                  height: 120, background: 'linear-gradient(135deg, var(--navy-light), var(--navy-mid))',
                  borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 6
                }}>
                  <MapPin size={24} color="var(--gold-light)" />
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{item.location_name}</span>
                  {item.building && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{item.building}</span>}
                </div>
              </div>
            )}

            {/* Report stats */}
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--navy)' }}>{item.view_count || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Views</div>
                </div>
                <div style={{ width: 1, background: 'var(--border)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--navy)' }}>{item.matches?.length || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Matches</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showClaim && <ClaimModal item={item} onClose={() => setShowClaim(false)} />}
    </div>
  );
}
