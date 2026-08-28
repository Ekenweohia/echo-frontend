'use client';

import React, { useState, FormEvent } from 'react';
import { apiClient } from '@/services/apiClient';

interface UnifiedDMKFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnifiedDMKForm({ onClose, onSuccess }: UnifiedDMKFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Demographic & Profile
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [religion, setReligion] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');
  const [language, setLanguage] = useState('');

  // 2. Emergency Contacts
  const [ecName, setEcName] = useState('');
  const [ecRelationship, setEcRelationship] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecSecondary, setEcSecondary] = useState('');

  // 3. Vitals & Lifestyle
  const [bloodGroup, setBloodGroup] = useState('');
  const [genotype, setGenotype] = useState('');
  const [smoking, setSmoking] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [diet, setDiet] = useState('');
  const [exerciseFreq, setExerciseFreq] = useState('');
  const [occupationCat, setOccupationCat] = useState('');
  const [livingSituation, setLivingSituation] = useState('');

  // 4. Women's Health (OBGYN)
  const [gravida, setGravida] = useState('');
  const [para, setPara] = useState('');
  const [miscarriages, setMiscarriages] = useState('');
  const [lastMenstrualPeriod, setLastMenstrualPeriod] = useState('');
  const [menstrualRegularity, setMenstrualRegularity] = useState('');
  const [contraceptiveUse, setContraceptiveUse] = useState('');
  const [menopause, setMenopause] = useState('');
  const [obgynNotes, setObgynNotes] = useState('');

  // 5. Array / Tag Fields (comma separated)
  const [cond, setCond] = useState('');
  const [surg, setSurg] = useState('');
  const [imm, setImm] = useState('');
  const [mentalHistory, setMentalHistory] = useState('');
  const [cognitive, setCognitive] = useState('');
  const [directives, setDirectives] = useState('');
  const [famHistory, setFamHistory] = useState('');
  const [assistive, setAssistive] = useState('');
  const [petsType, setPetsType] = useState('');
  const [pregnancyComplications, setPregnancyComplications] = useState('');
  const [substanceUse, setSubstanceUse] = useState('');

  // 6. Combo Fields
  const [drugAll, setDrugAll] = useState('');
  const [foodAll, setFoodAll] = useState('');
  const [rxMeds, setRxMeds] = useState('');
  const [otcMeds, setOtcMeds] = useState('');
  const [herbalMeds, setHerbalMeds] = useState('');

  // 7. Open Text Fields
  const [condOther, setCondOther] = useState('');
  const [surgOther, setSurgOther] = useState('');
  const [otherAll, setOtherAll] = useState('');
  const [medsNotes, setMedsNotes] = useState('');
  const [admitDetails, setAdmitDetails] = useState('');
  const [transfusionDetails, setTransfusionDetails] = useState('');
  const [immNotes, setImmNotes] = useState('');
  const [mentalNotes, setMentalNotes] = useState('');
  const [dirNotes, setDirNotes] = useState('');
  const [famHistoryNotes, setFamHistoryNotes] = useState('');
  const [assistiveNotes, setAssistiveNotes] = useState('');
  const [substanceDetails, setSubstanceDetails] = useState('');
  const [lifestyleNotes, setLifestyleNotes] = useState('');

  const parseArray = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const payload: any = {};

    // Helper to add if present
    const addStr = (key: string, val: string) => { if (val.trim()) payload[key] = val.trim(); };
    const addArr = (key: string, val: string) => { const arr = parseArray(val); if (arr.length > 0) payload[key] = arr; };

    // 1
    addStr('fullName', fullName); addStr('dob', dob); addStr('gender', gender);
    addStr('maritalStatus', maritalStatus); addStr('religion', religion); addStr('nationality', nationality);
    addStr('address', address); addStr('language', language);
    
    // 2
    addStr('ecName', ecName); addStr('ecRelationship', ecRelationship);
    addStr('ecPhone', ecPhone); addStr('ecSecondary', ecSecondary);

    // 3
    addStr('bloodGroup', bloodGroup); addStr('genotype', genotype); addStr('smoking', smoking);
    addStr('alcohol', alcohol); addStr('diet', diet); addStr('exerciseFreq', exerciseFreq);
    addStr('occupationCat', occupationCat); addStr('livingSituation', livingSituation);

    // 4
    addStr('gravida', gravida); addStr('para', para); addStr('miscarriages', miscarriages);
    addStr('lastMenstrualPeriod', lastMenstrualPeriod); addStr('menstrualRegularity', menstrualRegularity);
    addStr('contraceptiveUse', contraceptiveUse); addStr('menopause', menopause); addStr('obgynNotes', obgynNotes);

    // 5
    addArr('cond', cond); addArr('surg', surg); addArr('imm', imm);
    addArr('mentalHistory', mentalHistory); addArr('cognitive', cognitive); addArr('directives', directives);
    addArr('famHistory', famHistory); addArr('assistive', assistive); addArr('petsType', petsType);
    addArr('pregnancyComplications', pregnancyComplications); addArr('substanceUse', substanceUse);

    // 6
    addArr('drugAll', drugAll); addArr('foodAll', foodAll); addArr('rxMeds', rxMeds);
    addArr('otcMeds', otcMeds); addArr('herbalMeds', herbalMeds);

    // 7
    addStr('condOther', condOther); addStr('surgOther', surgOther); addStr('otherAll', otherAll);
    addStr('medsNotes', medsNotes); addStr('admitDetails', admitDetails); addStr('transfusionDetails', transfusionDetails);
    addStr('immNotes', immNotes); addStr('mentalNotes', mentalNotes); addStr('dirNotes', dirNotes);
    addStr('famHistoryNotes', famHistoryNotes); addStr('assistiveNotes', assistiveNotes);
    addStr('substanceDetails', substanceDetails); addStr('lifestyleNotes', lifestyleNotes);

    try {
      const response = await apiClient('/medical-history', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred while saving.');
    }
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle} className="glass-panel">
        <header style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Update Comprehensive Profile</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>All fields are optional. Leave blank to keep existing data unchanged.</p>
          </div>
          <button type="button" onClick={onClose} style={closeStyle}>×</button>
        </header>

        {status === 'success' ? (
          <div style={successStateStyle}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ margin: '0 0 8px' }}>Profile Updated</h3>
            <p style={{ margin: 0, color: '#94a3b8' }}>Your digital medical kit has been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            {status === 'error' && <div style={errorBannerStyle}>{errorMessage}</div>}
            
            <Section title="1. Basic Demographics">
              <Row>
                <Input label="Full Name" value={fullName} onChange={setFullName} />
                <Input label="Date of Birth" type="date" value={dob} onChange={setDob} />
                <Input label="Gender" value={gender} onChange={setGender} options={["Male", "Female", "Prefer not to say"]} />
              </Row>
              <Row>
                <Input label="Marital Status" value={maritalStatus} onChange={setMaritalStatus} options={["Single", "Married", "Divorced", "Widowed"]} />
                <Input label="Religion" value={religion} onChange={setReligion} options={["Christianity", "Islam", "Traditional", "Other", "Prefer not to say"]} />
                <Input label="Nationality" value={nationality} onChange={setNationality} />
              </Row>
              <Row>
                <Input label="Address" value={address} onChange={setAddress} />
                <Input label="Language" value={language} onChange={setLanguage} />
              </Row>
            </Section>

            <Section title="2. Emergency Contacts">
              <Row>
                <Input label="Contact Name" value={ecName} onChange={setEcName} />
                <Input label="Relationship" value={ecRelationship} onChange={setEcRelationship} />
              </Row>
              <Row>
                <Input label="Primary Phone" value={ecPhone} onChange={setEcPhone} />
                <Input label="Secondary Phone" value={ecSecondary} onChange={setEcSecondary} />
              </Row>
            </Section>

            <Section title="3. Vitals & Lifestyle">
              <Row>
                <Input label="Blood Group" placeholder="e.g. O+" value={bloodGroup} onChange={setBloodGroup} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]} />
                <Input label="Genotype" placeholder="e.g. AA, AS" value={genotype} onChange={setGenotype} options={["AA", "AS", "SS", "AC", "SC", "Unknown"]} />
              </Row>
              <Row>
                <Input label="Smoking Status" value={smoking} onChange={setSmoking} options={["Never smoked", "Former smoker", "Current smoker (social)", "Current smoker (daily)"]} />
                <Input label="Alcohol Use" value={alcohol} onChange={setAlcohol} options={["None", "Occasional/Social", "Moderate", "Heavy"]} />
              </Row>
              <Row>
                <Input label="Diet" value={diet} onChange={setDiet} options={["Standard/Omnivore", "Vegetarian", "Vegan", "Keto", "Gluten-Free", "Other"]} />
                <Input label="Exercise Frequency" value={exerciseFreq} onChange={setExerciseFreq} options={["None", "1-2 times/week", "3-4 times/week", "5+ times/week"]} />
              </Row>
              <Row>
                <Input label="Occupation Category" value={occupationCat} onChange={setOccupationCat} />
                <Input label="Living Situation" value={livingSituation} onChange={setLivingSituation} />
              </Row>
            </Section>

            <Section title="4. Women's Health (OBGYN)">
              <Row>
                <Input label="Gravida (Pregnancies)" type="number" value={gravida} onChange={setGravida} />
                <Input label="Para (Live Births)" type="number" value={para} onChange={setPara} />
                <Input label="Miscarriages" type="number" value={miscarriages} onChange={setMiscarriages} options={["0", "1", "2", "3", "4", "5+"]} />
              </Row>
              <Row>
                <Input label="Last Menstrual Period" type="date" value={lastMenstrualPeriod} onChange={setLastMenstrualPeriod} />
                <Input label="Menstrual Regularity" value={menstrualRegularity} onChange={setMenstrualRegularity} options={["Regular", "Irregular", "No longer menstruating"]} />
              </Row>
              <Row>
                <Input label="Contraceptive Use" value={contraceptiveUse} onChange={setContraceptiveUse} options={["None", "Pills", "IUD", "Implants", "Condoms", "Other"]} />
                <Input label="Menopause" value={menopause} onChange={setMenopause} options={["Pre-menopausal", "Peri-menopausal", "Post-menopausal"]} />
              </Row>
              <Input label="OBGYN Notes" value={obgynNotes} onChange={setObgynNotes} />
            </Section>

            <Section title="5. Medical History (Comma separated)">
              <Row>
                <Input label="Conditions (e.g. Asthma, Diabetes)" value={cond} onChange={setCond} />
                <Input label="Surgeries (e.g. Appendix removed)" value={surg} onChange={setSurg} />
              </Row>
              <Row>
                <Input label="Immunizations" value={imm} onChange={setImm} />
                <Input label="Mental Health Diagnoses" value={mentalHistory} onChange={setMentalHistory} />
              </Row>
              <Row>
                <Input label="Cognitive Issues" value={cognitive} onChange={setCognitive} />
                <Input label="Directives (e.g. DNR, Organ Donor)" value={directives} onChange={setDirectives} />
              </Row>
              <Row>
                <Input label="Family History" value={famHistory} onChange={setFamHistory} />
                <Input label="Assistive Devices" value={assistive} onChange={setAssistive} />
              </Row>
              <Row>
                <Input label="Pets" value={petsType} onChange={setPetsType} />
                <Input label="Pregnancy Complications" value={pregnancyComplications} onChange={setPregnancyComplications} />
              </Row>
              <Input label="Substance Use" value={substanceUse} onChange={setSubstanceUse} />
            </Section>

            <Section title="6. Medications & Allergies (Comma separated)">
              <Row>
                <Input label="Drug Allergies" value={drugAll} onChange={setDrugAll} />
                <Input label="Food/Other Allergies" value={foodAll} onChange={setFoodAll} />
              </Row>
              <Row>
                <Input label="Prescription Meds" value={rxMeds} onChange={setRxMeds} />
                <Input label="What medicine or herbs have you taken? or currently taking" value={otcMeds} onChange={setOtcMeds} />
                <Input label="Herbal Supplements" value={herbalMeds} onChange={setHerbalMeds} />
              </Row>
            </Section>

            <Section title="7. Additional Notes">
              <Row>
                <Input label="Condition Notes" value={condOther} onChange={setCondOther} />
                <Input label="Surgery Notes" value={surgOther} onChange={setSurgOther} />
              </Row>
              <Row>
                <Input label="Allergy Notes" value={otherAll} onChange={setOtherAll} />
                <Input label="Medication Notes" value={medsNotes} onChange={setMedsNotes} />
              </Row>
              <Row>
                <Input label="Hospital Admissions" value={admitDetails} onChange={setAdmitDetails} />
                <Input label="Blood Transfusions" value={transfusionDetails} onChange={setTransfusionDetails} />
              </Row>
              <Row>
                <Input label="Immunization Notes" value={immNotes} onChange={setImmNotes} />
                <Input label="Mental Health Notes" value={mentalNotes} onChange={setMentalNotes} />
              </Row>
              <Row>
                <Input label="Directives Notes" value={dirNotes} onChange={setDirNotes} />
                <Input label="Family History Notes" value={famHistoryNotes} onChange={setFamHistoryNotes} />
              </Row>
              <Row>
                <Input label="Assistive Device Notes" value={assistiveNotes} onChange={setAssistiveNotes} />
                <Input label="Substance Details" value={substanceDetails} onChange={setSubstanceDetails} />
              </Row>
              <Input label="Lifestyle Notes" value={lifestyleNotes} onChange={setLifestyleNotes} />
            </Section>

            <div style={footerStyle}>
              <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button type="submit" disabled={status === 'submitting'} style={submitBtnStyle}>
                {status === 'submitting' ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Helper Components
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: 15, margin: '0 0 12px', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>{title}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
  </div>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>
);

