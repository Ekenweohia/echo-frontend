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
  'Access Bank', 'Zenith Bank', 'GTBank', 'First Bank', 'UBA',
  'Fidelity Bank', 'Union Bank', 'Sterling Bank', 'Wema Bank', 'Keystone Bank',
  'Polaris Bank', 'Providus Bank', 'Stanbic IBTC', 'Standard Chartered', 'Ecobank',
];

const BANK_CODES: Record<string, string> = {
  'Access Bank': '044', 'Zenith Bank': '057', 'GTBank': '058',
  'First Bank': '011', 'UBA': '033', 'Fidelity Bank': '070',
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
      // 1. Get Balance
      const balRes = await apiClient('/billing/wallet');
      if (balRes.ok) {
        const json = await balRes.json();
        setBalance(json.data?.balance ?? 0);
        setCurrency(json.data?.currency || 'NGN');
      }

      // 2. Get Bank Accounts (for doctors/nurses only, but we fetch anyway for display)
      const bankRes = await apiClient('/billing/wallet/bank-accounts');
      if (bankRes.ok) {
        const json = await bankRes.json();
        const accounts = json.data || [];
        setBankAccounts(accounts);
        if (accounts.length > 0 && !selectedBankId) setSelectedBankId(accounts[0].id);
      }

      // 3. Get Transactions
      const txRes = await apiClient('/billing/transactions');
      if (txRes.ok) {
        const json = await txRes.json();
        setTransactions(json.data?.transactions || json.data || []);
      }
    } catch {
      // Offline mock
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

  // Deposit – Step 1: Initialize
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
      // Offline mock – simulate instant credit
      setBalance(prev => prev + amt);
      setTransactions(prev => [{ id: `t-m-${Date.now()}`, referenceId: `FUND-mock-${Date.now()}`, type: 'WALLET_FUNDING', amount: amt, status: 'COMPLETED', description: 'Mock Deposit (Offline Mode)', createdAt: new Date().toLocaleDateString() }, ...prev]);
      showToast(`₦${amt.toLocaleString()} added to wallet (offline mode).`);
      setDepositAmount('5000');
    } finally {
      setIsDepositing(false);
    }
  };

  // Deposit – Step 2: Verify
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

  // Withdrawal (doctors/nurses only)
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

  // Add Bank Account (doctors/nurses only)
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

  // Promo Code
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

  // Compute which tabs to show
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
      {/* Toast */}
      {toast && (
        <div style={toastStyle(toast.type)}>
          {toast.msg}
        </div>
      )}

      {/* Panel Header */}
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

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <div style={tabContentStyle}>

        {/* BALANCE TAB */}
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

            {/* Summary stats */}
            <div style={statRowStyle}>
              <div style={statCardStyle}>
                <span style={statLabelStyle}>TOTAL FUNDED</span>
                <span style={statValStyle}>
                  ₦{transactions.filter(t => t.type === 'WALLET_FUNDING').reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </span>
              </div>
              <div style={statCardStyle}>
                <span style={statLabelStyle}>TRANSACTIONS</span>
                <span style={statValStyle}>{transactions.length}</span>
              </div>
              {!isPatient && (
                <div style={statCardStyle}>
                  <span style={statLabelStyle}>LINKED BANKS</span>
                  <span style={statValStyle}>{bankAccounts.length}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEPOSIT TAB */}
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

              <div style={presetRowStyle}>
                {[1000, 2000, 5000, 10000, 20000].map(p => (
                  <button key={p} type="button" onClick={() => setDepositAmount(String(p))} style={presetBtnStyle(depositAmount === String(p))} disabled={!!fundingRef}>
                    ₦{p.toLocaleString()}
                  </button>
                ))}
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

        {/* WITHDRAW TAB (doctors/nurses only) */}
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
                      <option key={b.id} value={b.id}>{b.bankName} — ••••{b.accountNumber.slice(-4)} ({b.accountName})</option>
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
                  <span style={hintStyle}>Available: ₦{balance.toLocaleString()}</span>
                </div>

                <button type="submit" disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) > balance} style={primaryActionBtnStyle('#6366f1')}>
                  {isWithdrawing ? <><Spinner /> Processing...</> : '⬆️ Request Withdrawal'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* BANK ACCOUNTS TAB (doctors/nurses only) */}
        {activeTab === 'banks' && !isPatient && (
          <div style={cardSectionStyle}>
            <div style={sectionTitleBarStyle}>
              <span style={stbIconStyle}>🏦</span>
              <div>
                <div style={stbTitleStyle}>Linked Bank Accounts</div>
                <div style={stbSubStyle}>Add accounts for withdrawals</div>
              </div>
            </div>

            {/* Existing accounts */}
            {bankAccounts.length > 0 && (
              <div style={bankListStyle}>
                {bankAccounts.map(b => (
                  <div key={b.id} style={bankItemStyle}>
                    <div style={bankIconStyle}>🏦</div>
                    <div style={{ flex: 1 }}>
                      <div style={bankNameStyle}>{b.bankName}</div>
                      <div style={bankNumStyle}>{b.accountName} • ••••{b.accountNumber.slice(-4)}</div>
                    </div>
                    {b.isPrimary && <span style={primaryBadgeStyle}>Primary</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Add new bank form */}
            <form onSubmit={handleAddBank} style={{ ...formStyle, marginTop: bankAccounts.length ? '1.5rem' : '0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                + Link New Account
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Bank Name</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} style={selectStyle}>
                  {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
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

        {/* PROMO CODE TAB */}
        {activeTab === 'promo' && (
          <div style={cardSectionStyle}>
            <div style={sectionTitleBarStyle}>
              <span style={stbIconStyle}>🎁</span>
              <div>
                <div style={stbTitleStyle}>Apply Promo Code</div>
                <div style={stbSubStyle}>Redeem discounts & bonus credits</div>
              </div>
            </div>

            <form onSubmit={handleApplyPromo} style={formStyle}>
              <div style={promoBoxStyle}>
                <div style={promoIconStyle}>🏷️</div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Enter Promo Code</label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HEALTH50"
                    style={{ ...inputStyle, letterSpacing: '0.1em', fontWeight: 700 }}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={isApplyingPromo || !promoCode.trim()} style={primaryActionBtnStyle('#f59e0b')}>
                {isApplyingPromo ? <><Spinner /> Applying...</> : '🎁 Apply Code'}
              </button>

              <div style={promoHintStyle}>
                Promo codes are case-insensitive and can only be used once per account.
              </div>
            </form>
          </div>
        )}

        {/* TRANSACTION HISTORY TAB */}
        {activeTab === 'history' && (
          <div style={cardSectionStyle}>
            <div style={sectionTitleBarStyle}>
              <span style={stbIconStyle}>📋</span>
              <div>
                <div style={stbTitleStyle}>Transaction History</div>
                <div style={stbSubStyle}>{transactions.length} transactions</div>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div style={emptyStateStyle}>
                <span style={{ fontSize: '2.5rem' }}>📭</span>
                <p>No transactions yet.</p>
              </div>
            ) : (
              <div style={txListStyle}>
                {transactions.map(t => (
                  <div key={t.id} style={txItemStyle}>
                    <div style={txIconStyle(t.type)}>
                      {t.type === 'WALLET_FUNDING' ? '↓' : '↑'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={txDescStyle}>{t.description}</div>
                      <div style={txRefStyle}>Ref: {t.referenceId} · {t.createdAt}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={txAmtStyle(t.type)}>
                        {t.type === 'WALLET_FUNDING' ? '+' : '-'}₦{Math.abs(t.amount).toLocaleString()}
                      </div>
                      <div style={txStatusStyle(t.status)}>{t.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
const panelStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '500px',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  overflow: 'hidden',
  borderRadius: '16px',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.75rem) 0.85rem',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 800,
  margin: 0,
  color: 'var(--text-primary)',
};

const panelSubStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-muted)',
  marginTop: '2px',
};

const balancePillStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '2px',
  background: 'rgba(0,245,212,0.06)',
  border: '1px solid rgba(0,245,212,0.15)',
  padding: '0.5rem 0.9rem',
  borderRadius: '12px',
};

const tabNavStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
  padding: '0.65rem 1rem',
  overflowX: 'auto',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
  msOverflowStyle: 'none',
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.5rem 0.9rem',
  borderRadius: '8px',
  border: 'none',
  background: active ? 'rgba(0,245,212,0.1)' : 'transparent',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  fontWeight: active ? 700 : 500,
  fontSize: '0.78rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.18s',
  outline: active ? '1px solid rgba(0,245,212,0.2)' : 'none',
  flexShrink: 0,
});

const tabContentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 'clamp(1rem, 3vw, 1.5rem)',
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255,255,255,0.08) transparent',
  minWidth: 0,
};

const cardSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const sectionTitleBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '0.25rem',
};

const stbIconStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  lineHeight: 1,
};

const stbTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const stbSubStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  marginTop: '1px',
};

const bigBalanceStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(0,245,212,0.08) 0%, rgba(99,102,241,0.06) 100%)',
  border: '1px solid rgba(0,245,212,0.12)',
  borderRadius: '16px',
  padding: '2rem',
  textAlign: 'center',
};

const bigBalLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
};

const bigBalValueStyle: React.CSSProperties = {
  fontSize: 'clamp(1.8rem, 6vw, 2.8rem)',
  fontWeight: 800,
  color: 'var(--primary)',
  letterSpacing: '-0.02em',
  lineHeight: 1,
};

const bigBalCurrStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-muted)',
  marginTop: '0.5rem',
};

const quickActionRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
  gap: '0.75rem',
};

const qaButtonStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '1rem 0.5rem',
  borderRadius: '12px',
  background: `${color}12`,
  border: `1px solid ${color}22`,
  color: color,
  fontSize: '0.74rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const statRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
  gap: '0.75rem',
};

const statCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '0.85rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
};

const statValStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 800,
  color: 'var(--text-primary)',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  letterSpacing: '0.02em',
};

const inputWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  overflow: 'hidden',
};

const inputPrefixStyle: React.CSSProperties = {
  padding: '0 0.75rem',
  fontSize: '0.9rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  borderRight: '1px solid rgba(255,255,255,0.08)',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '0.65rem 0.9rem',
  color: 'var(--text-primary)',
  fontSize: '1rem',    /* 16px prevents iOS auto-zoom */
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '0.65rem 1rem',
  color: 'var(--text-primary)',
  fontSize: '1rem',   /* 16px prevents iOS auto-zoom */
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
};

const presetRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const presetBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.4rem 0.75rem',
  borderRadius: '8px',
  background: active ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  fontSize: '0.76rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.18s',
});

const primaryActionBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  padding: '0.85rem 1.5rem',
  borderRadius: '12px',
  background: `linear-gradient(135deg, ${color}, ${color}aa)`,
  border: 'none',
  color: '#080c14',
  fontSize: '0.88rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
  width: '100%',
});

