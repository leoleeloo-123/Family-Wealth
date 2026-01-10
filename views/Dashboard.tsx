
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, Home, Landmark, Globe, User, ArrowRightLeft } from 'lucide-react';

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const [displayCurrency, setDisplayCurrency] = useState<string>(settings.baseCurrency);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  const getExchangeRate = (from: string, to: string) => {
    if (from === to) return 1;
    const rates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    const rate = rates.find(r => r.基准币种 === to && r.报价币种 === from);
    return rate ? rate.汇率 : 1;
  };

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    data.汇率.forEach(rate => {
      if (rate.基准币种) currencies.add(rate.基准币种);
      if (rate.报价币种) currencies.add(rate.报价币种);
    });
    if (currencies.size === 0 && settings.baseCurrency) currencies.add(settings.baseCurrency);
    return Array.from(currencies).sort();
  }, [data.汇率, settings.baseCurrency]);

  const exchangeRatesMap = useMemo(() => {
    const rates: Record<string, number> = {};
    const base = displayCurrency;
    rates[base] = 1;
    const sortedRates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    const adj: Record<string, Record<string, number>> = {};
    sortedRates.forEach(r => {
      const b = r.基准币种; const q = r.报价币种; const val = Number(r.汇率);
      if (!b || !q || isNaN(val) || val === 0) return;
      if (!adj[b]) adj[b] = {}; adj[b][q] = 1 / val;
      if (!adj[q]) adj[q] = {}; adj[q][b] = val;
    });
    availableCurrencies.forEach(curr => {
      if (curr === base) return;
      const visited = new Set<string>();
      const queue: Array<{ node: string; factor: number }> = [{ node: base, factor: 1 }];
      visited.add(base);
      while (queue.length > 0) {
        const { node, factor } = queue.shift()!;
        if (node === curr) { rates[curr] = factor; return; }
        if (adj[node]) {
          for (const [neighbor, edgeRate] of Object.entries(adj[node])) {
            if (!visited.has(neighbor)) { visited.add(neighbor); queue.push({ node: neighbor, factor: factor * edgeRate }); }
          }
        }
      }
      rates[curr] = 0;
    });
    return rates;
  }, [data.汇率, displayCurrency, availableCurrencies]);

  const calculations = useMemo(() => {
    let accountsToCalculate = data.账户;
    if (selectedMemberId !== 'all') {
      accountsToCalculate = accountsToCalculate.filter(acc => acc.成员ID === selectedMemberId);
    }
    const latestLiquidByAccount = accountsToCalculate.map(acc => {
      const records = data.流动资产记录.filter(r => r.账户ID === acc.账户ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? Number(latest.市值) || 0 : 0;
      const currency = latest ? latest.币种 : acc.币种 || displayCurrency; 
      const converted = value * getExchangeRate(currency, displayCurrency);
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
      const converted = value * getExchangeRate(asset.币种, displayCurrency);
      return { 账户昵称: asset.资产昵称, value, converted, member: asset.成员昵称, type: 'fixed' };
    });

    let loansList = data.借入借出记录.filter(l => l.结清 !== '是');
    if (selectedMemberId !== 'all') {
      loansList = loansList.filter(l => l.成员ID === selectedMemberId);
    }
    const loanEntries = loansList.map(l => {
      const isBorrowing = l.借入借出 === '借入';
      const rawValue = Number(l.借款额) || 0;
      const converted = rawValue * getExchangeRate(l.币种, displayCurrency);
      return {
        账户昵称: l.借款对象,
        value: isBorrowing ? -rawValue : rawValue,
        converted: isBorrowing ? -converted : converted,
        member: l.成员昵称,
        type: 'loan',
        isLiability: isBorrowing
      };
    });

    const liquidTotal = latestLiquidByAccount.reduce((sum, item) => sum + item.converted, 0);
    const fixedTotal = latestFixedByAsset.reduce((sum, item) => sum + item.converted, 0);
    const loanNet = loanEntries.reduce((sum, item) => sum + item.converted, 0);
    const netWorth = liquidTotal + fixedTotal + loanNet;

    // Combine for snapshots table
    const snapshots = [...latestLiquidByAccount, ...latestFixedByAsset, ...loanEntries]
      .sort((a, b) => Math.abs(b.converted) - Math.abs(a.converted))
      .slice(0, 12);

    const memberData = data.成员.map(m => {
      const val = [...latestLiquidByAccount, ...latestFixedByAsset, ...loanEntries]
        .filter(a => a.成员ID === m.成员ID || a.member === m.成员昵称)
        .reduce((s, i) => s + i.converted, 0);
      return { name: String(m.成员昵称), value: Math.max(0, val) }; // Pie charts usually represent positive portions
    }).filter(m => m.value > 0);

    return { netWorth, liquidTotal, fixedTotal, loanNet, memberData, snapshots };
  }, [data, displayCurrency, selectedMemberId]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col xl:flex-row items-stretch gap-4 sm:gap-6">
        <div className="flex-1 rounded-[24px] py-3 px-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-8 min-h-[80px]">
          <div className="flex items-center gap-3 bg-blue-600/10 px-4 py-2 rounded-2xl text-blue-600 border border-blue-600/20 shadow-inner group/curr flex-shrink-0">
            <Globe size={18} strokeWidth={2.5} />
            <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="bg-transparent border-none outline-none font-black text-sm tracking-widest cursor-pointer appearance-none">
              {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
          </div>
          <div className="flex-1 flex items-center gap-4 overflow-x-auto no-scrollbar">
            {availableCurrencies.filter(c => c !== displayCurrency).map(curr => (
              <div key={curr} className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white/80 flex-shrink-0 shadow-sm">
                <span className="text-[10px] font-black text-slate-400">{curr}</span>
                <span className="text-xs font-black text-slate-700">{exchangeRatesMap[curr] > 0 ? exchangeRatesMap[curr].toFixed(3) : '--'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] py-3 px-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4 xl:min-w-[240px]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900/5 text-slate-500 flex-shrink-0"><User size={20} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Perspective</p>
            <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-sm py-0 pr-4 appearance-none cursor-pointer truncate">
              <option value="all">{settings.language === 'en' ? 'All Members' : '全体成员'}</option>
              {data.成员.map(m => <option key={m.成员ID} value={m.成员ID}>{m.成员昵称}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label={settings.language === 'en' ? "Net Worth" : "净资产"} value={calculations.netWorth} currency={displayCurrency} icon={<TrendingUp size={24} />} grad="from-blue-500/20 to-indigo-500/10" text="text-indigo-600" />
        <StatCard label={settings.language === 'en' ? "Liquid" : "流动资产"} value={calculations.liquidTotal} currency={displayCurrency} icon={<Wallet size={24} />} grad="from-emerald-500/20 to-teal-500/10" text="text-emerald-600" />
        <StatCard label={settings.language === 'en' ? "Fixed" : "固定资产"} value={calculations.fixedTotal} currency={displayCurrency} icon={<Home size={24} />} grad="from-orange-500/20 to-amber-500/10" text="text-amber-600" />
        <StatCard label={settings.language === 'en' ? "Net Loans" : "债务净额"} value={calculations.loanNet} currency={displayCurrency} icon={<Landmark size={24} />} grad="from-pink-500/20 to-purple-500/10" text="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="p-8 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg">
          <h3 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">{settings.language === 'en' ? 'Asset Distribution' : '资产分布'}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={calculations.memberData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                  {calculations.memberData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} cornerRadius={8} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 p-8 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg overflow-hidden">
          <h3 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">{settings.language === 'en' ? 'Snapshot Highlights' : '核心资产快照'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="pb-4 px-4">{settings.language === 'en' ? 'Account' : '项目'}</th>
                  <th className="pb-4 px-4">{settings.language === 'en' ? 'Member' : '成员'}</th>
                  <th className="pb-4 px-4 text-right">{settings.language === 'en' ? 'Valuation' : '折算数值'}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {calculations.snapshots.map((acc, i) => (
                  <tr key={i} className="bg-white/20 hover:bg-white/50 transition-colors rounded-xl overflow-hidden">
                    <td className="py-4 px-4 font-bold text-slate-700 rounded-l-2xl whitespace-nowrap">
                      {String(acc.账户昵称)}
                      <span className="ml-2 text-[9px] font-black uppercase tracking-tighter opacity-30">[{acc.type}]</span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 whitespace-nowrap">{String(acc.member)}</td>
                    <td className="py-4 px-4 text-right rounded-r-2xl whitespace-nowrap">
                       <span className={`font-black tracking-tight text-base ${(acc as any).isLiability || acc.converted < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                         {Math.round(acc.converted).toLocaleString()}
                       </span>
                       <span className="ml-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">{displayCurrency}</span>
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
  <div className={`p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-lg relative overflow-hidden flex flex-col justify-center min-h-[160px] group`}>
    <div className={`absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br ${grad} rounded-full blur-3xl opacity-60 group-hover:scale-125 transition-transform duration-1000`}></div>
    <div className="relative z-10 space-y-4">
       <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-md ${text}`}>{icon}</div>
          <p className="text-xl font-black uppercase tracking-tighter text-slate-800 opacity-90 leading-none">{label}</p>
       </div>
       <div className="flex items-baseline gap-2 overflow-hidden">
         <h4 className={`text-3xl font-black tracking-tighter leading-none ${value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
           {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
         </h4>
         <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">{currency}</span>
       </div>
    </div>
  </div>
);

export default DashboardView;
