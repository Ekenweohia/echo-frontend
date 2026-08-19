# Frontend Implementation Guide: Queue & LiveKit Consultation

This document provides technical specifications and implementation tasks for a frontend client or AI agent to build the Consultation Queue and LiveKit consultation rooms.

---

## 1. Authentication & Base Settings
- **Base URL**: `https://api.novacoresbank.com/api/v1`
- **Headers Required**:
  ```http
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
  ```

---

## 2. API Endpoints

### 2.1. Fetch Clinical Queue
Retrieves waiting patient intake cases.

- **URL**: `/consultations/queue`
- **Method**: `GET`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN` (Blocked for `PATIENT` role)
- **Priority Window Rules**: 
  - For the first **2 minutes** after queue entry creation, only `DOCTOR` users can see the entry.
  - `NURSE` and `ADMIN` users will only see non-SOS entries *after* the 2-minute window has expired.
  - **SOS Cases (`priority: 100`) bypass this window**: they are instantly visible to all clinical roles.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Queue fetched successfully",
    "data": [
      {
        "id": "queue-entry-uuid",
        "sessionId": "session-uuid",
        "patientId": "patient-uuid",
        "intakeId": "intake-uuid",
        "triageResultId": "triage-result-uuid",
        "routingDecisionId": "routing-decision-uuid",
        "assignedClinicianId": null,
        "clinicianRole": "DOCTOR",
        "isSOS": false,
        "priority": 5,
        "status": "WAITING",
        "queuedAt": "2026-08-17T22:30:00.000Z",
        "session": {
          "id": "session-uuid",
          "latitude": 34.0522,
          "longitude": -118.2437,
          "triageResult": {
            "acuity": "CRITICAL",
            "urgencyScore": 85,
            "decision": "Route to Emergency Care",
            "reasons": "Patient reports severe chest pain and breathlessness."
          },
          "clinicalIntake": {
            "chiefComplaint": "Chest pain",
            "clinicalSummary": "Patient experiencing moderate chest pain starting 30 mins ago...",
            "symptoms": [
              { "code": "chest_pain", "name": "Chest Pain", "present": true, "severity": "moderate" }
            ]
          },
          "patient": {
            "id": "patient-uuid",
            "fullName": "Jane Doe",
            "patientProfile": {
              "dateOfBirth": "1990-05-15T00:00:00.000Z",
              "gender": "FEMALE"
            }
          }
        }
      }
    ]
  }
  ```

---

### 2.2. Accept / Claim Queue Entry
Clinician claims a waiting patient. Enforces that two clinicians cannot claim the same patient (returns error if already claimed).

- **URL**: `/consultations/queue/accept`
- **Method**: `POST`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN`
- **Request Body**:
  ```json
  {
    "queueEntryId": "queue-entry-uuid"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Case accepted successfully",
    "data": {
      "id": "consultation-uuid",
      "queueEntryId": "queue-entry-uuid",
      "patientId": "patient-uuid",
      "primaryClinicianId": "clinician-uuid",
      "livekitRoomName": "consultation-3a9d8c9...",
      "status": "ACTIVE",
      "startedAt": "2026-08-17T23:55:00.000Z"
    }
  }
  ```
- **Error Response (400 Bad Request - already claimed)**:
  ```json
  {
    "success": false,
    "message": "Case is no longer available"
  }
  ```

---

### 2.3. Join Consultation (LiveKit Integration)
Fetches access token to connect to LiveKit and returns clinical/medical history contexts for clinicians.

- **URL**: `/consultations/:id/join`
- **Method**: `GET`
- **Path Params**: `:id` = `consultation-uuid`
- **Auth Role**: Any authenticated participant (Patient must match the consultation's patientId).
- **Success Response (200 OK)**:
  - **For Patients**:
    ```json
    {
      "success": true,
      "message": "Joined consultation",
      "data": {
        "token": "eyJhbGciOi...",
        "roomName": "consultation-3a9d8c9...",
        "contextData": null
      }
    }
    ```
  - **For Clinicians** (Bundles Digital Medical Kit & Triage Summary):
    ```json
    {
      "success": true,
      "message": "Joined consultation",
      "data": {
        "token": "eyJhbGciOi...",
        "roomName": "consultation-3a9d8c9...",
        "contextData": {
          "dmk": {
            "id": "dmk-uuid",
            "bloodType": "O+",
            "allergies": [
              { "id": "allergy-uuid", "name": "Penicillin" }
            ],
            "medications": [
              { "id": "med-uuid", "name": "Metformin", "dosage": "500mg" }
            ]
          },
          "echoSummary": {
            "id": "session-uuid",
            "triageResult": { "acuity": "CRITICAL" },
            "clinicalIntake": { "chiefComplaint": "Chest pain" }
          }
        }
      }
    }
    ```

---

### 2.4. End Consultation
Ends the video call session. **Enforced at API level: Only the patient can end the call.**

- **URL**: `/consultations/:id/end`
- **Method**: `POST`
- **Path Params**: `:id` = `consultation-uuid`
- **Auth Role**: `PATIENT` (Clinicians receive a 401/403 unauthorized if they attempt to invoke this)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Consultation ended successfully"
  }
  ```

