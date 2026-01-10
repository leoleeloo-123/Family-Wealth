
import React, { useContext, useState, useRef, useMemo } from 'react';
import { AppContext } from '../App';
import { 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Activity, 
  ChevronRight, 
  Database,
  Info,
  AlertCircle,
  Table as TableIcon,
  ShieldCheck,
  XCircle,
  Eye,
  ChevronLeft
} from 'lucide-react';
import { parseExcelFile, exportToExcel } from '../utils/excelHelper';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

const DataManagementView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data: currentData, setData } = context;

  const [parsingStatus, setParsingStatus] = useState<'idle' | 'parsing' | 'reviewed'>('idle');
  const [reviewMode, setReviewMode] = useState<'import' | 'current' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [tempData, setTempData] = useState<AppData | null>(null);
  const [previewTab, setPreviewTab] = useState<TabName>('成员');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingStatus('parsing');
    setLogs([]);
    try {
      const { data: parsedData, logs: parsingLogs } = await parseExcelFile(file);
      setTempData(parsedData);
      setLogs(parsingLogs);
      setParsingStatus('reviewed');
      setReviewMode('import');
      
      const firstTabWithData = (Object.keys(parsedData) as TabName[]).find(t => parsedData[t].length > 0);
      setPreviewTab(firstTabWithData || '成员');
    } catch (err) {
      console.error("Import Error:", err);
      alert("Error parsing file: " + err);
      setParsingStatus('idle');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleImport = () => {
    if (!tempData) {
      alert("Error: No data available to import.");
      return;
    }
    
    // User requested removal of the confirmation pop-up.
    // Proceeding directly to overwrite.
    try {
      console.log("Committing new data to state...", tempData);
      
      // Deep clone to avoid reference issues
      const dataToSave = JSON.parse(JSON.stringify(tempData));
      setData(dataToSave);
      
      alert("Import Successful! The database has been updated.");
      
      // Reset view
      setReviewMode(null);
      setTempData(null);
      setParsingStatus('idle');
    } catch (err) {
      console.error("Import execution failed:", err);
      alert("Import failed during state update: " + err);
    }
  };

  const openCurrentReview = () => {
    setReviewMode('current');
    setPreviewTab('成员');
  };

  const closeReview = () => {
    setReviewMode(null);
    if (reviewMode === 'import') {
      setTempData(null);
      setParsingStatus('idle');
    }
  };

  const handleExport = () => {
    exportToExcel(currentData);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const activeReviewData = reviewMode === 'import' ? tempData : currentData;

  const previewValidation = useMemo(() => {
    if (!activeReviewData) return { missingCols: [], hasData: false };
    const expected = EXCEL_STRUCTURE[previewTab];
    const rows = activeReviewData[previewTab];
    const actual = rows.length > 0 ? Object.keys(rows[0]) : [];
    const missing = expected.filter(col => !actual.includes(col));
    return {
      missingCols: missing,
      hasData: rows.length > 0
    };
  }, [activeReviewData, previewTab, reviewMode]);

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-7 space-y-6">
          <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl bg-white flex flex-col items-center text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
              {parsingStatus === 'parsing' ? <Activity className="animate-spin" size={36} /> : <Upload size={36} />}
            </div>
            <h3 className="text-2xl font-bold mb-3">Excel Source Protocol</h3>
            <p className="text-gray-500 mb-8 max-w-sm leading-relaxed text-sm">
              Upload your spreadsheet to refresh the entire system. <span className="text-red-500 font-bold">This replaces all current memory.</span>
            </p>
            <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileSelect} className="hidden" />
            <button onClick={triggerFilePicker} className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all flex items-center gap-3">
              {parsingStatus === 'parsing' ? 'Analyzing...' : 'Select Excel File'}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3"><Activity className="text-emerald-500" size={24} /> Database Tools</h3>
            <div className="space-y-3">
              <button onClick={openCurrentReview} className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-emerald-500 shadow-sm border border-emerald-50 group-hover:scale-110 transition-transform"><Eye size={24} /></div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">Review Current Data</p>
                    <p className="text-[11px] text-slate-500">View what's currently in memory.</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300" size={20} />
              </button>
              <button onClick={handleExport} className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm border border-blue-50 group-hover:scale-110 transition-transform"><Download size={24} /></div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">Export Snapshot</p>
                    <p className="text-[11px] text-slate-500">Download current data as Excel.</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300" size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {reviewMode && activeReviewData && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className={`p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 ${reviewMode === 'import' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><TableIcon size={24} /></div>
              <div>
                <h4 className="text-xl font-black">{reviewMode === 'import' ? 'Incoming Data Preview' : 'System Database View'}</h4>
                <p className="text-white/80 text-xs">{reviewMode === 'import' ? 'Review values before final import.' : 'Viewing active system records.'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={closeReview} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm border border-white/20 transition-all">
                {reviewMode === 'import' ? 'Discard' : 'Close'}
              </button>
              {reviewMode === 'import' && (
                <button onClick={handleImport} className="px-8 py-2 bg-slate-900 text-white hover:bg-black rounded-xl font-black text-sm shadow-xl transition-all">
                  Complete Overwrite
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[500px]">
            <div className="w-full lg:w-64 bg-slate-50 border-r border-slate-100 p-4 space-y-1.5 overflow-y-auto">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter px-3 mb-4">Worksheets</p>
              {(Object.keys(EXCEL_STRUCTURE) as TabName[]).map(tab => {
                const count = activeReviewData[tab]?.length || 0;
                const isActive = previewTab === tab;
                const colorClass = reviewMode === 'import' ? 'blue' : 'emerald';
                return (
                  <button key={tab} onClick={() => setPreviewTab(tab)} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${isActive ? `bg-white shadow-md border-l-4 border-${colorClass}-500 text-${colorClass}-700 font-bold` : 'hover:bg-slate-100 text-slate-500'}`}>
                    <span className="text-sm truncate">{tab}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${count > 0 ? `bg-${colorClass}-50 text-${colorClass}-600` : 'bg-slate-200 text-slate-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="px-8 py-6 border-b flex items-center justify-between bg-slate-50/30">
                <h5 className="text-xl font-black text-slate-800">{previewTab} <span className="text-xs font-normal text-slate-400 ml-2">{activeReviewData[previewTab]?.length || 0} Records</span></h5>
                <div className="flex gap-4">
                  {reviewMode === 'import' && (
                    previewValidation.missingCols.length > 0 ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-xs font-bold"><AlertTriangle size={14} /> {previewValidation.missingCols.length} Missing Cols</div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-bold"><ShieldCheck size={14} /> Structure Matches</div>
                    )
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-50/20 relative">
                {previewValidation.hasData ? (
                  <div className="inline-block min-w-full align-middle p-4">
                    <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white">
                      <table className="min-w-max w-full divide-y divide-slate-200 text-sm table-auto">
                        <thead className="bg-slate-100">
                          <tr>
                            {EXCEL_STRUCTURE[previewTab].map(col => (
                              <th key={col} className="px-6 py-4 font-black text-slate-500 text-[9px] uppercase tracking-widest text-left border-r border-slate-200 last:border-r-0">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeReviewData[previewTab].map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              {EXCEL_STRUCTURE[previewTab].map(col => (
                                <td key={col} className="px-6 py-3.5 text-slate-600 whitespace-nowrap text-xs border-r border-slate-50 last:border-r-0">
                                  {row[col] !== undefined && row[col] !== null 
                                    ? (typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col])) 
                                    : <span className="text-slate-200">-</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-20 text-center text-slate-400">
                    <XCircle size={48} className="text-slate-200 mb-4" />
                    <p className="font-bold">Worksheet is Empty</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-3 bg-slate-50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold"><Info size={12} /> Scroll right to view more columns.</div>
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase tracking-widest">End of Table</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagementView;
