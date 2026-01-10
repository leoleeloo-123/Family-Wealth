
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
// Added Database to the import list to fix the missing reference error
import { Plus, Search, MoreVertical, Trash2, Eye, EyeOff, Database } from 'lucide-react';
import { TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

const MasterDataView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData } = context;

  const [activeTab, setActiveTab] = useState<TabName>('成员');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const masterTabs: TabName[] = ['成员', '机构', '手机', '账户', '保险', '汇率', '固定资产'];

  const filteredData = (data[activeTab] as any[]).filter(item => 
    Object.values(item).some(val => 
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleDelete = (idKey: string, idVal: string) => {
    if (!window.confirm("Deleting this record might cause inconsistency if referenced elsewhere. Continue?")) return;
    const newData = { ...data };
    (newData[activeTab] as any[]) = (newData[activeTab] as any[]).filter(item => item[idKey] !== idVal);
    setData(newData);
  };

  const idColumn = EXCEL_STRUCTURE[activeTab][0];

  const renderCellContent = (row: any, col: string) => {
    const value = row[col];
    const isPassword = col === '密码';
    const showPass = showPasswords[row[idColumn]];

    if (isPassword) {
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono">{showPass ? String(value) : '••••••••'}</span>
          <button 
            onClick={() => setShowPasswords(prev => ({ ...prev, [row[idColumn]]: !showPass }))}
            className="text-slate-400 hover:text-blue-500 transition-colors"
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      );
    }

    if (col.includes('ID')) {
      return (
        <span className="font-mono text-[10px] bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-md text-slate-500 font-bold">
          {String(value)}
        </span>
      );
    }

    // Handle delimited tags logic (|||)
    if (typeof value === 'string' && value.includes('|||')) {
      const tags = value.split('|||').map(t => t.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {tags.map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[10px] font-black uppercase tracking-tight">
              {tag}
            </span>
          ))}
        </div>
      );
    }

    if (value instanceof Date) return value.toLocaleDateString();
    
    // Default styling for numeric-looking values
    if (typeof value === 'number') {
      return <span className="font-black text-slate-700">{value.toLocaleString()}</span>;
    }

    return value !== null && value !== undefined ? (
      <span className="font-semibold text-slate-600">{String(value)}</span>
    ) : '';
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Tab Navigation - Dashboard-style Pill */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white/30 backdrop-blur-xl rounded-[24px] border border-white/40 shadow-sm">
        {masterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab 
                ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={`Search across ${activeTab} data segments...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-[22px] focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700 placeholder:text-slate-400 text-sm shadow-inner transition-all"
          />
        </div>
        <button className="flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-[22px] font-black uppercase tracking-widest text-xs hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/20">
          <Plus size={18} strokeWidth={3} /> Add Record
        </button>
      </div>

      {/* Main Table View */}
      <div className="glass-card rounded-[40px] border border-white/60 shadow-2xl overflow-hidden relative group">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-white/60 backdrop-blur-2xl">
              <tr>
                {EXCEL_STRUCTURE[activeTab].map(col => (
                  <th key={col} className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/30">{col}</th>
                ))}
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/30 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/60 transition-all duration-300">
                  {EXCEL_STRUCTURE[activeTab].map(col => (
                    <td key={col} className="px-8 py-5 text-sm whitespace-nowrap">
                      {renderCellContent(row, col)}
                    </td>
                  ))}
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => handleDelete(idColumn, row[idColumn])}
                      className="w-9 h-9 bg-white/50 border border-white/80 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-xl text-slate-400 flex items-center justify-center transition-all hover:scale-110 shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={EXCEL_STRUCTURE[activeTab].length + 1} className="px-8 py-40 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <Database className="w-16 h-16 text-slate-400" strokeWidth={1} />
                       <p className="text-xl font-black italic tracking-tighter text-slate-500">No records found in this memory segment.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterDataView;
