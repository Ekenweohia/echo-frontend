# Frontend Implementation Guide: Post-Consultation Records & Messaging

This document details the API specifications and client tasks to implement post-consultation documentation (notes, prescriptions, referrals, follow-ups) and the post-consultation message board.

---

## 1. Authentication & Base Settings
- **Base URL**: `http://localhost:4000/api/v1`
- **Headers Required**:
  ```http
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
  ```

---

## 2. API Endpoints

### 2.1. Submit Consultation Record (Notes, Prescriptions, Referrals, Follow-ups)
Saves clinical brief, notes, and prescriptions for an ended session.

- **URL**: `/consultations/:id/records`
- **Method**: `POST`
- **Path Params**: `:id` = `consultation-uuid`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN` (Blocked for `PATIENT` role)
- **Request Body**:
  ```json
  {
    "clinicalNotes": "Patient exhibits signs of moderate hypertension. Recommending rest and drug plan.",
    "publicSummary": "Hypertension assessment. Bed rest and prescription provided.",
    "prescriptions": [
      {
        "medicationName": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "duration": "14 days",
        "instructions": "Take in the morning with water"
      }
    ],
    "referrals": [
      {
        "specialty": "Cardiology",
        "reason": "Further cardiovascular screening requested."
      }
    ],
    "followUps": [
      {
        "recommendedDate": "2026-08-24T12:00:00.000Z",
        "instructions": "Follow-up BP check"
      }
    ]
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "record-uuid",
      "liveConsultationId": "consultation-uuid",
      "patientId": "patient-uuid",
      "clinicianId": "clinician-uuid",
      "clinicalNotes": "Patient exhibits...",
      "publicSummary": "Hypertension...",
      "createdAt": "2026-08-17T23:58:00.000Z",
      "prescriptions": [
        {
          "id": "rx-uuid",
          "consultationRecordId": "record-uuid",
          "medicationName": "Lisinopril",
          "dosage": "10mg",
          "frequency": "Once daily",
          "duration": "14 days",
          "instructions": "Take in the morning with water"
        }
      ],
      "referrals": [
        {
          "id": "ref-uuid",
          "consultationRecordId": "record-uuid",
          "specialty": "Cardiology",
          "reason": "Further cardiovascular screening requested."
        }
      ],
      "followUps": [
        {
          "id": "follow-uuid",
          "consultationRecordId": "record-uuid",
          "recommendedDate": "2026-08-24T12:00:00.000Z",
          "instructions": "Follow-up BP check"
        }
      ]
    }
  }
  ```

---

### 2.2. Fetch Consultation Record
Retrieves the saved summary, prescriptions, and follow-ups.

- **URL**: `/consultations/:id/records`
- **Method**: `GET`
- **Path Params**: `:id` = `consultation-uuid`
- **Auth Role**: Any authenticated participant. 
  - **Data Masking Guard**: If the current user has the `PATIENT` role, the backend automatically excludes sensitive internal `clinicalNotes` or masks details if unauthorized.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "record-uuid",
      "liveConsultationId": "consultation-uuid",
      "patientId": "patient-uuid",
      "clinicianId": "clinician-uuid",
      "publicSummary": "Hypertension...",
      "createdAt": "2026-08-17T23:58:00.000Z",
      "prescriptions": [...],
      "referrals": [...],
      "followUps": [...],
      "clinician": {
        "fullName": "Dr. Smith",
        "role": "DOCTOR"
      }
    }
  }
  ```

---

### 2.3. Get Consultation Messages (Chat Board)
Fetches all messages exchanged *after* the consultation room ended. Automatically marks incoming messages as read.

- **URL**: `/consultations/:id/messages`
- **Method**: `GET`
- **Path Params**: `:id` = `consultation-uuid`
- **Auth Role**: Patient or participating Clinician on this specific record.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Messages fetched",
    "data": [
      {
        "id": "msg-uuid-1",
        "consultationRecordId": "record-uuid",
        "senderId": "clinician-uuid",
        "senderRole": "DOCTOR",
        "message": "Please monitor your blood pressure daily.",
        "readAt": "2026-08-17T23:59:15.000Z",
        "createdAt": "2026-08-17T23:59:00.000Z",
        "sender": {
          "fullName": "Dr. Smith",
          "role": "DOCTOR"
        }
      }
    ]
  }
  ```

---

### 2.4. Send Message
Sends a message to the post-consultation chat board.

- **URL**: `/consultations/:id/messages`
- **Method**: `POST`
- **Path Params**: `:id` = `consultation-uuid`
- **Auth Role**: Patient or participating Clinician on this specific record.
- **Request Body**:
  ```json
  {
    "message": "Can I take the Lisinopril before meals?"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Message sent",
    "data": {
      "id": "msg-uuid-2",
      "consultationRecordId": "record-uuid",
      "senderId": "patient-uuid",
      "senderRole": "PATIENT",
      "message": "Can I take the Lisinopril before meals?",
      "readAt": null,
      "createdAt": "2026-08-17T23:59:30.000Z",
      "sender": {
        "fullName": "Jane Doe",
        "role": "PATIENT"
      }
    }
  }
  ```

---

## 3. Frontend Implementation Tasks

### Task 1: Clinician Notes & Prescription Draft Form
- Render a form for the clinician after the call ends.
- Provide dynamic inputs to add multiple prescriptions (Medication, Dosage, Frequency, Duration, Special instructions).
- Validate that the clinician provides both a public summary and internal notes before enabling submission.
- On success, redirect the clinician to the Consultation Summary/Detail view.

### Task 2: Patient Prescription & Summary View
- Render a "Medical Record" or "Consultation History" screen.
- Pull the record via `/consultations/:id/records`.
- Display the public summary, the clinician's name and role, and a clear list of prescriptions (with details on dosage and instructions) and recommended follow-up dates.

### Task 3: Post-Consultation Chat Panel
- Check if a consultation record is created. Once created, display a "Message Board" or "Contact Doctor" tab/button.
- Fetch messages on mounting via `GET /consultations/:id/messages`.
- Render a messaging interface displaying bubbles. Color-code bubbles differently for patient messages and clinician messages.
- Display read status using the `readAt` field (e.g. checkmark icon).
- Provide a text input and send button triggering `POST /consultations/:id/messages`. On response, push the new message item into the state array to instantly display it.
