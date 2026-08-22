# Frontend Integration Guide: Authentication & Session Operations

This document specifies the authentication routes, request payloads, response schemas, and client storage instructions to implement user registration, login, token refresh, and password management.

---

## 1. Base URL & Security Policy
- **Base URL**: `http://localhost:4000/api/v1/auth`
- **Headers Required (for authenticated endpoints)**:
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **IP & User-Agent Tracking**: The backend audits and saves client IP addresses and User-Agent details during every token refresh, login, and registration event.

---

## 2. API Endpoints

### 2.1. User Registration
Registers a new user and triggers an email verification message.

- **URL**: `/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "fullName": "Jane Doe",
    "username": "janedoe",
    "email": "jane@example.com",
    "phone": "+15550101",
    "password": "Password123!", // Must have at least 1 uppercase, 1 lowercase, 1 digit, 1 special character, and be min 10 chars
    "role": "PATIENT"            // Optional, defaults to "PATIENT". Options: PATIENT | DOCTOR | NURSE | PARTNER
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registration successful. Verification email has been sent.",
    "data": {
      "id": "user-uuid",
      "fullName": "Jane Doe",
      "username": "janedoe",
      "email": "jane@example.com",
      "phone": "+15550101",
      "role": "PATIENT",
      "emailVerified": false,
      "accountStatus": "ACTIVE",
      "createdAt": "2026-08-18T10:00:00.000Z"
    }
  }
  ```

---

### 2.2. Login
Authenticates the user and returns short-lived access and long-lived refresh tokens.

- **URL**: `/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "identifier": "jane@example.com", // Can be email, username, or phone number
    "password": "Password123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "user-uuid",
        "fullName": "Jane Doe",
        "username": "janedoe",
        "email": "jane@example.com",
        "role": "PATIENT",
        "emailVerified": true
      },
      "tokens": {
        "accessToken": "eyJhbGciOi...",  // Short-lived access token (expires in 15 mins)
        "refreshToken": "eyJhbGciOi..." // Long-lived refresh token (expires in 30 days)
      }
    }
  }
  ```

---

### 2.3. Refresh Access Token
Exchanges a valid refresh token for a new access token. Called automatically by the frontend interceptor when the access token expires.

- **URL**: `/refresh`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

---

### 2.4. Logout (Single Device)
Invalidates the supplied refresh token to prevent further access.

- **URL**: `/logout`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### 2.5. Logout (All Devices / Sessions)
Terminates all active login sessions for the current user.

- **URL**: `/logout-all`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out of all sessions successfully"
  }
  ```

---

### 2.6. Verify Email
Verifies a registration using the secret token received in the verification email.

- **URL**: `/verify-email`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "token": "verification-token-string"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Email verified successfully"
  }
  ```

---

### 2.7. Resend Email Verification Link
Resends a new email verification message if the token expired.

- **URL**: `/resend-verification`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "If an account exists, a new verification link has been sent"
  }
  ```

---

### 2.8. Forgot Password (Request Link)
Requests a password reset link to be delivered via email.

- **URL**: `/forgot-password`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "If an account exists for this email, password reset instructions have been sent."
  }
  ```

---

### 2.9. Reset Password (Using Token)
Resets the user's password using the link token from the password reset email.

- **URL**: `/reset-password`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "token": "password-reset-token-string",
    "newPassword": "NewPassword123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password has been reset successfully. Please log in with your new password."
  }
  ```

---

### 2.10. Change Password (Authenticated Settings)
Changes password for an already logged-in user.

- **URL**: `/change-password`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```

---

### 2.11. Get Current User Details
Fetches active user details and profile info.

- **URL**: `/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
      "id": "user-uuid",
      "fullName": "Jane Doe",
      "username": "janedoe",
      "email": "jane@example.com",
      "phone": "+15550101",
      "role": "PATIENT",
      "emailVerified": true,
      "accountStatus": "ACTIVE",
      "patientProfile": {
        "id": "profile-uuid",
        "dateOfBirth": "1990-05-15T00:00:00.000Z",
        "gender": "FEMALE",
        "onboardingStatus": "COMPLETED"
      }
    }
  }
  ```

---

## 3. Frontend Client Implementation Tasks

### Task 1: Token Storage & Security
- **Access Token**: Store the short-lived `accessToken` in memory (or standard application state variable). Avoid writing it to `localStorage` or permanent storage to protect against Cross-Site Scripting (XSS) extraction.
- **Refresh Token**: Store the long-lived `refreshToken` in a secure location:
  - **Web Client**: If possible, configure server to use HttpOnly cookie settings (already validated on backend middleware), otherwise store in secure local storage.
  - **Mobile Client**: Store the refresh token securely in **Keychain** (iOS) or **Keystore** (Android).

### Task 2: Automated Token Refresh (HTTP Interceptor)
Implement an Axios or Fetch interceptor to automatically renew access tokens:
1. Intercept all outbound API calls and inject `Authorization: Bearer <accessToken>` into the headers.
2. If an API request fails with a `401 Unauthorized` error (access token expired), pause incoming requests.
3. Call `POST /refresh` passing the stored `refreshToken`.
4. If successful:
   - Save the new `accessToken`.
   - Retry the paused request with the new token.
5. If the refresh call itself fails (e.g. token expired, revoked, or account suspended), clear storage variables and redirect the user immediately to the Login page.
