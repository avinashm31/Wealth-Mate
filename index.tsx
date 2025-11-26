import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { read, utils } from "xlsx";
import {
  Plus, Upload, Trash2, Edit2, Mail, Check, X, ArrowLeft,
  PieChart, TrendingUp, Activity, Lock, RotateCcw
} from "lucide-react";

/* ============================
   Ultra Premium WealthMate App
   Single-file, fully-functional
   ============================ */

/* -------------------
   Types
   ------------------- */
type Txn = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: "expense" | "income";
};

type User = {
  id: string;
  name: string;
  email: string;
  targetSavings: number;
  status: "ACTIVE" | "PENDING";
};

/* -------------------
   Local DB wrapper
   ------------------- */
const DB = {
  USERS: "wm_users_ultra_v1",
  TXNS: "wm_txns_ultra_v1",

  init() {
    if (!localStorage.getItem(this.USERS)) {
      const demo: User = { id: "usr_demo", name: "Avinash", email: "demo@wealthmate.com", targetSavings: 50000, status: "ACTIVE" };
      localStorage.setItem(this.USERS, JSON.stringify([demo]));
    }
    if (!localStorage.getItem(this.TXNS)) {
      localStorage.setItem(this.TXNS, JSON.stringify([]));
    }
  },

  getUsers(): User[] {
    return JSON.parse(localStorage.getItem(this.USERS) || "[]");
  },

  getTxns(): Txn[] {
    return JSON.parse(localStorage.getItem(this.TXNS) || "[]");
  },

  saveTxns(txns: Txn[]) {
    localStorage.setItem(this.TXNS, JSON.stringify(txns));
  },

  addTxn(t: Txn) {
    const arr = this.getTxns();
    arr.push(t);
    this.saveTxns(arr);
  },

  updateTxn(t: Txn) {
    const arr = this.getTxns();
    const i = arr.findIndex(x => x.id === t.id);
    if (i >= 0) { arr[i] = t; this.saveTxns(arr); }
  },

  deleteTxn(id: string) {
    const arr = this.getTxns().filter(x => x.id !== id);
    this.saveTxns(arr);
  },

  purgeUserTxns(userId: string) {
    const arr = this.getTxns().filter(x => x.user_id !== userId);
    this.saveTxns(arr);
  }
};

DB.init();

/* -------------------
   Helpers
   ------------------- */
const uid = (p = "") => p + Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().split("T")[0];
const formatINR = (n = 0) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/* -------------------
   Coin Rain Canvas - Ultra realistic-ish
   ------------------- */
const CoinRain: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    type Coin = {
      x: number; y: number; r: number; v: number; spin: number; ang: number; type: "gold" | "silver"; opacity: number;
    };

    const coins: Coin[] = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h - h,
      r: Math.random() * 8 + 6,
      v: Math.random() * 4 + 2,
      spin: (Math.random() - 0.5) * 0.06,
      ang: Math.random() * Math.PI * 2,
      type: Math.random() > 0.3 ? "gold" : "silver",
      opacity: Math.random() * 0.6 + 0.2
    }));

    const mouse = { x: -9999, y: -9999 };

    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const c of coins) {
        // physics interaction with mouse
        const dx = c.x - mouse.x, dy = c.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 170) {
          const push = (170 - dist) / 170 * 6;
          c.x += (dx / (dist + 0.001)) * push;
          c.y += (dy / (dist + 0.001)) * push;
        }

        c.y += c.v;
        c.ang += c.spin;
        if (c.y > h + 40) { c.y = -40; c.x = Math.random() * w; }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.ang);
        const grad = ctx.createLinearGradient(-c.r, -c.r, c.r, c.r);
        if (c.type === "gold") {
          grad.addColorStop(0, "#fff6df"); grad.addColorStop(0.5, "#d4af37"); grad.addColorStop(1, "#6b5412");
        } else {
          grad.addColorStop(0, "#fff"); grad.addColorStop(0.5, "#cfcfcf"); grad.addColorStop(1, "#6b6b6b");
        }
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = c.opacity;
        ctx.fill();
        // embossed rim
        ctx.lineWidth = Math.max(1, c.r * 0.15);
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.stroke();
        ctx.restore();
      }
      requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
};

