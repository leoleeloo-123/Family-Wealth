
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, Home, Landmark, Globe, User } from 'lucide-react';

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const [displayCurrency, setDisplayCurrency] = useState<string>(settings.baseCurrency);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

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
   * 
   * Logic:
   * 1. Treat currency pairs as a graph.
   * 2. Edge Weights:
   *    If Record is: Base=USD, Quote=CNY, Rate=7.18
   *    Implies: 1 USD = 7.18 CNY
   *    Edge USD -> CNY = 7.18
   *    Edge CNY -> USD = 1/7.18
   * 
   * 3. BFS Traversal from DisplayCurrency (D):
   *    We calculate `rates[C]`: How many C units equal 1 D unit.
   *    Start: rates[D] = 1.
   *    Traverse D -> N (weight w).
   *    rates[N] = rates[D] * w.
   */
  const exchangeRatesMap = useMemo(() => {
    const rates: Record<string, number> = {};
    const base = displayCurrency;
    rates[base] = 1;

    // Build Adjacency List
    const adj: Record<string, Record<string, number>> = {};
    
    // Sort by date descending to prioritize latest rates
    const sortedRates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    
    sortedRates.forEach(r => {
      const b = r.基准币种; 
      const q = r.报价币种; 
      const val = Number(r.汇率);
      
      if (!b || !q || isNaN(val) || val === 0) return;
      
      // Standard FX Logic: 1 Base = Rate Quote
      // Base -> Quote cost is Rate
      if (!adj[b]) adj[b] = {}; 
      if (!adj[b][q]) adj[b][q] = val; // Only set if not already set (taking latest)

      // Quote -> Base cost is 1/Rate
      if (!adj[q]) adj[q] = {}; 
      if (!adj[q][b]) adj[q][b] = 1 / val;
    });

    // BFS to find rate relative to DisplayCurrency
    const visited = new Set<string>();
    const queue: Array<{ node: string; factor: number }> = [{ node: base, factor: 1 }];
    visited.add(base);

    while (queue.length > 0) {
      const { node, factor } = queue.shift()!;
      // factor represents: How many 'node' currency units = 1 'base' currency unit
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
    
    // Fill gaps for disconnected currencies (avoid NaN)
    availableCurrencies.forEach(c => {
      if (rates[c] === undefined) rates[c] = 0;
    });

    return rates;
  }, [data.汇率, displayCurrency, availableCurrencies]);

  const calculations = useMemo(() => {
    // Helper to convert any amount in 'currency' to 'displayCurrency'
    const convert = (amount: number, currency: string) => {
      if (!amount) return 0;
      if (currency === displayCurrency) return amount;
      const rateFactor = exchangeRatesMap[currency];
      // If rateFactor is 0 or undefined, we can't convert (disconnected graph)
      if (!rateFactor) return 0;
      return amount / rateFactor;
    };

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
      return { ...acc, value, converted, member: acc.成员昵称, type: 'liquid' };
    });

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
      return { 账户昵称: asset.资产昵称, value, converted, member: asset.成员昵称, 成员ID: asset.成员ID, type: 'fixed' };
    });

    let loansList = data.借入借出记录.filter(l => l.结清 !== '是');
    if (selectedMemberId !== 'all') {
      loansList = loansList.filter(l => l.成员ID === selectedMemberId);
    }
    const loanEntries = loansList.map(l => {
      const isBorrowing = l.借入借出 === '借入';
      const rawValue = Number(l.借款额) || 0;
      const currency = l.币种 || displayCurrency;
      const converted = convert(rawValue, currency);
      return {
        账户昵称: l.借款对象,
        value: isBorrowing ? -rawValue : rawValue,
        converted: isBorrowing ? -converted : converted,
        member: l.成员昵称,
        成员ID: l.成员ID,
        type: 'loan',
        isLiability: isBorrowing
      };
    });

    const liquidTotal = latestLiquidByAccount.reduce((sum, item) => sum + item.converted, 0);
    const fixedTotal = latestFixedByAsset.reduce((sum, item) => sum + item.converted, 0);
    const loanNet = loanEntries.reduce((sum, item) => sum + item.converted, 0);
    const netWorth = liquidTotal + fixedTotal + loanNet;

    const snapshots = [...latestLiquidByAccount, ...latestFixedByAsset, ...loanEntries]
      .sort((a, b) => Math.abs(b.converted) - Math.abs(a.converted))
      .slice(0, 12);

    const memberData = data.成员.map(m => {
      const val = [...latestLiquidByAccount, ...latestFixedByAsset, ...loanEntries]
        .filter((a: any) => a.成员ID === m.成员ID || a.member === m.成员昵称)
        .reduce((s, i) => s + i.converted, 0);
      return { name: String(m.成员昵称), value: Math.max(0, val) };
    }).filter(m => m.value > 0);

    return { netWorth, liquidTotal, fixedTotal, loanNet, memberData, snapshots };
  }, [data, displayCurrency, selectedMemberId, exchangeRatesMap]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row items-stretch gap-6 sm:gap-8">
        
        {/* Currency Selection & Rates Row */}
        <div className="flex-1 rounded-[24px] lg:rounded-[36px] py-6 px-8 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col md:flex-row md:items-center gap-8 min-h-[100px]">
          <div className="flex items-center gap-4 bg-blue-600/10 px-6 py-4 rounded-[24px] text-blue-600 border border-blue-600/20 shadow-inner group/curr flex-shrink-0">
            <Globe size={28} strokeWidth={2.5} />
            <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="bg-transparent border-none outline-none font-black text-xl lg:text-3xl tracking-widest cursor-pointer appearance-none">
              {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
          </div>

          <div className="flex-1 flex items-center gap-6 overflow-x-auto no-scrollbar py-2">
            {availableCurrencies.filter(c => c !== displayCurrency).map(curr => {
              // We want to show how many Foreign Units = 1 Base Unit.
              // exchangeRatesMap[curr] = Amount of 'curr' equivalent to 1 'displayCurrency'.
              // Example: Display=USD, Map[CNY]=7.18.
              // We show: CNY 7.18
              const rateToDisplay = exchangeRatesMap[curr] || 0;
              
              return (
                <div key={curr} className="flex items-center gap-4 bg-white/60 px-6 py-4 rounded-[24px] border border-white/80 flex-shrink-0 shadow-sm hover:scale-105 transition-transform">
                  <span className="text-[12px] lg:text-[16px] font-black text-slate-400">{curr}</span>
                  <span className="text-lg lg:text-2xl font-black text-slate-800">
                    {rateToDisplay > 0 ? rateToDisplay.toFixed(3) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Perspective Selection */}
        <div className="rounded-[24px] lg:rounded-[36px] py-6 px-10 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-6 xl:min-w-[360px]">
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center bg-slate-900/5 text-slate-500 flex-shrink-0"><User size={32} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] lg:text-[14px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Perspective</p>
            <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-xl lg:text-3xl py-1 pr-6 appearance-none cursor-pointer truncate">
              <option value="all">{isZh ? '全体成员' : 'All Members'}</option>
              {data.成员.map(m => <option key={m.成员ID} value={m.成员ID}>{m.成员昵称}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 lg:gap-10">
        <StatCard label={isZh ? "净资产" : "Net Worth"} value={calculations.netWorth} currency={displayCurrency} icon={<TrendingUp size={32} />} grad="from-blue-500/20 to-indigo-500/10" text="text-indigo-600" />
        <StatCard label={isZh ? "流动资产" : "Liquid"} value={calculations.liquidTotal} currency={displayCurrency} icon={<Wallet size={32} />} grad="from-emerald-500/20 to-teal-500/10" text="text-emerald-600" />
        <StatCard label={isZh ? "固定资产" : "Fixed"} value={calculations.fixedTotal} currency={displayCurrency} icon={<Home size={32} />} grad="from-orange-500/20 to-amber-500/10" text="text-amber-600" />
        <StatCard label={isZh ? "债务净额" : "Net Loans"} value={calculations.loanNet} currency={displayCurrency} icon={<Landmark size={32} />} grad="from-pink-500/20 to-purple-500/10" text="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
        <div className="p-10 lg:p-14 rounded-[48px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg">
          <h3 className="text-2xl lg:text-4xl font-black mb-10 text-slate-800 tracking-tight">{isZh ? '资产分布' : 'Asset Distribution'}</h3>
          <div className="h-80 lg:h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={calculations.memberData} innerRadius={100} outerRadius={140} paddingAngle={10} dataKey="value" stroke="none">
                  {calculations.memberData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} cornerRadius={16} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '32px', border: 'none', boxShadow: '0 25px 30px -5px rgba(0,0,0,0.1)', padding: '24px', fontWeight: '900' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 p-10 lg:p-14 rounded-[48px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg overflow-hidden">
          <h3 className="text-2xl lg:text-4xl font-black mb-10 text-slate-800 tracking-tight">{isZh ? '核心资产快照' : 'Snapshot Highlights'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-6">
              <thead>
                <tr className="text-[12px] lg:text-[15px] uppercase tracking-[0.3em] text-slate-400">
                  <th className="pb-4 px-8">{isZh ? '项目' : 'Account'}</th>
                  <th className="pb-4 px-8">{isZh ? '成员' : 'Member'}</th>
                  <th className="pb-4 px-8 text-right">{isZh ? '折算数值' : 'Valuation'}</th>
                </tr>
              </thead>
              <tbody className="text-sm lg:text-2xl">
                {calculations.snapshots.map((acc, i) => (
                  <tr key={i} className="bg-white/20 hover:bg-white/50 transition-all rounded-[32px] overflow-hidden group">
                    <td className="py-7 lg:py-9 px-8 font-black text-slate-700 rounded-l-[32px] whitespace-nowrap">
                      {String(acc.账户昵称)}
                      <span className="ml-5 text-[10px] lg:text-[13px] font-black uppercase tracking-tighter opacity-30 px-3 py-1 bg-slate-900/5 rounded-lg">[{acc.type}]</span>
                    </td>
                    <td className="py-7 lg:py-9 px-8 text-slate-500 whitespace-nowrap font-bold">{String(acc.member)}</td>
                    <td className="py-7 lg:py-9 px-8 text-right rounded-r-[32px] whitespace-nowrap">
                       <span className={`font-black tracking-tighter text-2xl lg:text-4xl ${(acc as any).isLiability || acc.converted < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                         {Math.round(acc.converted).toLocaleString()}
                       </span>
                       <span className="ml-4 text-[12px] lg:text-[16px] font-black text-slate-400 uppercase tracking-widest">{displayCurrency}</span>
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

const StatCard: React.FC<{ label: string, value: number, currency: string, icon: React.ReactNode, grad: string, text: string }> = ({ label, value, currency, icon, grad, text }) => (
  <div className={`p-10 lg:p-12 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] lg:rounded-[56px] shadow-lg relative overflow-hidden flex flex-col justify-center min-h-[160px] lg:min-h-[220px] group transition-all duration-700`}>
    <div className={`absolute -right-12 -top-12 w-48 h-48 lg:w-64 lg:h-64 bg-gradient-to-br ${grad} rounded-full blur-[80px] opacity-60 group-hover:scale-125 transition-transform duration-1000`}></div>
    <div className="relative z-10 space-y-6">
       <div className="flex items-center gap-5">
          <div className={`w-14 h-14 lg:w-18 lg:h-18 rounded-[24px] flex items-center justify-center bg-white shadow-md ${text}`}>{icon}</div>
          <p className="text-xl lg:text-3xl font-black uppercase tracking-tighter text-slate-800 opacity-90 leading-none">{label}</p>
       </div>
       <div className="flex items-baseline gap-2 lg:gap-4 overflow-hidden">
         <h4 className={`text-3xl lg:text-5xl font-black tracking-tighter leading-none ${value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
           {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
         </h4>
         <span className="text-[12px] lg:text-[18px] font-black text-slate-400 tracking-widest uppercase">{currency}</span>
       </div>
    </div>
  </div>
);

export default DashboardView;
