
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { ShieldAlert, Languages, Trash2, ShieldCheck } from 'lucide-react';

const SettingsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { settings, setSettings, setData } = context;

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

  const t = {
    preferences: settings.language === 'en' ? 'Interface Configuration' : '系统偏好设置',
    language: settings.language === 'en' ? 'System Language' : '系统语言',
    dangerZone: settings.language === 'en' ? 'Danger Zone' : '危险区域',
    dangerDesc: settings.language === 'en' 
      ? 'Destructive actions that permanently wipe local browser storage.'
      : '这些操作会永久清空浏览器本地存储，请谨慎操作。',
    resetBtn: settings.language === 'en' ? 'Reset Local Database' : '清空本地数据库',
    footer: settings.language === 'en' 
      ? 'Architecture strictly local. No assets or records leave your device.'
      : '架构受本地保护。没有任何资产或记录会离开您的设备。'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      
      {/* Unified Main Card */}
      <div className="glass-card rounded-[48px] p-8 sm:p-14 bg-white/40 backdrop-blur-3xl border-white/60 shadow-2xl relative overflow-hidden">
        {/* Header Decor */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-[20px] flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Languages size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{t.preferences}</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1">Interface Configuration Protocol</p>
            </div>
          </div>

          <div className="mb-16">
            <div className="max-w-md space-y-4">
              <label className="flex items-center gap-3 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                <Languages size={18} className="text-blue-500" /> {t.language}
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
          </div>

          {/* Danger Section integrated into the same card */}
          <div className="mt-12 pt-12 border-t border-white/30 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 text-rose-600 mb-2">
                <ShieldAlert size={20} />
                <h4 className="text-xl font-black uppercase tracking-widest">{t.dangerZone}</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-bold max-w-md">{t.dangerDesc}</p>
            </div>
            
            <button 
              onClick={handleClearData}
              className="w-full sm:w-auto px-10 py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-rose-500/30 transition-all hover:scale-[1.05] active:scale-95 flex items-center justify-center gap-3"
            >
              <Trash2 size={18} /> {t.resetBtn}
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center space-y-4 pt-4">
        <div className="flex items-center justify-center gap-3 text-emerald-600 mb-2">
          <ShieldCheck size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t.footer}</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-300">
          Family Asset Management System • v1.0.0 Stable
        </p>
      </footer>
    </div>
  );
};

export default SettingsView;