---

### 2.5. Invite Clinician
Allows a clinician (e.g. Doctor) to invite another clinician (e.g. Nurse or Specialist) to join the room.

- **URL**: `/consultations/:id/invite`
- **Method**: `POST`
- **Path Params**: `:id` = `consultation-uuid`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN`
- **Request Body**:
  ```json
  {
    "inviteeId": "invitee-user-uuid"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Clinician invited successfully"
  }
  ```

---

### 2.6. Get Active Consultation Status
Checks if the current user has any ongoing/active consultation.

- **URL**: `/consultations/live`
- **Method**: `GET`
- **Success Response (200 OK - Active Consultation exists)**:
  ```json
  {
    "success": true,
    "message": "Active consultation status fetched",
    "data": {
      "id": "consultation-uuid",
      "status": "ACTIVE",
      "livekitRoomName": "consultation-3a9d8c9..."
    }
  }
  ```
- **Success Response (200 OK - No Active Consultation)**:
  ```json
  {
    "success": true,
    "message": "Active consultation status fetched",
    "data": null
  }
  ```

---

## 3. Frontend Implementation Tasks

### Task 1: Clinician Queue Page
- Poll or use WebSockets/Server-Sent Events to refresh `/consultations/queue`.
- Display a countdown or flag indicating if the priority window is active for General Clinicians (`NURSE`/`ADMIN`).
- Disable "Claim Case" button if current user role does not qualify (or hide queue entry until window expires).
- Handle double claim: If `acceptCase` returns 400 with status code showing the case is taken, display a toast: *"This case has already been accepted by another clinician."* and refresh the list.

### Task 2: LiveKit SDK Integration
- Install `@livekit/components-react` and `livekit-client` (or native mobile SDKs).
- On mounting the consultation room screen, invoke `/consultations/:id/join` to get the JWT `token` and `roomName`.
- Initialize LiveKit:
  ```typescript
  import { LiveKitRoom } from '@livekit/components-react';
  // Use the token to connect to the LiveKit server URL (e.g. ws://localhost:7880 or production cloud url)
  ```
- **LiveKit Features to implement**:
  - **Video/Audio Tracks**: Display patient and clinician streams.
  - **Mute/Unmute**: Handle toggling microphone/camera publishing.
  - **Device Switching**: Allow changing input/output audio/video devices via `room.switchActiveDevice()`.
  - **Connection/Reconnection States**: Listen to `RoomEvent.Reconnecting` and `RoomEvent.Reconnected` events to show connection banners.
- **Clinician Workspace Overlay**:
  - If role is Doctor/Nurse, read `contextData` from the join response to populate the sidebar with the patient's DMK (allergies, medications) and the Echo AI Triage summary.

### Task 3: Patient Control & Leaving Room
- The patient UI must present a prominent red **"End Session"** button that invokes `POST /consultations/:id/end`.
- The clinician UI must **not** display an "End Session" button that makes a backend request (they can only "Disconnect" from the room locally to exit, but the room status remains active until the patient terminates or it timeouts).
- Listen to `ConsultationStatus` updates. If the server marks the consultation as `ENDED` (e.g. via room-wide signaling or polling), redirect both parties to the post-consultation screens.
