'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/services/apiClient';

export default function SharedDMKPage() {
  const { token } = useParams() as { token: string };
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dmk, setDmk] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchSharedDMK = async () => {
      try {
        const response = await apiClient(`/dmk/shared/${token}`, { skipAuth: true });
        const json = await response.json();
        
        if (response.ok && json.success) {
          setDmk(json.data);
        } else {
          setError(json.message || 'Invalid or expired share token.');
        }
      } catch (err) {
        setError('Failed to securely connect to the medical database.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSharedDMK();
  }, [token]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div className="glass-panel" style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="spinner" style={spinnerStyle}></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Decrypting emergency medical kit...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dmk) {
    return (
      <div style={pageStyle}>
        <div className="glass-panel" style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#ff5a5f' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Access Denied</h2>
            <p>{error}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
              For security and privacy, DMK share links expire after 24 hours or when manually revoked by the patient.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div className="glass-panel" style={cardStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={alertBadgeStyle}>🚨 EMERGENCY MEDICAL INFO</div>
          <h1 style={{ margin: '1rem 0 0', fontSize: '1.5rem' }}>Digital Medical Kit</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Confidential medical profile provided for emergency response.
          </p>
          <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {dmk.patient?.fullName || 'Patient Name Not Provided'}
          </div>
        </div>

        {/* Demographics & Emergency Contacts */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>DEMOGRAPHICS & EMERGENCY CONTACTS</h3>
          <div style={vitalsGridStyle}>
            <VitalBox label="GENDER" value={dmk.patient?.patientProfile?.gender} />
            <VitalBox label="DOB" value={dmk.patient?.patientProfile?.dateOfBirth ? new Date(dmk.patient.patientProfile.dateOfBirth).toLocaleDateString() : null} />
            <VitalBox label="LANGUAGE" value={dmk.primaryLanguage} />
            <VitalBox label="RELIGION" value={dmk.patient?.patientProfile?.religion} />
            <VitalBox label="NATIONALITY" value={dmk.patient?.patientProfile?.nationality} />
            <VitalBox label="MARITAL STATUS" value={dmk.patient?.patientProfile?.maritalStatus} />
          </div>
          {(dmk.patient?.patientProfile?.emergencyContactName || dmk.patient?.patientProfile?.emergencyContactPhone) && (
            <div style={{...vitalsGridStyle, marginTop: '0.75rem'}}>
              <VitalBox label="EMERGENCY CONTACT" value={dmk.patient.patientProfile.emergencyContactName} />
              <VitalBox label="RELATIONSHIP" value={dmk.patient.patientProfile.emergencyContactRelation} />
              <VitalBox label="PRIMARY PHONE" value={dmk.patient.patientProfile.emergencyContactPhone} highlight={true} />
              <VitalBox label="SECONDARY PHONE" value={dmk.patient.patientProfile.secondaryEmergencyPhone} />
            </div>
          )}
        </div>

        {/* Vitals */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>VITALS</h3>
          <div style={vitalsGridStyle}>
            <VitalBox label="BLOOD TYPE" value={dmk.bloodType} />
            <VitalBox label="GENOTYPE" value={dmk.genotype} />
            <VitalBox label="HEIGHT" value={dmk.heightCm ? `${dmk.heightCm} cm` : null} />
            <VitalBox label="WEIGHT" value={dmk.weightKg ? `${dmk.weightKg} kg` : null} />
            <VitalBox label="BMI" value={dmk.bmi} />
            <VitalBox label="ORGAN DONOR" value={dmk.organDonorStatus ? 'YES' : 'NO'} highlight={dmk.organDonorStatus} />
          </div>
        </div>

        {/* Lifestyle */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>LIFESTYLE</h3>
          <div style={vitalsGridStyle}>
            <VitalBox label="SMOKING STATUS" value={dmk.smokingStatus} />
            <VitalBox label="ALCOHOL USE" value={dmk.alcoholUse} />
            <VitalBox label="EXERCISE LEVEL" value={dmk.exerciseLevel} />
          </div>
        </div>

        {/* Reproductive Health */}
        {(dmk.patient?.patientProfile?.gender === 'Female' || dmk.lastMenstrualDate || dmk.contraceptionUse) && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>REPRODUCTIVE HEALTH</h3>
            <div style={vitalsGridStyle}>
              <VitalBox label="PREGNANCY STATUS" value={dmk.pregnancyStatus} />
              <VitalBox label="CONTRACEPTION" value={dmk.contraceptionUse} />
              <VitalBox label="LAST MENSTRUAL DATE" value={dmk.lastMenstrualDate ? new Date(dmk.lastMenstrualDate).toLocaleDateString() : null} />
            </div>
            {dmk.pregnancyComplications && (
              <div style={{marginTop: '0.75rem', ...listItemStyle}}>
                <strong>Pregnancy Complications:</strong> <span style={notesStyle}>{dmk.pregnancyComplications}</span>
              </div>
            )}
          </div>
        )}

        {/* Conditions */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>ACTIVE CONDITIONS</h3>
          {(!dmk.conditions || dmk.conditions.length === 0) ? (
            <p style={emptyStyle}>No active conditions recorded.</p>
          ) : (
            <div style={listStyle}>
              {dmk.conditions.map((c: any) => (
                <div key={c.id} style={listItemStyle}>
                  <strong>{c.name}</strong>
                  {c.notes && <span style={notesStyle}>{c.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medications */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>CURRENT MEDICATIONS</h3>
          {(!dmk.medications || dmk.medications.length === 0) ? (
            <p style={emptyStyle}>No current medications recorded.</p>
          ) : (
            <div style={listStyle}>
              {dmk.medications.map((m: any) => (
                <div key={m.id} style={listItemStyle}>
                  <div>
                    <strong>{m.name}</strong> <span style={badgeStyle}>{m.dosage}</span>
                  </div>
                  <div style={subtextStyle}>{m.frequency} {m.route && `• ${m.route}`}</div>
                  {m.notes && <span style={notesStyle}>{m.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Allergies */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>ALLERGIES</h3>
          {(!dmk.allergies || dmk.allergies.length === 0) ? (
            <p style={emptyStyle}>No known allergies.</p>
          ) : (
            <div style={listStyle}>
              {dmk.allergies.map((a: any) => (
                <div key={a.id} style={listItemStyle}>
                  <div>
                    <strong style={{ color: a.severity === 'SEVERE' ? '#ff5a5f' : 'inherit' }}>{a.allergen}</strong> 
                    <span style={{...badgeStyle, background: a.severity === 'SEVERE' ? 'rgba(255,90,95,0.1)' : badgeStyle.background, color: a.severity === 'SEVERE' ? '#ff5a5f' : badgeStyle.color}}>
                      {a.severity}
                    </span>
                  </div>
                  {a.reaction && <div style={subtextStyle}>Reaction: {a.reaction}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Medical History */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>ADDITIONAL MEDICAL HISTORY</h3>
          <div style={listStyle}>
            {dmk.surgeries && (
              <div style={listItemStyle}>
                <strong>Surgeries</strong>
                <div style={subtextStyle}>{dmk.surgeries}</div>
              </div>
            )}
            {dmk.familyHistory && (
              <div style={listItemStyle}>
                <strong>Family History</strong>
                <div style={subtextStyle}>{dmk.familyHistory}</div>
              </div>
            )}
            {dmk.cognitiveStatus && (
              <div style={listItemStyle}>
                <strong>Cognitive Status</strong>
                <div style={subtextStyle}>{dmk.cognitiveStatus}</div>
              </div>
            )}
            {dmk.directives && (
              <div style={listItemStyle}>
                <strong>Advance Directives</strong>
                <div style={subtextStyle}>{dmk.directives}</div>
              </div>
            )}
            {dmk.substanceUse && (
              <div style={listItemStyle}>
                <strong>Substance Use History</strong>
                <div style={subtextStyle}>{dmk.substanceUse}</div>
              </div>
            )}
            {dmk.pets && (
              <div style={listItemStyle}>
                <strong>Pets at Home</strong>
                <div style={subtextStyle}>{dmk.pets}</div>
              </div>
            )}
            {(!dmk.surgeries && !dmk.familyHistory && !dmk.cognitiveStatus && !dmk.directives && !dmk.substanceUse && !dmk.pets) && (
              <p style={emptyStyle}>No additional history recorded.</p>
            )}
          </div>
        </div>

        <div style={footerStyle}>
          This data is time-stamped and access has been securely logged. <br/>
          EmergencyEcho Secure Data Sharing
        </div>
      </div>
    </div>
  );
}

function VitalBox({ label, value, highlight = false }: { label: string, value: any, highlight?: boolean }) {
  return (
    <div style={{ ...vitalBoxStyle, border: highlight ? '1px solid rgba(0,245,212,0.3)' : vitalBoxStyle.border }}>
      <div style={vitalLabelStyle}>{label}</div>
      <div style={{ ...vitalValueStyle, color: highlight ? 'var(--primary)' : 'var(--text-primary)' }}>{value || '--'}</div>
    </div>
  );
}

// Styles
const pageStyle: React.CSSProperties = { minHeight: '100vh', padding: '2rem 1rem', display: 'flex', justifyContent: 'center', background: 'var(--bg-main)' };
const cardStyle: React.CSSProperties = { width: '100%', maxWidth: '600px', padding: '2rem', borderRadius: '24px' };
const headerStyle: React.CSSProperties = { textAlign: 'center', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' };
const alertBadgeStyle: React.CSSProperties = { display: 'inline-block', background: 'rgba(255,90,95,0.15)', color: '#ff5a5f', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' };

const sectionStyle: React.CSSProperties = { marginBottom: '2rem' };
const sectionTitleStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' };

const vitalsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' };
const vitalBoxStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' };
const vitalLabelStyle: React.CSSProperties = { fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' };
const vitalValueStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700 };

const listStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const listItemStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' };
const badgeStyle: React.CSSProperties = { fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(0,187,249,0.1)', color: 'var(--secondary)', marginLeft: '0.5rem' };
const subtextStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' };
const notesStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' };
const emptyStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' };

const footerStyle: React.CSSProperties = { textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' };
const spinnerStyle: React.CSSProperties = { width: '40px', height: '40px', border: '3px solid rgba(0,245,212,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' };