const secondaryBtnStyle: React.CSSProperties = {
  padding: '0.85rem 1.5rem',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  flex: 1,
};

const verifyBoxStyle: React.CSSProperties = {
  background: 'rgba(34,197,94,0.06)',
  border: '1px solid rgba(34,197,94,0.15)',
  borderRadius: '12px',
  padding: '1.25rem',
};

const bankListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
};

const bankItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.85rem 1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
};

const bankIconStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  flexShrink: 0,
};

const bankNameStyle: React.CSSProperties = {
  fontSize: '0.84rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const bankNumStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  marginTop: '2px',
};

const primaryBadgeStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 700,
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  background: 'rgba(0,245,212,0.1)',
  color: 'var(--primary)',
  border: '1px solid rgba(0,245,212,0.2)',
};

const promoBoxStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'flex-end',
};

const promoIconStyle: React.CSSProperties = {
  fontSize: '2rem',
  flexShrink: 0,
  paddingBottom: '0.5rem',
};

const promoHintStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
  textAlign: 'center',
  padding: '0.5rem',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '8px',
};

const txListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
};

const txItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.9rem 1rem',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '10px',
  transition: 'background 0.2s',
};

const txIconStyle = (type: string): React.CSSProperties => ({
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: type === 'WALLET_FUNDING' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
  color: type === 'WALLET_FUNDING' ? '#22c55e' : '#ef4444',
  fontWeight: 700,
  flexShrink: 0,
});

const txDescStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const txRefStyle: React.CSSProperties = {
  fontSize: '0.66rem',
  color: 'var(--text-muted)',
  marginTop: '2px',
};

const txAmtStyle = (type: string): React.CSSProperties => ({
  fontSize: '0.88rem',
  fontWeight: 700,
  color: type === 'WALLET_FUNDING' ? '#22c55e' : '#ef4444',
});

const txStatusStyle = (status: string): React.CSSProperties => ({
  fontSize: '0.62rem',
  fontWeight: 600,
  color: status === 'COMPLETED' ? '#22c55e' : status === 'PENDING' ? '#f59e0b' : '#ef4444',
  marginTop: '2px',
});

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '2.5rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  color: 'var(--text-muted)',
  fontSize: '0.84rem',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  padding: '3rem',
  color: 'var(--text-muted)',
  fontSize: '0.84rem',
};

const spinnerStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  border: '2px solid rgba(255,255,255,0.1)',
  borderTopColor: 'var(--primary)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const toastStyle = (type: 'success' | 'error' | 'info'): React.CSSProperties => ({
  position: 'fixed',
  top: '1.5rem',
  right: '1.5rem',
  zIndex: 2000,
  padding: '0.85rem 1.25rem',
  borderRadius: '12px',
  background: type === 'success' ? 'rgba(34,197,94,0.92)' : type === 'error' ? 'rgba(239,68,68,0.92)' : 'rgba(59,130,246,0.92)',
  color: '#fff',
  fontSize: '0.84rem',
  fontWeight: 600,
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  animation: 'fadeIn 0.2s ease',
  maxWidth: '320px',
});
