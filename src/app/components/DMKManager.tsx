'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

interface Condition {
  id: string;
  name: string;
  code: string;
  status: string;
  diagnosedAt?: string;
  notes?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  active: boolean;
  notes?: string;
}

interface Allergy {
  id: string;
  allergen: string;
  type: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  reaction: string;
}

export default function DMKManager() {
  // DMK Core Data
  const [bloodType, setBloodType] = useState('');
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);

  // Vitals Edit Form Inputs
  const [editBloodType, setEditBloodType] = useState('');
  const [editHeight, setEditHeight] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState<number | null>(null);

  // Modals & Forms State
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState<'none' | 'condition' | 'medication' | 'allergy' | 'vitals'>('none');
  const [showQrModal, setShowQrModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Form Inputs
  const [condName, setCondName] = useState('');
  const [condCode, setCondCode] = useState('E11.9');
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFreq, setMedFreq] = useState('');
  const [allergenName, setAllergenName] = useState('');
  const [allergySeverity, setAllergySeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE'>('SEVERE');
  const [allergyReaction, setAllergyReaction] = useState('');

  useEffect(() => {
    fetchDMK();
  }, []);

  // API 3.1: Get Patient DMK
  const fetchDMK = async () => {
    setLoading(true);
    try {
      const response = await apiClient('/dmk/me');
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const d = json.data;
          setBloodType(d.bloodType || '');
          setHeight(d.heightCm || null);
          setWeight(d.weightKg || null);
          setBmi(d.bmi || null);

          setEditBloodType(d.bloodType || '');
          setEditHeight(d.heightCm || null);
          setEditWeight(d.weightKg || null);

          setConditions(d.conditions || []);
          setMedications(d.medications || []);
          setAllergies(d.allergies || []);
        }
      }
    } catch (e) {
      console.warn('[DMK] Offline. Bootstrapping mock kit details.');
      // Bootstrap Mock DMK values for offline layout review
      setConditions([
        { id: 'c-1', name: 'Type 2 Diabetes', code: 'E11.9', status: 'ACTIVE', diagnosedAt: '2024-01-15', notes: 'Lifestyle managed' }
      ]);
      setMedications([
        { id: 'm-1', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', route: 'ORAL', active: true, notes: 'Take with meals' }
      ]);
      setAllergies([
        { id: 'a-1', allergen: 'Penicillin', type: 'DRUG', severity: 'SEVERE', reaction: 'Hives and difficulty breathing' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      bloodType: editBloodType || undefined,
      heightCm: editHeight || undefined,
      weightKg: editWeight || undefined,
    };

    try {
      const response = await apiClient('/dmk/me', {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const d = json.data;
          setBloodType(d.bloodType || '');
          setHeight(d.heightCm || null);
          setWeight(d.weightKg || null);
          setBmi(d.bmi || null);
        }
      }
    } catch (err) {
      setBloodType(editBloodType);
      setHeight(editHeight);
      setWeight(editWeight);
      if (editHeight && editWeight) {
        const m = editHeight / 100;
        setBmi(Number((editWeight / (m * m)).toFixed(1)));
      }
    }
    setShowAddForm('none');
  };

  // API 3.2: Add Condition
  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condName) return;

    const body = { name: condName, code: condCode, status: 'ACTIVE', diagnosedAt: new Date().toISOString() };
    try {
      const response = await apiClient('/dmk/conditions', { method: 'POST', body: JSON.stringify(body) });
      if (response.ok) {
        const json = await response.json();
        setConditions(prev => [...prev, json.data]);
      }
    } catch (err) {
      // Mock fallback
      setConditions(prev => [...prev, {
        id: `c-mock-${Math.random().toString(36).substring(4)}`,
        name: condName,
        code: condCode,
        status: 'ACTIVE',
        notes: 'Simulated addition'
      }]);
    }
    setCondName('');
    setShowAddForm('none');
  };

  // API 3.5: Add Medication
  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !medDosage || !medFreq) return;

    const body = { name: medName, dosage: medDosage, frequency: medFreq, route: 'ORAL', active: true };
    try {
      const response = await apiClient('/dmk/medications', { method: 'POST', body: JSON.stringify(body) });
      if (response.ok) {
        const json = await response.json();
        setMedications(prev => [...prev, json.data]);
      }
    } catch (err) {
      // Mock fallback
      setMedications(prev => [...prev, {
        id: `m-mock-${Math.random().toString(36).substring(4)}`,
        name: medName,
        dosage: medDosage,
        frequency: medFreq,
        route: 'ORAL',
        active: true
      }]);
    }
    setMedName('');
    setMedDosage('');
    setMedFreq('');
    setShowAddForm('none');
  };

  // API 3.8: Add Allergy
  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allergenName || !allergyReaction) return;

    const body = { allergen: allergenName, type: 'DRUG', severity: allergySeverity, reaction: allergyReaction };
    try {
      const response = await apiClient('/dmk/allergies', { method: 'POST', body: JSON.stringify(body) });
      if (response.ok) {
        const json = await response.json();
        setAllergies(prev => [...prev, json.data]);
      }
    } catch (err) {
      // Mock fallback
      setAllergies(prev => [...prev, {
        id: `a-mock-${Math.random().toString(36).substring(4)}`,
        allergen: allergenName,
        type: 'DRUG',
        severity: allergySeverity,
        reaction: allergyReaction
      }]);
    }
    setAllergenName('');
    setAllergyReaction('');
    setShowAddForm('none');
  };

  // API 3.4 / 3.7 / 3.10: Deletes
  const handleDeleteItem = async (type: 'condition' | 'medication' | 'allergy', id: string) => {
    try {
      const path = type === 'condition' ? `/dmk/conditions/${id}` : type === 'medication' ? `/dmk/medications/${id}` : `/dmk/allergies/${id}`;
      await apiClient(path, { method: 'DELETE' });
    } catch (err) { }

    // Always filter locally for immediate feedback
    if (type === 'condition') setConditions(prev => prev.filter(item => item.id !== id));
    if (type === 'medication') setMedications(prev => prev.filter(item => item.id !== id));
    if (type === 'allergy') setAllergies(prev => prev.filter(item => item.id !== id));
  };

  // API 3.11: Generate QR Share Token
  const handleGenerateShareToken = async () => {
    setShowQrModal(true);
    try {
      const response = await apiClient('/dmk/share-token', {
        method: 'POST',
        body: JSON.stringify({ description: 'Paramedic Emergency Scan' })
      });
      if (response.ok) {
        const json = await response.json();
        setShareToken(json.data.tokenHash);
      }
    } catch (err) {
      setShareToken('mock-shared-token-hash-1729');
    }
  };

  // API 3.13: Revoke Token
  const handleRevokeToken = async () => {
    if (!shareToken) return;
    try {
      await apiClient(`/dmk/share-token/${shareToken}`, { method: 'DELETE' });
    } catch (err) { }
    setShareToken(null);
    setShowQrModal(false);
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Syncing medical kit records...</div>;
  }

  return (
    <div style={dmkCardStyle} className="glass-panel">

      {/* Header */}
      <div style={dmkHeaderStyle}>
        <div>
          <h3 style={dmkTitleStyle}>Digital Medical Kit (DMK)</h3>
          <p style={dmkSubtitleStyle}>Active health registry, allergies, and emergency vitals</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowAddForm('vitals')} style={shareBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Update Vitals
          </button>

          <button onClick={handleGenerateShareToken} style={shareBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <rect x="7" y="7" width="3" height="3" />
              <rect x="14" y="7" width="3" height="3" />
              <rect x="7" y="14" width="3" height="3" />
              <rect x="14" y="14" width="3" height="3" />
            </svg>
            Emergency Share QR
          </button>
        </div>
      </div>

      {/* Vitals Summary row */}
      <div style={vitalSpecsRowStyle}>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>BLOOD</span>
          <span style={specValStyle}>{bloodType || '--'}</span>
        </div>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>HEIGHT</span>
          <span style={specValStyle}>{height ? `${height} cm` : '--'}</span>
        </div>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>WEIGHT</span>
          <span style={specValStyle}>{weight ? `${weight} kg` : '--'}</span>
        </div>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>BMI SPEC</span>
          <span style={specValStyle}>{bmi || '--'}</span>
        </div>
      </div>

      {/* DMK Grid sections */}
      <div style={gridsContainerStyle}>

        {/* Conditions */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>DIAGNOSED CONDITIONS</span>
            <button onClick={() => setShowAddForm('condition')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {conditions.length === 0 ? (
              <div style={emptyStateStyle}>No active conditions</div>
            ) : (
              conditions.map(c => (
                <div key={c.id} style={listItemStyle}>
                  <div>
                    <div style={itemNameStyle}>{c.name}</div>
                    <div style={itemDetailStyle}>ICD Code: {c.code} {c.notes && `• ${c.notes}`}</div>
                  </div>
                  <button onClick={() => handleDeleteItem('condition', c.id)} style={deleteBtnStyle}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Medications */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>ACTIVE MEDICATION RX</span>
            <button onClick={() => setShowAddForm('medication')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {medications.length === 0 ? (
              <div style={emptyStateStyle}>No active prescriptions</div>
            ) : (
              medications.map(m => (
                <div key={m.id} style={listItemStyle}>
                  <div>
                    <div style={itemNameStyle}>{m.name} <span style={dosageBadgeStyle}>{m.dosage}</span></div>
                    <div style={itemDetailStyle}>{m.frequency} {m.notes && `• ${m.notes}`}</div>
                  </div>
                  <button onClick={() => handleDeleteItem('medication', m.id)} style={deleteBtnStyle}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Allergies */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>KNOWN ALLERGENS</span>
            <button onClick={() => setShowAddForm('allergy')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {allergies.length === 0 ? (
              <div style={emptyStateStyle}>No recorded allergies</div>
            ) : (
              allergies.map(a => (
                <div key={a.id} style={listItemStyle}>
                  <div>
                    <div style={itemNameStyle}>
                      {a.allergen}
                      <span style={severityBadgeStyle(a.severity)}>{a.severity}</span>
                    </div>
                    <div style={itemDetailStyle}>Reaction: {a.reaction}</div>
                  </div>
                  <button onClick={() => handleDeleteItem('allergy', a.id)} style={deleteBtnStyle}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Add Item Overlay Form */}
      {showAddForm !== 'none' && (
        <div style={popupOverlayStyle}>
          <div style={popupCardStyle} className="glass-panel">
            <h4 style={popupTitleStyle}>Add {showAddForm.toUpperCase()}</h4>

            {showAddForm === 'condition' && (
              <form onSubmit={handleAddCondition} style={popupFormStyle}>
                <div style={formGroupStyle}>
                  <label style={popupLabelStyle}>Condition Name</label>
                  <input type="text" placeholder="Type 2 Diabetes" value={condName} onChange={e => setCondName(e.target.value)} style={popupInputStyle} required />
                </div>
                <div style={formGroupStyle}>
                  <label style={popupLabelStyle}>ICD-10 Code</label>
                  <input type="text" value={condCode} onChange={e => setCondCode(e.target.value)} style={popupInputStyle} required />
                </div>
                <div style={popupBtnRowStyle}>
                  <button type="button" onClick={() => setShowAddForm('none')} style={popupCancelBtnStyle}>Cancel</button>
                  <button type="submit" style={popupSubmitBtnStyle}>Add Record</button>
                </div>
              </form>
            )}

            {showAddForm === 'medication' && (
              <form onSubmit={handleAddMedication} style={popupFormStyle}>
                <div style={formGroupStyle}>
                  <label style={popupLabelStyle}>Medication Name</label>
                  <input type="text" placeholder="Metformin" value={medName} onChange={e => setMedName(e.target.value)} style={popupInputStyle} required />
                </div>
                <div style={popupRowStyle}>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Dosage</label>
                    <input type="text" placeholder="500mg" value={medDosage} onChange={e => setMedDosage(e.target.value)} style={popupInputStyle} required />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Frequency</label>
                    <input type="text" placeholder="Twice daily" value={medFreq} onChange={e => setMedFreq(e.target.value)} style={popupInputStyle} required />
                  </div>
                </div>
                <div style={popupBtnRowStyle}>
                  <button type="button" onClick={() => setShowAddForm('none')} style={popupCancelBtnStyle}>Cancel</button>
                  <button type="submit" style={popupSubmitBtnStyle}>Add Rx</button>
                </div>
              </form>
            )}

            {showAddForm === 'allergy' && (
              <form onSubmit={handleAddAllergy} style={popupFormStyle}>
                <div style={formGroupStyle}>
                  <label style={popupLabelStyle}>Allergen Name</label>
                  <input type="text" placeholder="Penicillin" value={allergenName} onChange={e => setAllergenName(e.target.value)} style={popupInputStyle} required />
                </div>
                <div style={formGroupStyle}>
                  <label style={popupLabelStyle}>Severity Level</label>
                  <select value={allergySeverity} onChange={e => setAllergySeverity(e.target.value as any)} style={popupSelectStyle}>
                    <option value="MILD">MILD</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="SEVERE">SEVERE</option>
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={popupLabelStyle}>Reaction</label>
                  <input type="text" placeholder="Hives, difficulty breathing" value={allergyReaction} onChange={e => setAllergyReaction(e.target.value)} style={popupInputStyle} required />
                </div>
                <div style={popupBtnRowStyle}>
                  <button type="button" onClick={() => setShowAddForm('none')} style={popupCancelBtnStyle}>Cancel</button>
                  <button type="submit" style={popupSubmitBtnStyle}>Add Allergy</button>
                </div>
              </form>
            )}

            {showAddForm === 'vitals' && (
              <form onSubmit={handleUpdateVitals} style={popupFormStyle}>
                <div style={formGroupStyle}>
                  <label style={popupLabelStyle}>Blood Type</label>
                  <select value={editBloodType} onChange={e => setEditBloodType(e.target.value)} style={popupSelectStyle}>
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div style={popupRowStyle}>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Height (cm)</label>
                    <input type="number" placeholder="e.g. 175" value={editHeight === null ? '' : editHeight} onChange={e => setEditHeight(e.target.value === '' ? null : Number(e.target.value))} style={popupInputStyle} min="1" max="300" required />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Weight (kg)</label>
                    <input type="number" placeholder="e.g. 70" value={editWeight === null ? '' : editWeight} onChange={e => setEditWeight(e.target.value === '' ? null : Number(e.target.value))} style={popupInputStyle} min="1" max="700" required />
                  </div>
                </div>
                <div style={popupBtnRowStyle}>
                  <button type="button" onClick={() => setShowAddForm('none')} style={popupCancelBtnStyle}>Cancel</button>
                  <button type="submit" style={popupSubmitBtnStyle}>Save Vitals</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* QR Share Modal */}
      {showQrModal && (
        <div style={popupOverlayStyle}>
          <div style={qrCardStyle} className="glass-panel">
            <h4 style={popupTitleStyle}>Emergency Medical Share</h4>
            <p style={qrHelpTextStyle}>Paramedics can scan this QR code or access the hash token link directly to access your active blood type, conditions, allergies, and emergency contacts without authentication.</p>

            {/* Mock QR Code Visual */}
            <div style={qrVisualWrapperStyle}>
              <div style={qrCodeBoxStyle}>
                {/* Visual grid rendering a futuristic QR representation */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '80px' }}>
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                  <div style={{ width: '16px', height: '16px', background: 'transparent' }} />
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                  <div style={{ width: '16px', height: '16px', background: 'transparent' }} />
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                  <div style={{ width: '16px', height: '16px', background: 'transparent' }} />
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                  <div style={{ width: '16px', height: '16px', background: 'transparent' }} />
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                  <div style={{ width: '16px', height: '16px', background: 'var(--primary)' }} />
                </div>
              </div>
            </div>

            {shareToken ? (
              <div style={tokenHashContainerStyle}>
                <span style={tokenLabelStyle}>SHARED ACCESS TOKEN HASH</span>
                <code style={tokenHashStyle}>{shareToken}</code>
                <a
                  href={`https://api.novacoresbank.com/api/v1/dmk/shared/${shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  style={sharedLinkLabelStyle}
                >
                  🔗 Access Shared DMK JSON Link (No Auth)
                </a>
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Generating access token...</span>
            )}

            <button onClick={handleRevokeToken} style={revokeBtnStyle}>
              Revoke Session & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Styles
const dmkCardStyle: React.CSSProperties = {
  width: '100%',
  padding: '1.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const dmkHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
};

const dmkTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  letterSpacing: '0.01em',
};

const dmkSubtitleStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
  marginTop: '2px',
};

const shareBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  padding: '0.5rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 245, 212, 0.08)',
  border: '1px solid rgba(0, 245, 212, 0.2)',
  color: 'var(--primary)',
  fontSize: '0.74rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const vitalSpecsRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '0.75rem',
  width: '100%',
};

const specBoxStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
};

const specLabelStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.05em',
};

const specValStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const gridsContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1.25rem',
  marginTop: '0.5rem',
};

const sectionBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  paddingBottom: '0.4rem',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  letterSpacing: '0.05em',
};

const addIconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--primary)',
  fontSize: '1.1rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const listWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  minHeight: '100px',
};

const emptyStateStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
  padding: '1.5rem 0',
  textAlign: 'center',
};

const listItemStyle: React.CSSProperties = {
  padding: '0.65rem 0.85rem',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const itemNameStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
};

const itemDetailStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-secondary)',
  marginTop: '2px',
};

const dosageBadgeStyle: React.CSSProperties = {
  fontSize: '0.64rem',
  fontWeight: 700,
  padding: '0.1rem 0.35rem',
  borderRadius: '4px',
  background: 'rgba(0, 187, 249, 0.1)',
  color: 'var(--secondary)',
};

const severityBadgeStyle = (severity: string): React.CSSProperties => ({
  fontSize: '0.64rem',
  fontWeight: 700,
  padding: '0.1rem 0.35rem',
  borderRadius: '4px',
  background: severity === 'SEVERE' ? 'rgba(255, 90, 95, 0.1)' : 'rgba(255, 255, 255, 0.05)',
  color: severity === 'SEVERE' ? '#ff5a5f' : 'var(--text-secondary)',
});

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.74rem',
  cursor: 'pointer',
  padding: '0.2rem',
};

const popupOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10005,
  backgroundColor: 'rgba(5, 7, 12, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1.5rem',
};

const popupCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '380px',
  padding: '1.75rem',
  animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
};

const qrCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  padding: '2rem',
  textAlign: 'center',
  animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
};

const popupTitleStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  marginBottom: '1rem',
};

const popupFormStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const popupLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
};

const popupInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '6px',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  outline: 'none',
};

const popupSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '6px',
  background: 'rgba(15, 22, 38, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  outline: 'none',
};

const popupRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
};

const popupBtnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  marginTop: '0.5rem',
};

const popupCancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.65rem',
  borderRadius: '6px',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const popupSubmitBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.65rem',
  borderRadius: '6px',
  background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)',
  color: '#080c14',
  border: 'none',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const qrHelpTextStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45',
  marginBottom: '1.5rem',
};

const qrVisualWrapperStyle: React.CSSProperties = {
  width: '120px',
  height: '120px',
  background: 'white',
  borderRadius: '12px',
  padding: '12px',
  margin: '0 auto 1.5rem auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const qrCodeBoxStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const tokenHashContainerStyle: React.CSSProperties = {
  textAlign: 'left',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '8px',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginBottom: '1.5rem',
};

const tokenLabelStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
};

const tokenHashStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.78rem',
  color: 'var(--primary)',
  wordBreak: 'break-all',
};

const sharedLinkLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--secondary)',
  textDecoration: 'underline',
  marginTop: '0.2rem',
};

const revokeBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '6px',
  background: 'rgba(255, 90, 95, 0.08)',
  border: '1px solid rgba(255, 90, 95, 0.15)',
  color: '#ff5a5f',
  fontWeight: 700,
  fontSize: '0.8rem',
  cursor: 'pointer',
};
