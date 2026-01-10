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
  XCircle
} from 'lucide-react';
import { parseExcelFile, exportToExcel } from '../utils/excelHelper';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

const DataManagementView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData, settings } = context;

  const [parsingStatus, setParsingStatus] = useState<'idle' | 'parsing' | 'reviewed'>('idle');
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
      // Set initial preview tab to first one with data or just the first tab
      const firstTabWithData = (Object.keys(parsedData) as TabName[]).find(t => parsedData[t].length > 0);
      setPreviewTab(firstTabWithData || '成员');
    } catch (err) {
      setLogs([`CRITICAL ERROR: ${err}`]);
      setParsingStatus('idle');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleImport = () => {
    if (tempData) {
      setData(tempData);
      setTempData(null);
      setLogs([]);
      setParsingStatus('idle');
      alert("Data successfully merged into application memory.");
    }
  };

  const handleExport = () => {
    exportToExcel(data);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Validation logic for preview
  const previewValidation = useMemo(() => {
    if (!tempData) return { missingCols: [], hasData: false };
    const expected = EXCEL_STRUCTURE[previewTab];
    const actual = tempData[previewTab].length > 0 ? Object.keys(tempData[previewTab][0]) : [];
    const missing = expected.filter(col => !actual.includes(col));
    return {
      missingCols: missing,
      hasData: tempData[previewTab].length > 0
    };
  }, [tempData, previewTab]);

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
              Strictly enforces the 11-tab data contract. All local changes will be overwritten by the imported file.
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
          <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-6 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Activity className="text-emerald-500" size={24} /> System Operations
            </h3>
            
            <div className="space-y-4">
              <button 
                onClick={handleExport}
                className="w-full flex items-center justify-between p-5 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm bg-slate-50/30"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm border border-blue-50 group-hover:scale-110 transition-transform">
                    <Download size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">Generate Export Package</p>
                    <p className="text-xs text-slate-500">Download snapshot.xlsx with current data.</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={20} />
              </button>

              <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Info size={16} />
                  Database Protocol
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This system operates as a stateless processor. Data is primarily managed through formatted Excel files.
                  <br /><br />
                  <span className="text-slate-200">Mandatory Structure:</span> 11 Worksheets, 80+ Pre-defined Columns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Preview Stage */}
      {parsingStatus === 'reviewed' && tempData && (
        <div className="bg-white rounded-3xl border border-blue-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TableIcon size={24} />
              </div>
              <div>
                <h4 className="text-xl font-bold">Data Review & Validation</h4>
                <p className="text-blue-100 text-xs">Verify the contents of the Excel file before final synchronization.</p>
              </div>
            </div>
            <div className="flex gap-4">
               <button 
                onClick={() => { setTempData(null); setParsingStatus('idle'); }}
                className="px-6 py-2 bg-blue-700 hover:bg-blue-800 rounded-xl font-bold text-sm transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleImport}
                className="px-8 py-2 bg-slate-900 text-white hover:bg-black rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95"
              >
                Complete Import
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Sidebar for Tabs */}
            <div className="w-full lg:w-72 bg-slate-50 border-r border-slate-100 p-4 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-4">Worksheets</p>
              {(Object.keys(EXCEL_STRUCTURE) as TabName[]).map(tab => {
                const count = tempData[tab].length;
                const isActive = previewTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setPreviewTab(tab)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-white shadow-md border-l-4 border-blue-500 text-blue-600' 
                        : 'hover:bg-white/50 text-slate-500'
                    }`}
                  >
                    <span className={`text-sm font-bold ${isActive ? 'translate-x-1' : ''} transition-transform`}>{tab}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${count > 0 ? 'bg-blue-50 text-blue-500' : 'bg-slate-200 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 p-8 flex flex-col bg-white">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h5 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    {previewTab}
                    <span className="text-sm font-normal text-slate-400">Sheet Preview</span>
                  </h5>
                </div>
                
                <div className="flex gap-4">
                  {previewValidation.missingCols.length > 0 ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-xs font-bold">
                      <AlertTriangle size={14} />
                      {previewValidation.missingCols.length} Columns Missing
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-bold">
                      <ShieldCheck size={14} />
                      Column Structure Valid
                    </div>
                  )}
                </div>
              </div>

              {previewValidation.missingCols.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-xs font-bold text-amber-800 mb-2">Missing column contract items:</p>
                  <div className="flex flex-wrap gap-2">
                    {previewValidation.missingCols.map(col => (
                      <span key={col} className="px-2 py-1 bg-white border border-amber-200 text-amber-600 rounded-lg text-[10px] font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-600/70 mt-3">Missing columns will result in empty values for those fields in the system.</p>
                </div>
              )}

              <div className="flex-1 overflow-auto border rounded-2xl border-slate-100">
                {previewValidation.hasData ? (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                      <tr>
                        {EXCEL_STRUCTURE[previewTab].map(col => (
                          <th key={col} className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tempData[previewTab].slice(0, 50).map((row: any, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          {EXCEL_STRUCTURE[previewTab].map(col => (
                            <td key={col} className="px-6 py-4 text-slate-600 whitespace-nowrap">
                              {row[col] !== undefined && row[col] !== null 
                                ? (row[col] instanceof Date ? row[col].toLocaleDateString() : String(row[col]))
                                : <span className="text-slate-300 italic text-xs">null</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                    <XCircle size={48} className="text-slate-200 mb-4" />
                    <p className="font-bold text-slate-400">No Records Found in this Sheet</p>
                    <p className="text-xs text-slate-300 max-w-xs mt-2">Make sure your sheet is named exactly "{previewTab}" and contains data starting from the second row.</p>
                  </div>
                )}
              </div>
              
              {tempData[previewTab].length > 50 && (
                <p className="text-center mt-4 text-[10px] text-slate-400 italic">Showing first 50 of {tempData[previewTab].length} records</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagementView;
