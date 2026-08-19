# Frontend Integration Guide: Milestone 1 - EchoAI & Voice AI Assessment

This document maps all the backend endpoints that implement the **Milestone 1 Success / Acceptance Criteria** to assist a frontend client or another AI agent in building the end-to-end user workflow.

---

## 1. Authentication & Security Policy

All patient and clinician-specific endpoints are secured via JWT bearer tokens and strict Role-Based Access Control (RBAC):
- **Headers**:
  ```http
  Authorization: Bearer <jwt_access_token>
  Content-Type: application/json
  ```
- **RLS/Guard Policies**:
  - Only users with role `PATIENT` can initialize intake sessions.
  - Only clinical staff (`DOCTOR`, `NURSE`, `ADMIN`) can access the triage queues.
  - Access to patient health records (Intakes, Transcripts, DMK data) is strictly restricted to the patient themselves or the assigned clinician. Other users receive `403 Forbidden`.

---

## 2. Milestone 1 Workflow & Endpoints

### 2.1. Initialize Assessment (Intake / SOS)
Creates a new Echo AI Voice Session. Captures location coordinates if permission exists on the client device.

- **URL**: `/echo-ai/sessions`
- **Method**: `POST`
- **Auth Role**: `PATIENT`
- **Request Body**:
  ```json
  {
    "language": "en",
    "isSOS": false,         // Set to true to bypass triage and trigger the emergency workflow
    "latitude": 6.5244,     // Optional location coordinate
    "longitude": 3.3792     // Optional location coordinate
  }
  ```
- **SOS Emergency Logic**:
  - If `isSOS` is set to `true`, the backend automatically creates a pre-completed Clinical Intake and a `CRITICAL` triage result with an urgency score of `100`.
  - It creates a `ClinicalQueueEntry` immediately routed to the doctor queue with highest priority (`priority: 100`) to bypass standard waiting.
  - If the patient has configured emergency contacts, the backend automatically triggers emergency contact notifications (logged to console in development).
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Echo AI session created successfully",
    "data": {
      "id": "session-uuid-12345",
      "patientId": "patient-uuid",
      "status": "CREATED",
      "language": "en",
      "isSOS": false,
      "latitude": 6.5244,
      "longitude": 3.3792,
      "createdAt": "2026-08-18T10:00:00.000Z"
    }
  }
  ```

---

### 2.2. Start Voice Session
Associates the session with the Vapi voice stream once the voice call connects.

- **URL**: `/echo-ai/sessions/:id/start`
- **Method**: `POST`
- **Path Params**: `:id` = `session-uuid-12345`
- **Auth Role**: `PATIENT`
- **Request Body**:
  ```json
  {
    "vapiCallId": "vapi-call-uuid"
  }
  ```
- **Error Handling**: If the `vapiCallId` is already associated with another active session, the endpoint returns a `400 Bad Request` unique constraint violation.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Echo AI session started successfully",
    "data": {
      "id": "session-uuid-12345",
      "vapiCallId": "vapi-call-uuid",
      "status": "ACTIVE",
      "startedAt": "2026-08-18T10:00:15.000Z"
    }
  }
  ```

---

### 2.3. End Voice Session
Transitions the session status and triggers background processing of the intake data.

- **URL**: `/echo-ai/sessions/:id/end`
- **Method**: `POST`
- **Path Params**: `:id` = `session-uuid-12345`
- **Auth Role**: `PATIENT`
- **Request Body**:
  ```json
  {
    "durationSeconds": 145,
    "rawAnalysis": {
      "summary": "Patient complains of chest tightness and cold sweats.",
      "structuredData": {
        "chiefComplaint": "Chest tightness",
        "clinicalSummary": "Patient reports chest tightness starting...",
        "symptoms": [
          { "code": "chest_pain", "name": "Chest tightness", "present": true, "severity": "severe" }
        ],
        "redFlags": [
          { "code": "chest_pain", "name": "Chest tightness", "detected": true, "severity": "HIGH", "evidence": "Cold sweating" }
        ]
      }
    }
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Echo AI session completed and clinical intake queued for processing",
    "data": {
      "id": "session-uuid-12345",
      "status": "PROCESSING",
      "endedAt": "2026-08-18T10:02:40.000Z"
    }
  }
  ```

---

### 2.4. Vapi Webhook Channel (Server-Side)
Vapi platform updates the session transcript, triggers tool calls (e.g. `get_patient_context` to personalize the voice conversation), and posts the end-of-call analysis.

