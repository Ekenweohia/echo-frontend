# Frontend Implementation Guide: Echo AI Voice Sessions & Vapi Dashboard Setup

This document provides absolute specifications for connecting the client application to Vapi for the voice-based clinical intake, starting and ending sessions, and setting up the Vapi platform dashboard.

---

## 1. Authentication & Base Settings
- **Base URL**: `http://localhost:4000/api/v1`
- **Headers Required**:
  ```http
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
  ```

---

## 2. API Endpoints (Echo AI Voice Sessions)

### 2.1. Create Echo AI Intake Session
Called by the patient app to initialize a new intake session before placing the voice call.

- **URL**: `/echo-ai/sessions`
- **Method**: `POST`
- **Auth Role**: `PATIENT`
- **Request Body**:
  ```json
  {
    "language": "en",
    "isSOS": false,
    "latitude": 34.0522,   // Optional location coordinates (decimal)
    "longitude": -118.2437 // Optional location coordinates (decimal)
  }
  ```
  *Note: For SOS sessions (`isSOS: true`), coordinates are highly recommended to trigger immediate notification alerts.*
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
      "latitude": 34.0522,
      "longitude": -118.2437,
      "createdAt": "2026-08-18T00:00:00.000Z"
    }
  }
  ```

---

### 2.2. Start Echo AI Session
Associates the session with the Vapi `vapiCallId` once the client starts the call.

- **URL**: `/echo-ai/sessions/:id/start`
- **Method**: `POST`
- **Path Params**: `:id` = `session-uuid-12345`
- **Auth Role**: `PATIENT`
- **Request Body**:
  ```json
  {
    "vapiCallId": "vapi-call-uuid-abc"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Echo AI session started successfully",
    "data": {
      "id": "session-uuid-12345",
      "vapiCallId": "vapi-call-uuid-abc",
      "status": "ACTIVE",
      "startedAt": "2026-08-18T00:00:10.000Z"
    }
  }
  ```

---

### 2.3. End Echo AI Session
Signals completion of the intake call, initiating the background processing worker to parse the structured intake data and evaluate triage.

- **URL**: `/echo-ai/sessions/:id/end`
- **Method**: `POST`
- **Path Params**: `:id` = `session-uuid-12345`
- **Auth Role**: `PATIENT`
- **Request Body**:
  ```json
  {
    "durationSeconds": 120,
    "rawAnalysis": {
      "summary": "Patient reports moderate chest pain for 30 minutes...",
      "structuredData": { ... } // Optional analysis payload
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
      "status": "COMPLETED",
      "endedAt": "2026-08-18T00:02:10.000Z"
    }
  }
  ```

---

### 2.4. Fetch Session Intake Details (Clinician View)
Gets the parsed clinical summary, symptoms, and red flags after background evaluation finishes.

- **URL**: `/echo-ai/sessions/:id/intake`
- **Method**: `GET`
- **Path Params**: `:id` = `session-uuid-12345`
- **Auth Role**: Any authenticated participant.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Clinical intake retrieved successfully",
    "data": {
      "id": "intake-uuid",
      "sessionId": "session-uuid-12345",
      "chiefComplaint": "Chest pain",
      "clinicalSummary": "Patient experiencing moderate chest pain...",
      "symptomOnset": "30 minutes ago",
      "symptomDuration": "30 minutes",
      "symptomSeverity": "moderate",
      "redFlags": "Chest tightness",
      "symptoms": [
        { "code": "chest_pain", "name": "Chest Pain", "present": true, "severity": "moderate" }
      ],
      "detectedRedFlags": [
        { "id": "redflag-uuid", "code": "chest_pain", "name": "Chest Pain", "severity": "HIGH" }
      ]
    }
  }
  ```

---

### 2.5. Fetch Session Transcript
Retrieves conversation messages dynamically saved during the voice call.

