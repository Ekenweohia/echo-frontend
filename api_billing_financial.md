# Frontend Implementation Guide: Billing, Wallet & Payments

This document outlines the API endpoints and integration steps to handle user wallets, bank accounts, Paystack deposits, withdrawals, promo code application, and auditing transaction history.

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

### 2.1. Get Wallet Balance
Fetch the user's current wallet balance.

- **URL**: `/billing/wallet`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Wallet fetched",
    "data": {
      "id": "wallet-uuid",
      "userId": "user-uuid",
      "balance": 5000,
      "currency": "NGN",
      "createdAt": "2026-08-17T20:00:00.000Z",
      "updatedAt": "2026-08-17T23:59:00.000Z"
    }
  }
  ```

---

### 2.2. Initialize Deposit Payment (Paystack)
Initiates a transaction to deposit funds into the patient's wallet. Returns an authorization URL to load the Paystack checkout.

- **URL**: `/billing/payment/initialize`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "amount": 2500
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment initialized",
    "data": {
      "authorizationUrl": "https://checkout.paystack.com/authcode123",
      "accessCode": "authcode123",
      "reference": "FUND-user8chars-17632948293"
    }
  }
  ```

---

### 2.3. Verify Payment
Manual check triggered by frontend after redirecting from Paystack to verify transaction status and credit the wallet.

- **URL**: `/billing/payment/verify/:reference`
- **Method**: `GET`
- **Path Params**: `:reference` = Transaction reference returned by Paystack
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment verified and wallet credited",
    "data": {
      "id": "transaction-uuid",
      "referenceId": "FUND-user8chars-17632948293",
      "userId": "user-uuid",
      "type": "WALLET_FUNDING",
      "amount": 2500,
      "status": "COMPLETED",
      "description": "Wallet Funding via Paystack",
      "createdAt": "2026-08-17T23:59:10.000Z"
    }
  }
  ```

---

### 2.4. Add Bank Account
Adds a bank account for payouts. Generates a Paystack transfer recipient code on the fly.

- **URL**: `/billing/wallet/bank-accounts`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "accountName": "John Doe",
    "accountNumber": "0123456789",
    "bankName": "Access Bank",
    "bankCode": "044"
  }
  ```
- **Success Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Bank account added successfully",
    "data": {
      "id": "bank-account-uuid",
      "userId": "user-uuid",
      "accountName": "John Doe",
      "accountNumber": "0123456789",
      "bankName": "Access Bank",
      "bankCode": "044",
      "recipientCode": "RCP_transferrecipient123",
      "isPrimary": true,
      "createdAt": "2026-08-17T23:59:15.000Z"
    }
  }
  ```

---

### 2.5. Fetch Saved Bank Accounts
Lists saved bank accounts for withdrawal options.

- **URL**: `/billing/wallet/bank-accounts`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Bank accounts fetched",
    "data": [
      {
        "id": "bank-account-uuid",
        "accountName": "John Doe",
        "accountNumber": "0123456789",
        "bankName": "Access Bank",
        "isPrimary": true
      }
    ]
  }
  ```

---

### 2.6. Request Withdrawal (Clinicians/Providers)
Initiates a transfer payout of wallet balance to a bank account.

- **URL**: `/billing/wallet/withdraw`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "amount": 1000,
    "bankAccountId": "bank-account-uuid"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Withdrawal requested successfully",
    "data": {
      "id": "transaction-uuid",
      "referenceId": "WTH-17632948293",
      "type": "WALLET_WITHDRAWAL",
      "providerPayout": -1000,
      "status": "PENDING",
      "description": "Withdrawal to Access Bank (0123456789)"
    }
  }
  ```

---

### 2.7. Apply Promo Code
Applies a promotional code to discount a billing amount.

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
      "code": "HEALTH50",
      "discountType": "PERCENT",
      "discountValue": 50,
      "originalAmount": 2000,
      "discountedAmount": 1000,
      "savings": 1000
    }
  }
  ```

---

### 2.8. Get Transaction History (Audit Trail)
Fetches user-specific financial history logs.

- **URL**: `/billing/transactions`
- **Method**: `GET`
- **Query Params**:
  - `page` (optional, default: `1`)
  - `limit` (optional, default: `20`, max: `100`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Transaction history fetched",
    "data": {
      "transactions": [
        {
          "id": "transaction-uuid",
          "referenceId": "FUND-...",
          "type": "WALLET_FUNDING",
          "amount": 2500,
          "providerPayout": 0,
          "eeMargin": 0,
          "currency": "NGN",
          "status": "COMPLETED",
          "description": "Wallet Funding via Paystack",
          "createdAt": "2026-08-17T23:59:10.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 1,
        "totalPages": 1
      }
    }
  }
  ```

---

## 3. Frontend Implementation Tasks

### Task 1: Wallet funding and Paystack Checkout Integration
1. Render a "Fund Wallet" modal/screen with pre-set payment buttons (e.g. ₦1,000, ₦5,000, ₦10,000) and custom input field.
2. User clicks "Pay" → Frontend calls `/billing/payment/initialize` with amount.
3. Extract `authorizationUrl` from the response.
4. **Web Client Integration**:
   - Redirect the user directly to the `authorizationUrl` via `window.location.href = authorizationUrl`.
   - **Paystack Callback Redirect**: Configure Paystack dashboard to redirect back to `/payment/callback?reference=...` on your frontend app.
5. **Mobile Client Integration**:
   - Open the `authorizationUrl` in an In-App WebView or Safari View Controller.
   - Listen for WebView URL redirect match (e.g. matching your callback URL or custom scheme). On redirect detect, close WebView and extract the `reference` query parameter.
6. Trigger `/billing/payment/verify/:reference` using the extracted reference. Show a loading overlay with *"Verifying payment, please wait..."* and on success update local wallet state and display a success modal.

### Task 2: Provider Withdrawal Panel
1. Render "Add Bank Account" form. Let users select bank (fetch bank list/codes from Paystack standard API or hardcode major banks), input account number and name.
2. User submits form → Frontend triggers `POST /billing/wallet/bank-accounts`. Add account successfully.
3. Render a "Withdraw Balance" panel. Show current balance, enable inputting a payout amount, and choosing a primary bank account.
4. On submit, trigger `/billing/wallet/withdraw`. Update wallet balance showing a deduction. Mark transaction status as pending.

### Task 3: Apply Promo Codes at Checkout
1. At payment/checkout screens, render an input field titled *"Promo Code"*.
2. When the user types code and presses "Apply", send `POST /billing/promo/apply` with current consultation/subscription charge and promo code.
3. Update the checkout view layout to display:
   - Original Price
   - Savings / Discount applied (e.g. `- ₦1,000`)
   - New Total Due
4. If the code is invalid/expired, render the error message return payload underneath the promo code input.