- **URL**: `/webhooks/vapi`
- **Method**: `POST`
- **Auth**: Signature verified via `x-vapi-secret` or `Authorization` header.
- **Vapi Webhook Secret Variable**: `VAPI_WEBHOOK_SECRET`
- **Supported Event Types**:
  - `call-started`: Activates session.
  - `transcript`: Saves live transcript snippets as they speak.
  - `tool-calls` / `function-call`: Executes server-side assistant tools (e.g. `get_patient_context`, `flag_red_flag` to audit critical red flags early, `finish_intake`).
  - `call-ended`: Automatically extracts final structured data and updates status to `PROCESSING` to schedule the background worker.

---

### 2.5. Retrieve Assessment Findings

#### A. Full Session Status
- **URL**: `/echo-ai/sessions/:id`
- **Method**: `GET`

#### B. Clinical Intake Summary & Symptom Lists
- **URL**: `/echo-ai/sessions/:id/intake`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Clinical intake retrieved successfully",
    "data": {
      "id": "intake-uuid",
      "chiefComplaint": "Chest tightness",
      "clinicalSummary": "Patient reports chest tightness starting...",
      "symptoms": [
        { "code": "chest_pain", "name": "Chest tightness", "present": true, "severity": "severe" }
      ],
      "detectedRedFlags": [
        { "id": "rf-uuid", "code": "chest_pain", "name": "Chest tightness", "severity": "HIGH" }
      ]
    }
  }
  ```

#### C. Deterministic Triage Result
- **URL**: `/echo-ai/sessions/:id/triage`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Triage result retrieved successfully",
    "data": {
      "id": "triage-uuid",
      "acuity": "URGENT",
      "urgencyScore": 75,
      "decision": "Escalate to Urgent Care Doctor",
      "reasons": "Presence of severe symptoms without red flags."
    }
  }
  ```

#### D. Routing Decisions & Priority Queues
- **URL**: `/echo-ai/sessions/:id/routing`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Routing decision retrieved successfully",
    "data": {
      "id": "routing-uuid",
      "destination": "DOCTOR_QUEUE",
      "priority": 3,
      "reason": "Urgent acuity level dictates doctor consultation"
    }
  }
  ```

---

### 2.6. Clinician Priority Queue

#### A. Fetch Queue (Role Restricted)
- **URL**: `/clinician/queue` (or `/consultations/queue`)
- **Method**: `GET`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN`
- **Success Response (200 OK)**:
  - Lists pending patient cases. SOS/Emergency cases (`priority: 100`) bubble to the top. Doctors see entries instantly; nurses/admins see non-SOS entries after the 2-minute doctor-first priority window expires.

#### B. Claim Case (Atomic Lock)
- **URL**: `/clinician/queue/:id/accept`
- **Method**: `POST`
- **Path Params**: `:id` = `queue-entry-uuid`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN`
- **Success Response (200 OK)**:
  - Claims the patient and creates a live consultation room. Returns a `400` error if another clinician already claimed the patient.

#### C. Complete Queue Entry
- **URL**: `/clinician/queue/:id/complete`
- **Method**: `POST`
- **Path Params**: `:id` = `queue-entry-uuid`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN`

---

## 3. Frontend Implementation Checklist (Milestone 1)

- [ ] **Request Location Permission**: Ask the user for GPS permission before calling `/echo-ai/sessions` to attach coordinates to the intake session (required for SOS dispatch).
- [ ] **Initialize Vapi SDK**: Inject the session ID in the metadata fields:
  ```typescript
  vapi.start({
    assistantId: 'assistant-id',
    assistantOverrides: { metadata: { sessionId: 'session-uuid-12345' } }
  });
  ```
- [ ] **Sync Webhook state**: Bind client start/end call SDK callbacks to hit `/echo-ai/sessions/:id/start` and `/echo-ai/sessions/:id/end`.
- [ ] **Poll Session Status**: Once the call ends, show a progress loader while polling `/echo-ai/sessions/:id`. When status changes from `PROCESSING` to `COMPLETED`, retrieve the intake and triage outcomes via `/intake`, `/triage`, and `/routing`.
- [ ] **Emergency Escalate Banner**: If triage acuity is returned as `EMERGENCY`, redirect the user immediately to the Emergency/SOS assistance layout, providing live map coordinates and emergency support details.
