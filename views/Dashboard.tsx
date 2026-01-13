
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { TrendingUp, Wallet, Home, Landmark, Globe, User, Filter, BarChart3, ChevronDown } from 'lucide-react';

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const [displayCurrency, setDisplayCurrency] = useState<string>(settings.baseCurrency);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [snapshotTypeFilter, setSnapshotTypeFilter] = useState<'all' | 'liquid' | 'fixed' | 'loan'>('liquid');
  const [selectedMetric, setSelectedMetric] = useState<'liquid' | 'fixed' | 'loan' | 'netWorth'>('liquid');

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
    data.固定资产记录.forEach(r => { if (r.币种) currencies.add(r.币种); });
    data.借入借出记录.forEach(r => { if (r.币种) currencies.add(r.币种); });

    if (currencies.size === 0 && settings.baseCurrency) currencies.add(settings.baseCurrency);
    if (settings.baseCurrency) currencies.add(settings.baseCurrency);

    return Array.from(currencies).filter(Boolean).sort();
  }, [data, settings.baseCurrency]);

  const exchangeRatesMap = useMemo(() => {
    const rates: Record<string, number> = {};
    const base = displayCurrency;
    rates[base] = 1;

    const adj: Record<string, Record<string, number>> = {};
    const sortedRates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    
    sortedRates.forEach(r => {
      const b = r.基准币种; 
      const q = r.报价币种; 
      const val = Number(r.汇率);
      if (!b || !q || isNaN(val) || val === 0) return;
      if (!adj[b]) adj[b] = {}; 
      if (!adj[b][q]) adj[b][q] = val;
      if (!adj[q]) adj[q] = {}; 
      if (!adj[q][b]) adj[q][b] = 1 / val;
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
    
    availableCurrencies.forEach(c => {
      if (rates[c] === undefined) rates[c] = 0;
    });

    return rates;
  }, [data.汇率, displayCurrency, availableCurrencies]);

  // Risk related definitions (Strict order for stacking)
  const RISK_LEVELS = isZh ? ['极高', '高', '中', '低', '未知'] : ['Very High', 'High', 'Medium', 'Low', 'Unknown'];
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
      if (!rateFactor) return 0;
      return amount / rateFactor;
    };

    const allLatestLiquid = data.账户.map(acc => {
      const records = data.流动资产记录.filter(r => r.账户ID === acc.账户ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? Number(latest.市值) || 0 : 0;
      const currency = latest ? latest.币种 : acc.币种 || displayCurrency; 
      const converted = convert(value, currency);
      const time = latest ? latest.时间 : '—';
      // Normalize risk level
      let riskLevel = acc.风险评估 || (isZh ? '未知' : 'Unknown');
      if (riskLevel === 'None' || riskLevel === '无') riskLevel = (isZh ? '未知' : 'Unknown');
      
      const institution = data.机构.find(inst => inst.机构ID === acc.机构ID);
      const color = institution?.代表色HEX || '#6366f1';
      const char = (institution?.机构名称?.[0] || acc.账户昵称[0] || '?').toUpperCase();

      return { 账户昵称: acc.账户昵称, converted, member: acc.成员昵称, 成员ID: acc.成员ID, riskLevel, time, color, char, type: 'liquid' };
    });

    const filteredLiquid = selectedMemberId === 'all' ? allLatestLiquid : allLatestLiquid.filter(a => a.成员ID === selectedMemberId);
    const liquidTotal = filteredLiquid.reduce((sum, item) => sum + item.converted, 0);

    let fixedToCalculate = data.固定资产;
    if (selectedMemberId !== 'all') fixedToCalculate = fixedToCalculate.filter(asset => asset.成员ID === selectedMemberId);
    const latestFixed = fixedToCalculate.map(asset => {
      const records = data.固定资产记录.filter(r => r.资产ID === asset.资产ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? Number(latest.估值) || 0 : Number(asset.购入价格) || 0;
      return { 账户昵称: asset.资产昵称, converted: convert(value, asset.币种 || displayCurrency), time: latest ? latest.时间 : '—', color: '#f59e0b', char: asset.资产昵称[0], type: 'fixed' };
    });
    const fixedTotal = latestFixed.reduce((sum, a) => sum + a.converted, 0);

    let loansList = data.借入借出记录.filter(l => l.结清 !== '是');
    if (selectedMemberId !== 'all') loansList = loansList.filter(l => l.成员ID === selectedMemberId);
    const loanNet = loansList.reduce((sum, l) => {
      const isBorrowing = l.借入借出 === '借入';
      const converted = convert(Number(l.借款额) || 0, l.币种 || displayCurrency);
      return sum + (isBorrowing ? -converted : converted);
    }, 0);

    const netWorth = liquidTotal + fixedTotal + loanNet;

    // Build Bar Data (100% Stacked)
    const members = data.成员;
    const barData = [];

    const buildRow = (name: string, assets: any[]) => {
      const row: any = { name };
      const total = assets.reduce((s, i) => s + Math.max(0, i.converted), 0);
      RISK_LEVELS.forEach(level => {
        const val = assets.filter(i => i.riskLevel === level).reduce((s, i) => s + Math.max(0, i.converted), 0);
        // We use 0.00001 instead of 0 for empty levels to ensure they "exist" in Recharts logic if needed, 
        // but normally Recharts handles 0 fine for 100% stack if at least one value is > 0.
        row[level] = total > 0 ? (val / total) * 100 : (level === (isZh ? '未知' : 'Unknown') ? 100 : 0);
        row[`${level}_val`] = val;
      });
      return row;
    };

    barData.push(buildRow(isZh ? '全家' : 'Family', allLatestLiquid));
    members.forEach(m => {
      const mAssets = allLatestLiquid.filter(i => i.成员ID === m.成员ID);
      if (mAssets.length > 0) barData.push(buildRow(m.成员昵称, mAssets));
    });

    let snapshots = [];
    if (snapshotTypeFilter === 'all') snapshots = [...filteredLiquid, ...latestFixed];
    else if (snapshotTypeFilter === 'liquid') snapshots = filteredLiquid;
    else if (snapshotTypeFilter === 'fixed') snapshots = latestFixed;
    snapshots = snapshots.sort((a, b) => Math.abs(b.converted) - Math.abs(a.converted)).slice(0, 15);

    return { netWorth, liquidTotal, fixedTotal, loanNet, barData, snapshots };
  }, [data, displayCurrency, selectedMemberId, exchangeRatesMap, snapshotTypeFilter, isZh, RISK_LEVELS]);

  const activeMetricData = useMemo(() => {
    switch(selectedMetric) {
      case 'netWorth': return { label: isZh ? "净资产" : "Net Worth", value: calculations.netWorth, icon: <TrendingUp size={18} />, grad: "from-blue-500/20 to-indigo-500/10", text: "text-indigo-600" };
      case 'liquid': return { label: isZh ? "流动资产" : "Liquid", value: calculations.liquidTotal, icon: <Wallet size={18} />, grad: "from-emerald-500/20 to-teal-500/10", text: "text-emerald-600" };
      case 'fixed': return { label: isZh ? "固定资产" : "Fixed", value: calculations.fixedTotal, icon: <Home size={18} />, grad: "from-orange-500/20 to-amber-500/10", text: "text-amber-600" };
      case 'loan': return { label: isZh ? "债务净额" : "Net Loans", value: calculations.loanNet, icon: <Landmark size={18} />, grad: "from-pink-500/20 to-purple-500/10", text: "text-purple-600" };
    }
  }, [selectedMetric, calculations, isZh]);

  return (
    <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Selection Control Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 items-stretch">
        <div className="xl:col-span-4 glass-card rounded-[28px] lg:rounded-[40px] p-4 lg:p-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4 lg:gap-6 min-h-[100px] lg:min-h-[120px]">
          <div className="flex items-center gap-2 bg-blue-600/10 px-3 lg:px-4 py-2.5 rounded-[18px] text-blue-600 border border-blue-600/20 shadow-inner flex-shrink-0">
            <Globe size={18} strokeWidth={2.5} />
            <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="bg-transparent border-none outline-none font-black text-sm lg:text-lg tracking-widest cursor-pointer appearance-none min-w-[50px]">
              {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
            <ChevronDown size={14} className="opacity-50" />
          </div>
          <div className="flex-1 overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-3">
              {availableCurrencies.filter(c => c !== displayCurrency).map(curr => {
                const rate = exchangeRatesMap[curr] || 0;
                return (
                  <div key={curr} className="flex flex-col items-center flex-shrink-0 bg-white/40 px-3 py-1.5 rounded-xl border border-white/60 min-w-[70px]">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{curr}</span>
                    <span className="text-xs lg:text-sm font-black text-slate-700">{rate > 0 ? rate.toFixed(2) : '--'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 glass-card rounded-[28px] lg:rounded-[40px] p-4 lg:p-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4 lg:gap-6 min-h-[100px] lg:min-h-[120px]">
          <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center bg-slate-900/5 text-slate-400 flex-shrink-0"><User size={24} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{isZh ? '视图成员' : 'PERSPECTIVE'}</p>
            <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-lg lg:text-2xl appearance-none cursor-pointer truncate pr-6">
              <option value="all">{isZh ? '全体成员' : 'All Members'}</option>
              {data.成员.map(m => <option key={m.成员ID} value={m.成员ID}>{m.成员昵称}</option>)}
            </select>
          </div>
        </div>

        <div className="xl:col-span-5 glass-card rounded-[28px] lg:rounded-[40px] p-4 lg:p-6 bg-white/50 backdrop-blur-2xl border border-white/80 shadow-2xl flex items-center justify-between gap-6 min-h-[100px] lg:min-h-[120px] relative overflow-hidden group">
          <div className={`absolute -right-16 -top-16 w-56 h-56 bg-gradient-to-br ${activeMetricData.grad} rounded-full blur-[80px] opacity-60 group-hover:scale-125 transition-transform duration-1000`}></div>
          <div className="flex items-center gap-4 lg:gap-6 relative z-10 flex-shrink-0">
             <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center bg-white shadow-md ${activeMetricData.text}`}>{activeMetricData.icon}</div>
             <div className="flex flex-col">
               <span className="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">{isZh ? '核心指标' : 'FOCUS METRIC'}</span>
               <div className="relative">
                <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value as any)} className="bg-transparent border-none outline-none font-black text-slate-800 text-base lg:text-xl appearance-none cursor-pointer pr-6 hover:text-indigo-600 transition-colors">
                  <option value="netWorth">{isZh ? '净资产' : 'Net Worth'}</option>
                  <option value="liquid">{isZh ? '流动资产' : 'Liquid Assets'}</option>
                  <option value="fixed">{isZh ? '固定资产' : 'Fixed Assets'}</option>
                  <option value="loan">{isZh ? '债务净额' : 'Net Loans'}</option>
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-30" />
               </div>
             </div>
          </div>
          <div className="relative z-10 text-right flex flex-col items-end">
             <div className="flex items-baseline gap-2">
               <span className={`text-3xl lg:text-5xl font-black tracking-tighter leading-none ${activeMetricData.value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{Math.round(activeMetricData.value).toLocaleString()}</span>
               <span className="text-[10px] lg:text-sm font-black text-slate-400 uppercase tracking-widest">{displayCurrency}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        
        {/* Risk Column Chart - UPGRADED to 100% Stacked */}
        <div className="p-8 lg:p-10 rounded-[40px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl"><BarChart3 size={20} /></div>
            <h3 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{isZh ? '流动资产风险分布' : 'Liquid Risk Distribution'}</h3>
          </div>
          <div className="flex-1 min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calculations.barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barGap={10}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#64748b' }} dy={10} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-5 rounded-[24px] shadow-2xl border border-white/20 min-w-[200px]">
                          <p className="font-black text-slate-800 text-lg mb-3 border-b border-slate-100 pb-2">{label}</p>
                          <div className="space-y-2">
                            {payload.slice().reverse().map((entry: any, index) => {
                              const rawVal = entry.payload[`${entry.name}_val`];
                              if (rawVal === 0 && entry.value === 0) return null; // Only hide 0 in tooltip if they are absolute 0
                              return (
                                <div key={index} className="flex items-center justify-between gap-6">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{entry.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-slate-800">{Math.round(rawVal).toLocaleString()} {displayCurrency}</span>
                                    <span className="ml-2 text-[10px] font-black text-slate-400">({Math.round(entry.value)}%)</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{value}</span>} />
                {RISK_LEVELS.map((level) => (
                  <Bar key={level} dataKey={level} name={level} stackId="risk_stack" fill={RISK_COLORS[level]} barSize={50} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center opacity-60">
            {isZh ? '※ 柱高统一表示 100% 占比对比' : '※ Columns are normalized to 100% for comparison'}
          </p>
        </div>

        {/* Snapshot Highlights */}
        <div className="lg:col-span-2 p-8 lg:p-10 rounded-[40px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h3 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{isZh ? '核心资产快照' : 'Snapshot Highlights'}</h3>
            <div className="flex items-center gap-3 bg-slate-900/5 px-5 py-2.5 rounded-xl border border-slate-900/10">
              <Filter size={16} className="text-slate-400" />
              <select value={snapshotTypeFilter} onChange={(e) => setSnapshotTypeFilter(e.target.value as any)} className="bg-transparent border-none outline-none font-black text-slate-600 text-xs lg:text-sm appearance-none cursor-pointer">
                <option value="all">{isZh ? '全部核心' : 'All Primary'}</option>
                <option value="liquid">{isZh ? '流动资产' : 'Liquid Only'}</option>
                <option value="fixed">{isZh ? '固定资产' : 'Fixed Only'}</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[10px] lg:text-[13px] uppercase tracking-[0.2em] text-slate-400">
                  <th className="pb-2 px-6">{isZh ? '项目' : 'Account'}</th>
                  <th className="pb-2 px-6">{isZh ? '更新' : 'Updated'}</th>
                  <th className="pb-2 px-6 text-right">{isZh ? '折算' : 'Valuation'}</th>
                </tr>
              </thead>
              <tbody className="text-xs lg:text-xl">
                {calculations.snapshots.map((acc, i) => (
                  <tr key={i} className="bg-white/20 hover:bg-white/50 transition-all rounded-[24px] overflow-hidden group">
                    <td className="py-5 lg:py-6 px-6 font-black text-slate-700 rounded-l-[24px] whitespace-nowrap">
                      <div className="flex items-center gap-4 sm:gap-5">
                        <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-[12px] lg:rounded-[18px] shadow-sm flex items-center justify-center text-white font-black text-xs lg:text-base select-none flex-shrink-0" style={{ backgroundColor: (acc as any).color }}>
                          {(acc as any).char}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 text-sm lg:text-xl tracking-tight">{String(acc.账户昵称)}</span>
                          <span className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex-shrink-0 ${(acc as any).type === 'liquid' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                            {(acc as any).type === 'liquid' ? (isZh ? '流动' : 'LIQ') : (isZh ? '固定' : 'FIX')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 lg:py-6 px-6 text-slate-400 whitespace-nowrap font-bold text-[10px] lg:text-sm uppercase tracking-widest">{String((acc as any).time)}</td>
                    <td className="py-5 lg:py-6 px-6 text-right rounded-r-[24px] whitespace-nowrap">
                       <span className={`font-black tracking-tighter text-lg lg:text-3xl ${acc.converted < 0 ? 'text-rose-600' : 'text-blue-600'}`}>{Math.round(acc.converted).toLocaleString()}</span>
                       <span className="ml-3 text-[10px] lg:text-[14px] font-black text-slate-400 uppercase tracking-widest">{displayCurrency}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