- **URL**: `/echo-ai/sessions/:id/transcript`
- **Method**: `GET`
- **Path Params**: `:id` = `session-uuid-12345`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Session transcript retrieved successfully",
    "data": [
      {
        "speaker": "AI",
        "text": "Hello, I am Echo, your AI health assistant. What symptoms are you experiencing today?",
        "sequence": 0,
        "timestamp": "2026-08-18T00:00:15.000Z"
      },
      {
        "speaker": "USER",
        "text": "I have chest pain and I'm feeling dizzy.",
        "sequence": 1,
        "timestamp": "2026-08-18T00:00:22.000Z"
      }
    ]
  }
  ```

---

## 3. Vapi Dashboard & Assistant Setup Configuration

To ensure the Vapi voice assistant makes use of the necessary server-side tools and delivers formatted symptoms back, set it up on the **[vapi.ai](https://dashboard.vapi.ai)** platform using these rules:

### 3.1. General Settings
- **Transcriber**: Deepgram (`nova-2` recommended for fast RT latency)
- **Model**: `gpt-4o` or `claude-3-5-sonnet` (required for reliable multi-turn diagnostic reasoning)
- **Voice**: PlayHT (`PlayHT2.0` multi-lingual) or ElevenLabs (`Rachel` or `Aria` recommended for medical care tone)

### 3.2. Structured Data Schema Configuration
In Vapi dashboard under **Assistant Settings → Analysis → Structured Data Schema**, paste the following JSON Schema to define the format of the final post-call analysis:

```json
{
  "type": "object",
  "properties": {
    "chiefComplaint": { "type": "string", "description": "Primary complaint or issue" },
    "symptoms": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": { "type": "string" },
          "name": { "type": "string" },
          "present": { "type": "boolean" },
          "severity": { "type": "string", "enum": ["mild", "moderate", "severe"] },
          "onset": { "type": "string" },
          "duration": { "type": "string" },
          "location": { "type": "string" },
          "character": { "type": "string" }
        }
      }
    },
    "symptomOnset": { "type": "string" },
    "symptomDuration": { "type": "string" },
    "symptomSeverity": { "type": "string", "enum": ["mild", "moderate", "severe"] },
    "associatedSymptoms": { "type": "string" },
    "medicalHistory": { "type": "string" },
    "medications": { "type": "string" },
    "allergies": { "type": "string" },
    "relevantRiskFactors": { "type": "string" },
    "pregnancyStatus": { "type": "string" },
    "redFlags": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": { "type": "string" },
          "name": { "type": "string" },
          "detected": { "type": "boolean" },
          "severity": { "type": "string" },
          "evidence": { "type": "string" }
        }
      }
    },
    "clinicalSummary": { "type": "string", "description": "Clinical intake summary narrative" }
  },
  "required": ["chiefComplaint", "symptoms", "redFlags", "clinicalSummary"]
}
```

### 3.3. Webhook Setup
In dashboard under **Org Settings → Webhooks**, set the **Webhook URL** to:
`https://<your-backend-domain>/api/v1/webhooks/vapi`

Subscribe to these webhook events:
1. `call-started`
2. `call-ended`
3. `transcript`
4. `tool-calls`

Set the header secret to verify signature:
- Key: `x-vapi-secret` (or Authorization header)
- Value: Matches backend `VAPI_WEBHOOK_SECRET` variable.

### 3.4. Server-Side Tools Registration
Register these tools under Vapi's **Tools** menu. Point their URL to your backend webhook endpoint:

#### 1. `get_patient_context`
- **Description**: Pulls patient profile details (e.g. name, date of birth, allergies) to personalize the conversation.
- **Parameters**: Empty object `{}`

#### 2. `flag_red_flag`
- **Description**: Alerts the backend immediately during the live call when a dangerous/life-threatening symptom is spoken.
- **Parameters**:
  ```json
  {
    "type": "object",
    "properties": {
      "code": { "type": "string", "description": "e.g. chest_pain_radiating" },
      "name": { "type": "string", "description": "e.g. Chest pain radiating to arm" },
      "evidence": { "type": "string", "description": "Patient's description" }
    },
    "required": ["code", "name", "evidence"]
  }
  ```

#### 3. `finish_intake`
- **Description**: Closes the call once the intake assessment is fully complete.
- **Parameters**: Empty object `{}`

---

## 4. Frontend Client Implementation Tasks

### Task 1: Initialize Voice Session
- Call `POST /echo-ai/sessions` sending user coordinates.
- Store the returned `id` (this is the `sessionId`).

### Task 2: Vapi Web SDK Call Integration
- Install `@vapi-ai/web`.
- Initialize and start call, passing the `sessionId` in overrides metadata to link Webhook events:
  ```typescript
  import Vapi from '@vapi-ai/web';

  const vapi = new Vapi('YOUR_PUBLIC_KEY');

  // Trigger call
  vapi.start({
    assistantId: 'YOUR_ASSISTANT_ID',
    assistantOverrides: {
      metadata: {
        sessionId: 'session-uuid-12345' // Crucial link
      }
    }
  });
  ```

### Task 3: Sync Call Start/End
- On the SDK `call-start` event listener, trigger `POST /echo-ai/sessions/:sessionId/start` passing the call ID.
- On the SDK `call-end` event listener, trigger `POST /echo-ai/sessions/:sessionId/end` to begin triage evaluation.
