
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { Type, Globe, Clock, ShieldAlert, Languages, Check, Trash2, ShieldCheck, TrendingUp } from 'lucide-react';

const SettingsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { settings, setSettings, setData, data } = context;

  const handleClearData = () => {
    const msg = settings.language === 'en' 
      ? "CRITICAL: This will wipe all current data in the application. Ensure you have an Excel backup. Continue?"
      : "致命警告：这将清空应用程序中的所有当前数据。请确保您已备份 Excel 文件。是否继续？";
    
    if (window.confirm(msg)) {
      setData({
        成员: [], 机构: [], 手机: [], 账户: [], 保险: [], 汇率: [], 固定资产: [],
        流动资产记录: [], 固定资产记录: [], 借入借出记录: [], 企业分红记录: []
      });
      localStorage.removeItem('family_asset_data');
      alert(settings.language === 'en' ? "All data cleared." : "所有数据已清空。");
    }
  };

  // 1. Available Currencies: Strictly only those present in the Exchange Rate table
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    data.汇率.forEach(rate => {
      if (rate.基准币种) currencies.add(rate.基准币种);
      if (rate.报价币种) currencies.add(rate.报价币种);
    });
    
    if (currencies.size === 0 && settings.baseCurrency) {
      currencies.add(settings.baseCurrency);
    }
    
    return Array.from(currencies).sort();
  }, [data.汇率, settings.baseCurrency]);

  // 2. Automated Exchange Rate Calculation
  // We compute factor R such that: 1 unit of Base = R units of Foreign
  const exchangeRatesMap = useMemo(() => {
    const rates: Record<string, number> = {};
    const base = settings.baseCurrency;
    
    rates[base] = 1;

    const sortedRates = [...data.汇率].sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());

    const adj: Record<string, Record<string, number>> = {};
    sortedRates.forEach(r => {
      const b = r.基准币种;
      const q = r.报价币种;
      const val = Number(r.汇率);
      if (!b || !q || isNaN(val) || val === 0) return;
      
      // The user's protocol usually means: 1 Q = val * B
      // To get 1 B = X * Q, we use X = 1/val
      if (!adj[b]) adj[b] = {};
      adj[b][q] = 1 / val;
      
      if (!adj[q]) adj[q] = {};
      adj[q][b] = val;
    });

    availableCurrencies.forEach(curr => {
      if (curr === base) return;
      
      const visited = new Set<string>();
      const queue: Array<{ node: string; factor: number }> = [{ node: base, factor: 1 }];
      visited.add(base);

      while (queue.length > 0) {
        const { node, factor } = queue.shift()!;
        if (node === curr) {
          rates[curr] = factor;
          return;
        }

        if (adj[node]) {
          for (const [neighbor, edgeRate] of Object.entries(adj[node])) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push({ node: neighbor, factor: factor * edgeRate });
            }
          }
        }
      }
      
      rates[curr] = 0;
    });

    return rates;
  }, [data.汇率, settings.baseCurrency, availableCurrencies]);

  const t = {
    preferences: settings.language === 'en' ? 'System Preferences' : '系统偏好',
    currencyVault: settings.language === 'en' ? 'Currency & FX Intelligence' : '本位币与汇率情报',
    currency: settings.language === 'en' ? 'Base Currency' : '系统基准币种',
    fxRates: settings.language === 'en' ? 'Active Exchange Rates' : '实时生效汇率',
    fontSize: settings.language === 'en' ? 'Font Size' : '字体大小',
    dateFormat: settings.language === 'en' ? 'Date Format' : '日期格式',
    language: settings.language === 'en' ? 'Interface Language' : '系统语言',
    dangerZone: settings.language === 'en' ? 'Danger Zone' : '危险区域',
    dangerDesc: settings.language === 'en' 
      ? 'These actions are permanent and cannot be undone within the application environment.'
      : '这些操作是永久性的，且无法在应用程序本地环境内撤销。',
    resetBtn: settings.language === 'en' ? 'Reset Local Database' : '清空本地数据库',
    footer: settings.language === 'en' 
      ? 'Family Asset Management System • Local Browser Sandbox'
      : '家庭资产管理系统 • 本地浏览器沙盒实例',
    noRate: settings.language === 'en' ? 'No path in FX table' : '汇率表中无路径',
    rateDesc: settings.language === 'en' ? 'Currencies strictly limited to FX source data' : '币种选择仅限于汇率表中存在的记录'
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      
      <section className="glass-card rounded-[48px] p-10 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 border-white/60 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
              <Globe size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{t.currencyVault}</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1">{t.rateDesc}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[280px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.currency}</label>
            <div className="relative">
              <select 
                value={settings.baseCurrency}
                onChange={(e) => setSettings({...settings, baseCurrency: e.target.value})}
                className="w-full p-5 bg-white border border-white/60 rounded-[24px] outline-none font-black text-blue-600 shadow-xl shadow-blue-500/5 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 transition-all"
              >
                {availableCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                <Globe size={18} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
          {availableCurrencies.filter(c => c !== settings.baseCurrency).map(curr => {
            const rate = exchangeRatesMap[curr];
            return (
              <div key={curr} className="bg-white/50 backdrop-blur-md p-6 rounded-[32px] border border-white/60 flex flex-col gap-2 hover:bg-white/80 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{curr}</span>
                  <TrendingUp size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800 tracking-tighter">
                    {rate > 0 ? rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '--'}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{curr}</span>
                </div>
                <p className="text-[9px] font-bold text-slate-400 italic">
                  {rate > 0 ? `1 ${settings.baseCurrency} = ${rate.toFixed(4)} ${curr}` : t.noRate}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <div className="glass-card rounded-[48px] p-12 bg-white/40 backdrop-blur-3xl border-white/60 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-6 mb-12 relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <Check size={28} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{t.preferences}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1">Interface Configuration Protocol</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 relative z-10">
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                  <Languages size={18} className="text-indigo-500" /> {t.language}
                </label>
                <div className="flex p-1.5 bg-slate-900/5 rounded-[22px] border border-white/40 backdrop-blur-md">
                  <button 
                    onClick={() => setSettings({...settings, language: 'zh'})}
                    className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest rounded-[18px] transition-all duration-500 ${settings.language === 'zh' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    简体中文
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, language: 'en'})}
                    className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest rounded-[18px] transition-all duration-500 ${settings.language === 'en' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                  <Type size={18} className="text-emerald-500" /> {t.fontSize}
                </label>
                <div className="relative group">
                  <select 
                    value={settings.fontSize}
                    onChange={(e) => setSettings({...settings, fontSize: e.target.value as any})}
                    className="w-full p-5 bg-white/60 border border-white/60 rounded-[22px] focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer shadow-inner"
                  >
                    <option value="small">{settings.language === 'en' ? 'Small (Condensed)' : '紧凑 (小号)'}</option>
                    <option value="medium">{settings.language === 'en' ? 'Medium (Standard)' : '标准 (中号)'}</option>
                    <option value="large">{settings.language === 'en' ? 'Large (Comfortable)' : '宽敞 (大号)'}</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <Check size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                  <Clock size={18} className="text-purple-500" /> {t.dateFormat}
                </label>
                <div className="relative">
                  <select 
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
                    className="w-full p-5 bg-white/60 border border-white/60 rounded-[22px] outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer shadow-inner"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <Clock size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="glass-card rounded-[48px] p-10 bg-red-500/5 border-red-500/20 backdrop-blur-3xl shadow-2xl space-y-8 relative overflow-hidden group">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/10 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
            
            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
              <div className="w-20 h-20 bg-white/80 rounded-[32px] flex items-center justify-center text-red-600 shadow-2xl border border-red-100">
                <ShieldAlert size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-red-700 tracking-tighter mb-2">{t.dangerZone}</h3>
                <p className="text-[11px] text-red-600/60 font-black leading-relaxed px-4">{t.dangerDesc}</p>
              </div>
            </div>

            <button 
              onClick={handleClearData}
              className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] shadow-3xl shadow-red-600/30 transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-3 relative z-10"
            >
              <Trash2 size={16} /> {t.resetBtn}
            </button>
          </div>

          <div className="glass-card rounded-[32px] p-8 bg-white/40 border-white/60 backdrop-blur-xl flex flex-col items-center text-center space-y-4 shadow-sm">
             <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
               <ShieldCheck size={24} />
             </div>
             <p className="text-[10px] font-black text-slate-500 leading-relaxed italic uppercase tracking-wider">
               "This application operates exclusively in your local browser sandbox. No telemetry or asset records leave your device."
             </p>
          </div>
        </div>
      </div>

      <footer className="text-center pt-8">
        <div className="inline-block px-8 py-3 bg-white/20 backdrop-blur-md rounded-full border border-white/40">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-0">
            {t.footer}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SettingsView;
