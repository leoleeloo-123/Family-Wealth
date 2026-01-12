
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Wallet, Home, Landmark, Globe, User, Filter, PieChart as PieIcon } from 'lucide-react';

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const [displayCurrency, setDisplayCurrency] = useState<string>(settings.baseCurrency);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  // Defaulting to 'liquid' as requested
  const [snapshotTypeFilter, setSnapshotTypeFilter] = useState<'all' | 'liquid' | 'fixed' | 'loan'>('liquid');

  const isZh = settings.language === 'zh';

  // Extract all available currencies
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

  /**
   * Graph-based Exchange Rate Logic
   */
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

  const calculations = useMemo(() => {
    const convert = (amount: number, currency: string) => {
      if (!amount) return 0;
      if (currency === displayCurrency) return amount;
      const rateFactor = exchangeRatesMap[currency];
      if (!rateFactor) return 0;
      return amount / rateFactor;
    };

    // 1. Process Liquid Assets (Latest record per account)
    let accountsToCalculate = data.账户;
    if (selectedMemberId !== 'all') {
      accountsToCalculate = accountsToCalculate.filter(acc => acc.成员ID === selectedMemberId);
    }
    const latestLiquidByAccount = accountsToCalculate.map(acc => {
      const records = data.流动资产记录.filter(r => r.账户ID === acc.账户ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? Number(latest.市值) || 0 : 0;
      const currency = latest ? latest.币种 : acc.币种 || displayCurrency; 
      const converted = convert(value, currency);
      const time = latest ? latest.时间 : '—';
      
      // Get institution color and character
      const institution = data.机构.find(inst => inst.机构ID === acc.机构ID);
      const color = institution?.代表色HEX || '#64748b';
      const char = (institution?.机构名称?.[0] || acc.账户昵称[0] || '?').toUpperCase();
      const riskLevel = acc.风险评估 || (isZh ? '未知' : 'Unknown');

      return { 账户昵称: acc.账户昵称, value, converted, member: acc.成员昵称, 成员ID: acc.成员ID, type: 'liquid', time, color, char, riskLevel };
    });

    // 2. Process Fixed Assets (Latest record per asset)
    let fixedToCalculate = data.固定资产;
    if (selectedMemberId !== 'all') {
      fixedToCalculate = fixedToCalculate.filter(asset => asset.成员ID === selectedMemberId);
    }
    const latestFixedByAsset = fixedToCalculate.map(asset => {
      const records = data.固定资产记录.filter(r => r.资产ID === asset.资产ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? Number(latest.估值) || 0 : Number(asset.购入价格) || 0;
      const currency = asset.币种 || displayCurrency;
      const converted = convert(value, currency);
      const time = latest ? latest.时间 : asset.购入时间 || '—';
      const char = (asset.资产昵称?.[0] || '?').toUpperCase();
      return { 账户昵称: asset.资产昵称, value, converted, member: asset.成员昵称, 成员ID: asset.成员ID, type: 'fixed', time, color: '#f59e0b', char };
    });

    // 3. Process Loans (Unpaid items, latest status per creditor if multiple)
    let loansList = data.借入借出记录.filter(l => l.结清 !== '是');
    if (selectedMemberId !== 'all') {
      loansList = loansList.filter(l => l.成员ID === selectedMemberId);
    }
    const loanGroups = new Map<string, any>();
    loansList.forEach(l => {
      const key = `${l.借款对象}-${l.成员ID}`;
      if (!loanGroups.has(key) || new Date(l.时间) > new Date(loanGroups.get(key).时间)) {
        loanGroups.set(key, l);
      }
    });

    const loanEntries = Array.from(loanGroups.values()).map(l => {
      const isBorrowing = l.借入借出 === '借入';
      const rawValue = Number(l.借款额) || 0;
      const currency = l.币种 || displayCurrency;
      const converted = convert(rawValue, currency);
      const char = (l.借款对象?.[0] || '?').toUpperCase();
      return {
        账户昵称: l.借款对象,
        value: isBorrowing ? -rawValue : rawValue,
        converted: isBorrowing ? -converted : converted,
        member: l.成员昵称,
        成员ID: l.成员ID,
        type: 'loan',
        isLiability: isBorrowing,
        time: l.时间,
        color: isBorrowing ? '#e11d48' : '#2563eb',
        char
      };
    });

    const liquidTotal = latestLiquidByAccount.reduce((sum, item) => sum + item.converted, 0);
    const fixedTotal = latestFixedByAsset.reduce((sum, item) => sum + item.converted, 0);
    const loanNet = loanEntries.reduce((sum, item) => sum + item.converted, 0);
    const netWorth = liquidTotal + fixedTotal + loanNet;

    // Filter snapshots based on selected type
    let snapshots = [];
    if (snapshotTypeFilter === 'all') {
      snapshots = [...latestLiquidByAccount, ...latestFixedByAsset, ...loanEntries];
    } else if (snapshotTypeFilter === 'liquid') {
      snapshots = latestLiquidByAccount;
    } else if (snapshotTypeFilter === 'fixed') {
      snapshots = latestFixedByAsset;
    } else if (snapshotTypeFilter === 'loan') {
      snapshots = loanEntries;
    }

    snapshots = snapshots
      .sort((a, b) => Math.abs(b.converted) - Math.abs(a.converted))
      .slice(0, 15);

    // Calculate Liquid Risk Data
    const riskGroups = new Map<string, number>();
    latestLiquidByAccount.forEach(item => {
      if (item.converted <= 0) return; // Skip zero/liabilities for risk pie if needed, but normally liquid liabilities (CC) are risky
      const risk = item.riskLevel;
      riskGroups.set(risk, (riskGroups.get(risk) || 0) + item.converted);
    });
    const riskData = Array.from(riskGroups.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { netWorth, liquidTotal, fixedTotal, loanNet, riskData, snapshots };
  }, [data, displayCurrency, selectedMemberId, exchangeRatesMap, snapshotTypeFilter, isZh]);

  // Risk related colors
  const RISK_COLORS: Record<string, string> = {
    'Low': '#10b981', '低': '#10b981',
    'Medium': '#f59e0b', '中': '#f59e0b',
    'High': '#ef4444', '高': '#ef4444',
    'Very High': '#7f1d1d', '极高': '#7f1d1d',
    'Unknown': '#94a3b8', '未知': '#94a3b8'
  };
  const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row items-stretch gap-4 sm:gap-6">
        
        {/* Currency Selection & Rates Row - Reduced Padding */}
        <div className="flex-1 rounded-[24px] lg:rounded-[32px] py-4 px-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col md:flex-row md:items-center gap-6 min-h-[80px]">
          <div className="flex items-center gap-3 bg-blue-600/10 px-4 py-2.5 rounded-[18px] text-blue-600 border border-blue-600/20 shadow-inner group/curr flex-shrink-0">
            <Globe size={24} strokeWidth={2.5} />
            <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="bg-transparent border-none outline-none font-black text-lg lg:text-2xl tracking-widest cursor-pointer appearance-none">
              {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
          </div>

          <div className="flex-1 flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
            {availableCurrencies.filter(c => c !== displayCurrency).map(curr => {
              const rateToDisplay = exchangeRatesMap[curr] || 0;
              return (
                <div key={curr} className="flex items-center gap-3 bg-white/60 px-4 py-2.5 rounded-[18px] border border-white/80 flex-shrink-0 shadow-sm hover:scale-105 transition-transform">
                  <span className="text-[10px] lg:text-[13px] font-black text-slate-400">{curr}</span>
                  <span className="text-base lg:text-xl font-black text-slate-800">
                    {rateToDisplay > 0 ? rateToDisplay.toFixed(3) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Perspective Selection - Reduced Padding */}
        <div className="rounded-[24px] lg:rounded-[32px] py-4 px-8 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4 xl:min-w-[300px]">
          <div className="w-12 h-12 rounded-[18px] flex items-center justify-center bg-slate-900/5 text-slate-500 flex-shrink-0"><User size={24} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-[12px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Perspective</p>
            <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-lg lg:text-2xl py-0.5 pr-6 appearance-none cursor-pointer truncate">
              <option value="all">{isZh ? '全体成员' : 'All Members'}</option>
              {data.成员.map(m => <option key={m.成员ID} value={m.成员ID}>{m.成员昵称}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <StatCard label={isZh ? "净资产" : "Net Worth"} value={calculations.netWorth} currency={displayCurrency} icon={<TrendingUp size={24} />} grad="from-blue-500/20 to-indigo-500/10" text="text-indigo-600" />
        <StatCard label={isZh ? "流动资产" : "Liquid"} value={calculations.liquidTotal} currency={displayCurrency} icon={<Wallet size={24} />} grad="from-emerald-500/20 to-teal-500/10" text="text-emerald-600" />
        <StatCard label={isZh ? "固定资产" : "Fixed"} value={calculations.fixedTotal} currency={displayCurrency} icon={<Home size={24} />} grad="from-orange-500/20 to-amber-500/10" text="text-amber-600" />
        <StatCard label={isZh ? "债务净额" : "Net Loans"} value={calculations.loanNet} currency={displayCurrency} icon={<Landmark size={24} />} grad="from-pink-500/20 to-purple-500/10" text="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        <div className="p-8 lg:p-10 rounded-[40px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl"><PieIcon size={20} /></div>
            <h3 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{isZh ? '流动资产风险占比' : 'Liquid Risk Profile'}</h3>
          </div>
          <div className="h-72 lg:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={calculations.riskData} innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value" stroke="none">
                  {calculations.riskData.map((entry, index) => (
                    <Cell 
                      key={index} 
                      fill={RISK_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                      cornerRadius={12} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [Math.round(value).toLocaleString() + ' ' + displayCurrency, isZh ? '价值' : 'Value']}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px', fontWeight: '900' }} 
                />
                <Legend iconType="circle" verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 p-8 lg:p-10 rounded-[40px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h3 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{isZh ? '核心资产快照' : 'Snapshot Highlights'}</h3>
            
            <div className="flex items-center gap-3 bg-slate-900/5 px-5 py-2.5 rounded-xl border border-slate-900/10">
              <Filter size={16} className="text-slate-400" />
              <select 
                value={snapshotTypeFilter} 
                onChange={(e) => setSnapshotTypeFilter(e.target.value as any)}
                className="bg-transparent border-none outline-none font-black text-slate-600 text-xs lg:text-sm appearance-none cursor-pointer"
              >
                <option value="all">{isZh ? '全部类型' : 'All Types'}</option>
                <option value="liquid">{isZh ? '流动资产' : 'Liquid Only'}</option>
                <option value="fixed">{isZh ? '固定资产' : 'Fixed Only'}</option>
                <option value="loan">{isZh ? '债务记录' : 'Debts Only'}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[10px] lg:text-[13px] uppercase tracking-[0.2em] text-slate-400">
                  <th className="pb-2 px-6">{isZh ? '项目' : 'Account'}</th>
                  <th className="pb-2 px-6">{isZh ? '最后更新' : 'Updated'}</th>
                  <th className="pb-2 px-6 text-right">{isZh ? '折算数值' : 'Valuation'}</th>
                </tr>
              </thead>
              <tbody className="text-xs lg:text-xl">
                {calculations.snapshots.map((acc, i) => (
                  <tr key={i} className="bg-white/20 hover:bg-white/50 transition-all rounded-[24px] overflow-hidden group">
                    <td className="py-5 lg:py-6 px-6 font-black text-slate-700 rounded-l-[24px] whitespace-nowrap">
                      <div className="flex items-center gap-4 sm:gap-5">
                        <div 
                          className="w-8 h-8 lg:w-12 lg:h-12 rounded-[10px] lg:rounded-[16px] shadow-sm flex items-center justify-center text-white font-black text-xs lg:text-base select-none flex-shrink-0" 
                          style={{ backgroundColor: (acc as any).color }} 
                        >
                          {(acc as any).char}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 text-sm lg:text-xl tracking-tight">
                            {String(acc.账户昵称)}
                          </span>
                          <span className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex-shrink-0 ${acc.type === 'liquid' ? 'bg-blue-100 text-blue-600' : acc.type === 'fixed' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                            {acc.type === 'liquid' ? (isZh ? '流动' : 'LIQ') : acc.type === 'fixed' ? (isZh ? '固定' : 'FIX') : (isZh ? '债务' : 'DBT')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 lg:py-6 px-6 text-slate-400 whitespace-nowrap font-bold text-[10px] lg:text-sm uppercase tracking-widest">
                      {String((acc as any).time)}
                    </td>
                    <td className="py-5 lg:py-6 px-6 text-right rounded-r-[24px] whitespace-nowrap">
                       <span className={`font-black tracking-tighter text-lg lg:text-3xl ${(acc as any).isLiability || acc.converted < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                         {Math.round(acc.converted).toLocaleString()}
                       </span>
                       <span className="ml-3 text-[10px] lg:text-[14px] font-black text-slate-400 uppercase tracking-widest">{displayCurrency}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calculations.snapshots.length === 0 && (
              <div className="py-14 text-center opacity-20 italic font-black text-xl">{isZh ? '暂无匹配数据' : 'No matching data.'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modified StatCard: flatter, smaller numbers, less padding
const StatCard: React.FC<{ label: string, value: number, currency: string, icon: React.ReactNode, grad: string, text: string }> = ({ label, value, currency, icon, grad, text }) => (
  <div className={`p-6 lg:p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] lg:rounded-[44px] shadow-lg relative overflow-hidden flex flex-col justify-center min-h-[120px] lg:min-h-[160px] group transition-all duration-700`}>
    <div className={`absolute -right-10 -top-10 w-40 h-40 lg:w-56 lg:h-56 bg-gradient-to-br ${grad} rounded-full blur-[70px] opacity-60 group-hover:scale-125 transition-transform duration-1000`}></div>
    <div className="relative z-10 space-y-3 lg:space-y-4">
       <div className="flex items-center gap-4">
          <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-[16px] flex items-center justify-center bg-white shadow-md ${text}`}>{icon}</div>
          <p className="text-base lg:text-2xl font-black uppercase tracking-tighter text-slate-800 opacity-90 leading-none">{label}</p>
       </div>
       <div className="flex items-baseline gap-2 lg:gap-3 overflow-hidden">
         <h4 className={`text-2xl lg:text-4xl font-black tracking-tighter leading-none ${value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
           {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
         </h4>
         <span className="text-[10px] lg:text-[14px] font-black text-slate-400 tracking-widest uppercase">{currency}</span>
       </div>
    </div>
  </div>
);

export default DashboardView;