/* -------------------
   AI call util -> /api/generate
   ------------------- */
async function callAI(prompt: string) {
  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    if (!r.ok) {
      const txt = await r.text();
      console.warn("AI failed", r.status, txt);
      return { provider: "simulated", advice: ["AI call failed — simulated fallback used"], raw: txt };
    }
    const j = await r.json();
    return j;
  } catch (e) {
    console.error("AI call error", e);
    return { provider: "simulated", advice: ["Network or provider error — simulated fallback used"] };
  }
}

/* -------------------
   Small in-app donut chart (SVG)
   ------------------- */
const Donut = ({ data }: { data: { label: string, value: number, color?: string }[] }) => {
  const total = data.reduce((s, x) => s + x.value, 0);
  const size = 160;
  const radius = size / 2;
  let angle = -Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(0deg)" }}>
      {data.map((d, i) => {
        const slice = d.value / (total || 1);
        const theta = slice * Math.PI * 2;
        const x1 = radius + (radius - 20) * Math.cos(angle);
        const y1 = radius + (radius - 20) * Math.sin(angle);
        angle += theta;
        const x2 = radius + (radius - 20) * Math.cos(angle);
        const y2 = radius + (radius - 20) * Math.sin(angle);
        const large = theta > Math.PI ? 1 : 0;
        const path = `M ${radius} ${radius} L ${x1} ${y1} A ${radius - 20} ${radius - 20} 0 ${large} 1 ${x2} ${y2} Z`;
        return <path key={i} d={path} fill={d.color || ["#D4AF37", "#E5E4E2", "#8A7120", "#708090"][i % 4]} stroke="#0b0b0b" strokeWidth={2} />;
      })}
      <circle cx={radius} cy={radius} r={radius - 40} fill="#070707" />
      <text x="50%" y="50%" fill="#aaa" fontSize="10" textAnchor="middle" dominantBaseline="middle">TOTAL</text>
    </svg>
  );
};

/* -------------------
   Main App
   ------------------- */
