
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, Home, Landmark } from 'lucide-react';

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const getExchangeRate = (from: string, to: string) => {
    if (from === to) return 1;
    const rates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    const rate = rates.find(r => r.基准币种 === to && r.报价币种 === from);
    return rate ? rate.汇率 : 1;
  };

  const calculations = useMemo(() => {
    const latestLiquidByAccount = data.账户.map(acc => {
      const records = data.流动资产记录.filter(r => r.账户ID === acc.账户ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? Number(latest.市值) || 0 : 0;
      const currency = latest ? latest.币种 : acc.资产类型; 
      const converted = value * getExchangeRate(currency, settings.baseCurrency);
      return { ...acc, value, converted, member: acc.成员昵称 };
    });

    const latestFixedByAsset = data.固定资产.map(asset => {
      const records = data.固定资产记录.filter(r => r.资产ID === asset.资产ID).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? Number(latest.估值) || 0 : Number(asset.购入价格) || 0;
      const converted = value * getExchangeRate(asset.币种, settings.baseCurrency);
      return { ...asset, value, converted, member: asset.成员昵称 };
    });

    const loansList = data.借入借出记录.filter(l => l.结清 !== '是');
    const lendingTotal = loansList.filter(l => l.借入借出 === '借出').reduce((sum, l) => sum + (Number(l.借款额) || 0) * getExchangeRate(l.币种, settings.baseCurrency), 0);
    const borrowingTotal = loansList.filter(l => l.借入借出 === '借入').reduce((sum, l) => sum + (Number(l.借款额) || 0) * getExchangeRate(l.币种, settings.baseCurrency), 0);

    const liquidTotal = latestLiquidByAccount.reduce((sum, item) => sum + item.converted, 0);
    const fixedTotal = latestFixedByAsset.reduce((sum, item) => sum + item.converted, 0);
    const netWorth = liquidTotal + fixedTotal + lendingTotal - borrowingTotal;

    const memberData = data.成员.map(m => {
      const val = latestLiquidByAccount.filter(a => a.成员ID === m.成员ID).reduce((s, i) => s + i.converted, 0) + latestFixedByAsset.filter(a => a.成员ID === m.成员ID).reduce((s, i) => s + i.converted, 0);
      return { name: String(m.成员昵称), value: val };
    }).filter(m => m.value > 0);

    return { netWorth, liquidTotal, fixedTotal, lendingTotal, borrowingTotal, memberData, latestLiquidByAccount };
  }, [data, settings]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Net Worth" value={calculations.netWorth} currency={settings.baseCurrency} icon={<TrendingUp size={28} />} grad="from-blue-500/20 to-indigo-500/20" text="text-indigo-700" />
        <StatCard label="Liquid" value={calculations.liquidTotal} currency={settings.baseCurrency} icon={<Wallet size={28} />} grad="from-emerald-500/20 to-teal-500/20" text="text-emerald-700" />
        <StatCard label="Fixed" value={calculations.fixedTotal} currency={settings.baseCurrency} icon={<Home size={28} />} grad="from-orange-500/20 to-amber-500/20" text="text-amber-700" />
        <StatCard label="Balance" value={calculations.lendingTotal - calculations.borrowingTotal} currency={settings.baseCurrency} icon={<Landmark size={28} />} grad="from-pink-500/20 to-purple-500/20" text="text-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="p-8 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg">
          <h3 className="text-xl font-black mb-6 text-slate-800">Member Split</h3>
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

        <div className="lg:col-span-2 p-8 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg">
          <h3 className="text-xl font-black mb-6 text-slate-800">Latest Snapshots</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/40 text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="pb-4 px-2">Account</th>
                  <th className="pb-4 px-2">Member</th>
                  <th className="pb-4 px-2 text-right">Value (Base)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {calculations.latestLiquidByAccount.slice(0, 6).map((acc, i) => (
                  <tr key={i} className="group hover:bg-white/50 transition-colors">
                    <td className="py-4 px-2 font-bold text-slate-700">{String(acc.账户昵称)}</td>
                    <td className="py-4 px-2 text-slate-500">{String(acc.member)}</td>
                    <td className="py-4 px-2 text-right font-black text-blue-600 tracking-tight">
                      {Math.round(acc.converted).toLocaleString()} {settings.baseCurrency}
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
  <div className={`p-7 bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] shadow-sm relative overflow-hidden group hover:scale-[1.03] transition-transform duration-500`}>
    <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${grad} rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-700`}></div>
    <div className="relative z-10 flex flex-col gap-4">
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm ${text}`}>
         {icon}
       </div>
       <div>
         <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
         <div className="flex items-baseline gap-2">
           <h4 className="text-3xl font-black text-slate-800 tracking-tighter">
             {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
           </h4>
           <span className="text-[10px] font-black text-slate-400">{currency}</span>
         </div>
       </div>
    </div>
  </div>
);

export default DashboardView;
