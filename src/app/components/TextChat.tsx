'use client';

import React, { FormEvent, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import { GoogleGenAI } from '@google/genai';
import formData from '@/app/data/echoai_form_data.json';

interface TextChatProps {
  isOpen: boolean;
  onClose: () => void;
  illnessTag: string;
  illnessTitle?: string;
  illnessColor?: string;
  illnessIcon?: string;
}


// Helper to convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function TextChat({
  isOpen,
  onClose,
  illnessTitle = 'Medical Chat',
  illnessColor = '#00f5d4',
  illnessIcon = '🩺'
}: TextChatProps) {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Voice Recording State
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Form State
  const [chiefComplaint, setChiefComplaint] = useState(illnessTitle);
  const [symptomOnset, setSymptomOnset] = useState('');
  const [redFlags, setRedFlags] = useState<string[]>([]);

  // Dynamic Form State
  const [selectedSymptomGroupId, setSelectedSymptomGroupId] = useState<string>('');
  const [clinicalAnswers, setClinicalAnswers] = useState<Record<string, { question: string, answer: string }>>({});

  const currentGroup = formData.symptomGroups.find(g => g.id === selectedSymptomGroupId);


  // Health Readings
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulse, setPulse] = useState('');

  // DMK Prefills
  const [drugAll, setDrugAll] = useState('');
  const [foodAll, setFoodAll] = useState('');
  const [rxMeds, setRxMeds] = useState('');
  const [otcMeds, setOtcMeds] = useState('');

  // Fetch DMK to prefill
  useEffect(() => {
    if (!isOpen || loading || !user) return;

    setChiefComplaint(illnessTitle);

    // Auto-select symptom group if it loosely matches illnessTitle
    const matchedGroup = formData.symptomGroups.find(g =>
      g.label.toLowerCase().includes(illnessTitle.toLowerCase()) ||
      illnessTitle.toLowerCase().includes(g.label.toLowerCase().split(' / ')[0])
    );
    if (matchedGroup) {
      setSelectedSymptomGroupId(matchedGroup.id);
    } else {
      setSelectedSymptomGroupId('');
    }
    setClinicalAnswers({});
    setRedFlags([]);

    const fetchDMK = async () => {
      setStatus('loading');
      try {
        const response = await apiClient('/dmk/me');
        if (response.ok) {
          const payload = await response.json();
          const dmk = payload?.data;
          if (dmk) {
            if (dmk.allergies && dmk.allergies.length > 0) {
              const uniqueAllergies = Array.from(new Set(dmk.allergies.map((a: any) => (a.allergen || a.name)?.trim()).filter(Boolean)));
              setDrugAll(uniqueAllergies.join(', '));
            }
            if (dmk.medications && dmk.medications.length > 0) {
              const uniqueMeds = Array.from(new Set(dmk.medications.map((m: any) => m.name?.trim()).filter(Boolean)));
              setRxMeds(uniqueMeds.join(', '));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching DMK:", err);
      } finally {
        setStatus('idle');
      }
    };

    fetchDMK();
  }, [isOpen, loading, user, illnessTitle]);

  const handleRedFlagToggle = (flag: string) => {
    setRedFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const handleSymptomGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSymptomGroupId(e.target.value);
    setClinicalAnswers({});
    setRedFlags([]);
  };

  const handleDynamicQuestionChange = (questionId: string, questionLabel: string, answer: string) => {
    setClinicalAnswers(prev => ({
      ...prev,
      [questionId]: {
        question: questionLabel,
        answer
      }
    }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceIntake(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      setRecordingStatus('recording');
    } catch (err) {
      console.error("Microphone access denied or error", err);
      setErrorMessage("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingStatus('processing');
    }
  };

  const processVoiceIntake = async (audioBlob: Blob) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY in environment variables.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: 'audio/webm'
            }
          },
          "Extract the clinical intake information from this audio."
        ],
        config: {
          responseMimeType: "application/json",
          systemInstruction: `You are an expert clinical triage assistant.
Listen to the patient's audio recording and extract their clinical intake information.
Output ONLY a raw JSON object with the following structure:
{
  "chiefComplaint": "string",
  "symptomOnset": "string",
  "redFlags": ["array of matching warning signs"],
  "healthReadings": { "bloodPressure": "string", "temperature": "string", "pulse": "string" },
  "drugAll": ["array of drug allergies"],
  "foodAll": ["array of food allergies"],
  "rxMeds": ["array of prescription medications"],
  "otcMeds": ["array of over-the-counter medications"]
}
If a piece of information is not mentioned in the audio, leave the field empty or omit it.`
        }
      });

      if (response.text) {
        const intakeData = JSON.parse(response.text);

        // Populate fields if present
        if (intakeData.chiefComplaint) setChiefComplaint(intakeData.chiefComplaint);
        if (intakeData.symptomOnset) setSymptomOnset(intakeData.symptomOnset);
        if (intakeData.drugAll && Array.isArray(intakeData.drugAll)) setDrugAll(intakeData.drugAll.join(', '));
        if (intakeData.foodAll && Array.isArray(intakeData.foodAll)) setFoodAll(intakeData.foodAll.join(', '));
        if (intakeData.rxMeds && Array.isArray(intakeData.rxMeds)) setRxMeds(intakeData.rxMeds.join(', '));
        if (intakeData.otcMeds && Array.isArray(intakeData.otcMeds)) setOtcMeds(intakeData.otcMeds.join(', '));

        if (intakeData.healthReadings) {
          if (intakeData.healthReadings.bloodPressure) setBloodPressure(intakeData.healthReadings.bloodPressure);
          if (intakeData.healthReadings.temperature) setTemperature(intakeData.healthReadings.temperature);
          if (intakeData.healthReadings.pulse) setPulse(intakeData.healthReadings.pulse);
        }

        if (Array.isArray(intakeData.redFlags)) {
          // Only add valid red flags for the current group
          const currentFlags = currentGroup?.redFlags?.map((f: any) => f.label) || [];
          const validFlags = intakeData.redFlags.filter((flag: string) => currentFlags.includes(flag));
          setRedFlags(prev => Array.from(new Set([...prev, ...validFlags])));
        }
      }

    } catch (err: any) {
      console.error("Error processing voice intake:", err);
      setErrorMessage(err.message || "Failed to process voice intake.");
    } finally {
      setRecordingStatus('idle');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');

    const payload = {
      chiefComplaint,
      symptomOnset: symptomOnset || undefined,
      redFlags: redFlags.length > 0 ? redFlags : undefined,
      healthReadings: (bloodPressure || temperature || pulse) ? {
        ...(bloodPressure ? { bloodPressure } : {}),
        ...(temperature ? { temperature } : {}),
        ...(pulse ? { pulse } : {})
      } : undefined,
      drugAll: drugAll ? drugAll.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      foodAll: foodAll ? foodAll.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      rxMeds: rxMeds ? rxMeds.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      otcMeds: otcMeds ? otcMeds.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      formData: currentGroup ? {
        symptomGroup: currentGroup.id,
        symptomGroupLabel: currentGroup.label,
        answers: clinicalAnswers
      } : undefined
    };

    try {
      const response = await apiClient('/echo-ai/manual-intake', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (response.ok && result?.success) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setRedFlags([]);
          setSymptomOnset('');
          setBloodPressure('');
          setTemperature('');
          setPulse('');
        }, 2000);
      } else {
        throw new Error(result?.message || 'Failed to submit intake form');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred while submitting.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={`${illnessTitle} Intake Form`}>
      <section style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <div style={{ color: illnessColor, fontSize: 13, fontWeight: 700 }}>
              {illnessIcon} CLINICAL INTAKE
            </div>
            <h2 style={{ margin: '5px 0 0', fontSize: 20 }}>{illnessTitle}</h2>
          </div>
          <button type="button" onClick={onClose} style={closeStyle} aria-label="Close intake">×</button>
        </header>

        {status === 'success' ? (
          <div style={successStateStyle}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ margin: '0 0 8px' }}>Intake Submitted</h3>
            <p style={{ margin: 0, color: '#94a3b8' }}>Your triage is being prepared.</p>
          </div>
        ) : (
          <div style={formStyle}>
            {status === 'error' && (
              <div style={errorBannerStyle}>{errorMessage}</div>
            )}

            <div style={voiceSectionStyle}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: 14 }}>Voice Intake</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Speak your symptoms and we'll automatically fill the form.</p>
              </div>
              <button
                type="button"
                onClick={recordingStatus === 'recording' ? stopRecording : startRecording}
                disabled={recordingStatus === 'processing'}
                style={{
                  ...recordButtonStyle,
                  background: recordingStatus === 'recording' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  color: recordingStatus === 'recording' ? '#ef4444' : '#94a3b8',
                  borderColor: recordingStatus === 'recording' ? '#ef4444' : '#31425c',
                }}
              >
                {recordingStatus === 'recording' ? 'Stop Recording 🛑' : recordingStatus === 'processing' ? 'Processing...' : 'Record 🎤'}
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Main Reason for Visit</label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={rowStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>How long have you had this problem?</label>
                  <select
                    value={symptomOnset}
                    onChange={e => setSymptomOnset(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">-- Select Duration --</option>
                    <option value="Today">Today</option>
                    <option value="1-3 days">1-3 days</option>
                    <option value="4-7 days">4-7 days</option>
                    <option value="1-2 weeks">1-2 weeks</option>
                    <option value="More than 2 weeks">More than 2 weeks</option>
                  </select>
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Health Readings (Optional)</label>
                <div style={rowStyle}>
                  <input
                    type="text"
                    placeholder="BP (e.g. 120/80)"
                    value={bloodPressure}
                    onChange={e => setBloodPressure(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Temp (e.g. 38.5 C)"
                    value={temperature}
                    onChange={e => setTemperature(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Pulse (e.g. 90)"
                    value={pulse}
                    onChange={e => setPulse(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Symptom Group</label>
                <select
                  value={selectedSymptomGroupId}
                  onChange={handleSymptomGroupChange}
                  style={inputStyle}
                >
                  <option value="">-- Select a Symptom Category --</option>
                  {formData.symptomGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.label}</option>
                  ))}
                </select>
              </div>

              {currentGroup && currentGroup.focusedQuestions && currentGroup.focusedQuestions.length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px solid rgba(147, 197, 253, .14)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: 0, color: '#93c5fd', fontSize: '15px' }}>Help your doctor or nurse understand you better: {currentGroup.label}</h4>

                  {currentGroup.focusedQuestions.map((q: any) => {
                    const answerObj = clinicalAnswers[q.id];
                    const currentAnswer = answerObj ? answerObj.answer : '';

                    return (
                      <div key={q.id} style={formGroupStyle}>
                        <label style={labelStyle}>{q.label}</label>
                        {q.type === 'select' || q.type === 'yesno' ? (
                          <select
                            value={currentAnswer}
                            onChange={(e) => handleDynamicQuestionChange(q.id, q.label, e.target.value)}
                            style={inputStyle}
                          >
                            <option value="">-- Select --</option>
                            {q.options?.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={currentAnswer}
                            onChange={(e) => handleDynamicQuestionChange(q.id, q.label, e.target.value)}
                            style={inputStyle}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {currentGroup && currentGroup.redFlags && currentGroup.redFlags.length > 0 && (
                <div style={formGroupStyle}>
                  <label style={{ ...labelStyle, color: '#ef4444' }}>Warning Signs (Red Flags - Select any that apply)</label>
                  <div style={checkboxGroupStyle}>
                    {currentGroup.redFlags.map((flag: any) => (
                      <label key={flag.label} style={checkboxLabelStyle}>
                        <input
                          type="checkbox"
                          checked={redFlags.includes(flag.label)}
                          onChange={() => handleRedFlagToggle(flag.label)}
                          style={{ marginRight: 8, accentColor: '#ef4444' }}
                        />
                        {flag.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={rowStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Drug Allergies</label>
                  <input
                    type="text"
                    placeholder="e.g., Penicillin"
                    value={drugAll}
                    onChange={e => setDrugAll(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Food Allergies</label>
                  <input
                    type="text"
                    placeholder="e.g., Peanuts"
                    value={foodAll}
                    onChange={e => setFoodAll(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={rowStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Prescription Meds</label>
                  <input
                    type="text"
                    placeholder="e.g., Lisinopril"
                    value={rxMeds}
                    onChange={e => setRxMeds(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>What medicine or herbs have you taken? or currently taking</label>
                  <input
                    type="text"
                    placeholder="e.g., Aspirin"
                    value={otcMeds}
                    onChange={e => setOtcMeds(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={footerStyle}>
                <button
                  type="submit"
                  disabled={status === 'submitting' || recordingStatus !== 'idle'}
                  style={{ ...submitStyle, background: illnessColor, opacity: (status === 'submitting' || recordingStatus !== 'idle') ? 0.7 : 1 }}
                >
                  {status === 'submitting' ? 'Submitting...' : 'Submit Intake'}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(5, 14, 28, .72)', backdropFilter: 'blur(8px)' };
const modalStyle: React.CSSProperties = { width: 'min(680px, 100%)', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#eff6ff', background: '#0b1628', border: '1px solid rgba(147, 197, 253, .24)', borderRadius: 20, boxShadow: '0 28px 80px rgba(0,0,0,.45)' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'start', justifyContent: 'space-between', padding: '22px 24px 16px', borderBottom: '1px solid rgba(147, 197, 253, .14)', flexShrink: 0 };
const closeStyle: React.CSSProperties = { border: 0, color: '#cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: 28, lineHeight: 1 };

const formStyle: React.CSSProperties = { padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' };
const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 };
const rowStyle: React.CSSProperties = { display: 'flex', gap: '16px', flexWrap: 'wrap' };
const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#94a3b8' };
const inputStyle: React.CSSProperties = { padding: '12px 14px', color: '#f8fafc', background: '#101d31', border: '1px solid #31425c', borderRadius: 10, outline: 'none', width: '100%', boxSizing: 'border-box' };

const checkboxGroupStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' };
const checkboxLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', fontSize: '14px', color: '#e2e8f0', cursor: 'pointer' };

const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(147, 197, 253, .14)', marginTop: '8px' };
const submitStyle: React.CSSProperties = { padding: '12px 24px', color: '#0b1628', border: 0, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '15px' };

const errorBannerStyle: React.CSSProperties = { background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '14px', marginBottom: 16 };
const successStateStyle: React.CSSProperties = { padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1 };

const voiceSectionStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid #31425c', borderRadius: '12px' };
const recordButtonStyle: React.CSSProperties = { padding: '8px 16px', border: '1px solid', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s ease' };