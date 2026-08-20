'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

// --- INTERFACES ---
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

interface MentalHealthDiagnosis {
  id: string;
  diagnosis: string;
  diagnosedAt?: string;
  status: string;
  notes?: string;
}

interface HospitalAdmission {
  id: string;
  reason: string;
  admissionDate: string;
  dischargeDate?: string;
  hospitalName: string;
}

interface Immunization {
  id: string;
  vaccine: string;
  dateAdministered: string;
  nextDueDate?: string;
}

interface Device {
  id: string;
  deviceName: string;
  type: string;
  model?: string;
  implantedDate?: string;
}

export default function DMKManager() {
  // --- BASE VITALS & DEMOGRAPHICS ---
  const [bloodType, setBloodType] = useState('');
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [smokingStatus, setSmokingStatus] = useState('');
  const [alcoholUse, setAlcoholUse] = useState('');
  const [exerciseLevel, setExerciseLevel] = useState('');
  const [organDonorStatus, setOrganDonorStatus] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState('');
  
  // ARRAYS
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [mentalHealthDiagnoses, setMentalHealthDiagnoses] = useState<MentalHealthDiagnosis[]>([]);
  const [hospitalAdmissions, setHospitalAdmissions] = useState<HospitalAdmission[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  // --- FORM STATES ---
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState<'none' | 'condition' | 'medication' | 'allergy' | 'vitals' | 'mental-health' | 'admission' | 'immunization' | 'device'>('none');
  const [editItem, setEditItem] = useState<any>(null); // For generic editing
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Vitals Edit Inputs
  const [editBloodType, setEditBloodType] = useState('');
  const [editHeight, setEditHeight] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [editSmoking, setEditSmoking] = useState('');
  const [editAlcohol, setEditAlcohol] = useState('');
  const [editExercise, setEditExercise] = useState('');
  const [editOrganDonor, setEditOrganDonor] = useState(false);

  // Generic Form Data
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchDMK();
  }, []);

  const fetchDMK = async () => {
    setLoading(true);
    try {
      const response = await apiClient('/dmk/me');
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const d = json.data;
          // Set base values
          setBloodType(d.bloodType || '');
          setHeight(d.heightCm || null);
          setWeight(d.weightKg || null);
          setBmi(d.bmi || null);
          setSmokingStatus(d.smokingStatus || 'UNKNOWN');
          setAlcoholUse(d.alcoholUse || 'UNKNOWN');
          setExerciseLevel(d.exerciseLevel || 'UNKNOWN');
          setOrganDonorStatus(d.organDonorStatus || false);
          setPrimaryLanguage(d.primaryLanguage || 'en');

          // Initialize Edit States for vitals
          setEditBloodType(d.bloodType || '');
          setEditHeight(d.heightCm || null);
          setEditWeight(d.weightKg || null);
          setEditSmoking(d.smokingStatus || '');
          setEditAlcohol(d.alcoholUse || '');
          setEditExercise(d.exerciseLevel || '');
          setEditOrganDonor(d.organDonorStatus || false);

          // Arrays
          setConditions(d.conditions || []);
          setMedications(d.medications || []);
          setAllergies(d.allergies || []);
          setMentalHealthDiagnoses(d.mentalHealthDiagnoses || []);
          setHospitalAdmissions(d.hospitalAdmissions || []);
          setImmunizations(d.immunizations || []);
          setDevices(d.devices || []);
        }
      }
    } catch (e) {
      console.warn('[DMK] Offline or Error. Check network.');
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
      smokingStatus: editSmoking || undefined,
      alcoholUse: editAlcohol || undefined,
      exerciseLevel: editExercise || undefined,
      organDonorStatus: editOrganDonor
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
          setSmokingStatus(d.smokingStatus || 'UNKNOWN');
          setAlcoholUse(d.alcoholUse || 'UNKNOWN');
          setExerciseLevel(d.exerciseLevel || 'UNKNOWN');
          setOrganDonorStatus(d.organDonorStatus || false);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setShowAddForm('none');
  };

  // --- GENERIC ADD/EDIT HANDLER ---
  const openForm = (type: any, item?: any) => {
    setEditItem(item || null);
    setFormData(item ? { ...item } : {});
    setShowAddForm(type);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editItem;
    
    // Determine endpoints and methods
    let endpoint = '';
    let updateStateFunc: React.Dispatch<React.SetStateAction<any[]>> | null = null;

    if (showAddForm === 'condition') {
      endpoint = isEdit ? `/dmk/me/conditions/${editItem.id}` : '/dmk/conditions';
      updateStateFunc = setConditions;
    } else if (showAddForm === 'medication') {
      endpoint = isEdit ? `/dmk/me/medications/${editItem.id}` : '/dmk/medications';
      updateStateFunc = setMedications;
    } else if (showAddForm === 'allergy') {
      endpoint = isEdit ? `/dmk/me/allergies/${editItem.id}` : '/dmk/allergies';
      updateStateFunc = setAllergies;
    } else if (showAddForm === 'mental-health') {
      endpoint = isEdit ? `/dmk/me/mental-health/${editItem.id}` : '/dmk/mental-health';
      updateStateFunc = setMentalHealthDiagnoses;
    } else if (showAddForm === 'admission') {
      endpoint = isEdit ? `/dmk/me/hospital-admissions/${editItem.id}` : '/dmk/hospital-admissions';
      updateStateFunc = setHospitalAdmissions;
    } else if (showAddForm === 'immunization') {
      endpoint = isEdit ? `/dmk/me/immunizations/${editItem.id}` : '/dmk/immunizations';
      updateStateFunc = setImmunizations;
    } else if (showAddForm === 'device') {
      endpoint = isEdit ? `/dmk/me/devices/${editItem.id}` : '/dmk/devices';
      updateStateFunc = setDevices;
    }

    try {
      const response = await apiClient(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        const json = await response.json();
        const savedItem = json.data;
        if (updateStateFunc) {
          updateStateFunc(prev => 
            isEdit ? prev.map(item => item.id === savedItem.id ? savedItem : item) 
                   : [...prev, savedItem]
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
    
    setShowAddForm('none');
    setEditItem(null);
  };

  const handleDeleteItem = async (type: string, id: string) => {
    let endpoint = '';
    let updateStateFunc: React.Dispatch<React.SetStateAction<any[]>> | null = null;
    
    if (type === 'condition') { endpoint = `/dmk/conditions/${id}`; updateStateFunc = setConditions; }
    if (type === 'medication') { endpoint = `/dmk/medications/${id}`; updateStateFunc = setMedications; }
    if (type === 'allergy') { endpoint = `/dmk/allergies/${id}`; updateStateFunc = setAllergies; }
    if (type === 'mental-health') { endpoint = `/dmk/mental-health/${id}`; updateStateFunc = setMentalHealthDiagnoses; }
    if (type === 'admission') { endpoint = `/dmk/hospital-admissions/${id}`; updateStateFunc = setHospitalAdmissions; }
    if (type === 'immunization') { endpoint = `/dmk/immunizations/${id}`; updateStateFunc = setImmunizations; }
    if (type === 'device') { endpoint = `/dmk/devices/${id}`; updateStateFunc = setDevices; }

    try {
      await apiClient(endpoint, { method: 'DELETE' });
    } catch (err) {}

    if (updateStateFunc) {
      updateStateFunc(prev => prev.filter(item => item.id !== id));
    }
  };

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

  const handleRevokeToken = async () => {
    if (!shareToken) return;
    try {
      await apiClient(`/dmk/share-token/${shareToken}`, { method: 'DELETE' });
    } catch (err) { }
    setShareToken(null);
    setShowQrModal(false);
  };

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Syncing DMK...</div>;

  return (
    <div style={dmkCardStyle} className="glass-panel">
      {/* Header */}
      <div style={dmkHeaderStyle}>
        <div>
          <h3 style={dmkTitleStyle}>Digital Medical Kit (DMK)</h3>
          <p style={dmkSubtitleStyle}>Active health registry & emergency vitals</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => openForm('vitals')} style={actionBtnStyle}>
            Update Demographics & Vitals
          </button>
          <button onClick={handleGenerateShareToken} style={actionBtnStyle}>
            Emergency Share QR
          </button>
        </div>
      </div>

      {/* Vitals Summary Row */}
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
          <span style={specLabelStyle}>BMI</span>
          <span style={specValStyle}>{bmi || '--'}</span>
        </div>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>SMOKING</span>
          <span style={specValStyle}>{smokingStatus || '--'}</span>
        </div>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>ALCOHOL</span>
          <span style={specValStyle}>{alcoholUse || '--'}</span>
        </div>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>EXERCISE</span>
          <span style={specValStyle}>{exerciseLevel || '--'}</span>
        </div>
        <div style={specBoxStyle}>
          <span style={specLabelStyle}>ORGAN DONOR</span>
          <span style={specValStyle}>{organDonorStatus ? 'YES' : 'NO'}</span>
        </div>
      </div>

      {/* Main Grids Container */}
      <div style={gridsContainerStyle}>
        
        {/* Conditions */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>CONDITIONS</span>
            <button onClick={() => openForm('condition')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {conditions.length === 0 ? <div style={emptyStateStyle}>No active conditions</div> : conditions.map(c => (
              <div key={c.id} style={listItemStyle}>
                <div>
                  <div style={itemNameStyle}>{c.name}</div>
                  <div style={itemDetailStyle}>Code: {c.code || '--'} {c.notes && `• ${c.notes}`}</div>
                </div>
                <div style={actionRowStyle}>
                  <button onClick={() => openForm('condition', c)} style={editBtnStyle}>✎</button>
                  <button onClick={() => handleDeleteItem('condition', c.id)} style={deleteBtnStyle}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>MEDICATIONS</span>
            <button onClick={() => openForm('medication')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {medications.length === 0 ? <div style={emptyStateStyle}>No active prescriptions</div> : medications.map(m => (
              <div key={m.id} style={listItemStyle}>
                <div>
                  <div style={itemNameStyle}>{m.name} <span style={badgeStyle}>{m.dosage}</span></div>
                  <div style={itemDetailStyle}>{m.frequency} {m.notes && `• ${m.notes}`}</div>
                </div>
                <div style={actionRowStyle}>
                  <button onClick={() => openForm('medication', m)} style={editBtnStyle}>✎</button>
                  <button onClick={() => handleDeleteItem('medication', m.id)} style={deleteBtnStyle}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>ALLERGIES</span>
            <button onClick={() => openForm('allergy')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {allergies.length === 0 ? <div style={emptyStateStyle}>No recorded allergies</div> : allergies.map(a => (
              <div key={a.id} style={listItemStyle}>
                <div>
                  <div style={itemNameStyle}>{a.allergen} <span style={badgeStyle}>{a.severity}</span></div>
                  <div style={itemDetailStyle}>Reaction: {a.reaction}</div>
                </div>
                <div style={actionRowStyle}>
                  <button onClick={() => openForm('allergy', a)} style={editBtnStyle}>✎</button>
                  <button onClick={() => handleDeleteItem('allergy', a.id)} style={deleteBtnStyle}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Immunizations */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>IMMUNIZATIONS</span>
            <button onClick={() => openForm('immunization')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {immunizations.length === 0 ? <div style={emptyStateStyle}>No immunizations</div> : immunizations.map(i => (
              <div key={i.id} style={listItemStyle}>
                <div>
                  <div style={itemNameStyle}>{i.vaccine}</div>
                  <div style={itemDetailStyle}>Date: {i.dateAdministered || '--'}</div>
                </div>
                <div style={actionRowStyle}>
                  <button onClick={() => openForm('immunization', i)} style={editBtnStyle}>✎</button>
                  <button onClick={() => handleDeleteItem('immunization', i.id)} style={deleteBtnStyle}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div style={sectionBoxStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionLabelStyle}>DEVICES</span>
            <button onClick={() => openForm('device')} style={addIconBtnStyle}>+</button>
          </div>
          <div style={listWrapperStyle}>
            {devices.length === 0 ? <div style={emptyStateStyle}>No devices</div> : devices.map(d => (
              <div key={d.id} style={listItemStyle}>
                <div>
                  <div style={itemNameStyle}>{d.deviceName}</div>
                  <div style={itemDetailStyle}>Type: {d.type} {d.model && `• ${d.model}`}</div>
                </div>
                <div style={actionRowStyle}>
                  <button onClick={() => openForm('device', d)} style={editBtnStyle}>✎</button>
                  <button onClick={() => handleDeleteItem('device', d.id)} style={deleteBtnStyle}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ADD/EDIT FORM OVERLAY */}
      {showAddForm !== 'none' && (
        <div style={popupOverlayStyle}>
          <div style={popupCardStyle} className="glass-panel">
            <h4 style={popupTitleStyle}>{editItem ? 'Edit' : 'Add'} {showAddForm.toUpperCase()}</h4>
            
            {showAddForm === 'vitals' && (
              <form onSubmit={handleUpdateVitals} style={popupFormStyle}>
                <div style={popupRowStyle}>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Blood Type</label>
                    <select value={editBloodType} onChange={e => setEditBloodType(e.target.value)} style={popupInputStyle}>
                      <option value="">Select...</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                </div>
                <div style={popupRowStyle}>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Height (cm)</label>
                    <input type="number" value={editHeight || ''} onChange={e => setEditHeight(Number(e.target.value))} style={popupInputStyle} />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Weight (kg)</label>
                    <input type="number" value={editWeight || ''} onChange={e => setEditWeight(Number(e.target.value))} style={popupInputStyle} />
                  </div>
                </div>
                <div style={popupRowStyle}>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Smoking</label>
                    <select value={editSmoking} onChange={e => setEditSmoking(e.target.value)} style={popupInputStyle}>
                      <option value="UNKNOWN">Unknown</option>
                      <option value="NEVER">Never</option>
                      <option value="CURRENT">Current</option>
                      <option value="FORMER">Former</option>
                    </select>
                  </div>
                  <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Alcohol</label>
                    <select value={editAlcohol} onChange={e => setEditAlcohol(e.target.value)} style={popupInputStyle}>
                      <option value="UNKNOWN">Unknown</option>
                      <option value="NONE">None</option>
                      <option value="SOCIAL">Social</option>
                      <option value="FREQUENT">Frequent</option>
                    </select>
                  </div>
                </div>
                <div style={formGroupStyle}>
                    <label style={popupLabelStyle}>Organ Donor</label>
                    <input type="checkbox" checked={editOrganDonor} onChange={e => setEditOrganDonor(e.target.checked)} />
                  </div>
                <div style={popupBtnRowStyle}>
                  <button type="button" onClick={() => setShowAddForm('none')} style={popupCancelBtnStyle}>Cancel</button>
                  <button type="submit" style={popupSubmitBtnStyle}>Save</button>
                </div>
              </form>
            )}

            {/* Dynamic Single Form for Item arrays */}
            {showAddForm !== 'vitals' && (
              <form onSubmit={handleSaveItem} style={popupFormStyle}>
                
                {showAddForm === 'condition' && (
                  <>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Condition Name</label>
                      <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} style={popupInputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>ICD-10 Code</label>
                      <input type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} style={popupInputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Notes</label>
                      <input type="text" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} style={popupInputStyle} />
                    </div>
                  </>
                )}

                {showAddForm === 'medication' && (
                  <>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Medication Name</label>
                      <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} style={popupInputStyle} required />
                    </div>
                    <div style={popupRowStyle}>
                      <div style={formGroupStyle}>
                        <label style={popupLabelStyle}>Dosage</label>
                        <input type="text" value={formData.dosage || ''} onChange={e => setFormData({...formData, dosage: e.target.value})} style={popupInputStyle} required />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={popupLabelStyle}>Frequency</label>
                        <input type="text" value={formData.frequency || ''} onChange={e => setFormData({...formData, frequency: e.target.value})} style={popupInputStyle} required />
                      </div>
                    </div>
                  </>
                )}

                {showAddForm === 'allergy' && (
                  <>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Allergen Name</label>
                      <input type="text" value={formData.allergen || ''} onChange={e => setFormData({...formData, allergen: e.target.value})} style={popupInputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Severity</label>
                      <select value={formData.severity || 'SEVERE'} onChange={e => setFormData({...formData, severity: e.target.value})} style={popupInputStyle}>
                        <option value="MILD">MILD</option>
                        <option value="MODERATE">MODERATE</option>
                        <option value="SEVERE">SEVERE</option>
                      </select>
                    </div>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Reaction</label>
                      <input type="text" value={formData.reaction || ''} onChange={e => setFormData({...formData, reaction: e.target.value})} style={popupInputStyle} required />
                    </div>
                  </>
                )}

                {showAddForm === 'immunization' && (
                  <>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Vaccine</label>
                      <input type="text" value={formData.vaccine || ''} onChange={e => setFormData({...formData, vaccine: e.target.value})} style={popupInputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Date Administered (ISO)</label>
                      <input type="text" value={formData.dateAdministered || ''} onChange={e => setFormData({...formData, dateAdministered: e.target.value})} style={popupInputStyle} required />
                    </div>
                  </>
                )}

                {showAddForm === 'device' && (
                  <>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Device Name</label>
                      <input type="text" value={formData.deviceName || ''} onChange={e => setFormData({...formData, deviceName: e.target.value})} style={popupInputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={popupLabelStyle}>Type</label>
                      <input type="text" value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} style={popupInputStyle} required />
                    </div>
                  </>
                )}

                <div style={popupBtnRowStyle}>
                  <button type="button" onClick={() => {setShowAddForm('none'); setEditItem(null);}} style={popupCancelBtnStyle}>Cancel</button>
                  <button type="submit" style={popupSubmitBtnStyle}>Save</button>
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
            <div style={{ marginBottom: '1.5rem' }}>
               <div style={{ width: '120px', height: '120px', background: 'white', padding: '12px', margin: '0 auto', borderRadius: '12px' }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                     {[...Array(16)].map((_, i) => <div key={i} style={{ width: '20px', height: '20px', background: i % 3 === 0 ? 'transparent' : 'var(--primary)' }} />)}
                  </div>
               </div>
            </div>
            {shareToken ? (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TOKEN HASH</span><br />
                <code style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{shareToken}</code>
              </div>
            ) : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generating...</span>}
            <button onClick={handleRevokeToken} style={revokeBtnStyle}>Close & Revoke</button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- STYLES ---
const dmkCardStyle: React.CSSProperties = { width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' };
const dmkHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' };
const dmkTitleStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.01em' };
const dmkSubtitleStyle: React.CSSProperties = { fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' };
const actionBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', background: 'rgba(0, 245, 212, 0.08)', border: '1px solid rgba(0, 245, 212, 0.2)', color: 'var(--primary)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' };

const vitalSpecsRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', width: '100%' };
const specBoxStyle: React.CSSProperties = { padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.2rem' };
const specLabelStyle: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' };
const specValStyle: React.CSSProperties = { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' };

const gridsContainerStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' };
const sectionBoxStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const sectionHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', paddingBottom: '0.4rem' };
const sectionLabelStyle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' };
const addIconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' };
const listWrapperStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '80px' };
const emptyStateStyle: React.CSSProperties = { fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem 0', textAlign: 'center' };

const listItemStyle: React.CSSProperties = { padding: '0.65rem 0.85rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const itemNameStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' };
const itemDetailStyle: React.CSSProperties = { fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' };
const badgeStyle: React.CSSProperties = { fontSize: '0.64rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(0, 187, 249, 0.1)', color: 'var(--secondary)' };

const actionRowStyle: React.CSSProperties = { display: 'flex', gap: '0.2rem' };
const editBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem' };
const deleteBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem' };

const popupOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10005, backgroundColor: 'rgba(5, 7, 12, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' };
const popupCardStyle: React.CSSProperties = { width: '100%', maxWidth: '380px', padding: '1.75rem', animation: 'fadeIn 0.2s ease-out' };
const qrCardStyle: React.CSSProperties = { width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' };
const popupTitleStyle: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' };
const popupFormStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.4rem' };
const popupLabelStyle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' };
const popupInputStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', background: 'rgba(15, 22, 38, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' };
const popupRowStyle: React.CSSProperties = { display: 'flex', gap: '0.75rem' };
const popupBtnRowStyle: React.CSSProperties = { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' };
const popupCancelBtnStyle: React.CSSProperties = { flex: 1, padding: '0.65rem', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' };
const popupSubmitBtnStyle: React.CSSProperties = { flex: 1, padding: '0.65rem', borderRadius: '6px', background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)', color: '#080c14', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' };
const revokeBtnStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255, 90, 95, 0.08)', border: '1px solid rgba(255, 90, 95, 0.15)', color: '#ff5a5f', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' };
