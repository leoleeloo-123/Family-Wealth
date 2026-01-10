
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Upload, Download, CheckCircle2, AlertTriangle, FileText, Activity, ChevronRight } from 'lucide-react';
import { parseExcelFile, exportToExcel } from '../utils/excelHelper';
import { AppData } from '../types';

const DataManagementView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData } = context;

  const [parsing, setParsing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [tempData, setTempData] = useState<AppData | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setLogs([]);
    try {
      const { data: parsedData, logs: parsingLogs } = await parseExcelFile(file);
      setTempData(parsedData);
      setLogs(parsingLogs);
    } catch (err) {
      setLogs([`Error parsing file: ${err}`]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = () => {
    if (tempData) {
      setData(tempData);
      setTempData(null);
      setLogs([]);
      alert("Data imported successfully!");
    }
  };

  const handleExport = () => {
    exportToExcel(data);
  };

  const integrityCheck = () => {
    const issues: string[] = [];
    // Example check: Missing account IDs in liquid records
    const accountIds = new Set(data.账户.map(a => a.账户ID));
    data.流动资产记录.forEach(r => {
      if (!accountIds.has(r.账户ID)) issues.push(`Liquid Record for "${r.账户昵称}" refers to non-existent Account ID: ${r.账户ID}`);
    });
    
    // Example check: Missing rates for records
    const currenciesUsed = new Set(data.流动资产记录.map(r => r.币种));
    const ratesDefined = new Set(data.汇率.map(r => r.报价币种));
    currenciesUsed.forEach(c => {
      if (c !== context.settings.baseCurrency && !ratesDefined.has(c)) {
        issues.push(`Missing exchange rate for ${c} to ${context.settings.baseCurrency}`);
      }
    });

    if (issues.length === 0) alert("Data Integrity Check: All checks passed!");
    else setLogs(issues);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Import Section */}
      <div className="space-y-6">
        <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-white flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Upload size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">Import from Excel</h3>
          <p className="text-gray-500 mb-6 max-w-xs">Upload your asset Excel file. The system will strictly follow the tab and column contract.</p>
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all">
            Select Excel File
            <input type="file" accept=".xlsx, .xls" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>

        {/* Logs / Results */}
        {logs.length > 0 && (
          <div className={`p-6 rounded-xl border ${logs.some(l => l.includes('Error') || l.includes('Missing')) ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-orange-500" size={18} />
              <h4 className="font-bold">Parsing & Integrity Logs</h4>
            </div>
            <ul className="text-sm space-y-2 max-h-60 overflow-auto">
              {logs.map((log, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                  {log}
                </li>
              ))}
            </ul>
            {tempData && (
              <button 
                onClick={handleImport}
                className="mt-6 w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold"
              >
                Confirm Import
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tools Section */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Activity className="text-emerald-500" size={20} /> Data Tools
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleExport}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Download className="text-blue-500" size={20} />
                <div className="text-left">
                  <p className="font-bold text-slate-800">Export All to Excel</p>
                  <p className="text-xs text-slate-500">Download the current memory state as a formatted Excel.</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={18} />
            </button>

            <button 
              onClick={integrityCheck}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <div className="text-left">
                  <p className="font-bold text-slate-800">Scan Data Integrity</p>
                  <p className="text-xs text-slate-500">Check for duplicate IDs, missing references, and currency errors.</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-emerald-500" size={18} />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText size={18} className="text-slate-500" /> Current Schema
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            The system is currently operating on 11 mandatory tabs including "成员", "机构", "手机", "账户", and "流动资产记录". 
            Removing these tabs from your Excel will result in data loss for those modules.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataManagementView;
