import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../Context/Auth';
import IconDark from '../../images/logo/icon-dark.png';
import IconLight from '../../images/logo/icon-light.png';
import DarkModeSwitcher from '../../components/Header/DarkModeSwitcher';
import {
  MdArrowForward,
  MdCheckCircle,
  MdInventory,
  MdReceiptLong,
  MdAccountBalanceWallet,
  MdWarehouse,
  MdPhone,
  MdStorefront,
  MdEmail,
  MdLocationOn,
  MdLanguage,
  MdCode,
  MdSupportAgent,
  MdOpenInNew
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import {
  LuActivity,
  LuCpu,
  LuSparkles,
  LuCheck
} from 'react-icons/lu';

const CompanyLanding: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeLogIndex, setActiveLogIndex] = useState(0);

  const logs = [
    { tag: 'SYSTEM', text: 'ERP Core Engine :: Node 01 Online (0.8ms)' },
    { tag: 'AUDIT', text: 'Dual-entry ledger balance verified :: Zero discrepancy' },
    { tag: 'INVENTORY', text: 'Multi-godown stock balances reconciled across counters' },
    { tag: 'SECURITY', text: 'Session authenticated :: 256-bit SSL encrypted stream' },
    { tag: 'DISPATCH', text: 'Digital invoicing & barcode gatepass queue clear' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLogIndex((prev) => (prev + 1) % logs.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [logs.length]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] text-slate-800 dark:text-slate-100 font-sans flex flex-col selection:bg-emerald-600 selection:text-white relative overflow-x-hidden transition-colors duration-200">
      
      {/* ── Ambient Background Glow Meshes ── */}
      <div className="pointer-events-none absolute -top-40 left-1/4 w-[750px] h-[550px] bg-gradient-to-br from-emerald-500/10 dark:from-emerald-600/12 via-teal-500/8 dark:via-teal-600/10 to-transparent rounded-full blur-[150px]" />
      <div className="pointer-events-none absolute top-[35%] -right-40 w-[650px] h-[500px] bg-gradient-to-bl from-blue-500/8 dark:from-blue-600/10 via-emerald-500/8 dark:via-emerald-600/10 to-transparent rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-[550px] h-[450px] bg-gradient-to-tr from-teal-500/8 dark:from-teal-600/8 to-transparent rounded-full blur-[160px]" />

      {/* ── 1. GLASSMORPHIC HEADER COMPONENT ── */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#060B17]/85 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          
          {/* Logo & Brand Architecture */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 p-1 flex items-center justify-center shadow-md shrink-0">
              <img src={IconDark} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
              <img src={IconLight} alt="Logo" className="w-full h-full object-contain block dark:hidden" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-sm sm:text-base tracking-tight leading-tight">
                <span className="text-emerald-600 dark:text-emerald-400">UZAIR JIBRAN</span>
                <span className="text-slate-900 dark:text-white">CLOTH</span>
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase font-semibold">
                Textile & Wholesale ERP System
              </p>
            </div>
          </div>

          {/* Smooth-Scroll Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => scrollToSection('core-engine')}
              className="hover:text-slate-950 dark:hover:text-white transition duration-150 cursor-pointer"
            >
              Core Engine
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('developer-contact')}
              className="hover:text-slate-950 dark:hover:text-white transition duration-150 cursor-pointer"
            >
              Developer & Tech
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('security-protocol')}
              className="hover:text-slate-950 dark:hover:text-white transition duration-150 cursor-pointer"
            >
              Security Protocol
            </button>
          </nav>

          {/* Theme Switcher & High-Contrast Button (White on dark, Black on light) */}
          <div className="flex items-center gap-3">
            <ul className="flex items-center m-0 list-none">
              <DarkModeSwitcher />
            </ul>

            <NavLink
              to={isAuthenticated ? "/dashboard" : "/signin"}
              className="inline-flex items-center gap-2 px-4.5 py-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-black dark:hover:bg-slate-100 font-bold text-xs shadow-md shadow-black/10 dark:shadow-white/10 hover:shadow-lg transition duration-200 cursor-pointer"
            >
              <span>{isAuthenticated ? "Enter Dashboard" : "Portal Access"}</span>
              <MdArrowForward className="text-sm" />
            </NavLink>
          </div>
        </div>
      </header>

      {/* ── 2. SPLIT-SCREEN HERO COMPONENT ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Typography & High-Contrast CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            {/* Release Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-bold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>TEXTILE ERP ECOSYSTEM • RELEASE V2.4</span>
            </div>

            {/* H1 Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[46px] font-black tracking-tight text-slate-950 dark:text-white leading-[1.15]">
              The Operating System for Modern Textile & Cloth Enterprise.
            </h1>

            {/* Subtitle Details */}
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              Consolidate high-volume cloth distribution, multi-godown fabric inventory, computerized wholesale billing, and customer credit ledgers into a single, synchronized source of truth.
            </p>

            {/* Dual Button Group (High-contrast: White on dark theme, Black on light theme) */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <NavLink
                to={isAuthenticated ? "/dashboard" : "/signin"}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-black dark:hover:bg-slate-100 font-extrabold text-xs sm:text-sm shadow-xl shadow-black/15 dark:shadow-white/15 hover:-translate-y-0.5 transition duration-200 cursor-pointer"
              >
                <span>{isAuthenticated ? "Launch Executive Portal" : "Launch Client Portal"}</span>
                <MdArrowForward size={16} />
              </NavLink>

              <button
                type="button"
                onClick={() => scrollToSection('core-engine')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-sm transition duration-200 cursor-pointer"
              >
                <span>Explore Capabilities</span>
                <span className="text-emerald-600 dark:text-emerald-400">↓</span>
              </button>
            </div>

            {/* High-Reliability Metrics Banner */}
            <div className="pt-6 grid grid-cols-3 gap-3 border-t border-slate-200 dark:border-slate-800/80 max-w-lg">
              <div>
                <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">100%</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  Audit Precision
                </p>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">&lt; 1s</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  Invoice Generation
                </p>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">Real-Time</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  Godown Sync
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: 3D-Layered Simulation Block */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Top Glass Card: Distribution Velocity Preview */}
            <div className="bg-white dark:bg-[#0B101D]/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-xl dark:shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/30 transition duration-300">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Commercial Invoicing & Dispatch Engine
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold">
                  LIVE SECURE ENCLAVE
                </span>
              </div>

              {/* Sample Operational Metrics */}
              <div className="grid grid-cols-3 gap-2 py-4">
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">Fiscal Velocity</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">Verified</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-0.5 mt-0.5">
                    ↑ Dual-Entry Balanced
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">Inventory Status</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">Active</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-mono mt-0.5">Shop + Godowns</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">Pending Dispatch</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">0 Queued</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">All Challans Cleared</p>
                </div>
              </div>

              {/* Interactive SVG Inflow Wave Simulation */}
              <div className="h-28 w-full relative pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Shaded Area */}
                  <path
                    d="M 0,75 Q 70,30 140,55 T 280,35 T 400,20 L 400,100 L 0,100 Z"
                    fill="url(#waveGradient)"
                  />
                  {/* Wave Line */}
                  <path
                    d="M 0,75 Q 70,30 140,55 T 280,35 T 400,20"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Telemetry Dots */}
                  <circle cx="70" cy="50" r="3.5" fill="#10B981" className="animate-pulse" />
                  <circle cx="210" cy="45" r="3.5" fill="#10B981" className="animate-pulse" />
                  <circle cx="340" cy="27" r="3.5" fill="#10B981" className="animate-pulse" />
                </svg>
                <div className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-400">
                  Continuous Ledger Velocity Simulation
                </div>
              </div>
            </div>

            {/* Split Bottom Simulation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Left Mini-Card: Stock Accuracy Index */}
              <div className="bg-white dark:bg-[#0B101D]/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4.5 shadow-lg backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                    Ledger Consistency
                  </span>
                  <LuActivity className="text-emerald-600 dark:text-emerald-400 text-sm" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">100%</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Synchronized</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Automatic double-entry verification between physical yard and computer ledgers.
                </p>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-full" />
                </div>
              </div>

              {/* Right Mini-Card: Minimalist Daemon Console (Sleek Dark Enclave) */}
              <div className="bg-[#070B14] border border-slate-800/90 rounded-2xl p-4.5 shadow-lg space-y-2 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                    <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                    <span className="ml-1 text-slate-300 font-bold">UJC_DAEMON</span>
                  </div>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> ACTIVE
                  </span>
                </div>

                <div className="text-[10px] space-y-1.5 text-left pt-1 min-h-[75px]">
                  <p className="text-slate-400">
                    <span className="text-emerald-400 font-bold">[{logs[activeLogIndex].tag}]</span> {logs[activeLogIndex].text}
                  </p>
                  <p className="text-slate-400">
                    <span className="text-teal-400 font-bold">[DATABASE]</span> PostgreSQL Connection Pool :: Verified
                  </p>
                  <p className="text-slate-400">
                    <span className="text-slate-500 font-bold">[BACKUP]</span> Hourly delta snapshots encrypted
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ── 3. OPERATIONAL CAPABILITIES RIBBON ── */}
      <section className="border-y border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#060A14]/70 py-4.5 px-4 text-center transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-mono text-slate-600 dark:text-slate-400">
          <span className="text-slate-800 dark:text-slate-300 uppercase tracking-wider font-bold">ERP ARCHITECTURE —</span>
          <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
            <LuCheck className="text-emerald-600 dark:text-emerald-400" /> Multi-Godown Stock
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
            <LuCheck className="text-emerald-600 dark:text-emerald-400" /> Wholesale Barcode Invoicing
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
            <LuCheck className="text-emerald-600 dark:text-emerald-400" /> Delivery Challan Queues
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
            <LuCheck className="text-emerald-600 dark:text-emerald-400" /> Customer Credit Controls
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
            <LuCheck className="text-emerald-600 dark:text-emerald-400" /> City & Area Master Mapping
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition">
            <LuCheck className="text-emerald-600 dark:text-emerald-400" /> Instant Trial Balance
          </span>
        </div>
      </section>

      {/* ── 4. FEATURE MATRIX COMPONENT (3-COLUMN) ── */}
      <section id="core-engine" className="py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 text-center">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
          <LuSparkles /> Precision Engineered Capabilities
        </div>

        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white max-w-3xl mx-auto">
          Built for High-Velocity Textile & Cloth Distribution
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
          Designed specifically for cloth merchants, wholesalers, and retail chains requiring uncompromising audit accuracy and zero operational latency.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          
          {/* Card 1: Invoicing & Challans */}
          <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 sm:p-7 shadow-lg dark:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                <MdReceiptLong />
              </div>
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                Module 01 • Billing Core
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Smart Digital Invoicing</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automated sales bills with instant barcode lookup, multi-rate tiers, customer discounts, and integrated delivery challan gate passes.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400">
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Barcode Dispatch</span>
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Delivery Challan</span>
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Return Credits</span>
            </div>
          </div>

          {/* Card 2: Fabric & Thaan Inventory */}
          <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 sm:p-7 shadow-lg dark:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/25 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                <MdInventory />
              </div>
              <span className="text-[10px] font-mono uppercase font-bold text-teal-600 dark:text-teal-400 tracking-wider">
                Module 02 • Stock Lifecycle
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fabric & Thaan Inventory</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Detailed metre and thaan tracking across Shop Counters, Main Warehouse, and Godowns. Inter-location transfer orders with holding gatepass queue.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400">
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Thaan / Metre Units</span>
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Godown Transfers</span>
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Reorder Alerts</span>
            </div>
          </div>

          {/* Card 3: Financial Ledgers */}
          <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 sm:p-7 shadow-lg dark:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                <MdAccountBalanceWallet />
              </div>
              <span className="text-[10px] font-mono uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                Module 03 • Fiscal Ledger
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer & Fiscal Ledgers</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Authoritative double-entry general ledger, daily cash daybook, vendor payables register, and 0–90+ day customer debt aging statements.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400">
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">General Ledger</span>
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Daily Cash Daybook</span>
              <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">Trial Balance</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── 5. SYSTEM ARCHITECT & DEVELOPER CONSTELLATION TOPOLOGY ── */}
      <section id="developer-contact" className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/60 dark:bg-[#060913]/60 relative z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: NHT Enterprises & Abdul Sattar Profile */}
            <div className="lg:col-span-5 space-y-5 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 text-[11px] font-mono font-bold uppercase tracking-wider">
                SOFTWARE ENGINEERING &amp; DEVELOPMENT
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                NHT ENTERPRISES
              </h2>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono -mt-2">
                Abdul Sattar — NHT ENTERPRISES
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                Developed and maintained natively by <strong className="text-slate-900 dark:text-white font-semibold">Abdul Sattar</strong>. Specialized in bespoke textile ERP solutions, high-velocity wholesale invoicing, multi-godown fabric inventory, and encrypted double-entry financial engines.
              </p>
              
              {/* Stat Callouts matching Stitch mockup */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-mono">
                    100%
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Ledger Audit Precision
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    24/7
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Direct Developer Support
                  </div>
                </div>
              </div>

              {/* Developer Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <a
                  href="https://wa.me/923128039911?text=Hello%20Abdul%20Sattar,%20I%20am%20interested%20in%20a%20custom%20ERP%20or%20software%20solution."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:-translate-y-0.5 transition duration-200 cursor-pointer"
                >
                  <FaWhatsapp className="text-sm" />
                  <span>Chat on WhatsApp: +92 312 8039911</span>
                </a>
                <a
                  href="mailto:nht@noorhorizontechnologies.com"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm transition duration-200 cursor-pointer"
                >
                  <MdEmail className="text-sm text-blue-500" />
                  <span>Email Inquiries</span>
                </a>
              </div>
            </div>

            {/* Right: Stitch-Styled Constellation Topology Diagram with REAL Details */}
            <div className="lg:col-span-7 bg-white dark:bg-[#090E1A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl dark:shadow-2xl relative transition-colors duration-200">
              
              {/* Top Meta Bar */}
              <div className="flex flex-wrap justify-between items-center text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-6 gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-blue-600 dark:text-blue-400">🌐</span>
                  <span>NHT ENTERPRISES • DEVELOPER NETWORK</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  HYDERABAD, SINDH, PAKISTAN
                </span>
              </div>

              {/* Radial Constellation Interactive Canvas */}
              <div className="relative h-64 sm:h-72 w-full bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800/60 p-4 overflow-hidden flex items-center justify-center">
                
                {/* SVG Connecting Dashed Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="50" y1="50" x2="24" y2="24" stroke="currentColor" strokeDasharray="3 3" className="text-blue-400/70 dark:text-blue-400/50" strokeWidth="1.2" />
                  <line x1="50" y1="50" x2="76" y2="24" stroke="currentColor" strokeDasharray="3 3" className="text-blue-400/70 dark:text-blue-400/50" strokeWidth="1.2" />
                  <line x1="50" y1="50" x2="24" y2="76" stroke="currentColor" strokeDasharray="3 3" className="text-blue-400/70 dark:text-blue-400/50" strokeWidth="1.2" />
                  <line x1="50" y1="50" x2="76" y2="76" stroke="currentColor" strokeDasharray="3 3" className="text-blue-400/70 dark:text-blue-400/50" strokeWidth="1.2" />
                </svg>

                {/* Node 1: Top Left - Abdul Sattar */}
                <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-sm text-[11px] font-mono text-slate-800 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Abdul Sattar</span>
                  </div>
                </div>

                {/* Node 2: Top Right - Direct WhatsApp */}
                <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10">
                  <a
                    href="https://wa.me/923128039911"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-sm text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:border-emerald-500 transition cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>WhatsApp: +92 312 8039911</span>
                  </a>
                </div>

                {/* Center: NHT Enterprises Core Node */}
                <div className="relative z-20 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-white dark:ring-slate-900">
                    <LuCpu className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-mono font-black tracking-wider text-slate-900 dark:text-slate-100 mt-2 bg-white/95 dark:bg-slate-900/95 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
                    NHT ENTERPRISES
                  </span>
                </div>

                {/* Node 3: Bottom Left - Office Location */}
                <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-sm text-[11px] font-mono text-slate-800 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Hyderabad, Sindh (Affandi Town)</span>
                  </div>
                </div>

                {/* Node 4: Bottom Right - Official Email */}
                <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-10">
                  <a
                    href="mailto:nht@noorhorizontechnologies.com"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-sm text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:border-blue-500 transition cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>nht@noorhorizontechnologies.com</span>
                  </a>
                </div>

              </div>

              {/* Bottom Meta Bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 gap-2">
                <span>PORTAL: noorhorizontechnologies.com (COMING SOON)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wider">
                  DEVELOPER STATUS: ONLINE &amp; ACTIVE
                </span>
              </div>

              {/* Physical Office Detailed Address Strip */}
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 gap-2">
                <span className="flex items-center gap-1.5">
                  <MdLocationOn className="text-amber-500 text-xs shrink-0" />
                  Office Near Chohan Kanta, Faizan E Madina Road, Affandi Town, Hyderabad, Sindh, Pakistan
                </span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  NHT ENTERPRISES
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 6. CONVERSION CTA CARD COMPONENT ── */}
      <section className="py-16 sm:py-20 relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-gradient-to-b from-white to-slate-100 dark:from-[#0D1527] dark:to-[#080D18] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 rounded-3xl p-8 sm:p-12 shadow-xl dark:shadow-2xl relative overflow-hidden transition duration-300">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25 text-[11px] font-mono font-bold uppercase mb-4">
            <LuSparkles /> High-Velocity Operational Modernization
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white max-w-2xl mx-auto">
            Ready to streamline your cloth wholesale & retail operations?
          </h2>

          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-xl mx-auto mt-3 leading-relaxed">
            Consolidate your fabric inventory, wholesale customer bills, and accounting ledgers into a secure, computerized ERP designed for rapid commercial growth.
          </p>

          {/* High-contrast CTA buttons: White on dark theme, Black on light theme */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-8">
            <NavLink
              to={isAuthenticated ? "/dashboard" : "/signin"}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-black dark:hover:bg-slate-100 font-extrabold text-xs sm:text-sm shadow-xl shadow-black/15 dark:shadow-white/15 hover:-translate-y-0.5 transition duration-200 cursor-pointer"
            >
              <span>{isAuthenticated ? "Enter Executive Dashboard" : "Access Portal Core"}</span>
              <MdArrowForward size={16} />
            </NavLink>

            <a
              href="https://wa.me/923128039911"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-800 hover:border-emerald-500/40 shadow-sm transition duration-200 cursor-pointer"
            >
              <MdPhone className="text-emerald-600 dark:text-emerald-400" />
              <span>Contact Business Hotline</span>
            </a>
          </div>

          <div id="security-protocol" className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap justify-center items-center gap-6 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><MdCheckCircle className="text-emerald-600 dark:text-emerald-400" /> 100% Financial Reconciliation</span>
            <span className="flex items-center gap-1.5"><MdCheckCircle className="text-emerald-600 dark:text-emerald-400" /> Multi-Godown Audited</span>
            <span className="flex items-center gap-1.5"><MdCheckCircle className="text-emerald-600 dark:text-emerald-400" /> Direct WhatsApp Support</span>
          </div>
        </div>
      </section>

      {/* ── 7. EXECUTIVE FOOTER COMPONENT ── */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-[#02050B] py-8 text-xs text-slate-500 dark:text-slate-400 relative z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">
              SYSTEMS OPERATIONAL • POSTGRESQL ACTIVE • 256-BIT SSL ENCRYPTED
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <NavLink to={isAuthenticated ? "/dashboard" : "/signin"} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Client Portal
            </NavLink>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a href="https://wa.me/923128039911" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Hotline Support
            </a>
          </div>

          <div className="text-center sm:text-right text-[11px]">
            Engineered and maintained natively by <span className="text-slate-700 dark:text-slate-300 font-semibold">NHT ENTERPRISES (Abdul Sattar)</span> for <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Uzair Jibran Cloth</span>.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default CompanyLanding;
