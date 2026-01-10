
import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../App';
import { 
  Upload, 
  Download, 
  Eye, 
  ChevronRight, 
  Activity, 
  ShieldCheck, 
  CheckCircle2,
  Table as TableIcon,
  AlertCircle,
  Database,
  X,
  Languages,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { parseExcelFile, exportToExcel } from '../utils/excelHelper';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

const DataManagementView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data: currentData, setData, settings, setSettings } = context;

  const [parsingStatus, setParsingStatus] = useState<'idle' | 'parsing'>('idle');
  const [tempData, setTempData] = useState<AppData | null>(null);
  const [isReviewingCurrent, setIsReviewingCurrent] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<TabName>('成员');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert(settings.language === 'zh' ? "数据库已成功重写。" : "Database Fully Overwritten Successfully.");
    }
  };

  const handleDiscard = () => {
    if (window.confirm(settings.language === 'zh' ? "放弃导入的数据？" : "Discard incoming data?")) {
      setTempData(null);
    }
  };

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

  const previewData = tempData || (isReviewingCurrent ? currentData : null);
  const isIncoming = !!tempData;
  const isZh = settings.language === 'zh';

  return (
    <div className="w-full max-w-[1900px] mx-auto space-y-6 lg:space-y-12 pb-12 animate-in fade-in duration-700">
      
      {!previewData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 items-stretch">
          
          {/* Column 1: Excel Source Protocol (Upload) */}
          <div className="glass-card rounded-[32px] lg:rounded-[48px] p-8 lg:p-12 flex flex-col items-center justify-center text-center group border border-white/60 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden min-h-[450px] lg:min-h-[600px]"
               onClick={() => fileInputRef.current?.click()}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div className="relative mb-6 lg:mb-10">
              <div className="absolute inset-0 bg-blue-400/30 blur-[40px] rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="w-20 h-20 lg:w-32 lg:h-32 bg-white/90 rounded-[24px] lg:rounded-[40px] flex items-center justify-center relative z-10 shadow-2xl border border-white/60">
                {parsingStatus === 'parsing' ? <Activity className="animate-spin text-blue-600 w-10 h-10 lg:w-16 lg:h-16" /> : <Upload className="text-blue-600 w-10 h-10 lg:w-16 lg:h-16" />}
              </div>
            </div>
            <h3 className="text-2xl lg:text-4xl font-black mb-4 lg:mb-6 text-slate-800 tracking-tighter">Excel Source</h3>
            <p className="text-slate-500 mb-8 lg:mb-12 text-sm lg:text-lg leading-relaxed max-w-xs font-medium">
              {isZh ? '上传主资产表刷新系统智能。' : 'Refresh system intelligence via master spreadsheet.'}
              <span className="block mt-4 text-rose-500/80 font-black uppercase tracking-[0.2em] text-[9px] lg:text-[11px] bg-rose-50 py-2 px-4 rounded-full inline-block shadow-sm">
                {isZh ? '警告：破坏性写入操作' : 'Warning: Destructive Write'}
              </span>
            </p>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
            <div className="px-8 lg:px-12 py-4 lg:py-5 bg-blue-600 text-white rounded-[20px] lg:rounded-[28px] font-black uppercase tracking-[0.2em] text-[10px] lg:text-[12px] shadow-2xl shadow-blue-500/40 group-hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
              {isZh ? '选择文件' : 'Select File'} <ChevronRight size={18} />
            </div>
          </div>

          {/* Column 2: Consolidated Data Management Tools Card (Improved) */}
          <div className="glass-card rounded-[32px] lg:rounded-[48px] p-8 lg:p-12 flex flex-col bg-white/40 backdrop-blur-3xl border border-white/60 shadow-lg relative overflow-hidden min-h-[450px] lg:min-h-[600px]">
            <div className="absolute -top-12 -left-12 w-32 h-32 lg:w-48 lg:h-48 bg-blue-500/5 blur-3xl rounded-full"></div>
            
            <div className="flex items-center gap-4 lg:gap-6 mb-8 lg:mb-12 relative z-10">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-blue-600 text-white rounded-[16px] lg:rounded-[22px] flex items-center justify-center shadow-lg">
                <TableIcon size={24} className="lg:w-8 lg:h-8" />
              </div>
              <div>
                <h3 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{isZh ? '数据库中心' : 'Database Vault'}</h3>
                <p className="text-[8px] lg:text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">{isZh ? '维护协议' : 'Maintenance Protocol'}</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between relative z-10 gap-4 lg:gap-6">
              <ToolAction 
                icon={<Eye size={20} className="lg:w-6 lg:h-6" />} 
                title={isZh ? "审查当前数据" : "Review Data"} 
                desc={isZh ? "审计本地活动记录" : "Audit active records"} 
                onClick={() => {
                  setIsReviewingCurrent(true);
                  setActivePreviewTab('成员');
                }} 
                color="text-slate-500" 
              />
              <ToolAction 
                icon={<Download size={20} className="lg:w-6 lg:h-6" />} 
                title={isZh ? "导出快照" : "Export Snapshot"} 
                desc={isZh ? "生成 .xlsx 备份" : "Generate .xlsx backup"} 
                onClick={() => exportToExcel(currentData)} 
                color="text-emerald-500" 
              />
              <ToolAction 
                icon={<Trash2 size={20} className="lg:w-6 lg:h-6" />} 
                title={isZh ? "清空本地数据库" : "Reset Database"} 
                desc={isZh ? "永久抹除所有本地记录" : "Wipe all local records"} 
                onClick={handleClearData} 
                color="text-rose-600"
                isDanger
              />
            </div>
          </div>

          {/* Column 3: System Settings */}
          <div className="glass-card rounded-[32px] lg:rounded-[48px] p-8 lg:p-12 bg-white/40 backdrop-blur-3xl border border-white/60 shadow-lg relative overflow-hidden flex flex-col min-h-[450px] lg:min-h-[600px]">
            <div className="absolute -top-12 -right-12 w-32 h-32 lg:w-48 lg:h-48 bg-indigo-500/10 blur-3xl rounded-full"></div>
            
            <div className="flex items-center gap-4 lg:gap-6 mb-8 lg:mb-12">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-indigo-600 text-white rounded-[16px] lg:rounded-[22px] flex items-center justify-center shadow-lg">
                <Languages size={24} className="lg:w-8 lg:h-8" />
              </div>
              <div>
                <h3 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{isZh ? '系统设置' : 'System Settings'}</h3>
                <p className="text-[8px] lg:text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">{isZh ? '偏好配置' : 'Preferences'}</p>
              </div>
            </div>

            <div className="space-y-8 lg:space-y-12 flex-1">
              <div className="space-y-4 lg:space-y-6">
                <label className="flex items-center gap-3 text-[9px] lg:text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <Languages size={14} className="text-indigo-500 lg:w-5 lg:h-5" /> {isZh ? '语言选择' : 'Language Selection'}
                </label>
                <div className="grid grid-cols-2 p-1.5 bg-slate-900/5 rounded-[18px] lg:rounded-[24px] border border-white/40 backdrop-blur-md">
                  <button 
                    onClick={() => setSettings({...settings, language: 'zh'})}
                    className={`py-3 lg:py-5 text-[9px] lg:text-[12px] font-black uppercase tracking-widest rounded-[14px] lg:rounded-[20px] transition-all duration-500 ${settings.language === 'zh' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    简体中文
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, language: 'en'})}
                    className={`py-3 lg:py-5 text-[9px] lg:text-[12px] font-black uppercase tracking-widest rounded-[14px] lg:rounded-[20px] transition-all duration-500 ${settings.language === 'en' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="p-6 lg:p-8 rounded-[24px] lg:rounded-[36px] bg-emerald-500/5 border border-emerald-500/10 mt-auto">
                 <div className="flex items-center gap-3 text-emerald-600 mb-3">
                   <ShieldCheck size={18} className="lg:w-6 lg:h-6" />
                   <span className="text-[9px] lg:text-[12px] font-black uppercase tracking-widest">{isZh ? '隐私保护' : 'Privacy Protocols'}</span>
                 </div>
                 <p className="text-[10px] lg:text-sm text-slate-500 leading-relaxed font-bold italic">
                   {isZh ? '"所有资产数据严格加密存储于本地浏览器，绝不外流。"' : '"Asset data is strictly encrypted and stored locally. No cloud sync."'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview View (Enhanced table fonts) */}
      {previewData && (
        <div className="space-y-8 animate-in slide-in-from-bottom-16 duration-1000">
          <div className={`glass-card rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 flex flex-col md:flex-row items-center justify-between border-none shadow-3xl relative overflow-hidden transition-all duration-700 ${isIncoming ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white' : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white'}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            
            <div className="flex items-center gap-6 lg:gap-8 px-4 lg:px-6 relative z-10 mb-6 md:mb-0">
               <div className="w-14 h-14 lg:w-20 lg:h-20 bg-white/20 rounded-2xl lg:rounded-3xl flex items-center justify-center backdrop-blur-2xl border border-white/40 shadow-inner">
                 {isIncoming ? <Activity size={32} className="animate-pulse lg:w-10 lg:h-10" /> : <Database size={32} className="lg:w-10 lg:h-10" />}
               </div>
               <div>
                 <h3 className="text-2xl lg:text-4xl font-black tracking-tighter mb-1">{isIncoming ? (isZh ? '导入数据预览' : 'Incoming Preview') : (isZh ? '本地数据库查看' : 'Active Database')}</h3>
                 <div className="flex items-center gap-3 text-[9px] lg:text-[11px] opacity-80 uppercase tracking-[0.4em] font-black">
                   <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                   {isIncoming ? (isZh ? '待验证：请检查数据完整性' : 'Inspect Integrity') : (isZh ? '正在查看本地存储记录' : 'Viewing local records')}
                 </div>
               </div>
            </div>

            <div className="flex flex-wrap gap-4 lg:gap-6 px-4 relative z-10 justify-center">
              {isIncoming ? (
                <>
                  <button onClick={handleDiscard} className="px-6 lg:px-10 py-3 lg:py-5 rounded-xl lg:rounded-2xl text-[9px] lg:text-[12px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/30 backdrop-blur-md">{isZh ? '放弃同步' : 'Discard'}</button>
                  <button onClick={handleCompleteOverwrite} className="px-8 lg:px-12 py-3 lg:py-5 bg-slate-900 text-white rounded-xl lg:rounded-2xl text-[9px] lg:text-[12px] font-black uppercase tracking-[0.2em] shadow-4xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group">
                    {isZh ? '确认重写' : 'Complete Overwrite'} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </>
              ) : (
                <button onClick={() => setIsReviewingCurrent(false)} className="px-8 lg:px-12 py-3 lg:py-5 bg-white/20 text-white rounded-xl lg:rounded-2xl text-[9px] lg:text-[12px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/30 hover:bg-white/30 hover:scale-105 transition-all flex items-center gap-3">
                  <X size={20} /> {isZh ? '关闭视图' : 'Close View'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-8 min-h-[600px]">
            <div className="w-full xl:w-80 glass-card rounded-[32px] lg:rounded-[40px] p-4 lg:p-6 flex flex-col bg-white/30 backdrop-blur-xl border-white/60 shadow-xl">
               <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                 {(Object.keys(EXCEL_STRUCTURE) as TabName[]).map(tab => {
                   const count = (previewData[tab] as any[]).length;
                   const isActive = activePreviewTab === tab;
                   return (
                    <button 
                      key={tab}
                      onClick={() => setActivePreviewTab(tab)}
                      className={`w-full flex items-center justify-between p-4 lg:p-5 rounded-[18px] lg:rounded-[22px] transition-all duration-500 group ${isActive ? 'bg-white shadow-xl scale-[1.04] text-blue-600 ring-1 ring-blue-50' : 'hover:bg-white/50 text-slate-500'}`}
                    >
                      <span className="text-sm lg:text-lg font-black tracking-tight">{tab}</span>
                      <span className={`text-[8px] lg:text-[10px] px-3 py-1 rounded-full font-black ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 shadow-inner'}`}>{count}</span>
                    </button>
                   );
                 })}
               </div>
            </div>

            <div className="flex-1 glass-card rounded-[32px] lg:rounded-[40px] overflow-hidden flex flex-col bg-white/10 relative border-white/50 shadow-inner min-h-[500px]">
              <div className="p-6 lg:p-10 border-b border-white/20 flex items-center justify-between bg-white/60 backdrop-blur-2xl z-20">
                 <h4 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tighter">{activePreviewTab}</h4>
                 <div className={`flex items-center gap-3 px-4 lg:px-6 py-2 rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${isIncoming ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                    <CheckCircle2 size={16} /> {isIncoming ? (isZh ? '结构已验证' : 'Verified') : (isZh ? '本地哈希匹配' : 'Local Match')}
                 </div>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar-wide bg-white/20">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {EXCEL_STRUCTURE[activePreviewTab].map(col => (
                        <th key={col} className="px-6 lg:px-10 py-5 lg:py-6 bg-white/80 backdrop-blur-xl text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/30 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm lg:text-base">
                    {(previewData[activePreviewTab] as any[]).map((row, i) => (
                      <tr key={i} className="hover:bg-white/60 transition-all duration-300 group">
                        {EXCEL_STRUCTURE[activePreviewTab].map(col => (
                          <td key={col} className="px-6 lg:px-10 py-5 lg:py-6 text-slate-600 whitespace-nowrap border-b border-white/10 font-bold group-hover:text-slate-900 transition-colors">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 font-medium italic opacity-50">#null</span>}
                          </td>
                        ))}
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

const ToolAction: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, color: string, isDanger?: boolean }> = ({ icon, title, desc, onClick, color, isDanger }) => (
  <button onClick={onClick} className={`w-full flex items-center p-5 lg:p-8 rounded-[24px] lg:rounded-[36px] border transition-all duration-500 group shadow-lg flex-1 ${
    isDanger 
      ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-500 hover:scale-[1.02] hover:shadow-rose-500/20' 
      : 'bg-white/60 border-white/80 backdrop-blur-xl hover:bg-white/95 hover:scale-[1.02] hover:shadow-2xl'
  }`}>
    <div className={`w-10 h-10 lg:w-16 lg:h-16 rounded-[16px] lg:rounded-[24px] bg-white flex items-center justify-center shadow-md mr-4 lg:mr-8 transition-transform duration-700 ${color} group-hover:scale-110`}>
      {icon}
    </div>
    <div className="text-left flex-1">
      <h4 className={`font-black text-sm lg:text-2xl leading-none mb-1 lg:mb-2 tracking-tight transition-colors ${isDanger ? 'text-rose-600 group-hover:text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className={`text-[7px] lg:text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${isDanger ? 'text-rose-400 group-hover:text-rose-100' : 'text-slate-400'}`}>{desc}</p>
    </div>
    <div className={`w-7 h-7 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm ${
      isDanger ? 'bg-rose-100 group-hover:bg-white/20' : 'bg-white/50 group-hover:bg-blue-600 group-hover:text-white'
    }`}>
      <ChevronRight className={`${isDanger ? 'text-rose-500 group-hover:text-white' : 'opacity-40 group-hover:opacity-100'} group-hover:translate-x-0.5 transition-all w-4 h-4 lg:w-6 lg:h-6`} />
    </div>
  </button>
);

export default DataManagementView;
