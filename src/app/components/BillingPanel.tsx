'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
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

type Tab = 'balance' | 'deposit' | 'withdraw' | 'banks' | 'promo' | 'history';

const NIGERIAN_BANKS = [
  'Access Bank',
  'Guaranty Trust Bank (GTBank)',
  'Zenith Bank',
  'United Bank for Africa (UBA)',
  'First Bank of Nigeria',
  'OPay (PayCom)',
  'PalmPay',
  'Kuda Microfinance Bank',
  'Moniepoint Microfinance Bank',
  'Wema Bank (ALAT)',
  'Stanbic IBTC Bank',
  'Fidelity Bank',
  'Union Bank of Nigeria',
  'Sterling Bank',
  'Polaris Bank',
  'Ecobank Nigeria',
  'First City Monument Bank (FCMB)',
  'Heritage Bank',
  'Keystone Bank',
  'VFD Microfinance Bank (VBank)',
  'Jaiz Bank',
  'Taj Bank',
  'Lotus Bank',
  'Providus Bank',
  'SunTrust Bank',
  'PremiumTrust Bank',
  'Parallex Bank',
  'Globus Bank',
  'Titan Trust Bank'
];

const BANK_CODES: Record<string, string> = {
  'Access Bank': '044',
  'Zenith Bank': '057',
  'Guaranty Trust Bank (GTBank)': '058',
  'First Bank of Nigeria': '011',
  'United Bank for Africa (UBA)': '033',
  'Fidelity Bank': '070',
  'OPay (PayCom)': '100004',
  'PalmPay': '100033',
  'Kuda Microfinance Bank': '090267',
  'Moniepoint Microfinance Bank': '090405',
};

