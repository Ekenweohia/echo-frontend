# Frontend Integration Guide: Milestone 3 - Clinician Workspace, Verification & Messaging

This document details the API endpoints, payload configurations, and client tasks to implement the **Milestone 3 Success / Acceptance Criteria** covering clinician dashboards, post-consultation documentation, DMK QR code sharing, practitioner verification workflows, email alerts, and post-consultation messaging.

---

## 1. Authentication & Security Policy
- **Base URL**: `https://api.novacoresbank.com/api/v1`
- **Headers Required**:
  ```http
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
  ```
- **Access Control Guardrails**:
  - `POST /consultations/:id/records` requires clinical roles (`DOCTOR`, `NURSE`, `ADMIN`). Patients are blocked.
  - Verification endpoints are restricted to `ADMIN` only.
  - Messaging on consultation boards (`/messages`) is restricted strictly to the patient or clinicians who participated in that consultation. Other users receive `403 Forbidden`.
  - Public scanning of DMK (`GET /dmk/shared/:token`) requires no authentication, but returns only specific patient medical data and records access details.

---

## 2. API Endpoints (Milestone 3)

### 2.1. Clinician Dashboard Data Feeds
Provides clinical queues, active calls, recent record logs, and verification status.

- **Doctor Dashboard URL**: `/doctors/dashboard`
- **Nurse Dashboard URL**: `/nurses/dashboard`
- **Method**: `GET`
- **Success Response (200 OK - Doctor Dashboard)**:
  ```json
  {
    "success": true,
    "message": "Doctor dashboard data retrieved successfully",
    "data": {
      "queueCount": 5,
      "activeConsultation": {
        "id": "consultation-uuid",
        "livekitRoomName": "consultation-uuid-random",
        "startedAt": "2026-08-18T11:40:00.000Z"
      },
      "recentRecords": [
        {
          "id": "record-uuid",
          "publicSummary": "Hypertension assessment.",
          "createdAt": "2026-08-18T11:45:00.000Z",
          "patient": {
            "fullName": "Jane Doe"
          }
        }
      ],
      "profile": {
        "verificationStatus": "VERIFIED",
        "onboardingStatus": "COMPLETED",
        "specialization": "Cardiology"
      }
    }
  }
  ```

---

### 2.2. Practitioner Verification Status Self-Check
Called by Doctor or Nurse on login to determine if their account has been approved by administrators.

- **URLs**:
  - **Doctor**: `/doctors/me/verification`
  - **Nurse**: `/nurses/me/verification`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Verification status retrieved",
    "data": {
      "verificationStatus": "VERIFIED", // PENDING | VERIFIED | REJECTED
      "onboardingStatus": "COMPLETED"
    }
  }
  ```

---

### 2.3. Admin Verification Portal & Workflow Actions
Enables admins to approve or reject practitioners.

- **URLs**:
  - **Approve Doctor**: `PATCH /admin/doctors/:id/verification`
  - **Approve Nurse**: `PATCH /admin/nurses/:id/verification`
- **Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "verificationStatus": "VERIFIED" // Or "REJECTED"
  }
  ```
- **Email Notification Trigger**:
  - Status change to `VERIFIED` triggers an automatic **Verification Approved Email** to the practitioner's email.
  - Status change to `REJECTED` triggers a **Verification Rejected Email** prompting them to update documents.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Doctor verification status updated successfully"
  }
  ```

---

### 2.4. Post-Consultation Records & Prescriptions
Saves clinical notes, prescriptions, and follow-ups.

- **URL**: `/consultations/:id/records`
- **Method**: `POST`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN` (Blocked for `PATIENT`)
- **Request Body**:
  ```json
  {
    "clinicalNotes": "Severe palpitation assessment. Advised resting.",
    "publicSummary": "Heart palpitations assessment.",
    "prescriptions": [
      {
        "medicationName": "Propranolol",
        "dosage": "10mg",
        "frequency": "Once daily",
        "duration": "7 days",
        "instructions": "Take with water"
      }
    ],
    "referrals": [
      {
        "specialty": "Cardiology Specialist",
        "reason": "ECG diagnostic testing requested."
      }
    ],
    "followUps": [
      {
        "recommendedDate": "2026-08-25T12:00:00.000Z",
        "instructions": "Follow-up BP screening."
      }
    ]
  }
  ```
- **Sync Behavior**: The backend automatically reads `prescriptions` and writes them as active medications into the patient's Digital Medical Kit (DMK).
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "record-uuid",
      "clinicalNotes": "...",
      "publicSummary": "...",
      "prescriptions": [ ... ]
    }
  }
  ```

---

### 2.5. DMK QR Code Generating & Scanning

#### A. Generate Share Token (Produces QR Payload)
- **URL**: `/dmk/me/share`
- **Method**: `POST`
- **Auth Role**: `PATIENT`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "share-token-uuid",
      "tokenHash": "public_qr_token_string_abc123",
      "expiresAt": "2026-08-19T11:42:00.000Z"
    }
  }
  ```

#### B. Scan QR Code / Fetch Shared DMK
- **URL**: `/dmk/shared/:token`
- **Method**: `GET`
- **Auth Role**: None (Public Endpoint)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "bloodType": "O+",
      "heightCm": 168,
      "weightKg": 62,
      "conditions": [
        { "name": "Mild Asthma" }
      ],
      "medications": [
        { "name": "Albuterol Inhaler", "dosage": "90mcg" }
      ],
      "allergies": [
        { "allergen": "Penicillin", "severity": "SEVERE" }
      ]
    }
  }
  ```

---

### 2.6. Post-Consultation Messaging (Chat Board)

#### A. Fetch Messages (Auto-marks incoming messages as read)
- **URL**: `/consultations/:id/messages`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "message-uuid",
        "senderId": "doctor-uuid",
        "senderRole": "DOCTOR",
        "message": "Please monitor your heart rate daily.",
        "readAt": "2026-08-18T11:45:00.000Z",
        "createdAt": "2026-08-18T11:43:00.000Z",
        "sender": { "fullName": "Dr. Smith", "role": "DOCTOR" }
      }
    ]
  }
  ```

#### B. Send Message
- **URL**: `/consultations/:id/messages`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "message": "Sure doctor. I will monitor it."
  }
  ```

---

## 3. Frontend Implementation Checklist (Milestone 3)

- [ ] **Verification Lockout Screen**: If the practitioner verification status self-check (`GET /doctors/me/verification`) is `PENDING` or `REJECTED`, render a blocking overlay page preventing them from viewing the queue or opening rooms.
- [ ] **Clinical Brief Overlay**: Before entering the LiveKit room, display the patient's triage result, red flags, and intake summary in a "Clinical Brief" popup.
- [ ] **Prescription Form**: Render inputs for medication details. Make sure they map fields correctly when posting `/records`.
- [ ] **Generate QR Code Code**: Request `/dmk/me/share`. Use a library like `qrcode.react` (web) or similar package on mobile to render a QR code containing the full URL: `https://your-domain.com/dmk/shared/<tokenHash>`.
- [ ] **Scan QR Code Integration**: Implement camera scanner layout. Upon detecting the QR code, parse the token and hit `GET /dmk/shared/:token` to display the patient's vitals, allergies, and conditions.
- [ ] **Messaging View**: Display chat bubbles. Call `GET /consultations/:id/messages` periodically to check for replies. Mark incoming chat bubbles as read.