const App: React.FC = () => {
  const users = DB.getUsers();
  const user = users[0];
  const [txns, setTxns] = useState<Txn[]>(() => DB.getTxns().filter(t => t.user_id === user.id));
  const [manualOpen, setManualOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("Uncategorized");
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState("Idle");
  const [aiOutput, setAiOutput] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setTxns(DB.getTxns().filter(t => t.user_id === user.id));
  }, [user.id]);

  const totals = useMemo(() => {
    const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [txns]);

  /* file upload excel */
  const fileRef = useRef<HTMLInputElement | null>(null);

  const parseFile = async (file: File | null) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const wb = read(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw: any[][] = utils.sheet_to_json(sheet, { header: 1 });

    // find best header row
    let headerIdx = -1;
    let bestScore = -1;
    const keywords = ["date", "description", "narration", "particulars", "amount", "debit", "credit"];
    for (let i = 0; i < Math.min(12, raw.length); i++) {
      const line = (raw[i] || []).join(" ").toLowerCase();
      let score = 0;
      for (const k of keywords) if (line.includes(k)) score++;
      if (score > bestScore) { bestScore = score; headerIdx = i; }
    }
    if (headerIdx === -1) headerIdx = 0;
    const header = (raw[headerIdx] || []).map((x: any) => String(x || "").toLowerCase());

    const dateIdx = header.findIndex((h: string) => /date/i.test(h));
    const descIdx = header.findIndex((h: string) => /description|narration|particulars|remark|merchant/i.test(h));
    const debitIdx = header.findIndex((h: string) => /debit|withdrawal|dr/i.test(h));
    const creditIdx = header.findIndex((h: string) => /credit|deposit|cr/i.test(h));
    const amountIdx = header.findIndex((h: string) => /amount|txn amount|value/i.test(h));

    const parsed: Txn[] = [];
    const uniqueDescriptions = new Set<string>();

    for (let i = headerIdx + 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || row.length === 0) continue;
      const descVal = String(row[descIdx] || row[1] || row[0] || "Unknown").trim();
      const parseNum = (v: any) => {
        if (typeof v === "number") return v;
        if (!v) return 0;
        return parseFloat(String(v).replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;
      };
      let amt = 0; let tt: "expense" | "income" = "expense";
      if (debitIdx >= 0 && row[debitIdx]) { amt = Math.abs(parseNum(row[debitIdx])); tt = "expense"; }
      else if (creditIdx >= 0 && row[creditIdx]) { amt = Math.abs(parseNum(row[creditIdx])); tt = "income"; }
      else if (amountIdx >= 0 && row[amountIdx] !== undefined) {
        const v = parseNum(row[amountIdx]);
        amt = Math.abs(v); tt = v < 0 ? "expense" : "income";
      } else continue;

      let dateVal = todayISO();
      const rawDate = row[dateIdx];
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) dateVal = d.toISOString().split("T")[0];
      }

      const t: Txn = { id: uid("txn_"), user_id: user.id, description: descVal, amount: amt, category: "Uncategorized", date: dateVal, type: tt };
      parsed.push(t);
      if (tt === "expense") uniqueDescriptions.add(descVal);
    }

    // commit parsed
    parsed.forEach(p => DB.addTxn(p));
    setTxns(DB.getTxns().filter(x => x.user_id === user.id));

    // attempt AI categorization on unique descriptors
    if (uniqueDescriptions.size > 0) {
      setAiStatus("Categorizing...");
      const sample = Array.from(uniqueDescriptions).slice(0, 60);
      const prompt = `Categorize these expense descriptors into: Food, Transport, Utilities, Shopping, Entertainment, Health, Transfer, Housing, Salary, Investment, Other. Return strict JSON mapping. Example: {"Uber":"Transport"}.\nDescriptors: ${JSON.stringify(sample)}`;

      const ai = await callAI(prompt);
      if (ai && ai.provider !== "simulated" && ai.raw) {
        // attempt to parse ai.raw.text or ai.raw.output
        const rawText = (ai.raw?.text) || (typeof ai.raw === "string" ? ai.raw : JSON.stringify(ai.raw));
        try {
          const mapping = JSON.parse(rawText);
          if (mapping && typeof mapping === "object") {
            // apply categories
            const all = DB.getTxns().map(t => {
              if (mapping[t.description]) t.category = mapping[t.description];
              return t;
            });
            DB.saveTxns(all);
            setTxns(all.filter(t => t.user_id === user.id));
            setAiStatus("Categorized (AI)");
            setAiOutput(JSON.stringify(mapping, null, 2));
            return;
          }
        } catch { /* fall through to heuristics */ }
      }

      // fallback heuristics
      const rules: [RegExp, string][] = [
        [/swiggy|zomato|dominos|pizza|restaurant|cafe|coffee|bar/i, "Food"],
        [/uber|ola|taxi|cab|auto|fuel|petrol|diesel/i, "Transport"],
        [/rent|landlord|lease|apartment/i, "Housing"],
        [/electric|water|gas|bill|bills|tneb|bescom|bses/i, "Utilities"],
        [/clinic|hospital|pharmacy|doctor|medicines/i, "Health"],
        [/netflix|prime|spotify|hotstar|subscription/i, "Entertainment"],
        [/mutual fund|sip|investment|stock|dividend|fd|rd/i, "Investment"]
      ];
      const all = DB.getTxns().map(t => {
        for (const [re, cat] of rules) if (re.test(t.description)) { t.category = cat; break; }
        return t;
      });
      DB.saveTxns(all);
      setTxns(all.filter(t => t.user_id === user.id));
      setAiStatus("Categorized (heuristics)");
      setAiOutput("Used heuristic rules (AI was not available or response not parseable).");
    }
  };

  /* manual actions */
  const openManual = () => { setManualOpen(true); setEditing(null); setDesc(""); setAmount(""); setType("expense"); setCategory("Uncategorized"); setDate(todayISO()); };
  const addManual = () => {
    if (!desc || !amount) return;
    const t: Txn = { id: uid("txn_"), user_id: user.id, description: desc, amount: Number(amount), category, date, type };
    DB.addTxn(t);
    setTxns(DB.getTxns().filter(x => x.user_id === user.id));
    setManualOpen(false); setDesc(""); setAmount("");
  };
  const startEdit = (t: Txn) => {
    setEditing(t.id); setManualOpen(true); setDesc(t.description); setAmount(t.amount); setType(t.type); setCategory(t.category); setDate(t.date);
  };
  const saveEdit = () => {
    if (!editing) return;
    const t: Txn = { id: editing, user_id: user.id, description: desc, amount: Number(amount), category, date, type };
    DB.updateTxn(t);
    setTxns(DB.getTxns().filter(x => x.user_id === user.id));
    setEditing(null); setManualOpen(false);
  };
  const remove = (id: string) => { DB.deleteTxn(id); setTxns(DB.getTxns().filter(x => x.user_id === user.id)); };

  const purgeAll = () => { DB.purgeUserTxns(user.id); setTxns([]); setShowConfirm(false); };

  /* advisor */
  const requestAdvice = async () => {
    setAiStatus("Generating advisor...");
    const catSummary: Record<string, number> = {};
    DB.getTxns().filter(t => t.user_id === user.id && t.type === "expense").forEach(t => catSummary[t.category] = (catSummary[t.category] || 0) + t.amount);
    const summary = Object.entries(catSummary).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v]) => `${k}: ₹${Math.round(v)}`).join(", ");
    const prompt = `Act as a terse institutional wealth advisor. Client target: ₹${user.targetSavings}. Current net: ₹${Math.round(totals.net)}. Spending: ${summary}. Give 3 concise bullet actions to save next month. Use '•' bullets only. Keep under 50 words.`;
    const ai = await callAI(prompt);
    if (ai.provider === "simulated") {
      setAiStatus("Advisor (simulated)");
      setAiOutput((ai.advice || ai.advice?.join?.("\n")) || "• Cut Food delivery by 20%\n• Pause one subscription\n• Move ₹500/week to savings");
    } else {
      // try to extract raw text
      const text = ai.raw?.text || JSON.stringify(ai.raw).slice(0,400);
      setAiStatus("Advisor (AI)");
      setAiOutput(text);
    }
  };

  /* export CSV */
  const exportCSV = () => {
    const rows = [["id","date","description","category","type","amount"], ...txns.map(t => [t.id, t.date, t.description, t.category, t.type, t.amount])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `transactions_${user.id}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  /* small chart data */
  const donutData = useMemo(() => {
    const agg: Record<string, number> = {};
    txns.filter(t => t.type === "expense").forEach(t => agg[t.category] = (agg[t.category] || 0) + t.amount);
    return Object.entries(agg).slice(0,6).map(([label, value], i) => ({ label, value, color: ["#D4AF37","#E5E4E2","#8A7120","#708090","#C0C0C0","#4A4A4A"][i%6] }));
  }, [txns]);

  return (
    <div style={{ minHeight: "100vh", position: "relative", paddingBottom: 80 }}>
      <CoinRain />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1400, margin: "36px auto", padding: "20px" }}>
        {/* NAV */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg,#222,#111)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 26px rgba(0,0,0,0.6)" }}>
              <div style={{ color: "#fff", fontWeight: 800, fontFamily: "Playfair Display" }}>WM</div>
            </div>
            <div>
              <div style={{ fontFamily: "Playfair Display", fontSize: 20, fontWeight: 700 }}>WealthMate</div>
              <div style={{ color: "#9aa0a6", fontSize: 12 }}>Institutional-grade personal finance</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { exportCSV(); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 10 }}>Export CSV</button>
            <button onClick={() => { setManualOpen(!manualOpen); setEditing(null); }} style={{ background: "linear-gradient(90deg,#fff,#F0E8B5)", color: "#000", padding: "8px 14px", borderRadius: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Plus size={14}/> Add</button>
          </div>
        </nav>

        {/* HERO / STATS */}
        <header style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }}>
          <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)", padding: 22, borderRadius: 16, border: "1px solid rgba(212,175,55,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, color: "#999", letterSpacing: 1.5, textTransform: "uppercase" }}>Dashboard</div>
                <h2 style={{ margin: "8px 0 0", fontFamily: "Playfair Display", fontSize: 34 }}>Your financial snapshot</h2>
                <div style={{ color: "#9aa0a6", marginTop: 8 }}>Welcome back, {user.name}. Last synced: {new Date().toLocaleTimeString()}.</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#9aa0a6", fontSize: 12 }}>Goal Progress</div>
                  <div style={{ fontFamily: "Playfair Display", fontSize: 20, color: "#D4AF37", fontWeight: 700 }}>{Math.max(0, Math.round((totals.net / user.targetSavings) * 100)) || 0}%</div>
                </div>
              </div>
            </div>

            {/* cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 18 }}>
              <div style={{ padding: 18, borderRadius: 12, background: "linear-gradient(180deg,#090909,#070707)", border: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ color: "#999", fontSize: 12 }}>Total Income</div>
                <div style={{ fontFamily: "Playfair Display", fontSize: 22, marginTop: 8 }}>{formatINR(totals.income)}</div>
              </div>
              <div style={{ padding: 18, borderRadius: 12, background: "linear-gradient(180deg,#090909,#070707)", border: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ color: "#999", fontSize: 12 }}>Total Spend</div>
                <div style={{ fontFamily: "Playfair Display", fontSize: 22, marginTop: 8 }}>{formatINR(totals.expense)}</div>
              </div>
              <div style={{ padding: 18, borderRadius: 12, background: "linear-gradient(180deg,#090909,#070707)", border: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ color: "#999", fontSize: 12 }}>Net Liquidity</div>
                <div style={{ fontFamily: "Playfair Display", fontSize: 22, marginTop: 8, color: totals.net < 0 ? "#ff6b6b" : "#9be26b" }}>{formatINR(totals.net)}</div>
              </div>
            </div>

            {/* charts */}
            <div style={{ display: "flex", gap: 16, marginTop: 18, alignItems: "stretch" }}>
              <div style={{ flex: 1, padding: 18, borderRadius: 12, background: "#070707", border: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#999", fontSize: 12 }}>Spending Allocation</div>
                  <div style={{ color: "#aaa", fontSize: 12 }}>{donutData.reduce((s, d)=> s + d.value, 0) ? `${donutData.reduce((s,d)=>s+d.value,0)}` : "—"}</div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
                  <Donut data={donutData} />
                  <div style={{ flex: 1 }}>
                    {donutData.map((d,i)=>(
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ width: 10, height: 10, background: d.color, borderRadius: 4 }} />
                          <div style={{ color: "#ddd" }}>{d.label}</div>
                        </div>
                        <div style={{ color: "#999" }}>₹{Math.round(d.value)}</div>
                      </div>
                    ))}
                    {donutData.length === 0 && <div style={{ color: "#777", marginTop: 12 }}>No expense data yet</div>}
                  </div>
                </div>
              </div>

              <div style={{ width: 340, padding: 18, borderRadius: 12, background: "#070707", border: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#999", fontSize: 12 }}>Advisor</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>{aiStatus}</div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button onClick={requestAdvice} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "linear-gradient(90deg,#fff,#F0E8B5)", border: "none", fontWeight: 700, color:"#000" }}>Get Quick Advice</button>
                </div>
                <pre style={{ marginTop: 12, color: "#ddd", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13, minHeight: 120 }}>{aiOutput || "No advisory yet. Click 'Get Quick Advice'."}</pre>
              </div>
            </div>
          </div>

          <div style={{ padding: 18, borderRadius: 16, background: "linear-gradient(180deg,#070707,#050505)", border: "1px solid rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#999", fontSize: 12 }}>Wealth Target</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>Managed • Private</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: "Playfair Display", fontSize: 26 }}>{formatINR(user.targetSavings)}</div>
              <div style={{ marginTop: 10, height: 10, background: "#0a0a0a", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, Math.max(0, (totals.net / user.targetSavings) * 100))}%`, height: "100%", background: "linear-gradient(90deg,#D4AF37,#F3E5AB)" }} />
              </div>
              <div style={{ color: "#999", marginTop: 8 }}>{Math.round((totals.net / user.targetSavings) * 100) || 0}% of target</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => { setManualOpen(true); }} style={{ padding: "8px 10px", borderRadius: 8, background: "#111", border: "1px solid #222" }}>Add Transaction</button>
                <button onClick={() => exportCSV()} style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.04)" }}>Export CSV</button>
              </div>
            </div>
          </div>
        </header>

        {/* activity + list */}
        <main style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Activity Log</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {showConfirm ? (
                <>
                  <button onClick={purgeAll} style={{ background: "#ff6b6b", color: "#000", padding: "8px 12px", borderRadius: 8 }}>Confirm</button>
                  <button onClick={() => setShowConfirm(false)} style={{ background: "#333", padding: "8px 12px", borderRadius: 8 }}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setShowConfirm(true)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 8 }}>Purge History</button>
              )}
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.02)" }}>
            {txns.length === 0 ? (
              <div style={{ padding: 24, color: "#9aa0a6" }}>No transactions — upload Excel or add one.</div>
            ) : (
              txns.slice().sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).map(t=>(
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottom: "1px solid rgba(255,255,255,0.02)", background: t.type === "expense" ? "linear-gradient(90deg,#060606,#040404)" : "transparent" }}>
                  <div style={{ maxWidth: "60%" }}>
                    <div style={{ fontWeight: 700 }}>{t.description}</div>
                    <div style={{ color: "#9aa0a6", fontSize: 13 }}>{t.date} • {t.category}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ minWidth: 120, textAlign: "right", fontWeight: 800, color: t.type==="expense" ? "#fff" : "#9be26b" }}>{t.type==="expense"? "-":"+"} {formatINR(t.amount)}</div>
                    <button onClick={() => startEdit(t)} style={{ background: "transparent", border: "none", color: "#aaa" }}><Edit2 size={16} /></button>
                    <button onClick={() => remove(t.id)} style={{ background: "transparent", border: "none", color: "#ff6b6b" }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        {/* manual modal panel (simple inline) */}
        {manualOpen && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "linear-gradient(180deg,#070707,#050505)", border: "1px solid rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} style={{ flex:1, padding: 12, borderRadius: 10, background: "#0b0b0b", border: "1px solid #222", color: "#fff" }} />
              <input placeholder="Amount" type="number" value={amount as any} onChange={e=>setAmount(e.target.value)} style={{ width: 140, padding: 12, borderRadius: 10, background: "#0b0b0b", border: "1px solid #222", color: "#fff" }} />
              <select value={type} onChange={e=>setType(e.target.value as any)} style={{ padding: 12, borderRadius: 10, background: "#0b0b0b", border: "1px solid #222", color: "#fff" }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ padding: 12, borderRadius: 10, background: "#0b0b0b", border: "1px solid #222", color: "#fff" }}/>
              {editing ? (
                <>
                  <button onClick={saveEdit} style={{ padding: "10px 14px", background: "#4caf50", borderRadius: 10, border: "none" }}>Save</button>
                  <button onClick={() => { setManualOpen(false); setEditing(null); }} style={{ padding: "10px 14px", background: "#333", borderRadius: 10, border: "none" }}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={addManual} style={{ padding: "10px 14px", background: "linear-gradient(90deg,#fff,#F0E8B5)", color: "#000", borderRadius: 10, border: "none", fontWeight: 800 }}>Add</button>
                  <button onClick={() => setManualOpen(false)} style={{ padding: "10px 14px", background: "#333", borderRadius: 10, border: "none" }}>Close</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* upload input hidden */}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => parseFile(e.target.files ? e.target.files[0] : null)} />
      </div>
    </div>
  );
};

/* render */
createRoot(document.getElementById("root")!).render(<App />);
