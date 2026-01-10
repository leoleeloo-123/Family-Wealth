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
      
      // Select first tab with data if possible
      const firstTabWithData = (Object.keys(parsedData) as TabName[]).find(t => parsedData[t].length > 0);
      setPreviewTab(firstTabWithData || '成员');
    } catch (err) {
      console.error("Import Error:", err);
      setLogs([`CRITICAL ERROR: ${err}`]);
      setParsingStatus('idle');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleImport = () => {
    if (!tempData) {
      alert("Error: No data to import.");
      return;
    }
    
    const confirmMsg = "WARNING: This will COMPLETEY OVERWRITE your current system data with the content of the Excel file. This action cannot be undone. Proceed?";
    
    if (window.confirm(confirmMsg)) {
      try {
        // Ensure we pass a fresh object reference to trigger React re-render properly
        setData({ ...tempData });
        
        // Provide immediate feedback
        alert("System data successfully updated from Excel.");
        
        // Reset local UI states
        setReviewMode(null);
        setTempData(null);
        setParsingStatus('idle');
      } catch (err) {
        console.error("Data commit error:", err);
        alert("Failed to update data: " + err);
      }
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

  // Data to display in the review panel
  const activeReviewData = reviewMode === 'import' ? tempData : currentData;

  // Validation logic for preview
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
        {/* Left Column: Import Actions */}
        <div className="xl:col-span-7 space-y-6">
          <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl bg-white flex flex-col items-center text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
              {parsingStatus === 'parsing' ? (
                <Activity className="animate-spin" size={36} />
              ) : (
                <Upload size={36} />
              )}
            </div>
            <h3 className="text-2xl font-bold mb-3">Excel Source Protocol</h3>
            <p className="text-gray-500 mb-8 max-w-sm leading-relaxed text-sm">
              Strictly enforces the 11-tab data contract. <span className="text-red-500 font-bold underline">Importing will completely replace current data.</span>
            </p>
            
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".xlsx, .xls" 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            
            <button 
              onClick={triggerFilePicker}
              disabled={parsingStatus === 'parsing'}
              className={`group relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-3 ${parsingStatus === 'parsing' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {parsingStatus === 'parsing' ? 'Analyzing Structure...' : 'Select Excel File'}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Column: Existing Tools */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Activity className="text-emerald-500" size={24} /> Database Tools
            </h3>
            
            <div className="space-y-3">
              <button 
                onClick={openCurrentReview}
                className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group bg-slate-50/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-emerald-500 shadow-sm border border-emerald-50 group-hover:scale-110 transition-transform">
                    <Eye size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">Review Current Data</p>
                    <p className="text-[11px] text-slate-500">View records currently in system memory.</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-emerald-500" size={20} />
              </button>

              <button 
                onClick={handleExport}
                className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group bg-slate-50/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm border border-blue-50 group-hover:scale-110 transition-transform">
                    <Download size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 text-sm">Export Snapshot</p>
                    <p className="text-[11px] text-slate-500">Save current data to a new Excel file.</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Preview Stage */}
      {reviewMode && activeReviewData && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
          {/* Review Header */}
          <div className={`p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 ${reviewMode === 'import' ? 'bg-blue-600 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]' : 'bg-emerald-600 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]'}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <TableIcon size={24} />
              </div>
              <div>
                <h4 className="text-xl font-black">
                  {reviewMode === 'import' ? 'Incoming Excel Preview' : 'Active System Snapshot'}
                </h4>
                <p className="text-white/80 text-xs font-medium">
                  {reviewMode === 'import' 
                    ? 'Validate your spreadsheet before committing to system memory.' 
                    : 'Inspecting current memory state.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
               <button 
                onClick={closeReview}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all border border-white/20"
              >
                {reviewMode === 'import' ? 'Discard' : 'Close'}
              </button>
              {reviewMode === 'import' && (
                <button 
                  onClick={handleImport}
                  className="px-8 py-2 bg-slate-900 text-white hover:bg-black rounded-xl font-black text-sm shadow-xl transition-all active:scale-95"
                >
                  Complete Overwrite
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[500px]">
            {/* Sidebar for Tabs */}
            <div className="w-full lg:w-64 bg-slate-50 border-r border-slate-100 p-4 space-y-1.5 overflow-y-auto">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter px-3 mb-4 flex items-center gap-2">
                <Database size={10} /> Data Partitions
              </p>
              {(Object.keys(EXCEL_STRUCTURE) as TabName[]).map(tab => {
                const count = activeReviewData[tab].length;
                const isActive = previewTab === tab;
                const colorClass = reviewMode === 'import' ? 'blue' : 'emerald';
                return (
                  <button
                    key={tab}
                    onClick={() => setPreviewTab(tab)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      isActive 
                        ? `bg-white shadow-md border-l-4 border-${colorClass}-500 text-${colorClass}-700 font-bold` 
                        : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <span className="text-sm truncate">{tab}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${count > 0 ? `bg-${colorClass}-50 text-${colorClass}-600` : 'bg-slate-200 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <h5 className="text-xl font-black text-slate-800">{previewTab}</h5>
                  <span className="px-2 py-1 bg-slate-200 text-slate-500 text-[10px] font-bold rounded uppercase">
                    {activeReviewData[previewTab].length} Records
                  </span>
                </div>
                
                <div className="flex gap-4">
                  {reviewMode === 'import' && (
                    previewValidation.missingCols.length > 0 ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-xs font-bold animate-pulse">
                        <AlertTriangle size={14} />
                        {previewValidation.missingCols.length} Cols Missing
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-bold">
                        <ShieldCheck size={14} />
                        Contract Valid
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Data Table with Improved Horizontal Scrolling */}
              <div className="flex-1 overflow-auto bg-slate-50/20 relative" key={previewTab}>
                {previewValidation.hasData ? (
                  <div className="inline-block min-w-full align-middle p-4">
                    <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                      <table className="min-w-max w-full divide-y divide-slate-200 text-sm table-auto border-collapse">
                        <thead className="bg-slate-100">
                          <tr>
                            {EXCEL_STRUCTURE[previewTab].map(col => (
                              <th key={col} className="px-6 py-4 font-black text-slate-500 text-[9px] uppercase tracking-widest text-left border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {activeReviewData[previewTab].map((row: any, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              {EXCEL_STRUCTURE[previewTab].map(col => (
                                <td key={col} className="px-6 py-3.5 text-slate-600 whitespace-nowrap text-xs border-r border-slate-50 last:border-r-0">
                                  {row[col] !== undefined && row[col] !== null 
                                    ? (row[col] instanceof Date ? row[col].toLocaleDateString() : String(row[col]))
                                    : <span className="text-slate-200 italic">-</span>
                                  }
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
                    <p className="font-bold">No Data in Partition</p>
                    <p className="text-xs mt-2">This worksheet is currently empty.</p>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-3 bg-slate-50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                  <Info size={12} />
                  Table uses horizontal scrolling. Scroll right to view all columns.
                </div>
                {previewValidation.hasData && (
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Scroll Right <ChevronRight size={10} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagementView;