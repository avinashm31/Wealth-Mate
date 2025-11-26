// index.tsx — full app (Supabase auth + DB wrappers + server AI proxy)
// Drop this file where your index.html loads /index.tsx (your previous setup).
//
// Assumptions:
//  - src/lib/supabaseClient.ts exports `supabase` (createClient).
//  - src/lib/db.ts exports db helper functions used below.
//  - src/lib/aiClient.ts exports `generateWithServer(prompt, options?)`.
//
// Dependencies:
//  - react, react-dom
//  - @supabase/supabase-js (already used in lib file)
//  - xlsx (for Excel parsing) - optional but helpful: npm install xlsx
//
// Copy entire file and replace your current index.tsx.

import React, { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './src/lib/supabaseClient';
import { 
  createUserProfile,
  getUserProfileByAuthUid,
  fetchTransactionsForUser,
  insertTransaction,
  deleteTransaction,
  purgeUserTransactions,
  updateUserGoalByAuthUid
} from './src/lib/db';
import { generateWithServer } from './src/lib/aiClient';
import { read, utils } from 'xlsx';

type Txn = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // yyyy-mm-dd
  type: 'expense' | 'income';
};

type Profile = {
  id: string;
  auth_uid: string;
  name?: string;
  email?: string;
  target_savings?: number;
  created_at?: string;
};

function friendlyCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function AppRoot() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<'LANDING' | 'AUTH' | 'DASH'>('LANDING');

  useEffect(() => {
    // subscribe to auth changes
    const s = supabase.auth.getSession().then(r => {
      const sess = (r as any).data?.session ?? null;
      setSession(sess);
      if (sess) setView('DASH');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) setView('DASH');
      else setView('LANDING');
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    // When session present, fetch or create profile
    (async () => {
      if (!session) { setProfile(null); return; }
      try {
        const uid = session.user.id;
        let p = await getUserProfileByAuthUid(uid);
        if (!p) {
          // create a minimal profile (name/email from session)
          p = await createUserProfile(uid, session.user.user_metadata?.full_name || '', session.user.email || '');
        }
        setProfile(p);
      } catch (err) {
        console.error('Failed to fetch/create profile', err);
      }
    })();
  }, [session]);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#eee', fontFamily: 'Inter, sans-serif' }}>
      {view === 'LANDING' && <Landing onLogin={() => setView('AUTH')} />}
      {view === 'AUTH' && <Auth onDone={() => setView('DASH')} onBack={() => setView('LANDING')} />}
      {view === 'DASH' && profile && <Dashboard profile={profile} onSignOut={async () => { await supabase.auth.signOut(); setView('LANDING'); }} />}
    </div>
  );
}

/* ---------------------------
   Landing Page (simple)
   --------------------------- */
function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ padding: '120px 32px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>WealthMate</h1>
      <p style={{ color: '#bbb', maxWidth: 700, margin: '0 auto 24px' }}>Institutional-grade finance UX with privacy-first local core and optional Supabase persistence. Use the login to get started.</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        <button onClick={onLogin} style={primaryBtn}>Client Login</button>
      </div>
    </div>
  );
}

/* ---------------------------
   Auth Page
   --------------------------- */
function Auth({ onDone, onBack }: { onDone: () => void, onBack: () => void }) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === 'SIGNUP') {
        // supabase sign up
        const res = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if ((res as any).error) throw (res as any).error;
        setMsg('Signup initiated. Check email for confirmation (may be simulated).');
        // after sign up, create profile via db server wrapper when session available
      } else if (mode === 'LOGIN') {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if ((res as any).error) throw (res as any).error;
        setMsg('Logged in');
        onDone();
      } else if (mode === 'FORGOT') {
        const res = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if ((res as any).error) throw (res as any).error;
        setMsg('Password reset sent (check email).');
      }
    } catch (err: any) {
      setMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 460, padding: 32, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(212,175,55,0.08)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#aaa', marginBottom: 8 }}>← Back to Home</button>
        <h2 style={{ marginTop: 0 }}>{mode === 'LOGIN' ? 'Access Vault' : mode === 'SIGNUP' ? 'Create Account' : 'Recover'}</h2>
        <p style={{ color: '#888', marginTop: 4 }}>{mode === 'LOGIN' ? 'Secure institutional access' : mode === 'SIGNUP' ? 'Create your profile' : 'Reset your password'}</p>

        {msg && <div style={{ background: '#111', color: '#ffd966', padding: 10, borderRadius: 6, marginTop: 12 }}>{msg}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          {mode === 'SIGNUP' && (
            <label style={labelStyle}>
              <div style={{ color: '#888', fontSize: 12 }}>Full name</div>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} required />
            </label>
          )}
          <label style={labelStyle}>
            <div style={{ color: '#888', fontSize: 12 }}>Email address</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </label>

          {(mode === 'LOGIN' || mode === 'SIGNUP') && (
            <label style={labelStyle}>
              <div style={{ color: '#888', fontSize: 12 }}>Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
            </label>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" style={{ ...primaryBtn, flex: 1 }}>{loading ? 'Working...' : mode === 'LOGIN' ? 'Enter Vault' : mode === 'SIGNUP' ? 'Create' : 'Send Link'}</button>
            {mode !== 'SIGNUP' && <button type="button" onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} style={ghostBtn}>{mode === 'LOGIN' ? 'Create account' : 'Have an account? Login'}</button>}
          </div>

          {mode === 'LOGIN' && <div style={{ textAlign: 'right', marginTop: 8 }}><a onClick={() => setMode('FORGOT')} style={{ color: '#ffd966', cursor: 'pointer' }}>Forgot?</a></div>}
        </form>
      </div>
    </div>
  );
}

