
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, Home, Landmark, Globe, User, ArrowRightLeft } from 'lucide-react';

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  // Local state for dashboard display currency (defaults to global setting)
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
    const base = displayCurrency; // Use local display currency for rates calculation
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
      const currency = latest ? latest.币种 : acc.资产类型; 
      const converted = value * getExchangeRate(currency, displayCurrency);
      return { ...acc, value, converted, member: acc.成员昵称 };
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
      return { ...asset, value, converted, member: asset.成员昵称 };
    });
    let loansList = data.借入借出记录.filter(l => l.结清 !== '是');
    if (selectedMemberId !== 'all') {
      loansList = loansList.filter(l => l.成员ID === selectedMemberId);
    }
    const lendingTotal = loansList.filter(l => l.借入借出 === '借出').reduce((sum, l) => sum + (Number(l.借款额) || 0) * getExchangeRate(l.币种, displayCurrency), 0);
    const borrowingTotal = loansList.filter(l => l.借入借出 === '借入').reduce((sum, l) => sum + (Number(l.借款额) || 0) * getExchangeRate(l.币种, displayCurrency), 0);
    const liquidTotal = latestLiquidByAccount.reduce((sum, item) => sum + item.converted, 0);
    const fixedTotal = latestFixedByAsset.reduce((sum, item) => sum + item.converted, 0);
    const netWorth = liquidTotal + fixedTotal + lendingTotal - borrowingTotal;
    const memberData = data.成员.map(m => {
      const val = latestLiquidByAccount.filter(a => a.成员ID === m.成员ID).reduce((s, i) => s + i.converted, 0) + latestFixedByAsset.filter(a => a.成员ID === m.成员ID).reduce((s, i) => s + i.converted, 0);
      return { name: String(m.成员昵称), value: val };
    }).filter(m => m.value > 0);
    return { netWorth, liquidTotal, fixedTotal, lendingTotal, borrowingTotal, memberData, latestLiquidByAccount };
  }, [data, displayCurrency, selectedMemberId]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Controls: Two Distinct Cards */}
      <div className="flex flex-col xl:flex-row items-stretch gap-6">
        {/* Card 1: Squashed FX Intelligence Bar with Dropdown */}
        <div className="flex-1 rounded-[28px] py-4 px-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500 flex items-center gap-8">
          <div className="flex items-center gap-3 bg-blue-600/10 px-4 py-2 rounded-2xl text-blue-600 border border-blue-600/20 shadow-inner group/curr">
            <Globe size={18} strokeWidth={2.5} />
            <select 
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="bg-transparent border-none outline-none font-black text-sm tracking-widest cursor-pointer appearance-none pr-1"
            >
              {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
          </div>

          <div className="flex-1 flex items-center gap-4 overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 flex-shrink-0">
              <ArrowRightLeft size={14} />
              <span>FX:</span>
            </div>
            {availableCurrencies.filter(c => c !== displayCurrency).map(curr => {
              const rate = exchangeRatesMap[curr];
              return (
                <div key={curr} className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white/80 flex-shrink-0 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400">{curr}</span>
                  <span className="text-xs font-black text-slate-700">
                    {rate > 0 ? rate.toFixed(3) : '--'}
                  </span>
                </div>
              );
            })}
            {availableCurrencies.length <= 1 && (
               <span className="text-[10px] text-slate-400 font-medium italic">No other rates tracked</span>
            )}
          </div>
        </div>

        {/* Card 2: Separated Member Filter Card */}
        <div className="rounded-[28px] py-4 px-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500 flex items-center gap-4 min-w-[240px]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900/5 text-slate-500">
            <User size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Perspective</p>
            <select 
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-sm py-0 pr-4 appearance-none cursor-pointer"
            >
              <option value="all">{settings.language === 'en' ? 'All Members' : '全体成员'}</option>
              {data.成员.map(m => (
                <option key={m.成员ID} value={m.成员ID}>{m.成员昵称}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label={settings.language === 'en' ? "Net Worth" : "净资产"} value={calculations.netWorth} currency={displayCurrency} icon={<TrendingUp size={28} />} grad="from-blue-500/20 to-indigo-500/10" text="text-indigo-600" />
        <StatCard label={settings.language === 'en' ? "Liquid" : "流动资产"} value={calculations.liquidTotal} currency={displayCurrency} icon={<Wallet size={28} />} grad="from-emerald-500/20 to-teal-500/10" text="text-emerald-600" />
        <StatCard label={settings.language === 'en' ? "Fixed" : "固定资产"} value={calculations.fixedTotal} currency={displayCurrency} icon={<Home size={28} />} grad="from-orange-500/20 to-amber-500/10" text="text-amber-600" />
        <StatCard label={settings.language === 'en' ? "Balance" : "待清结算"} value={calculations.lendingTotal - calculations.borrowingTotal} currency={displayCurrency} icon={<Landmark size={28} />} grad="from-pink-500/20 to-purple-500/10" text="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pie Chart Card */}
        <div className="p-8 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500">
          <h3 className="text-2xl font-black mb-6 text-slate-800">{settings.language === 'en' ? 'Member Split' : '成员资产分布'}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={calculations.memberData} innerRadius={75} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                  {calculations.memberData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} cornerRadius={8} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="lg:col-span-2 p-8 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500">
          <h3 className="text-2xl font-black mb-6 text-slate-800">{settings.language === 'en' ? 'Latest Snapshots' : '资产快照列表'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="pb-4 px-4">{settings.language === 'en' ? 'Account' : '账户'}</th>
                  <th className="pb-4 px-4">{settings.language === 'en' ? 'Member' : '所属成员'}</th>
                  <th className="pb-4 px-4 text-right">{settings.language === 'en' ? 'Value (Base)' : '折算市值'}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {calculations.latestLiquidByAccount.slice(0, 10).map((acc, i) => (
                  <tr key={i} className="group/row hover:bg-white/50 transition-colors bg-white/20 rounded-2xl">
                    <td className="py-4 px-4 font-bold text-slate-700 rounded-l-2xl">{String(acc.账户昵称)}</td>
                    <td className="py-4 px-4 text-slate-500">{String(acc.member)}</td>
                    <td className="py-4 px-4 text-right font-black text-blue-600 tracking-tight rounded-r-2xl">
                      {Math.round(acc.converted).toLocaleString()} {displayCurrency}
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
  <div className={`p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-lg relative overflow-hidden hover:shadow-2xl transition-all duration-500 min-h-[170px] flex flex-col justify-center`}>
    <div className={`absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br ${grad} rounded-full blur-3xl opacity-60`}></div>
    
    <div className="relative z-10 flex flex-col gap-6">
       <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white shadow-md shadow-slate-200/50 ${text} transition-all group-hover:rotate-12`}>
            {icon}
          </div>
          <p className="text-2xl font-black uppercase tracking-tighter text-slate-800 opacity-90 leading-none">{label}</p>
       </div>
       
       <div className="pl-1">
         <div className="flex items-baseline gap-2">
           <h4 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter drop-shadow-sm leading-none">
             {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
           </h4>
           <span className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase">{currency}</span>
         </div>
       </div>
    </div>
  </div>
);

export default DashboardView;
