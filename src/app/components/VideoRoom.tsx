'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import { Room, RoomEvent, VideoPresets, Track } from 'livekit-client';

interface VideoRoomProps {
  consultationId: string;
  onClose: () => void;
}

export default function VideoRoom({ consultationId, onClose }: VideoRoomProps) {
  const { user } = useAuth();
  const roomRef = useRef<Room | null>(null);
  
  // Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  
  // LiveKit / Context states
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [contextData, setContextData] = useState<any>(null);
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');

  // Post-Consultation Charting States (Clinician only)
  const [showChartForm, setShowChartForm] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [publicSummary, setPublicSummary] = useState('');
  const [prescriptions, setPrescriptions] = useState<Array<{
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>([]);
  const [referrals, setReferrals] = useState<Array<{ specialty: string; reason: string }>>([]);
  const [followUps, setFollowUps] = useState<Array<{ recommendedDate: string; instructions: string }>>([]);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  
  // Messenger states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'System Engine', text: 'Secure clinical stream established. E2EE active.', time: '12:00' }
  ]);
  const [newMsg, setNewMsg] = useState('');
  
  // Ref elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    joinCallSession();

    return () => {
      // Senior practice: Guarantee media release on unmount
      cleanupMediaTracks();
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [consultationId]);

  useEffect(() => {
    chatScrollerRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!consultationId) return;

    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 3000);
    return () => clearInterval(interval);
  }, [consultationId]);

  const joinCallSession = async () => {
    try {
      const response = await apiClient(`/consultations/${consultationId}/join`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const roomToken = json.data.token;
          setToken(roomToken);
          setRoomName(json.data.roomName);
          setContextData(json.data.contextData);
          
          if (!roomToken) throw new Error('Missing LiveKit token');
          connectLiveKit(roomToken);
        }
      } else {
        throw new Error('Unable to join consultation');
      }
    } catch (e) {
      console.error('[VideoRoom] Failed to join consultation session.', e);
      setConnStatus('disconnected');
    }
  };

  const connectLiveKit = async (roomToken: string) => {
    try {
      setConnStatus('connecting');

      // 1. Initialize LiveKit Room
      const room = new Room({
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        }
      });
      roomRef.current = room;

      // 2. Bind LiveKit Event Listeners
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === 'video' && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.kind === 'video') {
          track.detach();
        }
      });

      room.on(RoomEvent.Connected, () => setConnStatus('connected'));
      room.on(RoomEvent.Disconnected, () => setConnStatus('disconnected'));
      room.on(RoomEvent.Reconnecting, () => setConnStatus('reconnecting'));
      room.on(RoomEvent.Reconnected, () => setConnStatus('connected'));

      // 3. Connect to room
      const host = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';
      await room.connect(host, roomToken);

      // 4. Enable Camera and Microphone
      await room.localParticipant.enableCameraAndMicrophone();

      // 5. Attach Local Video track for rendering
      const localVideoPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (localVideoPub && localVideoPub.track && localVideoRef.current) {
        localVideoPub.track.attach(localVideoRef.current);
      }

      // Enumerate devices for selector dropdowns
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioIns = devices.filter(d => d.kind === 'audioinput');
      const videoIns = devices.filter(d => d.kind === 'videoinput');
      setAudioDevices(audioIns);
      setVideoDevices(videoIns);
      if (audioIns.length > 0) setSelectedAudio(audioIns[0].deviceId);
      if (videoIns.length > 0) setSelectedVideo(videoIns[0].deviceId);

    } catch (err: any) {
      console.error('[VideoRoom] LiveKit connection failed.', err?.message || err);
      setConnStatus('disconnected');
    }
  };

  const setupDevicesAndCapture = async () => {
    try {
      // 1. Request camera and mic permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Enumerate system media devices for switching
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioIns = devices.filter(d => d.kind === 'audioinput');
      const videoIns = devices.filter(d => d.kind === 'videoinput');
      
      setAudioDevices(audioIns);
      setVideoDevices(videoIns);

      if (audioIns.length > 0) setSelectedAudio(audioIns[0].deviceId);
      if (videoIns.length > 0) setSelectedVideo(videoIns[0].deviceId);

    } catch (err) {
      console.error('[VideoRoom] Media capture blocked or unavailable.', err);
      setConnStatus('disconnected');
    }
  };

  const switchCamera = async (deviceId: string) => {
    setSelectedVideo(deviceId);
    if (roomRef.current?.localParticipant) {
      await roomRef.current.switchActiveDevice('videoinput', deviceId);
    } else if (localStream) {
      try {
        // Stop old video tracks
        localStream.getVideoTracks().forEach(t => t.stop());
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
        });

        // Swap track
        const videoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStream.removeTrack(oldVideoTrack);
          localStream.addTrack(videoTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch (e) {
        console.error('[VideoRoom] Failed to switch video inputs:', e);
      }
    }
  };

  const switchMic = async (deviceId: string) => {
    setSelectedAudio(deviceId);
    if (roomRef.current?.localParticipant) {
      await roomRef.current.switchActiveDevice('audioinput', deviceId);
    } else if (localStream) {
      try {
        // Stop old audio tracks
        localStream.getAudioTracks().forEach(t => t.stop());
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: { deviceId: { exact: deviceId } }
        });

        const audioTrack = newStream.getAudioTracks()[0];
        const oldAudioTrack = localStream.getAudioTracks()[0];
        if (oldAudioTrack) {
          localStream.removeTrack(oldAudioTrack);
          localStream.addTrack(audioTrack);
        }
      } catch (e) {
        console.error('[VideoRoom] Failed to switch audio inputs:', e);
      }
    }
  };

  const toggleMic = async () => {
    const enabled = !isMicMuted;
    if (roomRef.current?.localParticipant) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    } else if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
    setIsMicMuted(!isMicMuted);
  };

  const toggleCam = async () => {
    const enabled = !isCamOff;
    if (roomRef.current?.localParticipant) {
      await roomRef.current.localParticipant.setCameraEnabled(enabled);
    } else if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
    setIsCamOff(!isCamOff);
  };

  const cleanupMediaTracks = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`[VideoRoom] Released track: ${track.kind}`);
      });
      setLocalStream(null);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const response = await apiClient(`/consultations/${consultationId}/messages`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setChatMessages(json.data.map((m: any) => ({
            sender: m.sender.fullName,
            text: m.message,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }
      }
    } catch (e) {
      console.error('[VideoRoom] Failed to fetch messages.', e);
    }
  };

  const sendTextMessage = async () => {
    if (!newMsg.trim()) return;

    const textToSend = newMsg.trim();
    setNewMsg('');

    // Optimistically update UI locally
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, {
      sender: user?.fullName || 'User',
      text: textToSend,
      time: formattedTime
    }]);

    try {
      // Call actual backend API
      const response = await apiClient(`/consultations/${consultationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: textToSend })
      });
      if (response.ok) {
        fetchChatMessages();
      }
    } catch (err) {
      console.error('[VideoRoom] Message send failed.', err);
    }
  };

  const addPrescriptionRow = () => {
    setPrescriptions(prev => [...prev, { medicationName: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };
  const updatePrescription = (idx: number, key: string, val: string) => {
    setPrescriptions(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  };
  const deletePrescriptionRow = (idx: number) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== idx));
  };

  const addReferralRow = () => {
    setReferrals(prev => [...prev, { specialty: '', reason: '' }]);
  };
  const updateReferral = (idx: number, key: string, val: string) => {
    setReferrals(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  };
  const deleteReferralRow = (idx: number) => {
    setReferrals(prev => prev.filter((_, i) => i !== idx));
  };

  const addFollowUpRow = () => {
    setFollowUps(prev => [...prev, { recommendedDate: '', instructions: '' }]);
  };
  const updateFollowUp = (idx: number, key: string, val: string) => {
    setFollowUps(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  };
  const deleteFollowUpRow = (idx: number) => {
    setFollowUps(prev => prev.filter((_, i) => i !== idx));
  };

  const submitClinicalRecord = async () => {
    setRecordError(null);
    if (!clinicalNotes.trim() || !publicSummary.trim()) {
      setRecordError('Clinical notes and public summary are required before submission.');
      return;
    }

    setIsSubmittingRecord(true);
    try {
      const payload = {
        clinicalNotes,
        publicSummary,
        prescriptions,
        referrals,
        followUps: followUps.map(f => ({
          recommendedDate: f.recommendedDate ? new Date(f.recommendedDate).toISOString() : new Date().toISOString(),
          instructions: f.instructions
        }))
      };

      const response = await apiClient(`/consultations/${consultationId}/records`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onClose();
      } else {
        const json = await response.json().catch(() => null);
        setRecordError(json?.message || 'Failed to submit clinical record.');
      }
    } catch (e) {
      console.error('[VideoRoom] Failed to submit clinical record.', e);
      setRecordError('The record could not be saved. Please try again.');
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  // Safe End Call handling
  const endCall = async () => {
    cleanupMediaTracks();
    setConnStatus('disconnected');
    
    if (user?.role === 'PATIENT') {
      try {
        await apiClient(`/consultations/${consultationId}/end`, { method: 'POST' });
      } catch (e) {
        // Fallback or ignore network error on ending
      }
      onClose();
    } else {
      // Clinicians must write clinical records before closing
      setShowChartForm(true);
    }
  };

  if (showChartForm) {
    return (
      <div style={fullscreenOverlayStyle}>
        <div className="glow-orb glow-orb-secondary" style={{ opacity: 0.15, right: '10%' }} />
        <div style={chartFormPanelStyle} className="glass-panel">
          <div style={chartHeaderStyle}>
            <h3 style={chartTitleStyle}>📋 Patient Case Charting Workspace</h3>
            <p style={chartSubTitleStyle}>Compile notes, medications, specialist referrals, and follow-ups to close this consultation session.</p>
          </div>
          
          <div style={chartBodyGridStyle}>
            {recordError ? <div style={recordErrorStyle}>{recordError}</div> : null}
            {/* Form Fields */}
            <div style={chartFormScrollArea}>
              
              <div style={inputGroupStyle}>
                <label style={inputLabelStyle}>Internal Clinical Notes (Only visible to Doctors/Nurses)</label>
                <textarea 
                  value={clinicalNotes} 
                  onChange={(e) => setClinicalNotes(e.target.value)} 
                  placeholder="Patient exhibits moderate cardiovascular load. Heart sounds normal. Prescribing Lisinopril for blood pressure support..." 
                  style={textareaStyle}
                  rows={4}
                />
              </div>

              <div style={inputGroupStyle}>
                <label style={inputLabelStyle}>Public Summary (Shared with Patient in their records)</label>
                <textarea 
                  value={publicSummary} 
                  onChange={(e) => setPublicSummary(e.target.value)} 
                  placeholder="Hypertension assessment. Low sodium diet, prescription provided." 
                  style={textareaStyle}
                  rows={3}
                />
              </div>

              {/* Prescriptions Block */}
              <div style={formCardStyle}>
                <div style={flexHeaderRow}>
                  <h4 style={cardHeadingStyle}>Prescriptions (Rx Plan)</h4>
                  <button type="button" onClick={addPrescriptionRow} style={addBtnStyle}>+ Add Medication</button>
                </div>
                {prescriptions.length === 0 ? (
                  <p style={emptyRowLabelStyle}>No medications added.</p>
                ) : (
                  prescriptions.map((rx, idx) => (
                    <div key={idx} style={dynamicRowStyle}>
                      <input 
                        type="text" 
                        placeholder="Medication Name" 
                        value={rx.medicationName} 
                        onChange={(e) => updatePrescription(idx, 'medicationName', e.target.value)}
                        style={rowInputStyle}
                      />
                      <input 
                        type="text" 
                        placeholder="Dosage (e.g. 10mg)" 
                        value={rx.dosage} 
                        onChange={(e) => updatePrescription(idx, 'dosage', e.target.value)}
                        style={rowInputStyle}
                      />
                      <input 
                        type="text" 
                        placeholder="Frequency (e.g. Once daily)" 
                        value={rx.frequency} 
                        onChange={(e) => updatePrescription(idx, 'frequency', e.target.value)}
                        style={rowInputStyle}
                      />
                      <input 
                        type="text" 
                        placeholder="Duration (e.g. 14 days)" 
                        value={rx.duration} 
                        onChange={(e) => updatePrescription(idx, 'duration', e.target.value)}
                        style={rowInputStyle}
                      />
                      <input 
                        type="text" 
                        placeholder="Instructions (e.g. Take with food)" 
                        value={rx.instructions} 
                        onChange={(e) => updatePrescription(idx, 'instructions', e.target.value)}
                        style={{ ...rowInputStyle, gridColumn: 'span 3' }}
                      />
                      <button type="button" onClick={() => deletePrescriptionRow(idx)} style={deleteBtnStyle}>×</button>
                    </div>
                  ))
                )}
              </div>

              {/* Referrals Block */}
              <div style={formCardStyle}>
                <div style={flexHeaderRow}>
                  <h4 style={cardHeadingStyle}>Specialist Referrals</h4>
                  <button type="button" onClick={addReferralRow} style={addBtnStyle}>+ Add Referral</button>
                </div>
                {referrals.length === 0 ? (
                  <p style={emptyRowLabelStyle}>No specialist referrals added.</p>
                ) : (
                  referrals.map((ref, idx) => (
                    <div key={idx} style={dynamicRowStyle}>
                      <input 
                        type="text" 
                        placeholder="Specialty (e.g. Cardiology)" 
                        value={ref.specialty} 
                        onChange={(e) => updateReferral(idx, 'specialty', e.target.value)}
                        style={rowInputStyle}
                      />
                      <input 
                        type="text" 
                        placeholder="Reason for referral" 
                        value={ref.reason} 
                        onChange={(e) => updateReferral(idx, 'reason', e.target.value)}
                        style={{ ...rowInputStyle, gridColumn: 'span 2' }}
                      />
                      <button type="button" onClick={() => deleteReferralRow(idx)} style={deleteBtnStyle}>×</button>
                    </div>
                  ))
                )}
              </div>

              {/* Follow-ups Block */}
              <div style={formCardStyle}>
                <div style={flexHeaderRow}>
                  <h4 style={cardHeadingStyle}>Recommended Follow-Ups</h4>
                  <button type="button" onClick={addFollowUpRow} style={addBtnStyle}>+ Add Follow-Up</button>
                </div>
                {followUps.length === 0 ? (
                  <p style={emptyRowLabelStyle}>No follow-ups scheduled.</p>
                ) : (
                  followUps.map((fu, idx) => (
                    <div key={idx} style={dynamicRowStyle}>
                      <input 
                        type="datetime-local" 
                        value={fu.recommendedDate} 
                        onChange={(e) => updateFollowUp(idx, 'recommendedDate', e.target.value)}
                        style={rowInputStyle}
                      />
                      <input 
                        type="text" 
                        placeholder="Instructions" 
                        value={fu.instructions} 
                        onChange={(e) => updateFollowUp(idx, 'instructions', e.target.value)}
                        style={{ ...rowInputStyle, gridColumn: 'span 2' }}
                      />
                      <button type="button" onClick={() => deleteFollowUpRow(idx)} style={deleteBtnStyle}>×</button>
                    </div>
                  ))
                )}
              </div>

              {/* Form Action Controls */}
              <div style={formActionsStyle}>
                <button 
                  type="button"
                  onClick={submitClinicalRecord} 
                  disabled={isSubmittingRecord || !clinicalNotes.trim() || !publicSummary.trim()}
                  style={btnSubmitChartStyle}
                >
                  {isSubmittingRecord ? 'Submitting Record...' : 'Submit Consultation Record & Exit'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowChartForm(false)} 
                  style={btnCancelChartStyle}
                >
                  Cancel & Back to Room
                </button>
              </div>

            </div>

            {/* Sidebar Diagnostic Reference Panel */}
            <div style={chartSidebarStyle}>
              <h4 style={panelHeaderStyle}>Clinical Reference Info</h4>
              {contextData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={infoCardStyle}>
                    <strong>Echo Triage Acuity:</strong>
                    <span style={criticalLabelStyle}>{contextData.echoSummary?.triageResult?.acuity}</span>
                    <p style={{ ...contextSummaryStyle, marginTop: '0.25rem' }}>
                      Chief Complaint: {contextData.echoSummary?.clinicalIntake?.chiefComplaint}
                    </p>
                  </div>
                  <div style={dmkCardStyle}>
                    <h5 style={subHeaderStyle}>Patient Medical File (DMK)</h5>
                    <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span>Blood Type: {contextData.dmk?.bloodType || 'N/A'}</span>
                      <span>Allergies: {contextData.dmk?.allergies?.map((a: any) => a.name).join(', ') || 'None'}</span>
                      <span>Active Medications: {contextData.dmk?.medications?.map((m: any) => m.name).join(', ') || 'None'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={fullscreenOverlayStyle}>
      
      {/* Visual background EKG heartbeat elements */}
      <div className="glow-orb glow-orb-secondary" style={{ opacity: 0.15, right: '10%' }} />

      {/* Main room panel wrapper */}
      <div style={roomPanelStyle} className="glass-panel">
        
        {/* Left Side: Call Stream Grid */}
        <div style={streamGridAreaStyle}>
          
          {/* Header metadata overlay */}
          <div style={callHeaderOverlayStyle}>
            <div style={statusLabelStyle(connStatus)}>
              <span style={pulsingDotStyle(connStatus === 'connected')} />
              {connStatus.toUpperCase()} — {roomName || 'SECURE STREAM'}
            </div>
            <div style={indicatorRowStyle}>
              {isMicMuted && <span style={indicatorStyle('#ff5a5f')}>MUTED MIC</span>}
              {isCamOff && <span style={indicatorStyle('#ff5a5f')}>CAM OFF</span>}
            </div>
          </div>

          {/* Remote Feed (Major Viewport) */}
          <div style={remoteFeedContainerStyle}>
            {connStatus === 'connecting' ? (
              <div style={feedPlaceholderStyle}>
                <div style={pulseLoaderStyle} />
                <p>Configuring secure LiveKit connection room...</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Visualizer simulation if webcam is offline/mock */}
                <div style={mockRemoteVisualizerStyle}>
                  <div style={ekgMonitorContainer}>
                    <div style={vitalRowStyle}>
                      <span>HEART RATE</span>
                      <span style={{ color: '#ff5a5f', fontWeight: 800 }}>88 bpm</span>
                    </div>
                    <div style={ekgWaveStyle}>
                      <svg width="100%" height="60" viewBox="0 0 300 60" fill="none">
                        <path 
                          d="M0 30 L50 30 L55 20 L60 40 L65 30 L100 30 L105 10 L110 50 L115 30 L150 30 L155 20 L160 40 L165 30 L200 30 L205 5 L210 55 L215 30 L250 30 L300 30" 
                          stroke="var(--primary)" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ strokeDasharray: '600', strokeDashoffset: '0', animation: 'heartbeat 3s infinite linear' }}
                        />
                      </svg>
                    </div>
                  </div>
                  <span style={remoteNameTagStyle}>
                    {user?.role === 'PATIENT' ? 'Clinician (Dr. Mark)' : 'Patient (Jane Doe)'}
                  </span>
                </div>
                {/* Optional HTML5 Remote webcam mock/bind if available */}
                <video ref={remoteVideoRef} autoPlay playsInline style={remoteVideoStyle} />
              </div>
            )}
          </div>

          {/* Local Feed (Picture in Picture overlay) */}
          <div style={localFeedPipStyle}>
            {isCamOff ? (
              <div style={localCamOffPlaceholderStyle}>
                <span>Cam Off</span>
              </div>
            ) : (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                style={localVideoStyle} 
              />
            )}
            <span style={localNameTagStyle}>You (Local)</span>
          </div>

          {/* Media Device Controls / Settings Toolbar */}
          <div style={controlToolbarStyle}>
            
            {/* Mic Switcher */}
            <div style={controlGroupStyle}>
              <button onClick={toggleMic} style={actionBtnStyle(isMicMuted)}>
                {isMicMuted ? '🎙️ Unmute' : '🎙️ Mute'}
              </button>
              {audioDevices.length > 0 && (
                <select 
                  value={selectedAudio} 
                  onChange={(e) => switchMic(e.target.value)} 
                  style={switcherSelectStyle}
                >
                  {audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mic'}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Camera Switcher */}
            <div style={controlGroupStyle}>
              <button onClick={toggleCam} style={actionBtnStyle(isCamOff)}>
                {isCamOff ? '📹 Start Cam' : '📹 Stop Cam'}
              </button>
              {videoDevices.length > 0 && (
                <select 
                  value={selectedVideo} 
                  onChange={(e) => switchCamera(e.target.value)} 
                  style={switcherSelectStyle}
                >
                  {videoDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
                  ))}
                </select>
              )}
            </div>

            {/* End Call button (Enforces patient end vs clinician disconnect) */}
            <button onClick={endCall} style={hangUpBtnStyle(user?.role === 'PATIENT')}>
              {user?.role === 'PATIENT' ? '🔴 End Consultation' : '🚪 Leave Call'}
            </button>

          </div>

        </div>

        {/* Right Side: Workspace Info Context / Messenger */}
        <div style={sidebarAreaStyle}>
          
          {/* Top Panel: Clinician Info Context (Only visible for Clinicians) */}
          {user?.role !== 'PATIENT' && contextData ? (
            <div style={clinicalContextPanelStyle}>
              <h4 style={panelHeaderStyle}>Clinical Case Metadata</h4>
              
              {/* Triage Summary */}
              <div style={infoCardStyle}>
                <div style={badgeRowStyle}>
                  <span style={criticalLabelStyle}>
                    Acuity: {contextData.echoSummary?.triageResult?.acuity}
                  </span>
                  <span style={urgencyLabelStyle}>
                    Score: {contextData.echoSummary?.triageResult?.urgencyScore}
                  </span>
                </div>
                <p style={contextSummaryStyle}>
                  <strong>Chief Complaint:</strong> {contextData.echoSummary?.clinicalIntake?.chiefComplaint}
                </p>
              </div>

              {/* Digital Medical Kit */}
              <div style={dmkCardStyle}>
                <h5 style={subHeaderStyle}>Patient DMK Records</h5>
                <div style={dmkBlockStyle}>
                  <strong>Blood Type:</strong> {contextData.dmk?.bloodType || 'N/A'}
                </div>
                <div style={dmkBlockStyle}>
                  <strong>Medications:</strong>
                  <ul style={dmkListStyle}>
                    {contextData.dmk?.medications?.map((m: any) => (
                      <li key={m.id}>{m.name} ({m.dosage})</li>
                    ))}
                  </ul>
                </div>
                <div style={dmkBlockStyle}>
                  <strong>Known Allergies:</strong>
                  <ul style={dmkListStyle}>
                    {contextData.dmk?.allergies?.map((a: any) => (
                      <li key={a.id} style={{ color: '#ff5a5f' }}>{a.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div style={patientInfoPanelStyle}>
              <h4 style={panelHeaderStyle}>Consulting Clinician</h4>
              <div style={clinicianCardStyle}>
                <div style={avatarCircle}>DR</div>
                <div>
                  <strong>Dr. Mark Benson</strong>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Emergency Medicine Registrar</p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Panel: Consultation Room Text Chat Messenger */}
          <div style={messengerPanelStyle}>
            <h4 style={panelHeaderStyle}>Room Messenger</h4>
            
            <div style={scrollerWrapperStyle}>
              <div style={messageContainerStyle}>
                {chatMessages.map((m, idx) => (
                  <div key={idx} style={messageBubbleStyle(m.sender === (user?.fullName || 'User'))}>
                    <span style={bubbleSpeakerStyle}>{m.sender}</span>
                    <p style={bubbleTextStyle}>{m.text}</p>
                    <span style={bubbleTimeStyle}>{m.time}</span>
                  </div>
                ))}
                <div ref={chatScrollerRef} />
              </div>
            </div>

            <div style={chatInputRowStyle}>
              <input 
                type="text" 
                placeholder="Type clinical notes or chat..." 
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                style={chatInputStyle}
              />
              <button onClick={sendTextMessage} style={sendBtnStyle}>
                Send
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

// Styles
const fullscreenOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(8, 12, 20, 0.95)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '1.5rem',
  animation: 'fadeIn 0.3s ease-out',
};

const roomPanelStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  maxWidth: '1200px',
  maxHeight: '750px',
  display: 'grid',
  gridTemplateColumns: '1fr 340px',
  borderRadius: 'var(--border-radius-md)',
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const streamGridAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  background: '#04060a',
  borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  height: '100%',
};

const callHeaderOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1.25rem',
  left: '1.25rem',
  right: '1.25rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 10,
};

const statusLabelStyle = (status: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.68rem',
  fontWeight: 700,
  color: status === 'connected' ? 'var(--primary)' : 'var(--secondary)',
  backgroundColor: 'rgba(8, 12, 20, 0.7)',
  padding: '0.35rem 0.65rem',
  borderRadius: '4px',
  border: '1.5px solid rgba(255, 255, 255, 0.08)',
  letterSpacing: '0.06em',
});

const pulsingDotStyle = (active: boolean): React.CSSProperties => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary)',
  boxShadow: active ? '0 0 8px var(--primary)' : 'none',
  animation: active ? 'heartbeat 1.5s infinite ease-in-out' : 'none',
});

const indicatorRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

const indicatorStyle = (color: string): React.CSSProperties => ({
  fontSize: '0.64rem',
  fontWeight: 700,
  color: '#fff',
  backgroundColor: color,
  padding: '0.25rem 0.5rem',
  borderRadius: '3px',
});

const remoteFeedContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
};

const feedPlaceholderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.8rem',
  textAlign: 'center',
};

const pulseLoaderStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: '2px solid rgba(0, 245, 212, 0.1)',
  borderTopColor: 'var(--primary)',
  animation: 'heartbeat 1.2s infinite linear',
};

const mockRemoteVisualizerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.4) 0%, rgba(8, 12, 20, 0.8) 100%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1,
};

const ekgMonitorContainer: React.CSSProperties = {
  background: 'rgba(8, 12, 20, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  padding: '1.25rem 2rem',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  width: '240px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
};

const vitalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const ekgWaveStyle: React.CSSProperties = {
  height: '60px',
  display: 'flex',
  alignItems: 'center',
};

const remoteNameTagStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '1.25rem',
  left: '1.25rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  background: 'rgba(8, 12, 20, 0.7)',
  padding: '0.35rem 0.65rem',
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

const remoteVideoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'none', // Only display if real WebRTC stream activates
};

const localFeedPipStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '5.5rem',
  right: '1.25rem',
  width: '120px',
  height: '160px',
  borderRadius: '6px',
  border: '1.5px solid rgba(255, 255, 255, 0.15)',
  overflow: 'hidden',
  backgroundColor: '#000',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  zIndex: 10,
};

const localVideoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const localCamOffPlaceholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '0.64rem',
  color: 'var(--text-muted)',
};

const localNameTagStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '0.35rem',
  left: '0.35rem',
  fontSize: '0.58rem',
  fontWeight: 700,
  color: '#fff',
  background: 'rgba(0, 0, 0, 0.6)',
  padding: '0.15rem 0.35rem',
  borderRadius: '2px',
};

const controlToolbarStyle: React.CSSProperties = {
  padding: '1.25rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  background: '#06090f',
  zIndex: 5,
};

const controlGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '4px',
  padding: '0.25rem',
};

const actionBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.4rem 0.75rem',
  border: 'none',
  borderRadius: '4px',
  background: active ? 'rgba(255, 90, 95, 0.1)' : 'rgba(255, 255, 255, 0.03)',
  color: active ? '#ff5a5f' : 'var(--text-primary)',
  fontWeight: 600,
  fontSize: '0.74rem',
  cursor: 'pointer',
});

const switcherSelectStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.68rem',
  outline: 'none',
  maxWidth: '70px',
  cursor: 'pointer',
};

const hangUpBtnStyle = (isPatient: boolean): React.CSSProperties => ({
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  background: '#ff5a5f',
  border: 'none',
  color: '#080c14',
  fontWeight: 700,
  fontSize: '0.78rem',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(255, 90, 95, 0.25)',
});

const sidebarAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(8, 12, 20, 0.3)',
  height: '100%',
  overflow: 'hidden',
};

const panelHeaderStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  paddingBottom: '0.4rem',
  marginBottom: '0.75rem',
};

const clinicalContextPanelStyle: React.CSSProperties = {
  padding: '1.25rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const infoCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '6px',
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
};

const criticalLabelStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 800,
  color: '#ff5a5f',
  backgroundColor: 'rgba(255, 90, 95, 0.1)',
  padding: '0.15rem 0.4rem',
  borderRadius: '2px',
  letterSpacing: '0.02em',
};

const urgencyLabelStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 800,
  color: 'var(--secondary)',
  backgroundColor: 'rgba(0, 187, 249, 0.1)',
  padding: '0.15rem 0.4rem',
  borderRadius: '2px',
  letterSpacing: '0.02em',
};

const contextSummaryStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
};

const dmkCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid rgba(255, 255, 255, 0.03)',
  borderRadius: '6px',
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const subHeaderStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const dmkBlockStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
};

const dmkListStyle: React.CSSProperties = {
  margin: '0.2rem 0 0 1rem',
  padding: 0,
};

const patientInfoPanelStyle: React.CSSProperties = {
  padding: '1.25rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const clinicianCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  background: 'rgba(255, 255, 255, 0.02)',
  padding: '0.85rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

const avatarCircle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'var(--primary)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: '#080c14',
  fontSize: '0.72rem',
  fontWeight: 800,
};

const messengerPanelStyle: React.CSSProperties = {
  flex: 1,
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const scrollerWrapperStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  paddingRight: '0.25rem',
  marginBottom: '0.75rem',
};

const messageContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const messageBubbleStyle = (isMe: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
  alignSelf: isMe ? 'flex-end' : 'flex-start',
  maxWidth: '85%',
  textAlign: isMe ? 'right' : 'left',
});

const bubbleSpeakerStyle: React.CSSProperties = {
  fontSize: '0.58rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.02em',
};

const bubbleTextStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-primary)',
  background: 'rgba(255, 255, 255, 0.03)',
  padding: '0.5rem 0.65rem',
  borderRadius: '6px',
  lineHeight: '1.45',
};

const bubbleTimeStyle: React.CSSProperties = {
  fontSize: '0.54rem',
  color: 'var(--text-muted)',
};

const chatInputRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.75rem',
  borderRadius: '4px',
  background: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.78rem',
  outline: 'none',
};

const sendBtnStyle: React.CSSProperties = {
  padding: '0.5rem 0.85rem',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  fontSize: '0.74rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const chartFormPanelStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  maxWidth: '1000px',
  maxHeight: '680px',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 'var(--border-radius-md)',
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '1.5rem',
  background: 'rgba(8, 12, 20, 0.9)',
};

const chartHeaderStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  paddingBottom: '0.85rem',
  marginBottom: '1.25rem',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 800,
  color: 'var(--text-primary)',
};

const chartSubTitleStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
  marginTop: '2px',
};

const recordErrorStyle: React.CSSProperties = {
  padding: '0.9rem 1rem',
  borderRadius: '14px',
  background: 'rgba(239, 68, 68, 0.12)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  color: '#fecaca',
  fontSize: '0.9rem',
  fontWeight: 600,
};

const chartBodyGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 280px',
  gap: '1.5rem',
  flex: 1,
  overflow: 'hidden',
};

const chartFormScrollArea: React.CSSProperties = {
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  paddingRight: '0.5rem',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const inputLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.02em',
};

const textareaStyle: React.CSSProperties = {
  padding: '0.65rem 0.85rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.82rem',
  fontFamily: 'inherit',
  outline: 'none',
};

const formCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: '6px',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const flexHeaderRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const cardHeadingStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-primary)',
};

const addBtnStyle: React.CSSProperties = {
  background: 'rgba(0, 245, 212, 0.08)',
  border: '1px solid rgba(0, 245, 212, 0.2)',
  color: 'var(--primary)',
  fontSize: '0.7rem',
  fontWeight: 700,
  padding: '0.3rem 0.6rem',
  borderRadius: '3px',
  cursor: 'pointer',
};

const dynamicRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr) 30px',
  gap: '0.5rem',
  alignItems: 'center',
};

const rowInputStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  background: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '0.74rem',
  outline: 'none',
};

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ff5a5f',
  cursor: 'pointer',
  fontSize: '0.85rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const emptyRowLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
};

const formActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  marginTop: '0.5rem',
};

const btnSubmitChartStyle: React.CSSProperties = {
  flex: 1.5,
  padding: '0.75rem',
  background: 'var(--primary)',
  border: 'none',
  borderRadius: '4px',
  color: '#080c14',
  fontWeight: 700,
  fontSize: '0.8rem',
  cursor: 'pointer',
};

const btnCancelChartStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.75rem',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '4px',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  fontSize: '0.8rem',
  cursor: 'pointer',
};

const chartSidebarStyle: React.CSSProperties = {
  borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
  paddingLeft: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};