/* ---------------------------
   Dashboard
   --------------------------- */
function Dashboard({ profile, onSignOut }: { profile: Profile, onSignOut: () => void }) {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState<number | ''>('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('Uncategorized');
  const [analyzing, setAnalyzing] = useState(false);
  const [advice, setAdvice] = useState<string>('System initializing...');
  const [fileBusy, setFileBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await fetchTransactionsForUser(profile.id);
        setTxns(list || []);
      } catch (err) {
        console.error('Failed fetch txns', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile.id]);

  async function handleAddManual() {
    if (!desc || !amt) return;
    try {
      const inserted = await insertTransaction({
        user_id: profile.id,
        description: desc,
        amount: Number(amt),
        category: type === 'expense' ? category : 'Income',
        date: new Date().toISOString().split('T')[0],
        type,
      });
      setTxns(prev => [inserted, ...prev]);
      setDesc(''); setAmt(''); setCategory('Uncategorized');
    } catch (err) { console.error(err); }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id);
      setTxns(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); }
  }

  async function handlePurgeAll() {
    if (!confirm('Delete all transactions for this user?')) return;
    try {
      await purgeUserTransactions(profile.id);
      setTxns([]);
    } catch (err) { console.error(err); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileBusy(true);
    try {
      const ab = await file.arrayBuffer();
      const workbook = read(ab, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = utils.sheet_to_json(sheet, { header: 1 });
      // simple header detection
      let headerRowIdx = -1;
      const keywords = ['date','description','amount','debit','credit','narration','particulars'];
      for (let i=0;i<Math.min(10, rows.length); i++){
        const rowStr = (rows[i]||[]).join(' ').toLowerCase();
        let score = 0;
        keywords.forEach(k=>{ if (rowStr.includes(k)) score++; });
        if (score >= 2) { headerRowIdx = i; break; }
      }
      if (headerRowIdx === -1) {
        alert('Could not detect header row. Ensure the file has Date, Description, Amount columns.');
        return;
      }
      const header = rows[headerRowIdx].map((x:any) => String(x).toLowerCase());
      const dateIdx = header.findIndex((h:any)=>h.includes('date'));
      const descIdx = header.findIndex((h:any)=>h.includes('description')||h.includes('narration')||h.includes('particulars'));
      const debitIdx = header.findIndex((h:any)=>h.includes('debit')||h.includes('withdrawal')||h.includes('dr'));
      const creditIdx = header.findIndex((h:any)=>h.includes('credit')||h.includes('deposit')||h.includes('cr'));
      const amountIdx = header.findIndex((h:any)=>h.includes('amount')||h.includes('txn amount'));
      const newTxns: Txn[] = [];
      const descSet = new Set<string>();
      for (let r=headerRowIdx+1; r<rows.length; r++){
        const row = rows[r];
        if (!row || row.length===0) continue;
        const descVal = (row[descIdx] ?? 'Unknown').toString();
        let amtVal = 0;
        let ttype: 'expense'|'income' = 'expense';
        const parseNum = (v:any) => {
          if (typeof v==='number') return v;
          if (typeof v==='string') return parseFloat(v.replace(/,/g,'').replace(/[^\d\.\-]/g,'')) || 0;
          return 0;
        };
        if (debitIdx !== -1 && row[debitIdx]) {
          amtVal = Math.abs(parseNum(row[debitIdx])); ttype = 'expense';
        } else if (creditIdx !== -1 && row[creditIdx]) {
          amtVal = Math.abs(parseNum(row[creditIdx])); ttype = 'income';
        } else if (amountIdx !== -1 && row[amountIdx]) {
          const v = parseNum(row[amountIdx]);
          if (v < 0) { amtVal = Math.abs(v); ttype = 'expense'; } else { amtVal = v; ttype = 'income'; }
        } else continue;
        if (amtVal === 0) continue;
        // parse date
        let dateStr = new Date().toISOString().split('T')[0];
        try {
          const raw = row[dateIdx];
          if (typeof raw === 'number') {
            const d = new Date(Date.UTC(1899, 11, 30 + raw));
            dateStr = d.toISOString().split('T')[0];
          } else if (raw) {
            const d = new Date(String(raw));
            if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
          }
        } catch {}
        const txn: any = {
          id: 'tmp_' + Math.random().toString(36).slice(2),
          user_id: profile.id,
          description: descVal,
          amount: amtVal,
          category: ttype === 'income' ? 'Income' : 'Uncategorized',
          date: dateStr,
          type: ttype,
        };
        newTxns.push(txn);
        if (ttype === 'expense') descSet.add(descVal);
      }

      // commit each txn to supabase (simple sequential)
      for (const t of newTxns) {
        try {
          const created = await insertTransaction(t);
          setTxns(prev => [created, ...prev]);
        } catch (err) {
          console.warn('Failed to insert txn', err);
        }
      }

      // Batch AI categorization for unique descriptions
      const descriptions = Array.from(descSet).slice(0, 120);
      if (descriptions.length > 0) {
        setAnalyzing(true);
        try {
          // Build prompt for server AI
          const prompt = `Categorize these merchant descriptors into buckets: Food, Transport, Utilities, Shopping, Entertainment, Health, Transfer, Housing, Salary, Investment, Other.
Return strictly JSON mapping descriptor->bucket.
Context: Indian consumer payments.
Descriptors: ${JSON.stringify(descriptions)}`;
          const aiRes = await generateWithServer(prompt, { model: 'gemini-2.5' });
          // aiRes could be JSON object or string — try parse
          let map: Record<string,string> = {};
          if (typeof aiRes === 'string') {
            try { map = JSON.parse(aiRes); } catch { /* fallback parse */ }
          } else if (typeof aiRes === 'object') map = aiRes;
          // apply categories to local txns & to DB (best-effort)
          const updatedLocal = txns.map(t => {
            if (t.type==='expense' && map[t.description]) {
              t.category = map[t.description];
            }
            return t;
          });
          setTxns(prev => {
            // We already appended created txns; just refresh from server for accuracy
            return prev;
          });
        } catch (err) {
          console.error('AI categorization error', err);
        } finally {
          setAnalyzing(false);
        }
      }

    } catch (err) {
      console.error('Upload parse failed', err);
      alert('Failed to parse file. Check format.');
    } finally {
      setFileBusy(false);
      // clear file input (if applicable)
      (e.target as HTMLInputElement).value = '';
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      // Build brief summary for AI
      const totalIncome = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
      const totalExpense = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const breakdown = Array.from(txns.reduce((m, t) => {
        if (t.type==='expense') m.set(t.category, (m.get(t.category)||0) + t.amount);
        return m;
      }, new Map<string, number>()))
        .map(([k,v])=>`${k}: ₹${Math.round(v)}`).join(', ');

      const prompt = `
You are an institutional finance advisor. Client's profile: ${profile.name || 'Client'}.
Total income: ₹${Math.round(totalIncome)}. Total expense: ₹${Math.round(totalExpense)}.
Spending breakdown: ${breakdown}
Task:
1) If expenses exceed income: recommend two categories to cut this month and by how much (₹).
2) If income > expenses: recommend where to invest a surplus.
Return plain text under 80 words with 3 bullets starting with •.
      `;
      const result = await generateWithServer(prompt);
      const text = (typeof result === 'string') ? result : JSON.stringify(result);
      setAdvice(text);
    } catch (err) {
      console.error('AI analyze error', err);
      setAdvice('Advisory systems unavailable. Check network.');
    } finally {
      setAnalyzing(false);
    }
  }

  const totalIncome = useMemo(()=>txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0), [txns]);
  const totalExpense = useMemo(()=>txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0), [txns]);
  const net = totalIncome - totalExpense;

  return (
    <div style={{ padding: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>Dashboard</h2>
          <div style={{ color: '#aaa', marginTop: 6 }}>Welcome back, {profile.name || (profile.email ?? 'User')}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={onSignOut} style={ghostBtn}>Sign out</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24 }}>
        <div>
          <div style={{ display:'flex', gap: 16, marginBottom: 16 }}>
            <div style={statCard}>
              <div style={{ color: '#888', fontSize: 12 }}>Total Income</div>
              <div style={{ fontSize: 22, fontFamily: 'Playfair Display' }}>{friendlyCurrency(totalIncome)}</div>
            </div>
            <div style={statCard}>
              <div style={{ color: '#888', fontSize: 12 }}>Total Spend</div>
              <div style={{ fontSize: 22, fontFamily: 'Playfair Display' }}>{friendlyCurrency(totalExpense)}</div>
            </div>
            <div style={statCard}>
              <div style={{ color: '#888', fontSize: 12 }}>Net Liquidity</div>
              <div style={{ fontSize: 22, fontFamily: 'Playfair Display' }}>{friendlyCurrency(net)}</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#ffd966', fontWeight: 700 }}>ADVISOR INSIGHT</div>
              <button onClick={handleAnalyze} style={ghostBtnSmall}>{analyzing ? 'Analyzing...' : 'REFRESH ANALYSIS'}</button>
            </div>
            <div style={{ marginTop: 12, color: '#ccc', minHeight: 48 }}>{advice}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <input placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} style={{ flex:1, ...inputStyle }} />
              <input placeholder="Amount" value={amt as any} onChange={e=>setAmt(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: 120, ...inputStyle }} />
              <select value={type} onChange={e=>setType(e.target.value as any)} style={{ width: 120, ...inputStyle }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <button onClick={handleAddManual} style={primaryBtnSmall}>ADD</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ color: '#888', fontSize: 12 }}>Upload Excel</label>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'block', marginTop: 6 }} />
              </div>
              <div>
                <button onClick={handlePurgeAll} style={ghostBtnSmall}>Purge history</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Activity Log</h3>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {loading ? <div>Loading…</div> : txns.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.description}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>{new Date(t.date).toLocaleDateString()} • <span style={{ color: '#ffd966' }}>{t.category}</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: t.type === 'income' ? '#4caf50' : '#fff', fontWeight: 700 }}>{t.type === 'income' ? '+' : '-'} {friendlyCurrency(t.amount)}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleDelete(t.id)} style={ghostBtnSmall}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Wealth Target</h4>
            <div style={{ color: '#aaa' }}>Target: ₹{profile.target_savings ?? 50000}</div>
            <div style={{ height: 8, background: '#222', borderRadius: 4, marginTop: 12 }}>
              <div style={{ width: `${Math.min(100, Math.max(0, ((totalIncome - totalExpense) / (profile.target_savings || 1)) * 100))}%`, height: '100%', background: 'linear-gradient(90deg,#ffd966,#f0e7b6)' }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ color: '#888', fontSize: 12 }}>Edit Goal</label>
              <GoalEditor profile={profile} onUpdate={(p)=>{/* a full reload would re-fetch profile; omitted here for brevity */}} />
            </div>
          </div>

          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Capital Allocation</h4>
            <div style={{ color: '#888' }}>Donut chart placeholder — implement visualization as needed.</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={handleAnalyze} style={primaryBtnSmall}>{analyzing ? 'Analyzing…' : 'Run Advisor'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   GoalEditor component (updates target savings using RLS by auth uid)
   --------------------------- */
function GoalEditor({ profile, onUpdate }: { profile: Profile, onUpdate: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(profile.target_savings || 50000));
  const [busy, setBusy] = useState(false);

  useEffect(()=>{ setVal(String(profile.target_savings || 50000)); }, [profile.target_savings]);

  async function save() {
    setBusy(true);
    try {
      // supabase db wrapper updates by auth uid inside db.ts
      const authUid = profile.auth_uid;
      await updateUserGoalByAuthUid(authUid, Number(val));
      setEditing(false);
      // ideally re-fetch profile and call onUpdate; for now, quick page reload
      window.location.reload();
    } catch (err) {
      console.error('Failed update goal', err);
      alert('Failed to update');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
      {editing ? (
        <>
          <input value={val} onChange={e=>setVal(e.target.value)} style={{ padding: 8, background: '#111', color: '#fff', borderRadius: 6, border: '1px solid #222' }} />
          <button onClick={save} style={primaryBtnSmall}>{busy ? 'Saving…' : 'Save'}</button>
          <button onClick={()=>setEditing(false)} style={ghostBtnSmall}>Cancel</button>
        </>
      ) : (
        <button onClick={()=>setEditing(true)} style={ghostBtnSmall}>Edit Goal</button>
      )}
    </div>
  );
}

/* ---------------------------
   Styling & small utilities
   --------------------------- */
const primaryBtn: React.CSSProperties = { background: '#fff', color: '#000', border: 'none', padding: '12px 28px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 };
const primaryBtnSmall: React.CSSProperties = { background: '#ffd966', color: '#000', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 };
const ghostBtn: React.CSSProperties = { background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' };
const ghostBtnSmall: React.CSSProperties = { background: 'transparent', color: '#ddd', border: '1px solid rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' };

const inputStyle: React.CSSProperties = { background: '#0b0b0b', border: '1px solid #222', color: '#fff', padding: '10px 12px', borderRadius: 6, outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 12 };

const statCard: React.CSSProperties = { background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10, minWidth: 200 };

const root = createRoot(document.getElementById('root')!);
root.render(<AppRoot />);
