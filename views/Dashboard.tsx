
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Wallet, Home, Landmark, Globe, User, Filter, 
  BarChart3, ChevronDown, Calendar, ArrowUpRight, Clock 
} from 'lucide-react';

// Deterministic color generator based on string hash
const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 65%, 45%)`;
};

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const isZh = settings.language === 'zh';

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    data.汇率.forEach(rate => {
      if (rate.基准币种) currencies.add(rate.基准币种);
      if (rate.报价币种) currencies.add(rate.报价币种);
    });
    data.账户.forEach(acc => { if (acc.币种) currencies.add(acc.币种); });
    data.固定资产.forEach(asset => { if (asset.币种) currencies.add(asset.币种); });
    data.流动资产记录.forEach(r => { if (r.币种) currencies.add(r.币种); });
    if (settings.baseCurrency) currencies.add(settings.baseCurrency);
    if (currencies.size === 0) currencies.add('CNY');
    return Array.from(currencies).filter(Boolean).sort();
  }, [data, settings.baseCurrency]);

  const [displayCurrency, setDisplayCurrency] = useState<string>(
    availableCurrencies.includes('CNY') ? 'CNY' : (availableCurrencies[0] || 'CNY')
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [snapshotTypeFilter, setSnapshotTypeFilter] = useState<'all' | 'liquid' | 'fixed'>('liquid');
  const [trendType, setTrendType] = useState<'total' | 'liquid' | 'fixed'>('liquid');

  const exchangeRatesMap = useMemo(() => {
    const rates: Record<string, number> = {};
    const base = displayCurrency;
    rates[base] = 1;
    const adj: Record<string, Record<string, number>> = {};
    const sortedRates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    
    sortedRates.forEach(r => {
      const b = r.基准币种; const q = r.报价币种; const val = Number(r.汇率);
      if (!b || !q || isNaN(val) || val === 0) return;
      if (!adj[b]) adj[b] = {}; if (!adj[b][q]) adj[b][q] = val;
      if (!adj[q]) adj[q] = {}; if (!adj[q][b]) adj[q][b] = 1 / val;
    });

    const visited = new Set<string>();
    const queue: Array<{ node: string; factor: number }> = [{ node: base, factor: 1 }];
    visited.add(base);
    while (queue.length > 0) {
      const { node, factor } = queue.shift()!;
      rates[node] = factor;
      if (adj[node]) {
        for (const [neighbor, edgeRate] of Object.entries(adj[node])) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({ node: neighbor, factor: factor * edgeRate });
          }
        }
      }
    }
    return rates;
  }, [data.汇率, displayCurrency]);

  const normalizeRisk = (level: string, isZh: boolean) => {
    const mapping: any = { '极高': 'Very High', '高': 'High', '中': 'Medium', '低': 'Low', '未知': 'Unknown' };
    const standard = mapping[level] || level || 'Unknown';
    const reverseMap: any = { 'Very High': isZh ? '极高' : 'Very High', 'High': isZh ? '高' : 'High', 'Medium': isZh ? '中' : 'Medium', 'Low': isZh ? '低' : 'Low', 'Unknown': isZh ? '未知' : 'Unknown' };
    return reverseMap[standard] || standard;
  };

  const RISK_COLORS: Record<string, string> = {
    'Low': '#10b981', '低': '#10b981',
    'Medium': '#f59e0b', '中': '#f59e0b',
    'High': '#ef4444', '高': '#ef4444',
    'Very High': '#7f1d1d', '极高': '#7f1d1d',
    'Unknown': '#94a3b8', '未知': '#94a3b8'
  };

  const calculations = useMemo(() => {
    const convert = (amount: number, currency: string) => {
      if (!amount) return 0;
      if (currency === displayCurrency) return amount;
      const rateFactor = exchangeRatesMap[currency];
      return rateFactor ? amount / rateFactor : 0;
    };

    // Robust color resolution helper
    const resolveColor = (acc: any, type: 'liquid' | 'fixed') => {
      if (type === 'liquid') {
        const instById = data.机构.find(i => i.机构ID === acc.机构ID);
        if (instById?.代表色HEX) return instById.代表色HEX;
        
        const instByName = data.机构.find(i => i.机构名称 === acc.机构名称);
        if (instByName?.代表色HEX) return instByName.代表色HEX;
        
        return generateColorFromString(acc.机构名称 || acc.账户昵称 || 'Default');
      } else {
        const fixedAssetColors: Record<string, string> = {
          '房地产': '#6366f1', '车辆': '#06b6d4', '股权': '#8b5cf6', '珠宝': '#f43f5e', '其他': '#64748b'
        };
        return fixedAssetColors[acc.固定资产类型] || generateColorFromString(acc.资产昵称 || 'Fixed');
      }
    };

    const allLatestLiquid = data.账户.map(acc => {
      const records = data.流动资产记录.filter(r => r.账户ID === acc.账户ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const val = latest ? Number(latest.市值) || 0 : 0;
      const cur = latest ? latest.币种 : acc.币种;
      return { 
        ...acc, 
        latestVal: val, 
        latestCur: cur, 
        latestDate: latest ? latest.时间 : '—',
        converted: convert(val, cur), 
        risk: normalizeRisk(acc.风险评估, isZh), 
        type: 'liquid',
        resolvedColor: resolveColor(acc, 'liquid')
      };
    });

    const allLatestFixed = data.固定资产.map(asset => {
      const records = data.固定资产记录.filter(r => r.资产ID === asset.资产ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const val = latest ? Number(latest.估值) || 0 : Number(asset.购入价格) || 0;
      const cur = latest ? latest.币种 : asset.币种;
      return { 
        ...asset, 
        latestVal: val, 
        latestCur: cur, 
        latestDate: latest ? latest.时间 : (asset.购入时间 || '—'),
        converted: convert(val, cur), 
        risk: isZh ? '低' : 'Low', 
        type: 'fixed',
        resolvedColor: resolveColor(asset, 'fixed')
      };
    });

    const filteredLiquid = selectedMemberId === 'all' ? allLatestLiquid : allLatestLiquid.filter(a => a.成员ID === selectedMemberId);
    const filteredFixed = selectedMemberId === 'all' ? allLatestFixed : allLatestFixed.filter(a => a.成员ID === selectedMemberId);
    
    let loansList = data.借入借出记录.filter(l => l.结清 !== '是');
    if (selectedMemberId !== 'all') loansList = loansList.filter(l => l.成员ID === selectedMemberId);
    const loanNet = loansList.reduce((sum, l) => {
      const converted = convert(Number(l.借款额) || 0, l.币种);
      return sum + (l.借入借出 === '借入' ? -converted : converted);
    }, 0);

    const liquidTotal = filteredLiquid.reduce((s, i) => s + i.converted, 0);
    const fixedTotal = filteredFixed.reduce((s, i) => s + i.converted, 0);
    const netWorth = liquidTotal + fixedTotal + loanNet;

    const trendData = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const calcTotalAt = (type: string) => {
        let sum = 0;
        if (type === 'total' || type === 'liquid') {
          data.账户.forEach(acc => {
            if (selectedMemberId !== 'all' && acc.成员ID !== selectedMemberId) return;
            const records = data.流动资产记录.filter(r => r.账户ID === acc.账户ID && r.时间 <= monthStr + '-31').sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
            if (records[0]) sum += convert(Number(records[0].市值) || 0, records[0].币种);
          });
        }
        if (type === 'total' || type === 'fixed') {
          data.固定资产.forEach(asset => {
            if (selectedMemberId !== 'all' && asset.成员ID !== selectedMemberId) return;
            const records = data.固定资产记录.filter(r => r.资产ID === asset.资产ID && r.时间 <= monthStr + '-31').sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
            if (records[0]) sum += convert(Number(records[0].估值) || 0, records[0].币种);
            else sum += convert(Number(asset.购入价格) || 0, asset.币种);
          });
        }
        return Math.round(sum);
      };
      trendData.push({ name: monthStr, value: calcTotalAt(trendType) });
    }

    const RISK_LEVELS = isZh ? ['极高', '高', '中', '低', '未知'] : ['Very High', 'High', 'Medium', 'Low', 'Unknown'];
    const barData = [];
    const buildRiskRow = (name: string, assets: any[]) => {
      const row: any = { name };
      const total = assets.reduce((s, i) => s + Math.max(0, i.converted), 0);
      RISK_LEVELS.forEach(level => {
        const val = assets.filter(i => i.risk === level).reduce((s, i) => s + Math.max(0, i.converted), 0);
        row[level] = total > 0 ? (val / total) * 100 : (level === (isZh ? '未知' : 'Unknown') ? 100 : 0);
        row[`${level}_val`] = val;
      });
      return row;
    };
    barData.push(buildRiskRow(isZh ? '全家' : 'Family', allLatestLiquid));
    data.成员.forEach(m => {
      const mAssets = allLatestLiquid.filter(i => i.成员ID === m.成员ID);
      if (mAssets.length > 0) barData.push(buildRiskRow(m.成员昵称, mAssets));
    });

    let snapshots = [];
    if (snapshotTypeFilter === 'all') snapshots = [...filteredLiquid, ...filteredFixed];
    else if (snapshotTypeFilter === 'liquid') snapshots = filteredLiquid;
    else snapshots = filteredFixed;
    snapshots = snapshots.sort((a, b) => b.converted - a.converted);

    return { netWorth, liquidTotal, fixedTotal, loanNet, trendData, snapshots, barData, RISK_LEVELS };
  }, [data, displayCurrency, selectedMemberId, trendType, snapshotTypeFilter, isZh, exchangeRatesMap]);

  const StatCard = ({ label, value, icon, colorClass, grad }: any) => (
    <div className="glass-card rounded-[32px] p-8 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg border-white/60 min-h-[160px] w-full transition-all hover:scale-[1.02] hover:shadow-2xl">
      <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${grad} rounded-full blur-[50px] opacity-40 group-hover:scale-150 transition-transform duration-1000`}></div>
      <div className="flex items-center gap-4 relative z-10 mb-4">
        <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center bg-white shadow-md ${colorClass}`}>
          {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
        </div>
        <span className="text-sm lg:text-base font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="relative z-10 flex items-baseline gap-3">
        <span className={`text-3xl lg:text-4xl xl:text-5xl font-black tracking-tighter truncate leading-none ${value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
          {Math.round(value).toLocaleString()}
        </span>
        <span className="text-xs lg:text-sm font-black text-slate-400 uppercase tracking-tighter">{displayCurrency}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full px-2 sm:px-6 lg:px-10 max-w-full overflow-x-hidden">
      
      {/* Row 1: Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-10">
        <StatCard label={isZh ? "净资产" : "NET WORTH"} value={calculations.netWorth} icon={<TrendingUp />} colorClass="text-indigo-600" grad="from-indigo-500/30 to-blue-500/10" />
        <StatCard label={isZh ? "流动资产" : "LIQUID"} value={calculations.liquidTotal} icon={<Wallet />} colorClass="text-emerald-600" grad="from-emerald-500/30 to-teal-500/10" />
        <StatCard label={isZh ? "固定资产" : "FIXED"} value={calculations.fixedTotal} icon={<Home />} colorClass="text-amber-600" grad="from-orange-500/30 to-amber-500/10" />
        <StatCard label={isZh ? "债务净额" : "NET LOANS"} value={calculations.loanNet} icon={<Landmark />} colorClass="text-purple-600" grad="from-pink-500/30 to-purple-500/10" />
      </div>

      <div className="glass-card rounded-[48px] border-white/60 shadow-2xl overflow-hidden flex flex-col bg-white/20 backdrop-blur-xl">
        <div className="p-10 lg:p-14 border-b border-white/20 bg-white/40 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 xl:gap-10">
            <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-200"><ArrowUpRight size={28} strokeWidth={3} /></div>
            <div className="flex flex-col">
              <h3 className="text-3xl lg:text-5xl font-black text-slate-800 tracking-tighter leading-none">{isZh ? '核心资产透视' : 'Core Asset Perspective'}</h3>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                   {isZh ? '当前基准汇率:' : 'FX BENCHMARK:'}
                </p>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {availableCurrencies.filter(c => c !== displayCurrency && (c === 'CNY' || c === 'USD' || c === 'HKD')).map(curr => {
                    const rate = exchangeRatesMap[curr] || 0;
                    return (
                      <span key={curr} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100/50 whitespace-nowrap shadow-sm">
                        {isZh ? (curr === 'CNY' ? '兑换人民币' : curr === 'HKD' ? '兑换港币' : `兑换${curr}`) : `to ${curr}`}: {rate > 0 ? rate.toFixed(2) : '--'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 lg:gap-6">
            <div className="flex items-center gap-4 bg-white/80 px-6 py-3 rounded-[24px] border border-white shadow-sm hover:shadow-md transition-all">
              <User size={18} className="text-slate-400" />
              <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="bg-transparent border-none outline-none font-black text-slate-700 text-sm lg:text-base cursor-pointer appearance-none pr-6">
                <option value="all">{isZh ? '全家视角' : 'Family'}</option>
                {data.成员.map(m => <option key={m.成员ID} value={m.成员ID}>{m.成员昵称}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4 bg-white/80 px-6 py-3 rounded-[24px] border border-white shadow-sm hover:shadow-md transition-all">
              <Globe size={18} className="text-blue-500" />
              <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="bg-transparent border-none outline-none font-black text-slate-700 text-sm lg:text-base cursor-pointer appearance-none pr-2">
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex bg-slate-900/10 p-1.5 rounded-[24px] border border-white/40">
              {(['total', 'liquid', 'fixed'] as const).map(t => (
                <button key={t} onClick={() => setTrendType(t)} className={`px-5 py-2 rounded-[20px] text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${trendType === t ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  {t === 'total' ? (isZh ? '总值' : 'Total') : t === 'liquid' ? (isZh ? '流动' : 'Liq') : (isZh ? '固定' : 'Fix')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-10 lg:p-14 bg-white/10 h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={calculations.trendData}>
              <defs>
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#94a3b8' }} dy={15} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-2xl p-6 rounded-[28px] shadow-4xl border border-white/20 min-w-[240px]">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{label}</p>
                        <p className="text-3xl font-black text-indigo-600 tracking-tighter">{payload[0].value.toLocaleString()} <span className="text-xs uppercase ml-1">{displayCurrency}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={5} fillOpacity={1} fill="url(#colorTrend)" animationDuration={2000} strokeLinecap="round" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-10 lg:p-14 bg-white/30">
          <div className="flex items-center justify-between mb-12">
            <h4 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-5">
              <Calendar size={28} className="text-slate-400" /> {isZh ? '全域资产持仓明细' : 'Global Asset Holdings'}
            </h4>
            <div className="flex bg-slate-900/5 p-1.5 rounded-[22px] border border-white/40">
              {(['all', 'liquid', 'fixed'] as const).map(m => (
                <button key={m} onClick={() => setSnapshotTypeFilter(m)} className={`px-6 py-2 rounded-[18px] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${snapshotTypeFilter === m ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400 hover:text-slate-500'}`}>
                  {m === 'all' ? (isZh ? '全部' : 'ALL') : m === 'liquid' ? (isZh ? '流动' : 'LIQ') : (isZh ? '固定' : 'FIX')}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar-wide">
            <table className="w-full text-left border-separate border-spacing-y-5">
              <thead>
                <tr className="text-[11px] lg:text-[13px] uppercase tracking-[0.4em] text-slate-400 font-black">
                  <th className="px-10 pb-4">{isZh ? '资产节点' : 'INFRA NODE'}</th>
                  <th className="px-10 pb-4">{isZh ? '所有者' : 'SOVEREIGN'}</th>
                  <th className="px-10 pb-4">{isZh ? '机构 / 类型' : 'INSTITUTION'}</th>
                  <th className="px-10 pb-4">{isZh ? '风险剖面' : 'RISK PROFILE'}</th>
                  <th className="px-10 pb-4">{isZh ? '最后更新' : 'LAST UPDATE'}</th>
                  <th className="px-10 pb-4 text-right">{isZh ? '原始账面' : 'BOOK VALUE'}</th>
                  <th className="px-10 pb-4 text-right">{isZh ? '折算估值' : 'MARKET VAL'}</th>
                </tr>
              </thead>
              <tbody>
                {calculations.snapshots.map((acc: any, idx) => {
                  const brandColor = acc.resolvedColor;
                  return (
                    <tr key={idx} className="bg-white/40 hover:bg-white/80 transition-all duration-500 rounded-[32px] group shadow-sm hover:shadow-xl hover:-translate-y-1">
                      <td className="px-10 py-7 rounded-l-[32px]">
                        <div className="flex items-center gap-6">
                          <div 
                            className="w-12 h-12 lg:w-16 lg:h-16 rounded-[22px] shadow-lg flex items-center justify-center text-white font-black text-sm lg:text-xl transition-transform group-hover:rotate-6" 
                            style={{ backgroundColor: brandColor }}
                          >
                            {String(acc.账户昵称 || acc.资产昵称)[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-lg lg:text-2xl tracking-tight leading-none mb-1">{acc.账户昵称 || acc.资产昵称}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ID: {acc.账户ID || acc.资产ID}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] lg:text-[12px] font-black uppercase tracking-[0.2em]">{acc.成员昵称}</span>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex flex-col gap-2.5">
                          <div 
                            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border shadow-sm transition-all group-hover:shadow-md max-w-fit"
                            style={{ 
                              backgroundColor: `${brandColor}12`, 
                              borderColor: `${brandColor}35` 
                            }}
                          >
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-inner"
                              style={{ backgroundColor: brandColor }}
                            >
                              {String(acc.机构名称 || acc.资产昵称 || 'D')[0]}
                            </div>
                            <span 
                              className="text-[12px] font-black tracking-tight"
                              style={{ color: brandColor }}
                            >
                              {acc.机构名称 || (isZh ? '直接持有' : 'Direct')}
                            </span>
                          </div>
                          <span className="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            {acc.资产类型 || acc.固定资产类型 || 'Asset'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <span className="px-3 py-1 rounded-xl text-[10px] lg:text-[12px] font-black uppercase tracking-widest border-2 shadow-sm" style={{ color: RISK_COLORS[acc.risk], borderColor: RISK_COLORS[acc.risk] + '30', backgroundColor: RISK_COLORS[acc.risk] + '05' }}>{acc.risk}</span>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock size={14} className="opacity-50" />
                          <span className="text-[10px] lg:text-[13px] font-black tracking-tight">{acc.latestDate}</span>
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-slate-600 text-sm lg:text-lg tracking-tight">{Math.round(acc.latestVal).toLocaleString()}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{acc.latestCur}</span>
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right rounded-r-[32px]">
                        <div className="flex flex-col items-end">
                          <span className={`text-2xl lg:text-4xl font-black tracking-tighter leading-none ${acc.converted < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{Math.round(acc.converted).toLocaleString()}</span>
                          <span className="text-[10px] lg:text-[14px] font-black text-slate-400 uppercase tracking-widest mt-2">{displayCurrency}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[48px] p-10 lg:p-14 border-white/60 shadow-2xl bg-white/30 backdrop-blur-xl transition-all hover:shadow-4xl">
        <div className="flex items-center gap-6 mb-14">
          <div className="p-4 bg-indigo-600/10 text-indigo-600 rounded-[24px]"><BarChart3 size={32} /></div>
          <div>
            <h3 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tighter leading-none">{isZh ? '流动资产风险分布对比' : 'Liquid Risk Distribution Analysis'}</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-3">{isZh ? '基于 100% 堆叠占比的风险敞口评估' : 'Relative Risk Exposure Based on 100% Stacked View'}</p>
          </div>
        </div>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={calculations.barData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(0,0,0,0.03)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 900, fill: '#64748b' }} dy={15} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-3xl p-6 rounded-[32px] shadow-4xl border border-slate-100 min-w-[280px]">
                        <p className="font-black text-slate-900 text-xl mb-4 border-b border-slate-50 pb-3">{label}</p>
                        <div className="space-y-3">
                          {payload.slice().reverse().map((entry: any, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs lg:text-sm">
                              <span className="font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: entry.fill}}></div> 
                                {entry.name}
                              </span>
                              <div className="text-right">
                                <span className="font-black text-slate-900">{Math.round(entry.payload[`${entry.name}_val`]).toLocaleString()}</span>
                                <span className="text-[10px] ml-2 font-black text-slate-400 uppercase">{displayCurrency}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 50 }} formatter={(val) => <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{val}</span>} />
              {calculations.RISK_LEVELS.map(level => (
                <Bar key={level} dataKey={level} stackId="a" fill={RISK_COLORS[level]} barSize={80} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-40">
           <div className="w-12 h-px bg-slate-400"></div>
           {isZh ? '※ 柱高统一折算为 100% 占比以方便成员间横向对比风险偏好' : '※ Columns are normalized to 100% to compare risk appetite across members'}
           <div className="w-12 h-px bg-slate-400"></div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
