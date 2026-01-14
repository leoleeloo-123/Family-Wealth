
import React, { useContext, useState, useRef, useMemo } from 'react';
import { AppContext } from '../App';
import { 
  Upload, 
  Download, 
  Eye, 
  ChevronRight, 
  Activity, 
  CheckCircle2,
  Table as TableIcon,
  Database,
  X,
  Languages,
  Trash2,
  Tag,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { parseExcelFile, exportToExcel } from '../utils/excelHelper';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE, INITIAL_APP_DATA } from '../constants';

const DataManagementView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data: currentData, setData, settings, setSettings } = context;

  const [parsingStatus, setParsingStatus] = useState<'idle' | 'parsing'>('idle');
  const [tempData, setTempData] = useState<AppData | null>(null);
  const [isReviewingCurrent, setIsReviewingCurrent] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<TabName>('成员');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isZh = settings.language === 'zh';

  const handleFactoryReset = () => {
    const msg = isZh 
      ? "确认要强制恢复演示数据吗？\n这将抹除您当前浏览器中的所有自定义修改，解决由于旧数据导致的 ID 或 颜色匹配冲突。" 
      : "Reset to factory demo data?\nThis will clear all local modifications and fix ID/Color mismatches from old data.";
    
    if (window.confirm(msg)) {
      setData(INITIAL_APP_DATA);
      localStorage.setItem('family_asset_data', JSON.stringify(INITIAL_APP_DATA));
      alert(isZh ? "数据已重置为最新演示版。" : "Data reset to latest demo version.");
      window.location.reload();
    }
  };

  const getUniqueTags = (categories: { tab: TabName, field: string }[]) => {
    const allTags = new Set<string>();
    categories.forEach(({ tab, field }) => {
      const records = currentData[tab] as any[];
      if (Array.isArray(records)) {
        records.forEach(row => {
          const val = String(row[field] || '');
          if (val.includes('|||')) {
            val.split('|||').forEach(t => {
              const trimmed = t.trim();
              if (trimmed) allTags.add(trimmed);
            });
          } else if (val.trim()) {
            allTags.add(val.trim());
          }
        });
      }
    });
    return Array.from(allTags).sort();
  };

  const tagCategories = useMemo(() => ({
    currencies: {
      label: isZh ? "全域币种" : "Currencies",
      color: "bg-blue-50 text-blue-600",
      targets: [
        { tab: '机构' as TabName, field: '币种' },
        { tab: '汇率' as TabName, field: '基准币种' },
        { tab: '汇率' as TabName, field: '报价币种' },
        { tab: '账户' as TabName, field: '币种' },
        { tab: '流动资产记录' as TabName, field: '币种' },
        { tab: '固定资产记录' as TabName, field: '币种' },
        { tab: '借入借出记录' as TabName, field: '币种' },
        { tab: '固定资产' as TabName, field: '币种' },
        { tab: '企业分红记录' as TabName, field: '币种' }
      ]
    },
    instTypes: {
      label: isZh ? "机构类型" : "Inst Types",
      color: "bg-indigo-50 text-indigo-600",
      targets: [{ tab: '机构' as TabName, field: '机构类型' }]
    },
    countries: {
      label: isZh ? "国家地区" : "Regions",
      color: "bg-emerald-50 text-emerald-600",
      targets: [
        { tab: '机构' as TabName, field: '国家地区' },
        { tab: '手机' as TabName, field: '国家地区' }
      ]
    },
    deviceTypes: {
      label: isZh ? "设备类型" : "Devices",
      color: "bg-amber-50 text-amber-600",
      targets: [{ tab: '手机' as TabName, field: '设备类型' }]
    },
    accountTypes: {
      label: isZh ? "账户类型" : "Accounts",
      color: "bg-purple-50 text-purple-600",
      targets: [{ tab: '账户' as TabName, field: '账户类型' }]
    },
    assetTypes: {
      label: isZh ? "资产/负债类型" : "Asset Types",
      color: "bg-slate-900 text-white",
      targets: [
        { tab: '账户' as TabName, field: '资产类型' },
        { tab: '借入借出记录' as TabName, field: '资产类型' }
      ]
    },
    riskLevels: {
      label: isZh ? "风险评估" : "Risk Levels",
      color: "bg-rose-50 text-rose-600",
      targets: [{ tab: '账户' as TabName, field: '风险评估' }]
    },
    returnLevels: {
      label: isZh ? "收益等级" : "Returns",
      color: "bg-cyan-50 text-cyan-600",
      targets: [{ tab: '账户' as TabName, field: '收益等级' }]
    },
    insuranceTypes: {
      label: isZh ? "保险类型" : "Insurance",
      color: "bg-rose-50 text-rose-500",
      targets: [{ tab: '保险' as TabName, field: '保险类型' }]
    }
  }), [isZh]);

  const tagData = useMemo(() => {
    const result: Record<string, string[]> = {};
    (Object.entries(tagCategories) as [string, any][]).forEach(([key, config]) => {
      result[key] = getUniqueTags(config.targets);
    });
    return result;
  }, [currentData, tagCategories]);

  const handleRenameTag = (categoryKey: string, oldName: string) => {
    const newName = window.prompt(isZh ? `重命名标签 "${oldName}" 为:` : `Rename tag "${oldName}" to:`, oldName);
    if (newName === null || newName.trim() === '' || newName === oldName) return;

    const config = (tagCategories as Record<string, any>)[categoryKey];
    if (!config) return;

    const newData = { ...currentData };

    config.targets.forEach(({ tab, field }: { tab: TabName, field: string }) => {
      const records = newData[tab];
      if (Array.isArray(records)) {
        const updatedRecords = records.map(row => {
          const val = String(row[field] || '');
          if (val.includes('|||')) {
            const parts = val.split('|||').map(p => p.trim());
            const index = parts.indexOf(oldName);
            if (index !== -1) {
              parts[index] = newName.trim();
              return { ...row, [field]: parts.join('|||') };
            }
          } else if (val.trim() === oldName) {
            return { ...row, [field]: newName.trim() };
          }
          return row;
        });
        (newData[tab] as any) = updatedRecords;
      }
    });

    setData(newData);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingStatus('parsing');
    try {
      const { data: parsedData } = await parseExcelFile(file);
      setTempData(parsedData);
      setIsReviewingCurrent(false);
      const firstTab = Object.keys(parsedData).find(k => (parsedData[k as TabName] as any[]).length > 0) as TabName;
      if (firstTab) setActivePreviewTab(firstTab);
    } catch (err) {
      alert("Sync Failed: " + err);
    } finally {
      setParsingStatus('idle');
      if (e.target) e.target.value = '';
    }
  };

  const handleCompleteOverwrite = () => {
    if (tempData) {
      setData(tempData);
      setTempData(null);
      alert(isZh ? "数据库已成功重写。" : "Database Fully Overwritten Successfully.");
    }
  };

  const handleDiscard = () => {
    if (window.confirm(isZh ? "放弃导入的数据？" : "Discard incoming data?")) {
      setTempData(null);
    }
  };

  const handleClearData = () => {
    const msg = isZh 
      ? "致命警告：这将清空应用程序中的所有当前数据。请确保您已备份 Excel 文件。是否继续？"
      : "CRITICAL: This will wipe all current data in the application. Ensure you have an Excel backup. Continue?";
    
    if (window.confirm(msg)) {
      setData({
        成员: [], 机构: [], 手机: [], 账户: [], 保险: [], 汇率: [], 固定资产: [],
        流动资产记录: [], 固定资产记录: [], 借入借出记录: [], 企业分红记录: []
      });
      localStorage.removeItem('family_asset_data');
      alert(isZh ? "所有数据已清空。" : "All data cleared.");
    }
  };

  const previewData = tempData || (isReviewingCurrent ? currentData : null);
  const isIncoming = !!tempData;

  return (
    <div className="w-full max-w-[1900px] mx-auto space-y-8 lg:space-y-12 pb-12 animate-in fade-in duration-700">
      {!previewData && (
        <div className="space-y-8 lg:space-y-12">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            <div className="lg:flex-[1.5] flex min-h-[140px] items-center glass-card rounded-[32px] p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
                 onClick={() => fileInputRef.current?.click()}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
              <div className="relative z-10 flex items-center gap-8 w-full">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-inner group-hover:rotate-6 transition-transform">
                   {parsingStatus === 'parsing' ? <Activity size={32} className="animate-spin" /> : <Upload size={32} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl lg:text-3xl font-black tracking-tighter">Excel Source</h3>
                  <p className="text-xs lg:text-sm font-bold opacity-70 uppercase tracking-[0.2em] mt-1">{isZh ? '点击上传主资产表' : 'Click to update master data'}</p>
                </div>
                <ChevronRight className="opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" size={28} />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
            </div>
            <div className="lg:flex-[2.5] grid grid-cols-1 sm:grid-cols-4 gap-4 lg:gap-8">
              <ToolButton icon={<Eye size={24} />} title={isZh ? "审查数据" : "Review"} onClick={() => { setIsReviewingCurrent(true); setActivePreviewTab('成员'); }} color="text-emerald-500" />
              <ToolButton icon={<RefreshCw size={24} />} title={isZh ? "同步演示" : "Reset Demo"} onClick={handleFactoryReset} color="text-amber-600" />
              <ToolButton icon={<Download size={24} />} title={isZh ? "导出" : "Export"} onClick={() => exportToExcel(currentData)} color="text-blue-500" />
              <ToolButton icon={<Trash2 size={24} />} title={isZh ? "清空" : "Clear"} onClick={handleClearData} color="text-rose-600" isDanger />
            </div>
          </div>
          <div className="glass-card rounded-[48px] p-10 lg:p-14 bg-white/40 backdrop-blur-3xl border border-white/60 shadow-lg relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-96 h-96 bg-indigo-500/10 blur-[150px] rounded-full"></div>
            <div className="flex items-center gap-8 mb-10 relative z-10">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-lg"><Languages size={32} /></div>
              <div>
                <h3 className="text-2xl lg:text-5xl font-black text-slate-800 tracking-tight">{isZh ? '系统全局配置' : 'System Configuration'}</h3>
                <p className="text-[11px] lg:text-[13px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">{isZh ? '偏好与标签维护协议' : 'Global preferences & tag maintenance'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-12 lg:gap-16 relative z-10">
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 text-[12px] lg:text-[14px] font-black text-slate-500 uppercase tracking-[0.2em]"><Languages size={20} className="text-indigo-500" /> {isZh ? '语言选择' : 'Language'}</label>
                  <div className="grid grid-cols-2 p-1.5 bg-slate-900/5 rounded-[24px] border border-white/40 shadow-inner">
                    <button onClick={() => setSettings({...settings, language: 'zh'})} className={`py-4 text-[13px] font-black uppercase tracking-widest rounded-[18px] transition-all ${settings.language === 'zh' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>简体中文</button>
                    <button onClick={() => setSettings({...settings, language: 'en'})} className={`py-4 text-[13px] font-black uppercase tracking-widest rounded-[18px] transition-all ${settings.language === 'en' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>English</button>
                  </div>
                </div>
                <div className="p-8 rounded-[32px] bg-emerald-500/5 border border-emerald-500/10 shadow-sm">
                  <div className="flex items-center gap-4 text-emerald-600 mb-3">
                    <Database size={24} />
                    <span className="font-black text-[11px] lg:text-[13px] uppercase tracking-widest">{isZh ? '本地存储状态' : 'Storage Protocol'}</span>
                  </div>
                  <p className="text-[13px] lg:text-[15px] text-slate-500 leading-relaxed font-medium italic">{isZh ? '所有资产信息均仅存储于您的浏览器 LocalStorage 中。' : 'All asset info stored locally in browser.'}</p>
                </div>
              </div>
              <div className="space-y-6">
                <label className="flex items-center gap-3 text-[12px] lg:text-[14px] font-black text-slate-500 uppercase tracking-[0.2em]"><Tag size={20} className="text-blue-500" /> {isZh ? '全域标签管理' : 'Global Tag Explorer'}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar-wide">
                  {(Object.entries(tagCategories) as [string, { label: string; color: string; targets: any[] }][]).map(([key, config]) => (
                    <div key={key} className="space-y-4 bg-white/30 p-6 rounded-[32px] border border-white/40 shadow-sm flex flex-col hover:bg-white/50 transition-all">
                      <p className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{config.label}</p>
                      <div className="flex flex-wrap gap-2.5 flex-1 content-start">
                        {tagData[key]?.length > 0 ? tagData[key].map((t, i) => (
                          <button key={i} onClick={() => handleRenameTag(key, t)} className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[12px] lg:text-[13px] font-black uppercase tracking-tight shadow-sm border border-black/5 hover:scale-105 active:scale-95 transition-all ${config.color}`}>
                            {t} <Edit3 size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                          </button>
                        )) : <span className="text-[12px] text-slate-300 italic">None</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewData && (
        <div className="space-y-8 animate-in slide-in-from-bottom-16 duration-1000">
          <div className={`glass-card rounded-[40px] p-8 lg:p-12 flex flex-col md:flex-row items-center justify-between border-none shadow-3xl relative overflow-hidden transition-all duration-700 ${isIncoming ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white' : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white'}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="flex items-center gap-8 relative z-10 px-4">
               <div className="w-16 h-16 lg:w-24 lg:h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-2xl border border-white/40 shadow-inner">
                 {isIncoming ? <Activity size={40} className="animate-pulse" /> : <Database size={40} />}
               </div>
               <div>
                 <h3 className="text-3xl lg:text-5xl font-black tracking-tighter mb-2">{isIncoming ? (isZh ? '导入数据预览' : 'Incoming Preview') : (isZh ? '本地数据库查看' : 'Active Database')}</h3>
                 <div className="flex items-center gap-4 text-[12px] lg:text-[14px] opacity-80 uppercase tracking-[0.4em] font-black"><span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>{isIncoming ? (isZh ? '请检查并确认写入' : 'Inspect Integrity') : (isZh ? '正在审阅活跃记录' : 'Viewing local records')}</div>
               </div>
            </div>
            <div className="flex flex-wrap gap-6 px-4 relative z-10 mt-8 md:mt-0">
              {isIncoming ? (
                <>
                  <button onClick={handleDiscard} className="px-10 py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/30 backdrop-blur-md">{isZh ? '放弃' : 'Discard'}</button>
                  <button onClick={handleCompleteOverwrite} className="px-12 py-5 bg-slate-900 text-white rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] shadow-4xl hover:bg-black transition-all flex items-center gap-4">{isZh ? '确认写入' : 'Confirm Overwrite'} <ChevronRight size={20} /></button>
                </>
              ) : (
                <button onClick={() => setIsReviewingCurrent(false)} className="px-12 py-5 bg-white/20 text-white rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/30 hover:bg-white/30 transition-all flex items-center gap-4"><X size={24} /> {isZh ? '退出预览' : 'Exit Review'}</button>
              )}
            </div>
          </div>
          <div className="flex flex-col xl:flex-row gap-10 min-h-[700px]">
            <div className="w-full xl:w-96 glass-card rounded-[40px] p-6 flex flex-col bg-white/30 backdrop-blur-xl border-white/60 shadow-xl">
               <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                 {(Object.keys(EXCEL_STRUCTURE) as TabName[]).map(tab => {
                   const count = (previewData[tab] as any[]).length;
                   const isActive = activePreviewTab === tab;
                   return (
                    <button key={tab} onClick={() => setActivePreviewTab(tab)} className={`w-full flex items-center justify-between p-6 rounded-[24px] transition-all duration-500 ${isActive ? 'bg-white shadow-xl scale-[1.04] text-blue-600' : 'hover:bg-white/50 text-slate-500'}`}>
                      <span className="text-lg font-black tracking-tight">{tab}</span>
                      <span className={`text-[12px] px-4 py-1.5 rounded-full font-black ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
                    </button>
                   );
                 })}
               </div>
            </div>
            <div className="flex-1 glass-card rounded-[56px] overflow-hidden flex flex-col bg-white/10 relative border-white/50 shadow-inner">
              <div className="p-10 lg:p-14 border-b border-white/20 flex items-center justify-between bg-white/60 backdrop-blur-2xl z-20">
                 <h4 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tighter">{activePreviewTab}</h4>
                 <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl text-[12px] lg:text-[14px] font-black uppercase tracking-[0.2em] shadow-sm border ${isIncoming ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}><CheckCircle2 size={24} /> {isIncoming ? (isZh ? '同步预备' : 'Ready') : (isZh ? '实时镜像' : 'Live Sync')}</div>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar-wide bg-white/20">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>{EXCEL_STRUCTURE[activePreviewTab].map(col => (<th key={col} className="px-10 py-8 bg-white/80 backdrop-blur-xl text-[12px] lg:text-[14px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/30 whitespace-nowrap">{col}</th>))}</tr>
                  </thead>
                  <tbody className="text-sm">
                    {(previewData[activePreviewTab] as any[]).map((row, i) => (
                      <tr key={i} className="hover:bg-white/60 transition-all group">
                        {EXCEL_STRUCTURE[activePreviewTab].map(col => (<td key={col} className="px-10 py-8 text-slate-600 whitespace-nowrap border-b border-white/10 font-bold group-hover:text-slate-900 text-sm lg:text-lg">{row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 font-medium italic opacity-50">#null</span>}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ToolButton: React.FC<{ icon: any, title: string, onClick: () => void, color: string, isDanger?: boolean }> = ({ icon, title, onClick, color, isDanger }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-6 rounded-[32px] glass-card border border-white/80 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group flex-1 ${isDanger ? 'hover:bg-rose-50' : 'hover:bg-white'}`}>
    <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md mb-4 transition-transform duration-500 ${color} group-hover:scale-110 group-hover:bg-white`}>{icon}</div>
    <span className={`text-[12px] lg:text-[14px] font-black uppercase tracking-widest text-center ${isDanger ? 'text-rose-600' : 'text-slate-700'}`}>{title}</span>
  </button>
);

export default DataManagementView;
