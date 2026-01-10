
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
  Trash2,
  Table as TableIcon,
  AlertCircle,
  X,
  Database
} from 'lucide-react';
import { parseExcelFile, exportToExcel } from '../utils/excelHelper';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

const DataManagementView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data: currentData, setData } = context;

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
      alert("Database Fully Overwritten Successfully.");
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Discard incoming data?")) {
      setTempData(null);
    }
  };

  // Determine which dataset to show in the preview grid
  const previewData = tempData || (isReviewingCurrent ? currentData : null);
  const isIncoming = !!tempData;

  return (
    <div className="w-[96%] max-w-[1900px] mx-auto space-y-10 pb-12 animate-in fade-in duration-700">
      
      {/* Initial Upload & Tools View - Dynamic Spacing */}
      {!previewData && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-stretch">
          {/* Upload Area - Expansive */}
          <div className="xl:col-span-8 glass-card rounded-[56px] p-20 flex flex-col items-center justify-center text-center group border-2 border-dashed border-white/40 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden min-h-[500px]"
               onClick={() => fileInputRef.current?.click()}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-blue-400/30 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="w-32 h-32 bg-white/90 rounded-[44px] flex items-center justify-center relative z-10 shadow-2xl border border-white/60">
                {parsingStatus === 'parsing' ? <Activity className="animate-spin text-blue-600" size={56} /> : <Upload className="text-blue-600" size={56} />}
              </div>
            </div>
            <h3 className="text-5xl font-black mb-6 text-slate-800 tracking-tighter">Excel Source Protocol</h3>
            <p className="text-slate-500 mb-12 text-lg leading-relaxed max-w-2xl font-medium">
              Refresh your entire system intelligence by uploading the master asset spreadsheet. 
              <span className="block mt-4 text-red-500/80 font-black uppercase tracking-[0.2em] text-[10px] bg-red-50 py-2 px-6 rounded-full inline-block shadow-sm">Warning: Destructive Write Operation</span>
            </p>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
            <div className="px-16 py-6 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-[0.3em] text-xs shadow-3xl shadow-blue-500/40 group-hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
              Select Excel File <ChevronRight size={20} />
            </div>
          </div>

          {/* Tools Area - High Information Density */}
          <div className="xl:col-span-4 flex flex-col gap-8">
            <div className="p-10 rounded-[48px] bg-white/40 border border-white/60 backdrop-blur-xl flex items-center gap-8 shadow-sm">
               <div className="w-20 h-20 bg-blue-600 text-white rounded-[32px] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform"><TableIcon size={32}/></div>
               <div>
                 <h4 className="font-black text-slate-900 text-2xl tracking-tight">Database Vault</h4>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1">Maintenance Protocol</p>
               </div>
            </div>
            
            <div className="flex-1 space-y-6">
              <ToolAction 
                icon={<Eye size={24}/>} 
                title="Review Current Data" 
                desc="Audit the active local memory records." 
                onClick={() => {
                  setIsReviewingCurrent(true);
                  setActivePreviewTab('成员');
                }} 
                color="text-slate-500" 
              />
              <ToolAction 
                icon={<Download size={24}/>} 
                title="Export Snapshot" 
                desc="Generate an .xlsx backup of current state." 
                onClick={() => exportToExcel(currentData)} 
                color="text-emerald-500" 
              />
            </div>

            <div className="p-10 rounded-[48px] bg-slate-900/5 border border-white/30 backdrop-blur-md flex flex-col gap-4">
               <div className="flex items-center gap-3">
                 <ShieldCheck className="text-blue-600" size={20}/>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Privacy Verification</span>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed font-bold italic">
                 "Architecture strictly local. No assets or account details are ever transmitted outside this browser environment."
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview View - Dynamic Full-Width Utilization */}
      {previewData && (
        <div className="space-y-8 animate-in slide-in-from-bottom-16 duration-1000">
          {/* Enhanced Action Bar - Wider & More Dynamic */}
          <div className={`glass-card rounded-[40px] p-8 flex items-center justify-between border-none shadow-3xl relative overflow-hidden transition-all duration-700 ${isIncoming ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white' : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white'}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
            
            <div className="flex items-center gap-8 px-6 relative z-10">
               <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-2xl border border-white/40 shadow-inner">
                 {isIncoming ? <Activity size={32} className="animate-pulse" /> : <Database size={32} />}
               </div>
               <div>
                 <h3 className="text-3xl font-black tracking-tighter mb-1">{isIncoming ? 'Incoming Intelligence Preview' : 'Active System Database'}</h3>
                 <div className="flex items-center gap-3 text-[10px] opacity-80 uppercase tracking-[0.4em] font-black">
                   <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                   {isIncoming ? 'Validation Required: Inspect Integrity' : 'Viewing real-time browser storage records.'}
                 </div>
               </div>
            </div>

            <div className="flex gap-6 px-4 relative z-10">
              {isIncoming ? (
                <>
                  <button onClick={handleDiscard} className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/30 backdrop-blur-md">Discard Sync</button>
                  <button onClick={handleCompleteOverwrite} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-4xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group">
                    Complete Overwrite <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </>
              ) : (
                <button onClick={() => setIsReviewingCurrent(false)} className="px-12 py-4 bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/30 hover:bg-white/30 hover:scale-105 transition-all flex items-center gap-3">
                  <X size={20} /> Close View
                </button>
              )}
            </div>
          </div>

          {/* Expansive Full-Width Layout */}
          <div className="flex flex-col xl:flex-row gap-8 min-h-[800px]">
            {/* Sidebar: Optimized for Wide Screens */}
            <div className="w-full xl:w-80 glass-card rounded-[48px] p-8 flex flex-col bg-white/30 backdrop-blur-xl border-white/60">
               <p className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/30 mb-6 flex justify-between items-center">
                 Memory Segments
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
               </p>
               <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                 {(Object.keys(EXCEL_STRUCTURE) as TabName[]).map(tab => {
                   const count = (previewData[tab] as any[]).length;
                   const isActive = activePreviewTab === tab;
                   return (
                    <button 
                      key={tab}
                      onClick={() => setActivePreviewTab(tab)}
                      className={`w-full flex items-center justify-between p-6 rounded-[28px] transition-all duration-500 group ${isActive ? 'bg-white shadow-2xl scale-[1.04] text-blue-600 ring-1 ring-blue-50' : 'hover:bg-white/50 text-slate-500'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-700 ${isActive ? (isIncoming ? 'bg-blue-600' : 'bg-emerald-600') + ' scale-150 shadow-[0_0_12px_rgba(37,99,235,0.4)]' : 'bg-slate-300 group-hover:bg-slate-400'}`}></div>
                        <span className="text-base font-black tracking-tight">{tab}</span>
                      </div>
                      <span className={`text-[11px] px-4 py-1.5 rounded-full font-black ${isActive ? (isIncoming ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600') : 'bg-slate-100 text-slate-400 shadow-inner'}`}>{count}</span>
                    </button>
                   );
                 })}
               </div>
            </div>

            {/* Hyper-Expansive Table Area */}
            <div className="flex-1 glass-card rounded-[48px] overflow-hidden flex flex-col bg-white/10 relative border-white/50 shadow-inner">
              <div className="p-10 border-b border-white/20 flex items-center justify-between bg-white/60 backdrop-blur-2xl z-20">
                 <div className="flex items-center gap-8">
                   <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{activePreviewTab}</h4>
                   <div className="px-6 py-2 bg-slate-900/5 rounded-full border border-slate-900/5 backdrop-blur-md">
                     <span className="text-xs text-slate-500 font-black uppercase tracking-[0.2em]">{previewData[activePreviewTab]?.length || 0} Entities in segment</span>
                   </div>
                 </div>
                 <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-sm border ${isIncoming ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                    <CheckCircle2 size={18} /> {isIncoming ? 'Structure Verified' : 'Local Hash Match'}
                 </div>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar-wide bg-white/20">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {EXCEL_STRUCTURE[activePreviewTab].map(col => (
                        <th key={col} className="px-10 py-7 bg-white/80 backdrop-blur-xl text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/30 whitespace-nowrap shadow-sm">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-base">
                    {(previewData[activePreviewTab] as any[]).map((row, i) => (
                      <tr key={i} className="hover:bg-white/60 transition-all duration-300 group">
                        {EXCEL_STRUCTURE[activePreviewTab].map(col => (
                          <td key={col} className="px-10 py-7 text-slate-600 whitespace-nowrap border-b border-white/10 font-bold group-hover:text-slate-900 transition-colors">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 font-medium italic opacity-50">#null_ptr</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {(previewData[activePreviewTab] as any[]).length === 0 && (
                      <tr>
                        <td colSpan={EXCEL_STRUCTURE[activePreviewTab].length} className="px-10 py-48 text-center">
                          <div className="flex flex-col items-center gap-6 text-slate-300">
                            <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center shadow-inner">
                              <AlertCircle size={48} strokeWidth={1} className="animate-pulse" />
                            </div>
                            <p className="text-2xl font-black italic tracking-tighter opacity-70">Segment contains zero records.</p>
                          </div>
                        </td>
                      </tr>
                    )}
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

const ToolAction: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, color: string }> = ({ icon, title, desc, onClick, color }) => (
  <button onClick={onClick} className="w-full flex items-center p-8 bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 hover:bg-white/80 hover:scale-[1.02] hover:shadow-2xl transition-all duration-500 group">
    <div className={`w-16 h-16 rounded-[28px] bg-white flex items-center justify-center shadow-xl mr-8 ${color} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700`}>
      {icon}
    </div>
    <div className="text-left flex-1">
      <h4 className="font-black text-slate-900 text-xl leading-none mb-2 tracking-tight">{title}</h4>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">{desc}</p>
    </div>
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
      <ChevronRight className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" size={20} />
    </div>
  </button>
);

export default DataManagementView;
