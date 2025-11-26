
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { read, utils } from "xlsx";
import { 
  Shield, 
  PieChart, 
  TrendingUp, 
  Upload, 
  Plus, 
  LogOut,
  Sparkles,
  Target,
  Activity,
  Globe,
  Clock,
  RotateCcw,
  ArrowLeft,
  Lock,
  Server,
  ScanLine,
  Cpu,
  Fingerprint,
  Edit2,
  Check,
  Trash2,
  CreditCard,
  Wifi,
  X,
  Save,
  Filter,
  BarChart3,
  Mail,
  Key,
  User,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Database,
  Link as LinkIcon,
  Menu
} from 'lucide-react';

// --- Configuration & Constants ---
const COIN_COUNT = 90; 
const GOLD_COLOR = '#D4AF37';
const GOLD_HIGHLIGHT = '#F3E5AB';
const DARK_GOLD = '#8A7120';
const OBSIDIAN_BG = '#050505';
const PLATINUM_TEXT = '#E5E4E2';

// Luxury Palette for Chart
const CHART_COLORS = [
    '#D4AF37', // Gold
    '#E5E4E2', // Platinum
    '#8A7120', // Dark Gold
    '#708090', // Slate
    '#C0C0C0', // Silver
    '#4A4A4A', // Charcoal
    '#F5F5DC', // Beige
    '#B8860B', // Dark Goldenrod
];

const CATEGORY_BUCKETS = [
    'Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 
    'Health', 'Transfer', 'Housing', 'Salary', 'Investment', 'Other'
];

// --- Type Definitions ---
type ViewState = 'LANDING' | 'AUTH' | 'DASHBOARD';
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';
type TimelinePreset = 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL';

interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number; // Stored in INR
  category: string;
  date: string;
  type: 'expense' | 'income';
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  targetSavings: number; // Stored in INR
  createdAt: string;
  status: 'ACTIVE' | 'PENDING';
}

const EXCHANGE_RATES: Record<CurrencyCode, number> = {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB'
};

// --- Mock Backend Database (Local Storage) ---
class WealthDatabase {
  private static STORAGE_KEY_USERS = 'wm_users_v2';
  private static STORAGE_KEY_TXNS = 'wm_txns_v2';

  static init() {
    if (!localStorage.getItem(this.STORAGE_KEY_USERS)) localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify([]));
    if (!localStorage.getItem(this.STORAGE_KEY_TXNS)) localStorage.setItem(this.STORAGE_KEY_TXNS, JSON.stringify([]));
  }

  static getUsers(): any[] {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS) || '[]');
  }

  static getTxns(): Transaction[] {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY_TXNS) || '[]');
  }

  static createUser(email: string, name: string, passwordHash: string): UserProfile {
    const users = this.getUsers();
    if (users.find((u: any) => u.email === email)) throw new Error("User already exists");
    
    const newUser = {
      id: 'usr_' + Date.now(),
      email,
      name,
      password: passwordHash,
      targetSavings: 50000,
      createdAt: new Date().toISOString(),
      status: 'PENDING' as 'PENDING'
    };
    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    return newUser;
  }

  static verifyUser(email: string, otp: string): boolean {
    const users = this.getUsers();
    const userIndex = users.findIndex((u: any) => u.email === email);
    if (userIndex === -1) return false;
    
    if (otp === '123456') {
      users[userIndex].status = 'ACTIVE';
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
      return true;
    }
    return false;
  }

  static login(email: string, passwordHash: string): UserProfile {
    const users = this.getUsers();
    const user = users.find((u: any) => u.email === email && u.password === passwordHash);
    if (!user) throw new Error("Invalid credentials");
    if (user.status === 'PENDING') throw new Error("Account not verified. Please check email.");
    return user;
  }

  static addTransaction(txn: Transaction) {
    const txns = this.getTxns();
    txns.push(txn);
    localStorage.setItem(this.STORAGE_KEY_TXNS, JSON.stringify(txns));
  }

  static updateTransaction(txn: Transaction) {
      const txns = this.getTxns();
      const idx = txns.findIndex(t => t.id === txn.id);
      if (idx !== -1) {
          txns[idx] = txn;
          localStorage.setItem(this.STORAGE_KEY_TXNS, JSON.stringify(txns));
      }
  }

  static getUserTransactions(userId: string): Transaction[] {
    return this.getTxns().filter(t => t.user_id === userId);
  }

  static deleteTransaction(id: string) {
    let txns = this.getTxns();
    txns = txns.filter(t => t.id !== id);
    localStorage.setItem(this.STORAGE_KEY_TXNS, JSON.stringify(txns));
  }

  static purgeUserTransactions(userId: string) {
      let txns = this.getTxns();
      txns = txns.filter(t => t.user_id !== userId);
      localStorage.setItem(this.STORAGE_KEY_TXNS, JSON.stringify(txns));
  }

  static updateUserGoal(userId: string, goal: number) {
      const users = this.getUsers();
      const idx = users.findIndex((u:any) => u.id === userId);
      if (idx !== -1) {
          users[idx].targetSavings = goal;
          localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
      }
  }
}

// Initialize Mock DB
WealthDatabase.init();


// --- Styles (CSS-in-JS Helper) ---
const styles = {
  container: {
    position: 'relative' as const,
    minHeight: '100vh',
    width: '100%',
    overflowX: 'hidden' as const,
    zIndex: 1,
    background: '#030303',
    color: '#e0e0e0',
  },
  canvas: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },
  glassPanel: {
    background: 'rgba(10, 10, 10, 0.8)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid rgba(212, 175, 55, 0.15)`, // Subtle Gold Border
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    borderRadius: '24px',
  },
  primaryBtn: {
    background: `linear-gradient(135deg, #fff 0%, #e0e0e0 100%)`,
    color: '#000',
    border: 'none',
    padding: '16px 42px',
    borderRadius: '2px', 
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    fontSize: '0.8rem',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: PLATINUM_TEXT,
    padding: '12px 16px',
    borderRadius: '8px',
    width: '100%',
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  heading: {
    fontFamily: 'Playfair Display, serif',
    color: '#fff',
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  subtext: {
    color: '#999',
    lineHeight: 1.8,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 300,
    letterSpacing: '0.02em',
  },
  navLink: {
    color: '#bbb',
    textDecoration: 'none',
    marginRight: '48px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    fontWeight: 500,
  }
};

// --- Custom Curved Loop Component ---
const CurvedLoop = ({ text = "WEALTHMATE ✦ ", speed = 10, radius = 800 }) => {
    const repeatedText = Array(12).fill(text).join("");
    // Lower multiplier = faster speed.
    const duration = speed * 2; 
    
    return (
        <div style={{ 
            width: '100%', 
            height: '300px', 
            overflow: 'hidden', 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            opacity: 0.8
        }}>
            <svg viewBox="0 0 1000 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                <path 
                    id="curvePath" 
                    d="M 0,200 Q 500,50 1000,200" 
                    fill="transparent" 
                />
                <text width="100%" style={{ 
                    fontSize: '60px', 
                    fontFamily: 'Playfair Display', 
                    fontWeight: '900', 
                    letterSpacing: '4px',
                    fill: GOLD_COLOR
                }}>
                    <textPath href="#curvePath" startOffset="0%">
                        {repeatedText}
                        <animate 
                            attributeName="startOffset" 
                            from="0%" 
                            to="-100%" 
                            dur={`${duration}s`} 
                            repeatCount="indefinite" 
                        />
                    </textPath>
                </text>
            </svg>
            <style>{`
                text {
                    text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
                }
            `}</style>
        </div>
    );
};

// --- Native Physics CountUp Component (Smoother) ---
const CountUp = ({ to, separator = ',', duration = 2.5, delay = 0, decimals = 0 }: { to: number, separator?: string, duration?: number, delay?: number, decimals?: number }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          
          setTimeout(() => {
              let startTime: number | null = null;
              const startValue = 0;
              
              const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const progress = (timestamp - startTime) / (duration * 1000);
                
                if (progress < 1) {
                  const ease = 1 - Math.pow(1 - progress, 4);
                  setCount(startValue + (to - startValue) * ease);
                  requestAnimationFrame(animate);
                } else {
                  setCount(to);
                }
              };
              requestAnimationFrame(animate);
          }, delay * 1000);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [to, duration, delay]);

  const formatted = useMemo(() => {
     if (to >= 10000000) {
          // Indian format for Crores
          return Math.floor(count).toLocaleString('en-IN'); 
     }
     return count.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }, [count, to, decimals]);

  return <span ref={elementRef}>{formatted}</span>;
};


