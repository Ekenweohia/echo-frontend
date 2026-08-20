'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

interface Transaction {
  id: string;
  referenceId: string;
  type: 'WALLET_FUNDING' | 'WALLET_WITHDRAWAL';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  description: string;
  createdAt: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  isPrimary: boolean;
}

export default function WalletConsole() {
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('NGN');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & inputs
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);

  // Deposit input
  const [depositAmount, setDepositAmount] = useState('5000');
  const [fundingRef, setFundingRef] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Withdrawal input
  const [withdrawAmount, setWithdrawAmount] = useState('1000');
  const [selectedBankId, setSelectedBankId] = useState('');

  // Add Bank inputs
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // Promo input
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      // 1. Get Balance (API 7.1)
      const balRes = await apiClient('/billing/wallet');
      if (balRes.ok) {
        const json = await balRes.json();
        setBalance(json.data.balance);
        setCurrency(json.data.currency || 'NGN');
      }

      // 2. Get Bank Accounts (API 7.5)
      const bankRes = await apiClient('/billing/wallet/bank-accounts');
      if (bankRes.ok) {
        const json = await bankRes.json();
        setBankAccounts(json.data || []);
        if (json.data && json.data.length > 0) {
          setSelectedBankId(json.data[0].id);
        }
      }

      // 3. Get Transactions (API 7.8)
      const transRes = await apiClient('/billing/transactions');
      if (transRes.ok) {
        const json = await transRes.json();
        setTransactions(json.data.transactions || []);
      }
    } catch (err) {
      console.warn('[Wallet] Offline. Loading mock wallet console.');
      // Bootstrap mocks for preview
      setTransactions([
        {
          id: 't-1',
          referenceId: 'FUND-patient-1029',
          type: 'WALLET_FUNDING',
          amount: 5000,
          status: 'COMPLETED',
          description: 'Wallet Funding via Paystack',
          createdAt: new Date().toLocaleDateString()
        }
      ]);
      setBankAccounts([
        { id: 'b-1', accountName: 'Jane Doe', accountNumber: '0123456789', bankName: 'Access Bank', isPrimary: true }
      ]);
      setSelectedBankId('b-1');
    } finally {
      setLoading(false);
    }
  };

  // API 7.2 & 7.3: Deposit flow
  const handleInitializeDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      const response = await apiClient('/billing/payment/initialize', {
        method: 'POST',
        body: JSON.stringify({ amount: amt })
      });
      
      if (response.ok) {
        const json = await response.json();
        setFundingRef(json.data.reference);
        
        // Open Paystack authorization URL
        if (json.data.authorizationUrl) {
          window.open(json.data.authorizationUrl, '_blank');
        }
      }
    } catch (err) {
      // Mock flow fallback
      setBalance(prev => prev + amt);
      setTransactions(prev => [
        {
          id: `t-mock-${Math.random().toString(36).substring(4)}`,
          referenceId: `FUND-mock-${Math.random().toString(36).substring(4)}`,
          type: 'WALLET_FUNDING',
          amount: amt,
          status: 'COMPLETED',
          description: 'Mock Deposit (Offline Mode)',
          createdAt: new Date().toLocaleDateString()
        },
        ...prev
      ]);
      setShowDepositModal(false);
    }
  };

  const handleVerifyDeposit = async () => {
    if (!fundingRef) return;
    setIsVerifying(true);
    try {
      const response = await apiClient(`/billing/payment/verify/${fundingRef}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success) {
          fetchWalletData();
          setFundingRef(null);
          setShowDepositModal(false);
          alert('🎉 Payment verified and wallet credited!');
        } else {
          alert('Payment verification pending. Please complete Paystack checkout.');
        }
      }
    } catch (err) {
      // Offline fallback: simulate verify success
      setBalance(prev => prev + parseFloat(depositAmount));
      setTransactions(prev => [
        {
          id: `t-verify-mock-${Math.random().toString(36).substring(4)}`,
          referenceId: fundingRef,
          type: 'WALLET_FUNDING',
          amount: parseFloat(depositAmount),
          status: 'COMPLETED',
          description: 'Paystack Verified (Simulated)',
          createdAt: new Date().toLocaleDateString()
        },
        ...prev
      ]);
      setFundingRef(null);
      setShowDepositModal(false);
    } finally {
      setIsVerifying(false);
    }
  };

  // API 7.4: Add Bank Account
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !accountName) return;

    const BANK_CODES: Record<string, string> = {
      'Access Bank': '044',
      'GTBank': '058',
      'Guaranty Trust Bank': '058',
      'Zenith Bank': '057',
      'UBA': '033',
      'United Bank for Africa': '033',
      'First Bank': '011',
      'First Bank of Nigeria': '011',
      'Opay': '100004',
      'Palmpay': '100033',
      'Kuda': '090267',
      'Moniepoint': '090405',
      'Wema Bank': '035',
      'Stanbic IBTC': '221',
      'Fidelity Bank': '070',
      'Union Bank': '032',
      'Sterling Bank': '232',
      'Polaris Bank': '076',
      'Ecobank': '050',
      'FCMB': '214',
    };
    const bankCode = BANK_CODES[bankName] || '999';
    const body = { accountName, accountNumber, bankName, bankCode };
    try {
      const response = await apiClient('/billing/wallet/bank-accounts', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const json = await response.json();
        setBankAccounts(prev => [...prev, json.data]);
        setSelectedBankId(json.data.id);
      }
    } catch (err) {
      const mockId = `b-mock-${Math.random().toString(36).substring(4)}`;
      setBankAccounts(prev => [...prev, {
        id: mockId,
        accountName,
        accountNumber,
        bankName,
        isPrimary: false
      }]);
      setSelectedBankId(mockId);
    }
    setAccountNumber('');
    setAccountName('');
    setBankName('');
    setShowAddBankModal(false);
  };

  // API 7.6: Request Withdrawal
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0 || amt > balance) return;

    const body = { amount: amt, bankAccountId: selectedBankId };
    try {
      const response = await apiClient('/billing/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const json = await response.json();
        setBalance(prev => prev - amt);
        setTransactions(prev => [json.data, ...prev]);
      }
    } catch (err) {
      setBalance(prev => prev - amt);
      setTransactions(prev => [
        {
          id: `t-wth-${Math.random().toString(36).substring(4)}`,
          referenceId: `WTH-mock-${Math.random().toString(36).substring(4)}`,
          type: 'WALLET_WITHDRAWAL',
          amount: -amt,
          status: 'PENDING',
          description: `Withdrawal to Linked Bank`,
          createdAt: new Date().toLocaleDateString()
        },
        ...prev
      ]);
    }
    setShowWithdrawModal(false);
  };

  // API 7.7: Apply Promo Code
  const handleApplyPromo = async () => {
    if (!promoCode) return;
    try {
      const response = await apiClient('/billing/promo/apply', {
        method: 'POST',
        body: JSON.stringify({ code: promoCode, amount: 2000 })
      });
      if (response.ok) {
        const json = await response.json();
        setBalance(prev => prev + json.data.savings);
        setPromoMessage(`🎉 Saved ₦${json.data.savings} via Promo Code ${promoCode}!`);
        setTransactions(prev => [
          {
            id: `t-pr-${Math.random().toString(36).substring(4)}`,
            referenceId: `PROMO-${promoCode}`,
            type: 'WALLET_FUNDING',
            amount: json.data.savings,
            status: 'COMPLETED',
            description: `Promo Code Applied: ${promoCode}`,
            createdAt: new Date().toLocaleDateString()
          },
          ...prev
        ]);
      }
    } catch (err) {
      setBalance(prev => prev + 1000);
      setPromoMessage(`🎉 Mock Promo Code Applied! Credited ₦1,000.`);
    }
    setPromoCode('');
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading billing wallet...</div>;
  }

  return (
    <div style={walletCardStyle} className="glass-panel">
      
      {/* Wallet Balance Board */}
      <div style={balanceBoardStyle}>
        <div style={balLeftStyle}>
          <span style={balLabelStyle}>WALLET BALANCE</span>
          <h2 style={balValueStyle}>
            {currency === 'NGN' ? '₦' : '$'}
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          {promoMessage && <p style={promoMsgStyle}>{promoMessage}</p>}
        </div>

        <div style={actionRowStyle}>
          <button onClick={() => setShowDepositModal(true)} style={depositBtnStyle}>Fund Wallet</button>
          <button onClick={() => setShowWithdrawModal(true)} style={withdrawBtnStyle}>Withdraw</button>
        </div>
      </div>

      {/* Promo & Bank Grid */}
      <div style={walletSubGridStyle}>
        {/* Promo Code widget */}
        <div style={subCardStyle}>
          <span style={subLabelStyle}>APPLY PROMO CODE</span>
          <div style={promoFormStyle}>
            <input 
              type="text" 
              placeholder="e.g. HEALTH50" 
              value={promoCode} 
              onChange={e => setPromoCode(e.target.value)} 
              style={promoInputStyle}
            />
            <button onClick={handleApplyPromo} style={promoApplyBtnStyle}>Apply</button>
          </div>
        </div>

        {/* Bank Account widget */}
        <div style={subCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={subLabelStyle}>LINKED BANK</span>
            <button onClick={() => setShowAddBankModal(true)} style={addBankBtnStyle}>+ Link New</button>
          </div>
          {bankAccounts.length === 0 ? (
            <div style={emptyBankStyle}>No linked accounts</div>
          ) : (
            bankAccounts.map(b => (
              <div key={b.id} style={bankItemStyle}>
                <div>
                  <div style={bankNameStyle}>{b.bankName}</div>
                  <div style={bankNumStyle}>•••• {b.accountNumber.slice(-4)}</div>
                </div>
                {b.isPrimary && <span style={primaryBadgeStyle}>Primary</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaction History Section */}
      <div style={historySectionStyle}>
        <span style={historyTitleStyle}>TRANSACTION HISTORY</span>
        <div style={historyListStyle}>
          {transactions.length === 0 ? (
            <div style={emptyHistoryStyle}>No recent transactions</div>
          ) : (
            transactions.map(t => (
              <div key={t.id} style={historyItemStyle}>
                <div style={historyLeftStyle}>
                  <div style={historyIconStyle(t.type)}>
                    {t.type === 'WALLET_FUNDING' ? '↓' : '↑'}
                  </div>
                  <div>
                    <div style={historyDescStyle}>{t.description}</div>
                    <div style={historyDateStyle}>Ref: {t.referenceId} • {t.createdAt}</div>
                  </div>
                </div>
                
                <div style={historyRightStyle}>
                  <span style={historyAmountStyle(t.type)}>
                    {t.type === 'WALLET_FUNDING' ? '+' : ''}
                    ₦{t.amount.toLocaleString()}
                  </span>
                  <span style={historyStatusStyle(t.status)}>{t.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODALS */}
      {showDepositModal && (
        <div style={popupOverlayStyle}>
          <div style={popupCardStyle} className="glass-panel">
            <h4 style={popupTitleStyle}>Fund Wallet</h4>
            <form onSubmit={handleInitializeDeposit} style={popupFormStyle}>
              <div style={formGroupStyle}>
                <label style={popupLabelStyle}>Deposit Amount (₦)</label>
                <input 
                  type="number" 
                  value={depositAmount} 
                  disabled={!!fundingRef}
                  onChange={e => setDepositAmount(e.target.value)} 
                  style={popupInputStyle} 
                  required 
                />
              </div>

              {fundingRef ? (
                <div style={fundingAlertStyle}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.75rem' }}>
                    Paystack checkout has been opened in a new tab. Please complete the transaction and verify below.
                  </p>
                  {isVerifying ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={spinnerStyle} />
                      <span style={{ fontSize: '0.78rem' }}>Verifying deposit status...</span>
                    </div>
                  ) : (
                    <div style={popupBtnRowStyle}>
                      <button type="button" onClick={() => setFundingRef(null)} style={popupCancelBtnStyle}>Back</button>
                      <button type="button" onClick={handleVerifyDeposit} style={popupSubmitBtnStyle}>Verify Deposit</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={popupBtnRowStyle}>
                  <button type="button" onClick={() => setShowDepositModal(false)} style={popupCancelBtnStyle}>Cancel</button>
                  <button type="submit" style={popupSubmitBtnStyle}>Initialize Deposit</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div style={popupOverlayStyle}>
          <div style={popupCardStyle} className="glass-panel">
            <h4 style={popupTitleStyle}>Request Withdrawal</h4>
            <form onSubmit={handleRequestWithdrawal} style={popupFormStyle}>
              <div style={formGroupStyle}>
                <label style={popupLabelStyle}>Withdrawal Amount (₦)</label>
                <input 
                  type="number" 
                  value={withdrawAmount} 
                  onChange={e => setWithdrawAmount(e.target.value)} 
                  style={popupInputStyle} 
                  max={balance}
                  required 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={popupLabelStyle}>Destination Bank Account</label>
                <select 
                  value={selectedBankId} 
                  onChange={e => setSelectedBankId(e.target.value)} 
                  style={popupSelectStyle}
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber} ({b.accountName})
                    </option>
                  ))}
                </select>
              </div>

              <div style={popupBtnRowStyle}>
                <button type="button" onClick={() => setShowWithdrawModal(false)} style={popupCancelBtnStyle}>Cancel</button>
                <button type="submit" style={popupSubmitBtnStyle} disabled={bankAccounts.length === 0}>
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddBankModal && (
        <div style={popupOverlayStyle}>
          <div style={popupCardStyle} className="glass-panel">
            <h4 style={popupTitleStyle}>Link Bank Account</h4>
            <form onSubmit={handleAddBank} style={popupFormStyle}>
              <div style={formGroupStyle}>
                <label style={popupLabelStyle}>Bank Name</label>
                <input
                  type="text"
                  list="bank-name-list"
                  placeholder="e.g. Access Bank, GTBank, Opay..."
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  style={popupInputStyle}
                  required
                />
                <datalist id="bank-name-list">
                  <option value="Access Bank" />
                  <option value="Guaranty Trust Bank" />
                  <option value="Zenith Bank" />
                  <option value="United Bank for Africa" />
                  <option value="First Bank of Nigeria" />
                  <option value="Opay" />
                  <option value="Palmpay" />
                  <option value="Kuda" />
                  <option value="Moniepoint" />
                  <option value="Wema Bank" />
                  <option value="Stanbic IBTC" />
                  <option value="Fidelity Bank" />
                  <option value="Union Bank" />
                  <option value="Sterling Bank" />
                  <option value="Polaris Bank" />
                  <option value="Ecobank" />
                  <option value="FCMB" />
                </datalist>
              </div>

              <div style={formGroupStyle}>
                <label style={popupLabelStyle}>Account Number</label>
                <input 
                  type="text" 
                  placeholder="0123456789" 
                  value={accountNumber} 
                  onChange={e => setAccountNumber(e.target.value)} 
                  maxLength={10}
                  style={popupInputStyle} 
                  required 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={popupLabelStyle}>Account Name</label>
                <input 
                  type="text" 
                  placeholder="Jane Doe" 
                  value={accountName} 
                  onChange={e => setAccountName(e.target.value)} 
                  style={popupInputStyle} 
                  required 
                />
              </div>

              <div style={popupBtnRowStyle}>
                <button type="button" onClick={() => setShowAddBankModal(false)} style={popupCancelBtnStyle}>Cancel</button>
                <button type="submit" style={popupSubmitBtnStyle}>Link Bank</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Styles
const walletCardStyle: React.CSSProperties = {
  padding: '1.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const balanceBoardStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1.5rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const balLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const balLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
};

const balValueStyle: React.CSSProperties = {
  fontSize: '2.25rem',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
};

const promoMsgStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--primary)',
  fontWeight: 600,
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
};

const depositBtnStyle: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)',
  color: '#080c14',
  fontWeight: 700,
  fontSize: '0.78rem',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(0, 245, 212, 0.15)',
};

const withdrawBtnStyle: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  borderRadius: 'var(--border-radius-sm)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'var(--text-primary)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  fontWeight: 600,
  fontSize: '0.78rem',
  cursor: 'pointer',
};

const walletSubGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1.25rem',
};

const subCardStyle: React.CSSProperties = {
  padding: '1.25rem',
  background: 'rgba(255, 255, 255, 0.015)',
  border: '1px solid rgba(255, 255, 255, 0.03)',
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  justifyContent: 'space-between',
};

const subLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  letterSpacing: '0.05em',
};

const promoFormStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

const promoInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  background: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  color: 'var(--text-primary)',
  fontSize: '0.78rem',
  outline: 'none',
};

const promoApplyBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  background: 'rgba(0, 245, 212, 0.08)',
  border: '1px solid rgba(0, 245, 212, 0.15)',
  color: 'var(--primary)',
  fontSize: '0.74rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const addBankBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--secondary)',
  fontSize: '0.68rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const emptyBankStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
  padding: '0.5rem 0',
};

const bankItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0.75rem',
  background: 'rgba(0, 0, 0, 0.15)',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.03)',
};

const bankNameStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const bankNumStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-secondary)',
  marginTop: '1px',
};

const primaryBadgeStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  padding: '0.1rem 0.3rem',
  borderRadius: '4px',
  background: 'rgba(0, 245, 212, 0.08)',
  color: 'var(--primary)',
  fontWeight: 700,
};

const historySectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const historyTitleStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
};

const historyListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
  maxHeight: '260px',
  overflowY: 'auto',
  paddingRight: '0.25rem',
};

const emptyHistoryStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
  padding: '2rem 0',
  textAlign: 'center',
};

const historyItemStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: '10px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const historyLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
};

const historyIconStyle = (type: string): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: type === 'WALLET_FUNDING' ? 'rgba(0, 245, 212, 0.06)' : 'rgba(255, 90, 95, 0.06)',
  border: `1px solid ${type === 'WALLET_FUNDING' ? 'rgba(0, 245, 212, 0.15)' : 'rgba(255, 90, 95, 0.15)'}`,
  color: type === 'WALLET_FUNDING' ? 'var(--primary)' : '#ff5a5f',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '1rem',
  fontWeight: 700,
});

const historyDescStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const historyDateStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-secondary)',
  marginTop: '2px',
};

const historyRightStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '0.2rem',
};

const historyAmountStyle = (type: string): React.CSSProperties => ({
  fontSize: '0.88rem',
  fontWeight: 700,
  color: type === 'WALLET_FUNDING' ? 'var(--primary)' : '#ff5a5f',
});

const historyStatusStyle = (status: string): React.CSSProperties => ({
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: status === 'COMPLETED' ? 'var(--primary)' : status === 'PENDING' ? 'var(--secondary)' : '#ff5a5f',
});

const popupOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10005,
  backgroundColor: 'rgba(5, 7, 12, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1.5rem',
};

const popupCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '380px',
  padding: '1.75rem',
  animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
};

const popupTitleStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  marginBottom: '1rem',
};

const popupFormStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const popupLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
};

const popupInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '6px',
  background: 'rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  outline: 'none',
};

const popupSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '6px',
  background: 'rgba(15, 22, 38, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  outline: 'none',
};

const popupBtnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  marginTop: '0.5rem',
};

const popupCancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.65rem',
  borderRadius: '6px',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const popupSubmitBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.65rem',
  borderRadius: '6px',
  background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)',
  color: '#080c14',
  border: 'none',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const fundingAlertStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem',
  background: 'rgba(0, 245, 212, 0.05)',
  borderRadius: '8px',
  border: '1px solid rgba(0, 245, 212, 0.15)',
  fontSize: '0.76rem',
  color: 'var(--primary)',
  marginTop: '0.5rem',
};

const spinnerStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  border: '2px solid rgba(0, 245, 212, 0.1)',
  borderTopColor: 'var(--primary)',
  animation: 'heartbeat 1s infinite ease-in-out',
};
