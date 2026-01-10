
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Controls: Enhanced Dynamism */}
      <div className="flex flex-col xl:flex-row items-stretch gap-4 sm:gap-6">
        {/* Card 1: Currency & FX Bar */}
        <div className="flex-1 rounded-[24px] sm:rounded-[28px] py-3 sm:py-4 px-4 sm:px-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500 flex items-center gap-4 sm:gap-8 min-h-[64px] sm:min-h-[80px]">
          <div className="flex items-center gap-2 sm:gap-3 bg-blue-600/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-blue-600 border border-blue-600/20 shadow-inner group/curr flex-shrink-0">
            <Globe size={16} sm:size={18} strokeWidth={2.5} />
            <select 
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="bg-transparent border-none outline-none font-black text-xs sm:text-sm tracking-widest cursor-pointer appearance-none pr-1"
            >
              {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
          </div>

          <div className="flex-1 flex items-center gap-3 sm:gap-4 overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 sm:mr-2 flex-shrink-0">
              <ArrowRightLeft size={12} sm:size={14} />
              <span>FX:</span>
            </div>
            {availableCurrencies.filter(c => c !== displayCurrency).map(curr => {
              const rate = exchangeRatesMap[curr];
              return (
                <div key={curr} className="flex items-center gap-1.5 sm:gap-2 bg-white/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/80 flex-shrink-0 shadow-sm">
                  <span className="text-[8px] sm:text-[10px] font-black text-slate-400">{curr}</span>
                  <span className="text-[10px] sm:text-xs font-black text-slate-700">
                    {rate > 0 ? rate.toFixed(3) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Perspective (Member Filter) - Dynamic Scaling */}
        <div className="rounded-[24px] sm:rounded-[28px] py-3 sm:py-4 px-4 sm:px-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500 flex items-center gap-3 sm:gap-4 xl:min-w-[240px]">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-slate-900/5 text-slate-500 flex-shrink-0">
            <User size={16} sm:size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Perspective</p>
            <select 
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-xs sm:text-sm py-0 pr-4 appearance-none cursor-pointer truncate"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label={settings.language === 'en' ? "Net Worth" : "净资产"} value={calculations.netWorth} currency={displayCurrency} icon={<TrendingUp size={24} />} grad="from-blue-500/20 to-indigo-500/10" text="text-indigo-600" />
        <StatCard label={settings.language === 'en' ? "Liquid" : "流动资产"} value={calculations.liquidTotal} currency={displayCurrency} icon={<Wallet size={24} />} grad="from-emerald-500/20 to-teal-500/10" text="text-emerald-600" />
        <StatCard label={settings.language === 'en' ? "Fixed" : "固定资产"} value={calculations.fixedTotal} currency={displayCurrency} icon={<Home size={24} />} grad="from-orange-500/20 to-amber-500/10" text="text-amber-600" />
        <StatCard label={settings.language === 'en' ? "Balance" : "待清结算"} value={calculations.lendingTotal - calculations.borrowingTotal} currency={displayCurrency} icon={<Landmark size={24} />} grad="from-pink-500/20 to-purple-500/10" text="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Pie Chart Card */}
        <div className="p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500">
          <h3 className="text-lg sm:text-xl md:text-2xl font-black mb-4 sm:mb-6 text-slate-800 tracking-tight">{settings.language === 'en' ? 'Member Split' : '成员资产分布'}</h3>
          <div className="h-64 sm:h-72">
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

        {/* Data Table Card */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden">
          <h3 className="text-lg sm:text-xl md:text-2xl font-black mb-4 sm:mb-6 text-slate-800 tracking-tight">{settings.language === 'en' ? 'Latest Snapshots' : '资产快照列表'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="pb-3 sm:pb-4 px-3 sm:px-4">{settings.language === 'en' ? 'Account' : '账户'}</th>
                  <th className="pb-3 sm:pb-4 px-3 sm:px-4">{settings.language === 'en' ? 'Member' : '所属成员'}</th>
                  <th className="pb-3 sm:pb-4 px-3 sm:px-4 text-right">{settings.language === 'en' ? 'Value (Base)' : '折算市值'}</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm">
                {calculations.latestLiquidByAccount.slice(0, 10).map((acc, i) => (
                  <tr key={i} className="group/row hover:bg-white/50 transition-colors bg-white/20 rounded-xl sm:rounded-2xl">
                    <td className="py-3 sm:py-4 px-3 sm:px-4 font-bold text-slate-700 rounded-l-xl sm:rounded-l-2xl whitespace-nowrap">{String(acc.账户昵称)}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-slate-500 whitespace-nowrap">{String(acc.member)}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-black text-blue-600 tracking-tight rounded-r-xl sm:rounded-r-2xl whitespace-nowrap">
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
  <div className={`p-5 sm:p-6 lg:p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] sm:rounded-[32px] shadow-lg relative overflow-hidden hover:shadow-2xl transition-all duration-500 min-h-[140px] sm:min-h-[160px] flex flex-col justify-center`}>
    <div className={`absolute -right-4 -top-4 w-24 sm:w-28 h-24 sm:h-28 bg-gradient-to-br ${grad} rounded-full blur-3xl opacity-60`}></div>
    
    <div className="relative z-10 flex flex-col gap-3 sm:gap-4 lg:gap-6 overflow-hidden">
       <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl lg:rounded-2xl flex-shrink-0 flex items-center justify-center bg-white shadow-md shadow-slate-200/50 ${text}`}>
            {icon}
          </div>
          <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black uppercase tracking-tighter text-slate-800 opacity-90 leading-none truncate">{label}</p>
       </div>
       
       <div className="pl-0.5 sm:pl-1 overflow-hidden">
         <div className="flex items-baseline gap-1.5 sm:gap-2 overflow-hidden">
           <h4 className="text-lg sm:text-xl md:text-2xl xl:text-3xl 2xl:text-4xl font-black text-slate-900 tracking-tighter drop-shadow-sm leading-none truncate">
             {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
           </h4>
           <span className="text-[9px] lg:text-[11px] font-black text-slate-400 tracking-widest uppercase flex-shrink-0">{currency}</span>
         </div>
       </div>
    </div>
  </div>
);

export default DashboardView;