// --- Coin Rain Canvas Component ---
const CoinRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    interface Coin {
      x: number;
      y: number;
      size: number;
      speed: number;
      angle: number;
      spinSpeed: number;
      type: 'gold' | 'silver';
      text: string;
      opacity: number;
    }

    const coins: Coin[] = Array.from({ length: COIN_COUNT }).map(() => {
      const rand = Math.random();
      let text = 'W';
      if (rand > 0.6) text = '₹';
      else if (rand > 0.9) text = '$';

      return {
        x: Math.random() * width,
        y: Math.random() * height - height,
        size: Math.random() * 8 + 6,
        speed: Math.random() * 8 + 6, // High speed
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.3, 
        type: Math.random() > 0.3 ? 'gold' : 'silver',
        text: text,
        opacity: Math.random() * 0.5 + 0.2,
      };
    });

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const drawCoin = (coin: Coin) => {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.rotate(coin.angle);
        
        const scaleX = Math.abs(Math.cos(coin.angle * 2)); 
        ctx.scale(scaleX, 1);

        ctx.beginPath();
        ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
        
        const gradient = ctx.createLinearGradient(-coin.size, -coin.size, coin.size, coin.size);
        if (coin.type === 'gold') {
            gradient.addColorStop(0, '#F5E6CA');
            gradient.addColorStop(0.5, '#C5A028'); 
            gradient.addColorStop(1, '#6B5412');
        } else {
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.5, '#7d7d7d');
            gradient.addColorStop(1, '#333333');
        }
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = coin.opacity;
        ctx.fill();
        ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      coins.forEach(coin => {
        coin.y += coin.speed;
        coin.angle += coin.spinSpeed;

        const dx = coin.x - mouseRef.current.x;
        const dy = coin.y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repelRange = 250;

        if (distance < repelRange) {
            const force = (repelRange - distance) / repelRange;
            const angle = Math.atan2(dy, dx);
            coin.x += Math.cos(angle) * force * 5; 
            coin.y += Math.sin(angle) * force * 5;
        }

        if (coin.y > height + 50) {
            coin.y = -50;
            coin.x = Math.random() * width;
        }
        drawCoin(coin);
      });
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} style={styles.canvas} />;
};

// --- Custom Components ---
const NotificationToast = ({ show, code }: { show: boolean, code: string }) => {
    if (!show) return null;
    return (
        <div style={{
            position: 'fixed', top: '24px', right: '24px',
            background: 'rgba(20,20,20,0.95)', border: `1px solid ${GOLD_COLOR}`,
            borderRadius: '12px', padding: '16px', zIndex: 9999,
            width: '320px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
            animation: 'slideInRight 0.5s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ background: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={16} color="#000" />
                </div>
                <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>New Email</div>
                    <div style={{ color: '#888', fontSize: '0.75rem' }}>security@wealthmate.com</div>
                </div>
            </div>
            <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '12px' }}>
                Your verification code is <span style={{ color: GOLD_COLOR, fontWeight: 700, fontSize: '1rem' }}>{code}</span>. Do not share this code.
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'right' }}>just now</div>
        </div>
    );
};

