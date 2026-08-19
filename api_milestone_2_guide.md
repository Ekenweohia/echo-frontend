# Frontend Integration Guide: Milestone 2 - Queue, Consultation & Financial Operations

This document maps all the backend endpoints that implement the **Milestone 2 Success / Acceptance Criteria** to assist a frontend client or another AI agent in building the connected clinician queue, live audio/video consultation space, and wallet/billing payment flows.

---

## 1. Authentication & Security Policy

All endpoints are secured via JWT bearer tokens and strict Role-Based Access Control (RBAC):
- **Headers**:
  ```http
  Authorization: Bearer <jwt_access_token>
  Content-Type: application/json
  ```
- **RLS/Guard Policies**:
  - **Queue endpoints** require role `DOCTOR`, `NURSE`, or `ADMIN`. Blocked for `PATIENT` role.
  - **Consultation Room creation/joining**: Enforces that only the patient of the consultation or participating/invited clinicians can fetch the LiveKit join token.
  - **Ending Consultation**: Enforced at the API level—only the patient of the consultation is authorized to end the consultation room.
  - **Wallet funding**: A user can only deposit into or query their own wallet.
  - **Withdrawal**: Clinicians can only request withdrawals to bank accounts linked to their own user accounts.

---

## 2. Milestone 2 Workflow & Endpoints

### 2.1. Triage Queue Operations

#### A. Fetch Queue (Doctor-First Priority Window)
- **URL**: `/consultations/queue`
- **Method**: `GET`
- **Auth Role**: `DOCTOR`, `NURSE`, `ADMIN`
- **Priority Rules**:
  - Non-SOS entries are hidden from general clinical staff (`NURSE`, `ADMIN`) for the first **2 minutes** following entry to give `DOCTOR` users first access.
  - SOS entries (`priority: 100`) bypass this window and are visible to everyone immediately.
  - SOS entries always bubble to the top of the queue.
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
        "isSOS": false,
        "priority": 5,
        "status": "WAITING",
        "queuedAt": "2026-08-18T11:00:00.000Z",
        "session": {
          "triageResult": { "acuity": "URGENT", "urgencyScore": 75, "decision": "Escalate to Doctor" },
          "clinicalIntake": { "chiefComplaint": "Shortness of breath" },
          "patient": {
            "fullName": "Jane Doe",
            "patientProfile": { "dateOfBirth": "1990-05-15T00:00:00.000Z", "gender": "FEMALE" }
          }
        }
      }
    ]
  }
  ```

#### B. Claim Case (Atomic Prevention of Double-Claiming)
- **URL**: `/consultations/queue/accept`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "queueEntryId": "queue-entry-uuid"
  }
  ```
- **Success Response (200 OK)**:
  - Generates the LiveKit room and primary participant records.
  ```json
  {
    "success": true,
    "message": "Case accepted successfully",
    "data": {
      "id": "consultation-uuid",
      "patientId": "patient-uuid",
      "primaryClinicianId": "clinician-uuid",
      "livekitRoomName": "consultation-uuid-random",
      "status": "ACTIVE"
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

### 2.2. Consultation Room (LiveKit Video/Audio)

#### A. Join Consultation
- **URL**: `/consultations/:id/join`
- **Method**: `GET`
- **Success Response (200 OK)**:
  - Returns a LiveKit connection JWT `token`, `roomName`, and metadata context.
  ```json
  {
    "success": true,
    "message": "Joined consultation",
    "data": {
      "token": "eyJhbGciOi...",
      "roomName": "consultation-uuid-random",
      "contextData": {
        "dmk": { "bloodType": "O+", "allergies": [...], "medications": [...] },
        "echoSummary": { "triageResult": { "acuity": "URGENT" } }
      }
    }
  }
  ```

#### B. End Consultation (Patient-Only)
- **URL**: `/consultations/:id/end`
- **Method**: `POST`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Consultation ended successfully"
  }
  ```

---

### 2.3. Financial & Billing Transactions

#### A. Initialize Wallet Deposit (Paystack checkout redirection)
- **URL**: `/billing/payment/initialize`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "amount": 5000 // Amount to deposit in NGN
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment initialized",
    "data": {
      "authorizationUrl": "https://checkout.paystack.com/authcode123",
      "reference": "FUND-patient8chars-17632948293"
    }
  }
  ```

#### B. Verify Wallet Deposit
- **URL**: `/billing/payment/verify/:reference`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment verified and wallet credited"
  }
  ```

#### C. Apply Promo Code
- **URL**: `/billing/promo/apply`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "code": "HEALTH50",
    "amount": 2000
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Promo code applied",
    "data": {
      "discountedAmount": 1000,
      "savings": 1000
    }
  }
  ```

#### D. Charge Consultation (Consultation Fee Resolution)
Calculates costs and updates user balances. Applies free weekly/included tier entitlements automatically.
- **URL**: `/billing/consultation/charge`
- **Method**: `POST`
- **Auth Role**: `ADMIN` (internal webhook/cron trigger)
- **Request Body**:
  ```json
  {
    "referenceId": "tx_cons_9988",
    "patientId": "patient-uuid",
    "providerId": "doctor-uuid",
    "durationMinutes": 10
  }
  ```
- **Entitlement Calculation Table**:
  - Free tier + duration <= 1 min + free weekly reset unused → **₦0** charge.
  - Paid tier + included calls remaining → **₦0** charge, decrements included counter.
  - Paid tier + exceeded calls → **₦1,800** (Silver/Gold member rate).
  - General Public / Exceeded Limit → **₦2,000** (standard rate).
- **Payment Split Rules**:
  - Patient is charged the calculated rate.
  - Clinician earns their fixed rate (e.g. ₦1,000 NGN).
  - Platform records the margin (earnings - payout).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "transaction": {
      "referenceId": "tx_cons_9988",
      "amount": 2000,
      "providerPayout": 1000,
      "eeMargin": 1000,
      "status": "COMPLETED"
    }
  }
  ```

#### E. Request Clinician Withdrawal
- **URL**: `/billing/wallet/withdraw`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "amount": 10000,
    "bankAccountId": "bank-account-uuid"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Withdrawal requested successfully",
    "data": { "referenceId": "WTH-17632948293", "status": "PENDING" }
  }
  ```

---

## 3. Frontend Implementation Checklist (Milestone 2)

- [ ] **Priority Queue View**: Setup conditional layouts based on clinician roles (`DOCTOR` vs `NURSE`). Only enable case acceptance if the priority window qualifies.
- [ ] **Atomic Claim Warnings**: Catch errors from claim collision (400) and display a clear toast message: *"Case is no longer available. Try another patient."*
- [ ] **LiveKit Audio/Video controls**: Mount client-side mute/unmute toggles, media state indicators, and device selector hooks.
- [ ] **Leave/End call routing**:
  - Clinician UI should only call `Disconnect` locally (leaving the database status active).
  - Patient UI should call `POST /consultations/:id/end` to end the consultation room globally.
- [ ] **Paystack Web Checkout Redirection**: Load `authorizationUrl` in WebView (mobile) or window (web). Capture Paystack redirect reference parameters and hit `/billing/payment/verify/:reference` to refresh the user's local wallet state.
