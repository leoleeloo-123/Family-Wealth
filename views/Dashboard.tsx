
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, Wallet, Landmark, Home, ArrowUpRight, ArrowDownRight } from 'lucide-react';
// Import LoanRecord type to fix typing errors in calculations
import { LoanRecord } from '../types';

const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  // 1. Exchange Rate Helper
  const getExchangeRate = (from: string, to: string) => {
    if (from === to) return 1;
    const rates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    const rate = rates.find(r => r.基准币种 === to && r.报价币种 === from);
    return rate ? rate.汇率 : 1; // Default to 1 if not found, usually should prompt
  };

  // 2. Snapshot Calculations
  const calculations = useMemo(() => {
    // Liquid Assets
    const accountSnapshots: Record<string, number> = {};
    data.流动资产记录.forEach(record => {
      const existing = accountSnapshots[record.账户ID];
      const recordDate = new Date(record.时间).getTime();
      if (!existing || recordDate > new Date(record.时间).getTime()) {
         // This is a bit inefficient, usually we sort first.
      }
    });

    // Let's do it properly: Sort then pick last
    const latestLiquidByAccount = data.账户.map(acc => {
      const records = data.流动资产记录
        .filter(r => r.账户ID === acc.账户ID)
        .sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? latest.市值 : 0;
      const currency = latest ? latest.币种 : acc.资产类型; // Fallback to asset type or something
      const converted = value * getExchangeRate(currency, settings.baseCurrency);
      return { ...acc, value, converted, member: acc.成员昵称 };
    });

    const latestFixedByAsset = data.固定资产.map(asset => {
      const records = data.固定资产记录
        .filter(r => r.资产ID === asset.资产ID)
        .sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      const latest = records[0];
      const value = latest ? latest.估值 : asset.购入价格;
      const converted = value * getExchangeRate(asset.币种, settings.baseCurrency);
      return { ...asset, value, converted, member: asset.成员昵称 };
    });

    // Lending/Borrowing
    const latestLoans = data.借入借出记录
      .filter(l => l.结清 !== '是')
      .reduce((acc, l) => {
        const key = `${l.成员ID}-${l.借款对象}-${l.借入借出}`;
        const existing = acc[key];
        // Use .getTime() for reliable date comparison in TypeScript to avoid 'unknown' issues
        if (!existing || new Date(l.时间).getTime() > new Date(existing.时间).getTime()) {
          acc[key] = l;
        }
        return acc;
      }, {} as Record<string, LoanRecord>);

    const loansList = Object.values(latestLoans);
    // Use the correctly typed loansList to perform calculations
    const lendingTotal = (loansList as LoanRecord[])
      .filter(l => l.借入借出 === '借出')
      .reduce((sum, l) => sum + l.借款额 * getExchangeRate(l.币种, settings.baseCurrency), 0);
    const borrowingTotal = (loansList as LoanRecord[])
      .filter(l => l.借入借出 === '借入')
      .reduce((sum, l) => sum + l.借款额 * getExchangeRate(l.币种, settings.baseCurrency), 0);

    const liquidTotal = latestLiquidByAccount.reduce((sum, item) => sum + item.converted, 0);
    const fixedTotal = latestFixedByAsset.reduce((sum, item) => sum + item.converted, 0);
    const netWorth = liquidTotal + fixedTotal + lendingTotal - borrowingTotal;

    // Member Breakdown
    const memberData = data.成员.map(m => {
      const m_liquid = latestLiquidByAccount.filter(a => a.成员ID === m.成员ID).reduce((s, i) => s + i.converted, 0);
      const m_fixed = latestFixedByAsset.filter(a => a.成员ID === m.成员ID).reduce((s, i) => s + i.converted, 0);
      return { name: m.成员昵称, value: m_liquid + m_fixed };
    });

    return { netWorth, liquidTotal, fixedTotal, lendingTotal, borrowingTotal, memberData, latestLiquidByAccount };
  }, [data, settings]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Family Net Worth" 
          value={calculations.netWorth} 
          currency={settings.baseCurrency} 
          icon={<TrendingUp className="text-blue-500" />} 
          color="blue"
        />
        <StatCard 
          label="Liquid Assets" 
          value={calculations.liquidTotal} 
          currency={settings.baseCurrency} 
          icon={<Wallet className="text-emerald-500" />} 
          color="emerald"
        />
        <StatCard 
          label="Fixed Assets" 
          value={calculations.fixedTotal} 
          currency={settings.baseCurrency} 
          icon={<Home className="text-orange-500" />} 
          color="orange"
        />
        <StatCard 
          label="Loans (Lend - Borrow)" 
          value={calculations.lendingTotal - calculations.borrowingTotal} 
          currency={settings.baseCurrency} 
          icon={<Landmark className="text-purple-500" />} 
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart: Member Allocation */}
        <div className={`p-6 rounded-xl border ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Member Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={calculations.memberData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {calculations.memberData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed List: Recent Accounts */}
        <div className={`lg:col-span-2 p-6 rounded-xl border ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Account Snapshot</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-400">
                  <th className="pb-3 font-medium">Account</th>
                  <th className="pb-3 font-medium">Member</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium text-right">Value (Original)</th>
                  <th className="pb-3 font-medium text-right">Value ({settings.baseCurrency})</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {calculations.latestLiquidByAccount.slice(0, 8).map((acc, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-4 font-medium">{acc.账户昵称}</td>
                    <td className="py-4">{acc.member}</td>
                    <td className="py-4 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded-full">{acc.账户类型}</span>
                    </td>
                    <td className="py-4 text-right tabular-nums">
                      {acc.value.toLocaleString()} 
                    </td>
                    <td className="py-4 text-right font-semibold tabular-nums">
                      {Math.round(acc.converted).toLocaleString()}
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

const StatCard: React.FC<{ label: string, value: number, currency: string, icon: React.ReactNode, color: string }> = ({ label, value, currency, icon, color }) => {
  return (
    <div className={`p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex items-start justify-between`}>
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-2xl font-bold tracking-tight">
            {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h4>
          <span className="text-xs font-bold text-gray-400">{currency}</span>
        </div>
      </div>
      <div className={`p-3 bg-${color}-50 rounded-lg`}>
        {icon}
      </div>
    </div>
  );
};

export default DashboardView;