const DonutChart = ({ data, title }: { data: { label: string, value: number, color: string }[], title?: string }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativeAngle = 0;
    const size = 220;
    const center = size / 2;
    const radius = size / 2 - 20;
    
    if (total === 0) {
        return (
             <div style={{ height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                <PieChart size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <span style={{ fontFamily: 'Inter', fontWeight: 300, letterSpacing: '1px' }}>No activity data</span>
            </div>
        );
    }

    return (
        <div className="donut-container" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                    {data.map((item, i) => {
                        const startAngle = cumulativeAngle;
                        const sliceAngle = (item.value / total) * 2 * Math.PI;
                        cumulativeAngle += sliceAngle;
                        
                        if (sliceAngle <= 0) return null;

                        const x1 = center + radius * Math.cos(startAngle);
                        const y1 = center + radius * Math.sin(startAngle);
                        const x2 = center + radius * Math.cos(startAngle + sliceAngle);
                        const y2 = center + radius * Math.sin(startAngle + sliceAngle);
                        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
                        
                        return (
                            <path
                                key={i}
                                d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                fill={item.color}
                                stroke="#121212"
                                strokeWidth="4"
                            />
                        );
                    })}
                    <circle cx={center} cy={center} r={radius * 0.65} fill="#181818" />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>TOTAL</span>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{((total)/1000).toFixed(1)}k</span>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
                {title && <h5 style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>{title}</h5>}
                {data.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                        <span style={{ color: PLATINUM_TEXT, fontWeight: 500, minWidth: '80px' }}>{item.label}</span>
                        <span style={{ color: '#666', fontWeight: 400 }}>{Math.round((item.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const IncomeExpenseChart = ({ transactions, startDate, endDate }: { transactions: Transaction[], startDate: string, endDate: string }) => {
    const dailyData: Record<string, { income: number, expense: number }> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    // Initialize days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dailyData[d.toISOString().split('T')[0]] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
        if (dailyData[t.date]) {
             if (t.type === 'expense') dailyData[t.date].expense += t.amount;
             else if (t.type === 'income') dailyData[t.date].income += t.amount;
        }
    });

    const dataPoints = Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]));
    if (dataPoints.length === 0) return null;

    const maxVal = Math.max(...dataPoints.map(d => Math.max(d[1].income, d[1].expense)), 1000);
    const width = 1000;
    const height = 300;
    const padding = 40;
    const graphHeight = height - padding * 2;

    const createPath = (type: 'income' | 'expense') => {
        const points = dataPoints.map((point, index) => {
            const x = (index / (dataPoints.length - 1 || 1)) * width;
            const val = type === 'income' ? point[1].income : point[1].expense;
            const y = height - padding - (val / maxVal) * graphHeight;
            return `${x},${y}`;
        });
        
        // Ensure path starts and ends at bottom for area fill
        if (type === 'income') {
             return `0,${height - padding} ${points.join(' ')} ${width},${height - padding}`;
        }
        return points.join(' ');
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h4 style={{ color: GOLD_COLOR, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Income & Expenditure Flow</h4>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', background: GOLD_COLOR }}></div><span style={{ fontSize: '10px', color: '#888' }}>INCOME</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '2px', background: '#fff' }}></div><span style={{ fontSize: '10px', color: '#888' }}>EXPENSE</span></div>
                </div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={GOLD_COLOR} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={GOLD_COLOR} stopOpacity="0" />
                        </linearGradient>
                         <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    {/* Dotted Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(p => (
                        <line 
                            key={p} 
                            x1="0" 
                            y1={height - padding - p * graphHeight} 
                            x2={width} 
                            y2={height - padding - p * graphHeight} 
                            stroke="#333" 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                        />
                    ))}
                    
                    {/* Y Axis Labels */}
                    {[0, 0.5, 1].map(p => (
                        <text 
                            key={p} 
                            x="-10" 
                            y={height - padding - p * graphHeight + 4} 
                            fill="#666" 
                            fontSize="10" 
                            textAnchor="end"
                        >
                            ₹{Math.round(p * maxVal / 1000)}k
                        </text>
                    ))}
                    
                    {/* Income Area (Gold Filled) */}
                    <polygon points={createPath('income')} fill="url(#goldGradient)" stroke={GOLD_COLOR} strokeWidth="2" strokeLinejoin="round" />
                    
                    {/* Expense Area (White line with slight shadow) */}
                     {/* We draw expens as a line primarily, but maybe a slight area too */}
                    <polyline points={createPath('expense')} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
                </svg>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc, large = false }: { icon: React.ReactNode, title: string, desc: string, large?: boolean }) => {
    return (
        <div 
            className={`feature-card ${large ? 'feature-large' : ''}`}
            style={{ 
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '340px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
            }}
        >
             <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ marginBottom: '32px' }}>{icon}</div>
                <h3 style={{ color: '#fff', fontSize: '1.6rem', fontFamily: 'Playfair Display', marginBottom: '16px', fontWeight: 500, fontStyle: 'italic' }}>{title}</h3>
                <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 300, fontFamily: 'Inter' }}>{desc}</p>
            </div>
            <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundImage: `linear-gradient(${GOLD_COLOR}22 1px, transparent 1px), linear-gradient(90deg, ${GOLD_COLOR}22 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                zIndex: 1,
                opacity: 0,
                transition: 'opacity 0.4s',
                pointerEvents: 'none'
            }} className="grid-bg"></div>
            <style>{`
                .feature-card:hover { border-color: ${GOLD_COLOR}44; transform: translateY(-5px); background: rgba(212, 175, 55, 0.03); }
                .feature-card:hover .grid-bg { opacity: 0.1; }
            `}</style>
        </div>
    );
};

// --- Pages ---

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
    <div style={{ position: 'relative', zIndex: 10, color: PLATINUM_TEXT }}>
      {/* Premium Navbar */}
      <nav className="navbar" style={{ 
          position: 'fixed', top: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          height: '90px', padding: '0 60px',
          background: 'rgba(5, 5, 5, 0.85)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ 
                fontSize: '24px', 
                fontWeight: 700, 
                fontFamily: 'Playfair Display', 
                letterSpacing: '-0.5px',
                color: '#fff'
            }}>
                Wealth<span style={{color: GOLD_COLOR, fontWeight: 400}}>Mate</span>
            </span>
        </div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
            <span onClick={() => scrollToSection('intelligence-section')} className="nav-link" style={styles.navLink}>Intelligence</span>
            <span onClick={() => scrollToSection('protocol-section')} className="nav-link" style={styles.navLink}>Protocol</span>
            <button 
                onClick={onGetStarted} 
                className="hover-bright"
                style={{ 
                    ...styles.primaryBtn, 
                    padding: '12px 32px', 
                    fontSize: '11px',
                    background: 'transparent',
                    border: `1px solid ${GOLD_COLOR}`,
                    color: GOLD_COLOR,
                    letterSpacing: '2px'
                }}
            >
                CLIENT LOGIN
            </button>
        </div>
      </nav>

      {/* Massive Hero Section */}
      <div className="hero-grid" style={{ 
          maxWidth: '1800px', margin: '0 auto', 
          minHeight: '85vh', 
          padding: '140px 60px 40px', 
          display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '80px', alignItems: 'center'
      }}>
        <div className="reveal-text">
            <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '12px',
                padding: '6px 16px', background: 'rgba(212, 175, 55, 0.1)', 
                borderRadius: '100px', color: GOLD_COLOR, fontSize: '0.7rem', fontWeight: 600, marginBottom: '40px',
                letterSpacing: '2px', textTransform: 'uppercase', border: `1px solid ${GOLD_COLOR}40`
            }}>
                <div style={{ width: '6px', height: '6px', background: GOLD_COLOR, borderRadius: '50%', boxShadow: `0 0 8px ${GOLD_COLOR}` }}></div>
                System V3.0 Online
            </div>
            
            <h1 style={{ 
                ...styles.heading, 
                fontSize: 'clamp(3.5rem, 6vw, 6.5rem)', 
                marginBottom: '24px', 
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                fontWeight: 800,
            }}>
                Your Money. <br />
                <span style={{ 
                    fontFamily: 'Playfair Display',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: '#fff',
                    textShadow: `0 0 30px rgba(255,255,255,0.1)`
                }}>Reimagined.</span>
            </h1>
            
            <p style={{ 
                ...styles.subtext, 
                fontSize: '1.15rem', 
                maxWidth: '550px', 
                marginBottom: '50px', 
                color: '#888',
                fontWeight: 300,
                letterSpacing: '0.01em',
                lineHeight: 1.6
            }}>
                Experience personal finance with premium analytics, AI-powered insights, and intelligent budgeting powered by Google's <span style={{ color: GOLD_COLOR }}>Gemini 3.0 Pro</span>.
            </p>
            
            <button 
                onClick={onGetStarted}
                className="hover-scale"
                style={{ 
                    ...styles.primaryBtn, 
                    fontSize: '0.9rem', 
                    padding: '22px 56px',
                    boxShadow: `0 20px 80px -10px ${GOLD_COLOR}20`,
                    letterSpacing: '2px',
                    background: '#fff'
                }}
            >
                Enter Vault
            </button>
        </div>

        {/* 3D Mobile Phone Card (Restored Design) */}
        <div className="phone-container" style={{ position: 'relative', height: '700px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="phone">
                 <div className="phone-bezel">
                    <div className="dynamic-island"></div>
                    <div className="phone-screen">
                        {/* Fake Dashboard UI */}
                        <div style={{ padding: '30px 20px', color: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                 <Fingerprint size={24} color={GOLD_COLOR} />
                                 <Wifi size={20} color="#fff" />
                             </div>
                             
                             <div style={{ padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                 <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', marginBottom: '5px' }}>TOTAL BALANCE</div>
                                 <div style={{ fontSize: '32px', fontFamily: 'Playfair Display' }}>₹ 1,45,00,000</div>
                                 <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '5px' }}>+12.5% vs last month</div>
                             </div>

                             <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                  <div style={{ flex: 1, height: '100px', background: '#111', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <TrendingUp color={GOLD_COLOR} />
                                  </div>
                                  <div style={{ flex: 1, height: '100px', background: '#111', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <PieChart color="#fff" />
                                  </div>
                             </div>

                             <div style={{ background: '#000', borderRadius: '20px', padding: '20px', flex: 1, border: '1px solid #222' }}>
                                 <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px', letterSpacing: '1px' }}>SPENDING VELOCITY</div>
                                 <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '8px' }}>
                                      {[40, 60, 35, 80, 50, 90, 45, 70, 60].map((h, i) => (
                                          <div key={i} style={{ 
                                              flex: 1, height: `${h}%`, 
                                              background: i === 5 ? GOLD_COLOR : '#222', 
                                              borderRadius: '4px' 
                                          }}></div>
                                      ))}
                                 </div>
                             </div>
                             
                             <div className="scanning-bar"></div>
                        </div>
                    </div>
                 </div>
            </div>
            
            {/* Ambient Glow */}
            <div style={{ position: 'absolute', width: '300px', height: '500px', background: GOLD_COLOR, filter: 'blur(100px)', opacity: 0.15, zIndex: -1 }}></div>
        </div>
      </div>

      {/* Stats Strip with Physics Counters */}
      <div style={{ 
          borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '80px 0', background: 'rgba(10,10,10,0.5)'
      }}>
          <div className="stats-grid" style={{ 
              maxWidth: '1400px', 
              margin: '0 auto', 
              padding: '0 60px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '60px'
            }}>
              <div>
                  <div style={{ 
                      fontSize: 'clamp(2.5rem, 4vw, 4.5rem)', fontWeight: 200, color: '#fff', 
                      fontFamily: 'Inter', lineHeight: 1, letterSpacing: '-2px',
                      marginBottom: '16px'
                  }}>
                      <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '2.5rem', marginRight: '4px' }}>₹</span>
                        <CountUp to={50000000} delay={0.2} />
                        <span style={{ fontSize: '2.5rem', marginLeft: '4px' }}>+</span>
                      </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600 }}>Volume Processed</div>
              </div>

              <div>
                  <div style={{ 
                      fontSize: 'clamp(2.5rem, 4vw, 4.5rem)', fontWeight: 200, color: '#fff', 
                      fontFamily: 'Inter', lineHeight: 1, letterSpacing: '-2px',
                      marginBottom: '16px'
                  }}>
                      <CountUp to={12500} delay={0.4} />
                      <span style={{ fontSize: '2.5rem', marginLeft: '4px' }}>+</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600 }}>Elite Members</div>
              </div>

              <div>
                  <div style={{ 
                      fontSize: 'clamp(2.5rem, 4vw, 4.5rem)', fontWeight: 200, color: '#fff', 
                      fontFamily: 'Inter', lineHeight: 1, letterSpacing: '-2px',
                      marginBottom: '16px'
                  }}>
                      <CountUp to={99.9} delay={0.6} decimals={1} />
                      <span style={{ fontSize: '2.5rem', marginLeft: '4px' }}>%</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600 }}>AI Accuracy</div>
              </div>
          </div>
      </div>

      {/* INTELLIGENCE SECTION */}
      <div id="intelligence-section" style={{ background: '#080808', padding: '100px 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '60px' }}>
                <span style={{ fontSize: '0.8rem', letterSpacing: '3px', color: GOLD_COLOR, fontWeight: 700 }}>SECTION 01</span>
                <div style={{ height: '1px', flex: 1, background: '#222' }}></div>
                <span style={{ fontSize: '2.5rem', fontFamily: 'Playfair Display', fontStyle: 'italic', color: '#fff' }}>Intelligence Layer</span>
            </div>
            
            <div className="features-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    <FeatureCard 
                        icon={<ScanLine size={32} color={GOLD_COLOR} />}
                        title="Flash Categorization"
                        desc="Quantum-speed ledger analysis. Our engine deconstructs thousands of transactions instantly, turning raw chaos into structured institutional data."
                        large={false}
                    />
                    <FeatureCard 
                        icon={<Cpu size={32} color={GOLD_COLOR} />}
                        title="Predictive Advisory"
                        desc="Forward-looking wealth synthesis. Gemini 3.0 models your burn rate against seasonal volatility to forecast liquidity events before they happen."
                    />
                    <FeatureCard 
                        icon={<Target size={32} color={GOLD_COLOR} />}
                        title="Goal Trajectory"
                        desc="Precision wealth targeting. Define your exit velocity. The system calculates the exact daily arbitrage needed to hit your accumulation targets."
                    />
                    <FeatureCard 
                        icon={<PieChart size={32} color={GOLD_COLOR} />}
                        title="Visual Analytics"
                        desc="Full-spectrum capital visualization. Interactive allocation rings provide instant clarity on asset distribution and expenditure leakage."
                        large={false}
                    />
            </div>
        </div>
      </div>

      {/* PROTOCOL SECTION */}
      <div id="protocol-section" style={{ background: '#020202', padding: '100px 0', borderTop: '1px solid #111' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '60px' }}>
                <span style={{ fontSize: '0.8rem', letterSpacing: '3px', color: '#444', fontWeight: 700 }}>SECTION 02</span>
                <div style={{ height: '1px', flex: 1, background: '#222' }}></div>
                <span style={{ fontSize: '2.5rem', fontFamily: 'Playfair Display', fontStyle: 'italic', color: '#fff' }}>Protocol Layer</span>
            </div>

            <div className="features-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <FeatureCard 
                    icon={<Globe size={32} color="#666" />}
                    title="Multi-Currency"
                    desc="Border-agnostic architecture. Native handling of INR, USD, EUR, and GBP. Your wealth knows no geography."
                />
                <FeatureCard 
                    icon={<Server size={32} color="#666" />}
                    title="Offline-First"
                    desc="Zero-latency local core. Data resides on your silicon, not our servers. True sovereignty over your financial footprint."
                />
                <FeatureCard 
                    icon={<Lock size={32} color="#666" />}
                    title="Privacy Core"
                    desc="Military-grade encryption standards. Zero-knowledge architecture ensures your financial DNA remains exclusively yours."
                />
            </div>
        </div>
      </div>

      {/* Footer with Curved Loop */}
      <footer style={{ 
          background: '#000', 
          padding: '80px 0 0', 
          borderTop: '1px solid #1a1a1a',
          position: 'relative',
          overflow: 'hidden'
      }}>
          <CurvedLoop speed={3} />
          
          <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center', padding: '40px 0 80px' }}>
            <div style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '3px', fontWeight: 600 }}>EST. 2024 • BANGALORE / MUMBAI</div>
          </div>
      </footer>
      
      <style>{`
          .reveal-text { animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(60px); }
          @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
          
          .hover-scale:hover { transform: scale(1.02); }
          .hover-bright:hover { background: ${GOLD_COLOR}11; border-color: ${GOLD_COLOR}; }

          /* 3D Phone CSS */
          .phone-container { perspective: 2000px; }
          .phone {
              width: 340px; height: 680px;
              transform: rotateY(-15deg) rotateX(10deg);
              transition: transform 0.5s ease;
              position: relative;
          }
          .phone:hover { transform: rotateY(0deg) rotateX(0deg); }
          
          .phone-bezel {
              width: 100%; height: 100%;
              background: #1a1a1a;
              border-radius: 48px;
              border: 4px solid #444;
              box-shadow: 
                0 0 0 2px #111,
                0 0 0 4px #333,
                inset 0 0 20px rgba(0,0,0,0.8),
                20px 20px 50px rgba(0,0,0,0.5);
              position: relative;
              overflow: hidden;
              background: linear-gradient(135deg, #333 0%, #111 100%);
          }
          
          .phone-screen {
              position: absolute;
              top: 12px; left: 12px; right: 12px; bottom: 12px;
              background: #000;
              border-radius: 36px;
              overflow: hidden;
          }
          
          .dynamic-island {
              position: absolute;
              top: 24px; left: 50%;
              transform: translateX(-50%);
              width: 100px; height: 28px;
              background: #000;
              border-radius: 20px;
              z-index: 20;
          }
          
          .scanning-bar {
              position: absolute;
              top: 0; left: 0; width: 100%; height: 2px;
              background: ${GOLD_COLOR};
              box-shadow: 0 0 20px ${GOLD_COLOR};
              animation: scanDown 3s infinite ease-in-out;
              opacity: 0.6;
          }
          
          @keyframes scanDown {
              0% { top: 0; opacity: 0; }
              20% { opacity: 1; }
              80% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
          }

          /* Email Notification Animation */
          @keyframes slideInRight {
              from { transform: translateX(120%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
          }

          /* RESPONSIVE CSS */
          @media (max-width: 1024px) {
              .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding-top: 120px !important; text-align: center; }
              .reveal-text { align-items: center; display: flex; flex-direction: column; }
              .phone-container { height: 500px !important; }
              .phone { width: 280px; height: 560px; }
              .stats-grid { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
              .features-grid-2 { grid-template-columns: 1fr !important; }
              .features-grid-3 { grid-template-columns: 1fr !important; }
              .nav-links { display: none !important; } /* Simplify for demo, real app needs mobile menu */
              .dash-stats-grid { grid-template-columns: 1fr !important; }
              .dash-charts-grid { grid-template-columns: 1fr !important; height: auto !important; }
          }

          @media (max-width: 768px) {
               .navbar { padding: 0 20px !important; height: 70px !important; }
               .hero-grid { padding: 100px 20px 40px !important; }
               h1 { font-size: 3.5rem !important; }
               .stats-grid { padding: 0 20px !important; }
               .feature-card { min-height: 250px !important; }
               .dashboard-container { padding: 20px !important; }
               .dash-charts-grid div { height: auto !important; min-height: 400px; }
               .donut-container { flex-direction: column !important; }
          }
      `}</style>
    </div>
  );
};


// --- AUTH COMPONENTS ---
type AuthMode = 'LOGIN' | 'SIGNUP' | 'VERIFY' | 'FORGOT';

const AuthPage = ({ onAuthSuccess, onBack }: { onAuthSuccess: (p: UserProfile) => void, onBack: () => void }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showEmailToast, setShowEmailToast] = useState(false);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg('');

    // Simulate Network Delay
    await new Promise(r => setTimeout(r, 1000));

    try {
        if (mode === 'SIGNUP') {
            WealthDatabase.createUser(email, name, password); // Passwords should be hashed in production
            setMode('VERIFY');
            setShowEmailToast(true);
        } else if (mode === 'VERIFY') {
            const success = WealthDatabase.verifyUser(email, otp);
            if (success) {
                setMsg("Verified successfully. Logging in...");
                setTimeout(() => {
                    const user = WealthDatabase.login(email, password);
                    onAuthSuccess(user);
                }, 1000);
            } else {
                throw new Error("Invalid Security Code");
            }
        } else if (mode === 'LOGIN') {
            const user = WealthDatabase.login(email, password);
            onAuthSuccess(user);
        } else if (mode === 'FORGOT') {
            setMsg("Recovery link sent to secure inbox (Simulated).");
            setTimeout(() => setMode('LOGIN'), 2000);
        }
    } catch (err: any) {
        setMsg(err.message || "Protocol Error");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
        <NotificationToast show={showEmailToast} code="123456" />

        <button 
            onClick={onBack}
            style={{ 
                position: 'absolute', top: '40px', left: '40px', 
                background: 'transparent', border: 'none', color: '#666', 
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' 
            }}
        >
            <ArrowLeft size={20} /> Back to Home
        </button>

      <div style={{ width: '420px', maxWidth: '90%', ...styles.glassPanel, padding: '48px' }}>
         <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                 {mode === 'LOGIN' && <Shield size={32} color="#000" />}
                 {mode === 'SIGNUP' && <User size={32} color="#000" />}
                 {mode === 'VERIFY' && <CheckCircle2 size={32} color="#000" />}
                 {mode === 'FORGOT' && <Key size={32} color="#000" />}
            </div>
            <h2 style={{ ...styles.heading, fontSize: '1.8rem' }}>
                {mode === 'LOGIN' && 'Access Vault'}
                {mode === 'SIGNUP' && 'New Identity'}
                {mode === 'VERIFY' && 'Security Check'}
                {mode === 'FORGOT' && 'Recovery'}
            </h2>
            <p style={styles.subtext}>
                {mode === 'LOGIN' && 'Secure institutional access.'}
                {mode === 'SIGNUP' && 'Create your secured ledger.'}
                {mode === 'VERIFY' && 'Enter 6-digit verification code.'}
                {mode === 'FORGOT' && 'Restore access protocols.'}
            </p>
         </div>

         {msg && <div style={{ color: GOLD_COLOR, textAlign: 'center', marginBottom: '16px', fontSize: '0.8rem', background: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '4px', border: `1px solid ${GOLD_COLOR}30` }}>{msg}</div>}

         <form onSubmit={handleAction}>
           {mode === 'SIGNUP' && (
               <div style={{ marginBottom: '24px' }}>
                 <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '8px', letterSpacing: '1px' }}>FULL NAME</label>
                 <input type="text" style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
               </div>
           )}
           
           {(mode === 'LOGIN' || mode === 'SIGNUP' || mode === 'FORGOT') && (
               <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '8px', letterSpacing: '1px' }}>EMAIL ADDRESS</label>
                <input type="email" style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="client@wealthmate.com" />
               </div>
           )}

           {(mode === 'LOGIN' || mode === 'SIGNUP') && (
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', letterSpacing: '1px' }}>PASSWORD</label>
                        {mode === 'LOGIN' && <span onClick={() => setMode('FORGOT')} style={{ fontSize: '0.7rem', color: GOLD_COLOR, cursor: 'pointer' }}>Forgot?</span>}
                    </div>
                    <input type="password" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>
           )}

            {mode === 'VERIFY' && (
                <div style={{ marginBottom: '40px' }}>
                    <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '8px', letterSpacing: '1px' }}>SECURITY CODE</label>
                    <input type="text" style={{...styles.input, textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem'}} value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="XXXXXX" maxLength={6} />
                </div>
            )}
           
           <button type="submit" style={{ ...styles.primaryBtn, width: '100%', marginBottom: '24px' }}>
              {isLoading ? 'Processing...' : (mode === 'LOGIN' ? 'Enter Vault' : (mode === 'SIGNUP' ? 'Initialize' : (mode === 'VERIFY' ? 'Verify Identity' : 'Send Link')))}
           </button>

           <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
               {mode === 'LOGIN' ? (
                   <>New to WealthMate? <span onClick={() => setMode('SIGNUP')} style={{ color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Create Account</span></>
               ) : (
                   mode !== 'VERIFY' && <>Already have access? <span onClick={() => setMode('LOGIN')} style={{ color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Login</span></>
               )}
           </div>
         </form>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [advice, setAdvice] = useState<string>('System initializing wealth analysis...');
    const [currency, setCurrency] = useState<CurrencyCode>('INR');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [manualFormOpen, setManualFormOpen] = useState(false);
    const [desc, setDesc] = useState('');
    const [amt, setAmt] = useState('');
    const [category, setCategory] = useState(CATEGORY_BUCKETS[0]);
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(user.targetSavings.toString());
    const [currentUser, setCurrentUser] = useState(user);
    const [allocationView, setAllocationView] = useState<'Category' | 'Source'>('Category');
    const [editingTxn, setEditingTxn] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Transaction>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Initial Fetch
    useEffect(() => {
        setTransactions(WealthDatabase.getUserTransactions(user.id));
        // Default to ALL TIME
        const start = new Date(2023, 0, 1);
        const end = new Date();
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, [user.id]);

    const formatCurrency = (amount: number) => {
        const converted = amount * EXCHANGE_RATES[currency];
        return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(converted);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
        
        // Intelligent Header Detection
        let headerRowIndex = -1;
        let bestScore = 0;
        
        // Keywords to look for in headers
        const keywords = ['date', 'description', 'narration', 'particulars', 'debit', 'withdrawal', 'credit', 'deposit', 'amount'];
        
        for (let i = 0; i < Math.min(25, rawRows.length); i++) {
            const rowStr = rawRows[i].join(' ').toLowerCase();
            let score = 0;
            keywords.forEach(k => { if (rowStr.includes(k)) score++; });
            if (score > bestScore) {
                bestScore = score;
                headerRowIndex = i;
            }
        }

        if (headerRowIndex === -1 || bestScore < 2) {
            alert("Could not detect standard bank statement headers. Please ensure the file has columns like 'Date', 'Description', and 'Amount'.");
            return;
        }

        const headerRow = rawRows[headerRowIndex].map(c => String(c).toLowerCase().trim());
        
        // Dynamic Column Mapping
        const dateIdx = headerRow.findIndex(c => c.includes('date'));
        const descIdx = headerRow.findIndex(c => c.includes('description') || c.includes('narration') || c.includes('particulars') || c.includes('remark'));
        const debitIdx = headerRow.findIndex(c => c.includes('debit') || c.includes('withdrawal') || c.includes('dr'));
        const creditIdx = headerRow.findIndex(c => c.includes('credit') || c.includes('deposit') || c.includes('cr'));
        const amountIdx = headerRow.findIndex(c => c === 'amount' || c.includes('txn amount'));

        const newTxns: Transaction[] = [];
        const uniqueDescriptions = new Set<string>();

        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;
            
            const descStr = row[descIdx] ? String(row[descIdx]) : "Unknown Transaction";
            let amountVal = 0;
            let typeVal: 'expense' | 'income' = 'expense';

            // Robust Amount Parsing (Handle "1,000.00" strings)
            const parseAmount = (val: any) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/,/g, ''));
                return 0;
            };

            if (debitIdx !== -1 && row[debitIdx]) {
                const val = parseAmount(row[debitIdx]);
                if (val > 0) { amountVal = val; typeVal = 'expense'; }
            } else if (creditIdx !== -1 && row[creditIdx]) {
                const val = parseAmount(row[creditIdx]);
                if (val > 0) { amountVal = val; typeVal = 'income'; }
            } else if (amountIdx !== -1 && row[amountIdx]) {
                 const val = parseAmount(row[amountIdx]);
                 if (!isNaN(val)) {
                     if (val < 0) { amountVal = Math.abs(val); typeVal = 'expense'; }
                     else { amountVal = val; typeVal = 'income'; }
                 }
            }
            
            if (amountVal === 0) continue;

            // Robust Date Parsing
            let dateStr = new Date().toISOString().split('T')[0];
            const rawDate = row[dateIdx];
            if (typeof rawDate === 'number') {
                const d = new Date(Date.UTC(1899, 11, 30 + rawDate));
                dateStr = d.toISOString().split('T')[0];
            } else if (rawDate) {
                const rawDateStr = String(rawDate).trim();
                const d = new Date(rawDateStr);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().split('T')[0];
                }
            }

            if (typeVal === 'expense') uniqueDescriptions.add(descStr);
            
            newTxns.push({ 
                id: 'txn_' + Date.now() + Math.random(),
                user_id: user.id,
                description: descStr, 
                amount: amountVal, 
                category: typeVal === 'income' ? 'Income' : 'Uncategorized', 
                date: dateStr, 
                type: typeVal 
            });
        }
        
        setIsAnalyzing(true);
        // AI Categorization Batch
        const descriptions = Array.from(uniqueDescriptions).slice(0, 100);
        if (descriptions.length > 0) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `
                Categorize these financial transaction descriptors into simple buckets: 
                Buckets: Food, Transport, Utilities, Shopping, Entertainment, Health, Transfer, Housing, Salary, Investment.
                Context: Indian Market. "Swiggy" -> Food. "UPI" -> Transfer (unless merchant name clear).
                Return strictly JSON: { "Starbucks": "Food", "Uber": "Transport" }
                Descriptors: ${JSON.stringify(descriptions)}
                `;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });
                const categoryMap = JSON.parse(response.text);
                newTxns.forEach(t => { 
                    if (t.type === 'expense' && categoryMap[t.description]) {
                        t.category = categoryMap[t.description];
                    }
                });
            } catch (err) { console.error("AI Categorization failed", err); }
        }

        // Commit to DB
        newTxns.forEach(t => WealthDatabase.addTransaction(t));
        setTransactions(WealthDatabase.getUserTransactions(user.id));
        setLastUpdated(new Date());
        setIsAnalyzing(false);
        e.target.value = ""; 
    };

    const handleAddManual = () => {
        if (!desc || !amt) return;
        WealthDatabase.addTransaction({ 
            id: 'txn_' + Date.now(),
            user_id: user.id,
            description: desc, 
            amount: parseFloat(amt), 
            category: type === 'expense' ? category : 'Income', 
            date: new Date().toISOString().split('T')[0], 
            type: type 
        });
        setTransactions(WealthDatabase.getUserTransactions(user.id));
        setLastUpdated(new Date());
        setDesc(''); setAmt(''); setManualFormOpen(false);
    };

    const handleDelete = (id: string) => { 
        WealthDatabase.deleteTransaction(id);
        setTransactions(WealthDatabase.getUserTransactions(user.id));
        setLastUpdated(new Date()); 
    };

    const handlePurgeAll = () => {
        WealthDatabase.purgeUserTransactions(user.id);
        setTransactions([]);
        setLastUpdated(new Date());
        setShowDeleteConfirm(false);
    };

    const startEditing = (txn: Transaction) => {
        setEditingTxn(txn.id);
        setEditForm({ ...txn });
    };

    const saveEdit = () => {
        if (editingTxn) {
            WealthDatabase.updateTransaction(editForm as Transaction);
            setTransactions(WealthDatabase.getUserTransactions(user.id));
            setEditingTxn(null);
            setEditForm({});
            setLastUpdated(new Date());
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (!startDate || !endDate) return true;
            return t.date >= startDate && t.date <= endDate;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, startDate, endDate]);

    const stats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const currentSavings = income - expense;
        const goalPercent = Math.min((currentSavings / currentUser.targetSavings) * 100, 100);
        
        return { income, expense, balance: currentSavings, goalPercent };
    }, [filteredTransactions, currentUser.targetSavings]);

    const chartData = useMemo(() => {
        const cats: Record<string, number> = {};
        const targetType = allocationView === 'Category' ? 'expense' : 'income';
        
        filteredTransactions.filter(t => t.type === targetType).forEach(t => { 
            const key = allocationView === 'Category' ? t.category : t.description; // Simplified source for income
            cats[key] = (cats[key] || 0) + t.amount; 
        });
        
        return Object.entries(cats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8) // Top 8 only
            .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [filteredTransactions, allocationView]);

    const generateAdvice = async () => {
        setIsAnalyzing(true);
        const savingsGap = currentUser.targetSavings - (stats.balance);
        const categorySummary = chartData.map(c => `${c.label}: ₹${c.value}`).join(', ');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
            Act as a ruthless institutional wealth advisor for a premium client.
            Client: ${currentUser.name}.
            
            Target Goal: ₹${currentUser.targetSavings}
            Current Savings: ₹${stats.balance}
            Gap: ₹${savingsGap}
            
            Spending Breakdown: ${categorySummary}
            
            Instructions:
            1. If Gap > 0: Identify exactly which 2 categories to cut and by how much to close the gap this month.
            2. If Gap <= 0: Congratulate briefly and suggest an investment vehicle for the surplus (e.g., Index Funds, Gold Bonds).
            3. Provide a bulleted 3-step action plan using the symbol '•' for bullets.
            4. Do NOT use markdown bolding (like **text**) or headers (###). Keep it clean text.
            5. Use the '₹' symbol for currency.
            
            Tone: Professional, direct, high-finance. Keep it under 60 words.
            `;
            const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
            setAdvice(response.text);
        } catch (e) { setAdvice("Advisory systems unavailable. Check network protocols."); }
        setIsAnalyzing(false);
    };

    // Auto-generate advice when stats change significantly
    useEffect(() => {
        if (!isAnalyzing && stats.balance !== 0) {
             // Debounce slightly or just run once on mount/major change
        }
    }, [stats.balance]);


    const setPreset = (preset: TimelinePreset) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();
        switch (preset) {
            case 'THIS_WEEK': start.setDate(today.getDate() - today.getDay()); break;
            case 'THIS_MONTH': start = new Date(today.getFullYear(), today.getMonth(), 1); break;
            case 'LAST_MONTH': start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0); break;
            case 'ALL': start = new Date(2020, 0, 1); break;
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const updateGoal = (newGoal: number) => {
         WealthDatabase.updateUserGoal(user.id, newGoal);
         setCurrentUser({...currentUser, targetSavings: newGoal});
    }

    // Advice Parser to render cleaner HTML
    const renderAdvice = (text: string) => {
        const cleanText = text.replace(/\*\*/g, '').replace(/###/g, ''); // Remove Markdown
        const lines = cleanText.split('\n').filter(l => l.trim().length > 0);
        return lines.map((line, i) => {
            if (line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim())) {
                 return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                     <span style={{ color: GOLD_COLOR }}>•</span>
                     <span>{line.replace(/^[•\-\d+\.]/, '').trim()}</span>
                 </div>
            }
            return <div key={i} style={{ marginBottom: '8px' }}>{line}</div>
        });
    };

    return (
        <div className="dashboard-container" style={{ position: 'relative', zIndex: 10, padding: '40px 80px', maxWidth: '1600px', margin: '0 auto' }}>
            <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <h1 style={{ ...styles.heading, fontSize: '2.5rem', marginBottom: '8px' }}>Dashboard</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={styles.subtext}>Welcome back, {currentUser.name}</span>
                        <div style={{ width: '1px', height: '12px', background: '#333' }}></div>
                        <span style={{ ...styles.subtext, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> Synced: {lastUpdated.toLocaleTimeString()}</span>
                    </div>
                </div>
                <div className="dashboard-controls" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                     <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} style={{ background: 'transparent', color: PLATINUM_TEXT, border: '1px solid #333', padding: '8px 16px', borderRadius: '4px' }}>
                         <option value="INR">INR (₹)</option>
                         <option value="USD">USD ($)</option>
                         <option value="EUR">EUR (€)</option>
                         <option value="GBP">GBP (£)</option>
                     </select>
                     <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><LogOut size={20} /></button>
                </div>
            </header>

            <div className="dash-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                {[{ label: 'Total Income', val: stats.income, icon: <TrendingUp color="#4caf50" /> }, { label: 'Total Spend', val: stats.expense, icon: <Activity color="#f44336" /> }, { label: 'Net Liquidity', val: stats.balance, icon: <Shield color={GOLD_COLOR} /> }].map((item, i) => (
                    <div key={i} style={{ ...styles.glassPanel, padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}><span style={{ color: '#666', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>{item.label}</span>{item.icon}</div>
                        <div style={{ fontSize: '2rem', fontFamily: 'Playfair Display', color: '#fff' }}>{formatCurrency(item.val)}</div>
                    </div>
                ))}
            </div>
            
            {/* Protocol Advisor Panel (Landscape Mode) */}
            <div style={{ ...styles.glassPanel, padding: '32px', marginBottom: '40px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: `${GOLD_COLOR}20`, padding: '8px', borderRadius: '50%' }}>
                             <Sparkles color={GOLD_COLOR} size={20} />
                        </div>
                        <div>
                            <span style={{ display: 'block', color: GOLD_COLOR, fontSize: '0.9rem', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1 }}>Advisor</span>
                            <span style={{ display: 'block', color: '#fff', fontSize: '0.9rem', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1 }}>Insight</span>
                        </div>
                    </div>
                    <button onClick={generateAdvice} style={{ background: 'transparent', border: '1px solid #333', borderRadius: '100px', padding: '8px 20px', color: '#888', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '1px', transition: 'all 0.3s' }} className="hover-bright">REFRESH ANALYSIS</button>
                 </div>
                 
                 <div style={{ fontSize: '1.25rem', color: '#e0e0e0', lineHeight: 1.6, fontFamily: 'Inter', fontWeight: 300, borderLeft: `2px solid ${GOLD_COLOR}`, paddingLeft: '24px' }}>
                    {renderAdvice(advice)}
                 </div>
                 
                 {stats.balance < currentUser.targetSavings && (
                     <div style={{ width: '100%', background: '#222', borderRadius: '2px', height: '4px', marginTop: '8px' }}>
                         <div style={{ width: `${stats.goalPercent}%`, height: '100%', background: 'linear-gradient(90deg, #ff4d4d, #f9cb28)' }}></div>
                     </div>
                 )}
            </div>
            
            {/* Wealth Target Bar */}
             <div style={{ ...styles.glassPanel, padding: '24px 32px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '32px' }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                         <span style={{ fontSize: '1.2rem', fontFamily: 'Playfair Display', color: '#fff' }}>Wealth Target</span>
                         {isEditingGoal ? ( 
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input type="number" value={tempGoal} onChange={e => setTempGoal(e.target.value)} style={{...styles.input, width: '120px', padding: '4px'}} autoFocus />
                                 <button onClick={() => { 
                                     updateGoal(parseFloat(tempGoal));
                                     setIsEditingGoal(false); 
                                 }}><Check size={16} color="#4caf50"/></button>
                             </div>
                         ) : ( 
                             <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '1.5rem', color: GOLD_COLOR, fontWeight: 600 }}>{Math.round(stats.goalPercent)}%</span>
                                <span style={{ color: '#666', fontSize: '0.9rem' }}>of {formatCurrency(currentUser.targetSavings)}</span>
                                <button onClick={() => setIsEditingGoal(true)} style={{background:'none',border:'none',cursor:'pointer', marginLeft: '8px'}}><Edit2 size={14} color="#666"/></button>
                             </div>
                         )}
                     </div>
                     <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                         <div style={{ width: `${stats.goalPercent}%`, height: '100%', background: `linear-gradient(90deg, ${DARK_GOLD}, ${GOLD_COLOR})`, transition: 'width 1s ease' }}></div>
                     </div>
                  </div>
             </div>


            <div className="filter-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                     <div style={{ background: '#111', borderRadius: '8px', padding: '4px', display: 'flex', border: '1px solid #222' }}>
                        <button onClick={() => setPreset('THIS_WEEK')} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>WEEK</button>
                        <button onClick={() => setPreset('THIS_MONTH')} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>MONTH</button>
                        <button onClick={() => setPreset('ALL')} style={{ padding: '8px 16px', background: '#222', borderRadius: '4px', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>ALL</button>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ background: '#111', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '4px' }} />
                        <span style={{ color: '#444' }}>—</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ background: '#111', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '4px' }} />
                        <button onClick={() => setPreset('ALL')} title="Clear Filter" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><RotateCcw size={16} color="#666"/></button>
                     </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => setManualFormOpen(!manualFormOpen)} style={{ ...styles.primaryBtn, background: '#111', color: '#fff', border: '1px solid #333', padding: '12px 24px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={16} /> Manual Entry</button>
                    <label style={{ ...styles.primaryBtn, background: GOLD_COLOR, color: '#000', border: 'none', padding: '12px 24px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Upload size={16} /> Upload Excel <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} /></label>
                </div>
            </div>

            {manualFormOpen && (
                <div style={{ ...styles.glassPanel, padding: '24px', marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}><label style={{ display: 'block', color: '#666', fontSize: '0.7rem', marginBottom: '8px' }}>DESCRIPTION</label><input style={styles.input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Starbucks, Rent, etc." /></div>
                    <div style={{ flex: '1 1 100px' }}><label style={{ display: 'block', color: '#666', fontSize: '0.7rem', marginBottom: '8px' }}>AMOUNT ({currency})</label><input type="number" style={styles.input} value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00" /></div>
                    <div style={{ flex: '1 1 120px' }}>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.7rem', marginBottom: '8px' }}>TYPE</label>
                        <select style={{...styles.input, height: '42px'}} value={type} onChange={e => setType(e.target.value as any)}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>
                     <div style={{ flex: '1 1 120px' }}>
                        <label style={{ display: 'block', color: '#666', fontSize: '0.7rem', marginBottom: '8px' }}>CATEGORY</label>
                        {type === 'expense' ? (
                            <select style={{...styles.input, height: '42px'}} value={category} onChange={e => setCategory(e.target.value)}>
                                {CATEGORY_BUCKETS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        ) : (
                             <input style={{...styles.input, height: '42px'}} disabled value="Income" />
                        )}
                    </div>
                    <button onClick={handleAddManual} style={{ ...styles.primaryBtn, padding: '0 32px', height: '42px' }}>ADD</button>
                </div>
            )}

            <div className="dash-charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '40px' }}>
                 <div style={{ ...styles.glassPanel, padding: '32px', height: '450px' }}>
                    <IncomeExpenseChart transactions={filteredTransactions} startDate={startDate} endDate={endDate} />
                 </div>
                 <div style={{ ...styles.glassPanel, padding: '32px', height: '450px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                         <h4 style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Capital Allocation</h4>
                         <select 
                            value={allocationView} 
                            onChange={(e) => setAllocationView(e.target.value as any)} 
                            style={{ background: '#111', border: '1px solid #333', color: '#888', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}
                         >
                             <option value="Category">BY CATEGORY</option>
                             <option value="Source">BY SOURCE</option>
                         </select>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <DonutChart data={chartData} title={allocationView} />
                    </div>
                 </div>
            </div>

            <div style={{ ...styles.glassPanel, padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                     <h3 style={{ ...styles.heading, fontSize: '1.2rem' }}>Activity Log</h3>
                     {transactions.length > 0 && (
                         showDeleteConfirm ? (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                 <span style={{ color: '#f44336', fontSize: '0.8rem', fontWeight: 600 }}>Destroy all data?</span>
                                 <button onClick={handlePurgeAll} style={{ background: '#f44336', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>CONFIRM</button>
                                 <button onClick={() => setShowDeleteConfirm(false)} style={{ background: '#333', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>CANCEL</button>
                             </div>
                         ) : (
                             <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'transparent', border: '1px solid #333', color: '#666', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <Trash2 size={12} /> PURGE HISTORY
                             </button>
                         )
                     )}
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {filteredTransactions.map(t => (
                        <div key={t.id} style={{ padding: '16px 0', borderBottom: '1px solid #1a1a1a' }}>
                            {editingTxn === t.id ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                                    <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} style={{...styles.input, padding: '8px'}} />
                                    <input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} style={{...styles.input, padding: '8px'}} />
                                    <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} style={{...styles.input, padding: '8px'}} />
                                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} style={{...styles.input, padding: '8px'}}>
                                         {CATEGORY_BUCKETS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={saveEdit} style={{ background: '#4caf50', border: 'none', borderRadius: '4px', padding: '6px' }}><Check size={14} color="#fff" /></button>
                                        <button onClick={() => setEditingTxn(null)} style={{ background: '#f44336', border: 'none', borderRadius: '4px', padding: '6px' }}><X size={14} color="#fff" /></button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div><div style={{ color: '#fff', fontWeight: 500, marginBottom: '4px' }}>{t.description}</div><div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}><span style={{ color: '#666' }}>{new Date(t.date).toLocaleDateString()}</span><span style={{ color: '#444' }}>•</span><span style={{ color: GOLD_COLOR }}>{t.category}</span></div></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{ color: t.type === 'income' ? '#4caf50' : '#fff', fontWeight: 600, fontFamily: 'Inter' }}>{t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}</span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => startEditing(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Edit2 size={14} color="#666" /></button>
                                            <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} color="#666" /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [user, setUser] = useState<UserProfile | null>(null);

  return (
    <div style={styles.container}>
      <CoinRain />
      {view === 'LANDING' && ( <LandingPage onGetStarted={() => setView('AUTH')} /> )}
      {view === 'AUTH' && ( <AuthPage onBack={() => setView('LANDING')} onAuthSuccess={(u) => { setUser(u); setView('DASHBOARD'); }} /> )}
      {view === 'DASHBOARD' && user && ( <Dashboard user={user} onLogout={() => { setUser(null); setView('LANDING'); }} /> )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