const Input = ({ label, value, onChange, type = 'text', placeholder = '', options }: any) => {
  const inputBaseStyle = {
    padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #31425c', 
    borderRadius: 8, color: '#f8fafc', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{label}</label>
      {options ? (
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          style={inputBaseStyle}
        >
          <option value="">-- Select --</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input 
          type={type} 
          value={value} 
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} 
          style={inputBaseStyle} 
        />
      )}
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', background: 'rgba(5, 14, 28, .8)', backdropFilter: 'blur(8px)' };
const modalStyle: React.CSSProperties = { width: '100%', maxWidth: '800px', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0b1628', border: '1px solid rgba(147, 197, 253, .15)', borderRadius: 16, boxShadow: '0 28px 80px rgba(0,0,0,.45)' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(147, 197, 253, .1)', flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.2)' };
const closeStyle: React.CSSProperties = { border: 0, color: '#cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: 24, lineHeight: 1 };
const formStyle: React.CSSProperties = { padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' };
const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(147, 197, 253, .1)' };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', color: '#94a3b8', border: '1px solid #31425c', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const submitBtnStyle: React.CSSProperties = { padding: '10px 20px', color: '#0b1628', border: 0, borderRadius: 8, background: 'linear-gradient(90deg, #00f5d4 0%, #00bbf9 100%)', cursor: 'pointer', fontWeight: 700, fontSize: 14 };
const errorBannerStyle: React.CSSProperties = { background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '12px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 14, marginBottom: 20 };
const successStateStyle: React.CSSProperties = { padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1, color: '#eff6ff' };
