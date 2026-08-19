# Frontend Implementation Guide: Practitioner Dashboard & Verification

This document specifies the dashboard data feeds and account verification status flows for Doctors and Nurses on the platform.

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

### 2.1. Doctor Dashboard Data Feed
Provides counts of active cases, ongoing LiveKit session rooms, and recent consultation records.

- **URL**: `/doctors/dashboard`
- **Method**: `GET`
- **Auth Role**: `DOCTOR`, `ADMIN`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Doctor dashboard data retrieved successfully",
    "data": {
      "queueCount": 12,
      "activeConsultation": {
        "id": "consultation-uuid",
        "livekitRoomName": "consultation-3a9d8c9...",
        "startedAt": "2026-08-17T23:55:00.000Z"
      },
      "recentRecords": [
        {
          "id": "record-uuid",
          "publicSummary": "Hypertension...",
          "createdAt": "2026-08-17T23:58:00.000Z",
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

### 2.2. Nurse Dashboard Data Feed
Provides counts of active cases, ongoing LiveKit session rooms, and nurse profile summaries.

- **URL**: `/nurses/dashboard`
- **Method**: `GET`
- **Auth Role**: `NURSE`, `ADMIN`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Nurse dashboard data retrieved successfully",
    "data": {
      "queueCount": 12,
      "activeConsultation": null,
      "profile": {
        "verificationStatus": "PENDING",
        "onboardingStatus": "COMPLETED",
        "specialization": "Emergency Care"
      }
    }
  }
  ```

---

### 2.3. Practitioner Verification Status Self-Check
A high-frequency check to see if a practitioner's profile was verified/rejected by the admin without pulling the full dashboard or profile payload.

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
      "verificationStatus": "VERIFIED",
      "onboardingStatus": "COMPLETED"
    }
  }
  ```
- **Verification Status Enum Values**: `PENDING`, `VERIFIED`, `REJECTED`, `UNVERIFIED`

---

## 3. Frontend Implementation Tasks

### Task 1: Practitioner Welcome & Access Shield
1. On login, retrieve the practitioner profile or dashboard data.
2. If `verificationStatus` is `PENDING`, show a custom locked landing page stating: *"Your credentials are being reviewed by our medical board. We will notify you by email once your account is activated."*
3. If `verificationStatus` is `REJECTED`, show a rejected alert layout highlighting options to update onboarding data (e.g. License ID, Certificate PDF files) and trigger a re-verification request.
4. Block access to the active Clinical Queue (`GET /consultations/queue`) or LiveKit consultation spaces until the account state changes to `VERIFIED`.

### Task 2: Live Verification Status Polling
1. On the locked verification status landing screen, setup a periodic poll (e.g. every 30 seconds) or configure WebSocket triggers listening to changes on `/doctors/me/verification` or `/nurses/me/verification`.
2. When the status changes to `VERIFIED`, trigger a full UI redirect or reload to transition the practitioner to the active dashboard.

### Task 3: Clinician Dashboard Metrics UI
1. Display the `queueCount` metrics as a badge on the sidebar navigation item titled *"Waiting Patients"*.
2. If `activeConsultation` is not null, display a floating notification banner at the top of the dashboard screen stating: *"You have an active session in progress"* with a prominent button to **"Rejoin Room"**.
3. Render a grid showing:
   - Recent consultations summary list
   - Fast links to patient clinical history
   - Current verification details