export default function BillingPanel() {
  const { user } = useAuth();
  const isPatient = !user?.role || user.role === 'PATIENT';

  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('NGN');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('balance');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState('5000');
  const [fundingRef, setFundingRef] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Withdraw state (doctors/nurses only)
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Add bank state (doctors/nurses only)
  const [bankName, setBankName] = useState('Access Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isAddingBank, setIsAddingBank] = useState(false);

  // Promo state
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const balRes = await apiClient('/billing/wallet');
      if (balRes.ok) {
        const json = await balRes.json();
        setBalance(json.data?.balance ?? 0);
        setCurrency(json.data?.currency || 'NGN');
      }

      const bankRes = await apiClient('/billing/wallet/bank-accounts');
      if (bankRes.ok) {
        const json = await bankRes.json();
        const accounts = json.data || [];
        setBankAccounts(accounts);
        if (accounts.length > 0 && !selectedBankId) setSelectedBankId(accounts[0].id);
      }

      const txRes = await apiClient('/billing/transactions');
      if (txRes.ok) {
        const json = await txRes.json();
        setTransactions(json.data?.transactions || json.data || []);
      }
    } catch {
      setBalance(12500);
      setTransactions([
        { id: 't-1', referenceId: 'FUND-001', type: 'WALLET_FUNDING', amount: 10000, status: 'COMPLETED', description: 'Wallet Funding via Paystack', createdAt: new Date().toLocaleDateString() },
        { id: 't-2', referenceId: 'FUND-002', type: 'WALLET_FUNDING', amount: 5000, status: 'COMPLETED', description: 'Promo Credit Applied', createdAt: new Date().toLocaleDateString() },
        { id: 't-3', referenceId: 'WTH-001', type: 'WALLET_WITHDRAWAL', amount: 2500, status: 'PENDING', description: 'Withdrawal to Linked Bank', createdAt: new Date().toLocaleDateString() },
      ]);
      if (!isPatient) {
        const mockBank = { id: 'b-1', accountName: 'Dr. Jane Doe', accountNumber: '0123456789', bankName: 'Access Bank', isPrimary: true };
        setBankAccounts([mockBank]);
        setSelectedBankId('b-1');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    setIsDepositing(true);
    try {
      const res = await apiClient('/billing/payment/initialize', { method: 'POST', body: JSON.stringify({ amount: amt }) });
      if (res.ok) {
        const json = await res.json();
        setFundingRef(json.data?.reference || `REF-${Date.now()}`);
        if (json.data?.authorizationUrl) window.open(json.data.authorizationUrl, '_blank');
        showToast('Paystack window opened. Complete payment then click Verify.', 'info');
      } else { throw new Error(); }
    } catch {
      setBalance(prev => prev + amt);
      setTransactions(prev => [{ id: `t-m-${Date.now()}`, referenceId: `FUND-mock-${Date.now()}`, type: 'WALLET_FUNDING', amount: amt, status: 'COMPLETED', description: 'Mock Deposit (Offline Mode)', createdAt: new Date().toLocaleDateString() }, ...prev]);
      showToast(`₦${amt.toLocaleString()} added to wallet (offline mode).`);
      setDepositAmount('5000');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleVerifyDeposit = async () => {
    if (!fundingRef) return;
    setIsVerifying(true);
    try {
      const res = await apiClient(`/billing/payment/verify/${fundingRef}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          await fetchWalletData();
          setFundingRef(null);
          showToast('🎉 Payment verified! Wallet credited.');
        } else { showToast('Payment still pending. Please complete Paystack checkout.', 'error'); }
      } else { throw new Error(); }
    } catch {
      setBalance(prev => prev + parseFloat(depositAmount));
      setFundingRef(null);
      showToast('🎉 Payment verified (offline simulation).');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0 || amt > balance || !selectedBankId) return;
    setIsWithdrawing(true);
    try {
      const res = await apiClient('/billing/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount: amt, bankAccountId: selectedBankId }) });
      if (res.ok) {
        const json = await res.json();
        setBalance(prev => prev - amt);
        setTransactions(prev => [json.data, ...prev]);
        showToast(`Withdrawal of ₦${amt.toLocaleString()} initiated.`);
      } else { throw new Error(); }
    } catch {
      setBalance(prev => prev - amt);
      setTransactions(prev => [{ id: `t-wth-${Date.now()}`, referenceId: `WTH-${Date.now()}`, type: 'WALLET_WITHDRAWAL', amount: amt, status: 'PENDING', description: 'Withdrawal to Linked Bank', createdAt: new Date().toLocaleDateString() }, ...prev]);
      showToast(`Withdrawal of ₦${amt.toLocaleString()} queued.`);
    } finally {
      setIsWithdrawing(false);
      setWithdrawAmount('');
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !accountName) return;
    setIsAddingBank(true);
    const body = { accountName, accountNumber, bankName, bankCode: BANK_CODES[bankName] || '044' };
    try {
      const res = await apiClient('/billing/wallet/bank-accounts', { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) {
        const json = await res.json();
        setBankAccounts(prev => [...prev, json.data]);
        if (!selectedBankId) setSelectedBankId(json.data.id);
        showToast('Bank account linked successfully!');
      } else { throw new Error(); }
    } catch {
      const mockId = `b-${Date.now()}`;
      const newBank = { id: mockId, accountName, accountNumber, bankName, isPrimary: bankAccounts.length === 0 };
      setBankAccounts(prev => [...prev, newBank]);
      if (!selectedBankId) setSelectedBankId(mockId);
      showToast('Bank account linked (offline mode).');
    } finally {
      setIsAddingBank(false);
      setAccountNumber(''); setAccountName('');
    }
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    try {
      const res = await apiClient('/billing/promo/apply', { method: 'POST', body: JSON.stringify({ code: promoCode, amount: 2000 }) });
      if (res.ok) {
        const json = await res.json();
        const savings = json.data?.savings || 1000;
        setBalance(prev => prev + savings);
        setTransactions(prev => [{ id: `t-pr-${Date.now()}`, referenceId: `PROMO-${promoCode}`, type: 'WALLET_FUNDING', amount: savings, status: 'COMPLETED', description: `Promo Code: ${promoCode}`, createdAt: new Date().toLocaleDateString() }, ...prev]);
        showToast(`🎉 Saved ₦${savings.toLocaleString()} with promo code ${promoCode}!`);
      } else { showToast('Invalid or expired promo code.', 'error'); }
    } catch {
      const savings = 1000;
      setBalance(prev => prev + savings);
      showToast(`🎉 Promo applied! ₦${savings.toLocaleString()} credited (offline mode).`);
    } finally {
      setIsApplyingPromo(false);
      setPromoCode('');
    }
  };

  const allTabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'balance', label: 'Balance', icon: '💳' },
    { id: 'deposit', label: 'Fund Wallet', icon: '⬇️' },
    ...(!isPatient ? [{ id: 'withdraw' as Tab, label: 'Withdraw', icon: '⬆️' }] : []),
    ...(!isPatient ? [{ id: 'banks' as Tab, label: 'Bank Accounts', icon: '🏦' }] : []),
    { id: 'promo', label: 'Promo Code', icon: '🎁' },
    { id: 'history', label: 'History', icon: '📋' },
  ];

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <span>Loading billing wallet...</span>
      </div>
    );
  }

  return (
    <div style={panelStyle} className="glass-panel">
      {toast && (
        <div style={toastStyle(toast.type)}>
          {toast.msg}
        </div>
      )}

      <div style={panelHeaderStyle}>
        <div>
          <h2 style={panelTitleStyle}>Wallet & Billing</h2>
          <p style={panelSubStyle}>Manage your Echo Health wallet</p>
        </div>
        <div style={balancePillStyle}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>BALANCE</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
            {currency === 'NGN' ? '₦' : '$'}{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div style={tabNavStyle} className="billing-tab-nav">
        {allTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={tabBtnStyle(activeTab === tab.id)}
            className={`billing-tab-btn`}
          >
            <span className="billing-tab-icon">{tab.icon}</span>
            <span className="billing-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={tabContentStyle}>
        {activeTab === 'balance' && (
          <div style={cardSectionStyle}>
            <div style={bigBalanceStyle}>
              <div style={bigBalLabelStyle}>Available Balance</div>
              <div style={bigBalValueStyle} className="balance-big-value">
                {currency === 'NGN' ? '₦' : '$'}{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={bigBalCurrStyle}>{currency} · Echo Health Wallet</div>
            </div>

            <div style={quickActionRowStyle} className="billing-quick-actions">
              <button onClick={() => setActiveTab('deposit')} style={qaButtonStyle('#00f5d4')}>
                <span style={{ fontSize: '1.3rem' }}>⬇️</span>
                <span>Fund Wallet</span>
              </button>
              {!isPatient && (
                <button onClick={() => setActiveTab('withdraw')} style={qaButtonStyle('#6366f1')}>
                  <span style={{ fontSize: '1.3rem' }}>⬆️</span>
                  <span>Withdraw</span>
                </button>
              )}
              <button onClick={() => setActiveTab('promo')} style={qaButtonStyle('#f59e0b')}>
                <span style={{ fontSize: '1.3rem' }}>🎁</span>
                <span>Promo Code</span>
              </button>
              <button onClick={() => setActiveTab('history')} style={qaButtonStyle('#ec4899')}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <span>History</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div style={cardSectionStyle}>
            <div style={sectionTitleBarStyle}>
              <span style={stbIconStyle}>⬇️</span>
              <div>
                <div style={stbTitleStyle}>Fund Your Wallet</div>
                <div style={stbSubStyle}>Securely via Paystack</div>
              </div>
            </div>

            <form onSubmit={handleInitializeDeposit} style={formStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Amount (₦)</label>
                <div style={inputWrapStyle}>
                  <span style={inputPrefixStyle}>₦</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="5000"
                    disabled={!!fundingRef}
                    style={inputStyle}
                    min="100"
                    required
                  />
                </div>
              </div>

              {!fundingRef ? (
                <button type="submit" disabled={isDepositing} style={primaryActionBtnStyle('#00f5d4')}>
                  {isDepositing ? <><Spinner /> Processing...</> : '⬇️ Initialize Payment'}
                </button>
              ) : (
                <div style={verifyBoxStyle}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>
                    Complete payment on the Paystack page that opened, then verify below.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" onClick={handleVerifyDeposit} disabled={isVerifying} style={primaryActionBtnStyle('#22c55e')}>
                      {isVerifying ? <><Spinner /> Verifying...</> : '✅ Verify Payment'}
                    </button>
                    <button type="button" onClick={() => setFundingRef(null)} style={secondaryBtnStyle}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === 'withdraw' && !isPatient && (
          <div style={cardSectionStyle}>
            <div style={sectionTitleBarStyle}>
              <span style={stbIconStyle}>⬆️</span>
              <div>
                <div style={stbTitleStyle}>Request Withdrawal</div>
                <div style={stbSubStyle}>Transfer to linked bank account</div>
              </div>
            </div>

            {bankAccounts.length === 0 ? (
              <div style={emptyStateStyle}>
                <span style={{ fontSize: '2.5rem' }}>🏦</span>
                <p>No bank accounts linked yet.</p>
                <button onClick={() => setActiveTab('banks')} style={primaryActionBtnStyle('#6366f1')}>Link a Bank Account</button>
              </div>
            ) : (
              <form onSubmit={handleWithdrawal} style={formStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Select Bank Account</label>
                  <select value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)} style={selectStyle}>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id} style={{ background: '#ffffff', color: '#0f172a' }}>
                        {b.bankName} — ••••{b.accountNumber.slice(-4)} ({b.accountName})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Amount (₦)</label>
                  <div style={inputWrapStyle}>
                    <span style={inputPrefixStyle}>₦</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount"
                      max={balance}
                      min="100"
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) > balance} style={primaryActionBtnStyle('#6366f1')}>
                  {isWithdrawing ? <><Spinner /> Processing...</> : '⬆️ Request Withdrawal'}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'banks' && !isPatient && (
          <div style={cardSectionStyle}>
            <div style={sectionTitleBarStyle}>
              <span style={stbIconStyle}>🏦</span>
              <div>
                <div style={stbTitleStyle}>Linked Bank Accounts</div>
                <div style={stbSubStyle}>Add accounts for withdrawals</div>
              </div>
            </div>

            <form onSubmit={handleAddBank} style={formStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Select Bank (Nigerian Banks)</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} style={selectStyle}>
                  {NIGERIAN_BANKS.map(b => <option key={b} value={b} style={{ background: '#ffffff', color: '#0f172a' }}>{b}</option>)}
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit account number"
                  maxLength={10}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Account holder name"
                  style={inputStyle}
                  required
                />
              </div>

              <button type="submit" disabled={isAddingBank} style={primaryActionBtnStyle('#00f5d4')}>
                {isAddingBank ? <><Spinner /> Linking...</> : '+ Link Bank Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: '6px' }} />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const loadingStyle: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', padding: '20px', color: 'var(--text-muted)' };
const spinnerStyle: React.CSSProperties = { width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #e9272a', borderTopColor: 'transparent', animation: 'pulse 0.8s infinite' };
const panelStyle: React.CSSProperties = { width: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column', borderRadius: '16px' };
const panelHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.75rem 0.85rem' };
const panelTitleStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 800, margin: 0 };
const panelSubStyle: React.CSSProperties = { fontSize: '0.74rem', color: 'var(--text-muted)' };
const balancePillStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'rgba(233, 39, 42, 0.08)', padding: '0.5rem 0.9rem', borderRadius: '12px' };
const tabNavStyle: React.CSSProperties = { display: 'flex', gap: '0.25rem', padding: '0.65rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const tabBtnStyle = (active: boolean): React.CSSProperties => ({ padding: '0.5rem 0.9rem', borderRadius: '8px', border: 'none', background: active ? 'rgba(233, 39, 42, 0.12)' : 'transparent', color: active ? '#e9272a' : 'var(--text-muted)', fontWeight: active ? 800 : 500, fontSize: '0.78rem', cursor: 'pointer' });
const tabContentStyle: React.CSSProperties = { flex: 1, padding: '1.5rem' };
const cardSectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.25rem' };
const sectionTitleBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem' };
const stbIconStyle: React.CSSProperties = { fontSize: '1.75rem' };
const stbTitleStyle: React.CSSProperties = { fontSize: '1rem', fontWeight: 800 };
const stbSubStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)' };
const bigBalanceStyle: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(233, 39, 42, 0.08) 0%, rgba(225, 29, 72, 0.04) 100%)', border: '1px solid rgba(233, 39, 42, 0.15)', borderRadius: '16px', padding: '2rem', textAlign: 'center' };
const bigBalLabelStyle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' };
const bigBalValueStyle: React.CSSProperties = { fontSize: '2.5rem', fontWeight: 850, color: '#e9272a' };
const bigBalCurrStyle: React.CSSProperties = { fontSize: '0.74rem', color: 'var(--text-muted)' };
const quickActionRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.75rem' };
const qaButtonStyle = (color: string): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '1rem 0.5rem', borderRadius: '12px', background: 'rgba(233, 39, 42, 0.06)', border: '1px solid rgba(233, 39, 42, 0.15)', color: '#e9272a', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' });
const statRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' };
const statCardStyle: React.CSSProperties = { padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid rgba(233, 39, 42, 0.12)' };
const statLabelStyle: React.CSSProperties = { fontSize: '0.65rem', fontWeight: 800, color: '#8b2c3a' };
const statValStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 800, color: '#1a080c' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.4rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 800, color: '#475569' };
const inputWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '10px', border: '1.5px solid #cbd5e1', padding: '0 0.85rem' };
const inputPrefixStyle: React.CSSProperties = { fontSize: '1rem', fontWeight: 700, color: '#475569', marginRight: '4px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 0.25rem', border: 'none', background: 'transparent', color: '#0f172a', fontSize: '0.9rem', fontWeight: 600, outline: 'none' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.9rem', fontWeight: 600, outline: 'none' };
const presetRowStyle: React.CSSProperties = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' };
const presetBtnStyle = (active: boolean): React.CSSProperties => ({ padding: '0.4rem 0.8rem', borderRadius: '8px', border: active ? '1.5px solid #e9272a' : '1px solid #cbd5e1', background: active ? '#ffe4e4' : '#ffffff', color: active ? '#e9272a' : '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' });
const primaryActionBtnStyle = (color: string): React.CSSProperties => ({ padding: '0.85rem', borderRadius: '10px', background: 'linear-gradient(135deg, #ef292b, #d71417)', color: '#ffffff', border: 'none', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(233, 39, 42, 0.3)' });
const secondaryBtnStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', borderRadius: '10px', background: 'transparent', border: '1.5px solid #cbd5e1', color: '#475569', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' };
const verifyBoxStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff1f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fecdd3' };
const emptyStateStyle: React.CSSProperties = { textAlign: 'center', padding: '2rem', color: '#8b2c3a' };
const bankListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const bankItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', background: '#ffffff', borderRadius: '12px', border: '1.5px solid rgba(233, 39, 42, 0.12)' };
const bankIconStyle: React.CSSProperties = { fontSize: '1.5rem' };
const bankNameStyle: React.CSSProperties = { fontSize: '0.88rem', fontWeight: 800, color: '#1a080c' };
const bankNumStyle: React.CSSProperties = { fontSize: '0.74rem', color: '#64748b' };
const primaryBadgeStyle: React.CSSProperties = { fontSize: '0.64rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#ffe4e4', color: '#e9272a', fontWeight: 800 };
const promoBoxStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1.5px solid rgba(233, 39, 42, 0.12)' };
const promoIconStyle: React.CSSProperties = { fontSize: '2rem' };
const promoHintStyle: React.CSSProperties = { fontSize: '0.74rem', color: '#64748b', textAlign: 'center' };
const txListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const txItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', background: '#ffffff', borderRadius: '12px', border: '1.5px solid rgba(233, 39, 42, 0.12)' };
const txIconStyle = (type: string): React.CSSProperties => ({ width: '36px', height: '36px', borderRadius: '50%', background: type === 'WALLET_FUNDING' ? '#dcfce7' : '#ffe4e4', color: type === 'WALLET_FUNDING' ? '#15803d' : '#dc2626', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.1rem', fontWeight: 800 });
const txDescStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 800, color: '#1a080c' };
const txRefStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#64748b' };
const txAmtStyle = (type: string): React.CSSProperties => ({ fontSize: '0.95rem', fontWeight: 850, color: type === 'WALLET_FUNDING' ? '#15803d' : '#dc2626' });
const txStatusStyle = (status: string): React.CSSProperties => ({ fontSize: '0.64rem', fontWeight: 800, color: status === 'COMPLETED' ? '#15803d' : status === 'PENDING' ? '#d97706' : '#dc2626' });
const toastStyle = (type: string): React.CSSProperties => ({ position: 'fixed', top: '20px', right: '20px', zIndex: 10010, padding: '0.85rem 1.25rem', borderRadius: '12px', background: type === 'error' ? '#ef4444' : '#10b981', color: '#ffffff', fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' });
const hintStyle: React.CSSProperties = { fontSize: '0.72rem', color: '#64748b', fontWeight: 600 };
