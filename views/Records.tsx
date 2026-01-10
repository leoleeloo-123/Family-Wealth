
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Plus, Search, Edit2, Trash2, X, Calendar, Filter, Clock, User, ArrowRight, LayoutList, History as HistoryIcon } from 'lucide-react';
import { TabName } from '../types';

const RecordsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const [activeType, setActiveType] = useState<'liquid' | 'fixed' | 'loan'>('liquid');
  const [viewMode, setViewMode] = useState<'all' | 'latest'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const splitValue = (val: any): string[] => {
    if (typeof val !== 'string') return [String(val || '')];
    return val.split('|||').map(s => s.trim()).filter(Boolean);
  };

  const filterOptions = useMemo(() => {
    const members = Array.from(new Set(data.成员.flatMap(m => splitValue(m.成员昵称)))).sort();
    let rawAccounts: string[] = [];
    if (activeType === 'liquid') rawAccounts = data.账户.flatMap(a => splitValue(a.账户昵称));
    else if (activeType === 'fixed') rawAccounts = data.固定资产.flatMap(a => splitValue(a.资产昵称));
    else rawAccounts = data.借入借出记录.flatMap(l => splitValue(l.借款对象));
    const accounts = Array.from(new Set(rawAccounts)).sort();
    return { members, accounts };
  }, [data, activeType]);

  const filteredRecords = useMemo(() => {
    let source: any[] = [];
    if (activeType === 'liquid') source = data.流动资产记录;
    else if (activeType === 'fixed') source = data.固定资产记录;
    else source = data.借入借出记录;

    let processed = source.filter(r => {
      const rDate = r.时间;
      const dateInRange = (!startDate || rDate >= startDate) && (!endDate || rDate <= endDate);
      
      const memberMatch = selectedMember === 'all' || (() => {
        let recordMembers: string[] = [];
        if (activeType === 'loan') recordMembers = splitValue(r.成员昵称);
        else if (activeType === 'liquid') {
          const acc = data.账户.find(a => a.账户ID === r.账户ID);
          recordMembers = splitValue(acc?.成员昵称);
        } else {
          const asset = data.固定资产.find(a => a.资产ID === r.资产ID);
          recordMembers = splitValue(asset?.成员昵称);
        }
        return recordMembers.includes(selectedMember);
      })();

      const accountMatch = selectedAccount === 'all' || (() => {
        const currentName = String((r as any).账户昵称 || (r as any).资产昵称 || (r as any).借款对象);
        return splitValue(currentName).includes(selectedAccount);
      })();

      const searchMatch = Object.values(r).some(v => 
        String(v || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

      return dateInRange && memberMatch && accountMatch && searchMatch;
    });

    if (viewMode === 'latest') {
      const latestMap = new Map();
      const idKey = activeType === 'liquid' ? '账户ID' : activeType === 'fixed' ? '资产ID' : '借款对象';
      processed.forEach(r => {
        const id = r[idKey];
        if (!latestMap.has(id) || new Date(r.时间) > new Date(latestMap.get(id).时间)) latestMap.set(id, r);
      });
      processed = Array.from(latestMap.values());
    }

    return processed.sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
  }, [data, activeType, viewMode, searchTerm, selectedMember, selectedAccount, startDate, endDate]);

  const renderItemName = (name: any) => {
    const parts = splitValue(name);
    return (
      <div className="flex flex-col">
        <span className="font-black text-slate-800 text-sm tracking-tight">{parts[0]}</span>
        {parts.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {parts.slice(1).map((p, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-black uppercase tracking-tight">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTypeTags = (typeString: string, isLiability: boolean) => {
    const types = splitValue(typeString);
    const baseClass = isLiability 
      ? "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/50" 
      : "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50";
    
    return (
      <div className="flex flex-wrap gap-1.5">
        {types.map((t, idx) => (
          <span key={idx} className={`px-2.5 py-1 border rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${baseClass}`}>
            {t}
          </span>
        ))}
      </div>
    );
  };

  const getRecordMetadata = (r: any) => {
    let assetType = '';
    let isLiability = false;
    let rawValue = Number((r as any).市值 || (r as any).估值 || (r as any).借款额 || 0);

    if (activeType === 'liquid') {
      const acc = data.账户.find(a => a.账户ID === r.账户ID);
      assetType = acc?.资产类型 || 'Unknown';
    } else if (activeType === 'fixed') {
      assetType = '资产';
    } else {
      assetType = (r as any).资产类型 || 'N/A';
      if (r.借入借出 === '借入') {
        isLiability = true;
        rawValue = -Math.abs(rawValue);
      }
    }

    return { assetType, isLiability, signedValue: rawValue };
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col gap-4">
        {/* Row 1: Primary Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center"><Filter size={18} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</span>
            </div>
            <div className="flex bg-slate-900/5 p-1 rounded-2xl w-full lg:w-auto">
              {(['liquid', 'fixed', 'loan'] as const).map((type) => (
                <button key={type} onClick={() => setActiveType(type)} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter sm:tracking-widest transition-all ${activeType === type ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>{type}</button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center"><Clock size={18} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">View Mode</span>
            </div>
            <div className="flex bg-slate-900/5 p-1 rounded-2xl w-full lg:w-auto">
              {(['all', 'latest'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter sm:tracking-widest transition-all ${viewMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>{mode}</button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4">
             <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center flex-shrink-0"><User size={18} /></div>
             <div className="flex-1 min-w-0">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Member</p>
               <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-xs appearance-none cursor-pointer truncate">
                 <option value="all">All Members</option>
                 {filterOptions.members.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
             </div>
          </div>

          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4">
             <div className="w-9 h-9 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center flex-shrink-0"><Filter size={18} /></div>
             <div className="flex-1 min-w-0">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{activeType === 'liquid' ? 'Account' : activeType === 'fixed' ? 'Asset' : 'Lender'}</p>
               <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-xs appearance-none cursor-pointer truncate">
                 <option value="all">All Items</option>
                 {filterOptions.accounts.map(a => <option key={a} value={a}>{a}</option>)}
               </select>
             </div>
          </div>
        </div>

        {/* Row 2: Search & Date Range */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-5 p-2 rounded-[28px] bg-white/40 border-white/60 backdrop-blur-xl flex items-center relative overflow-hidden shadow-lg">
            <Search className="absolute left-6 text-slate-400" size={20} />
            <input type="text" placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-transparent outline-none font-bold text-slate-800 text-sm" />
          </div>
          <div className="xl:col-span-5 p-2 rounded-[28px] bg-white/40 border-white/60 backdrop-blur-xl flex items-center gap-2 overflow-hidden px-4 shadow-lg">
            <Calendar size={18} className="text-slate-400" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent outline-none font-bold text-slate-800 text-[10px] sm:text-xs flex-1" />
            <ArrowRight size={14} className="text-slate-300" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent outline-none font-bold text-slate-800 text-[10px] sm:text-xs flex-1" />
          </div>
          <button onClick={() => setIsAdding(true)} className="xl:col-span-2 bg-slate-900 text-white rounded-[28px] py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl">
            <Plus size={18} strokeWidth={3} /> New Entry
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[40px] overflow-hidden border-white/60 shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/40 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/20">
                <th className="px-10 py-6 w-1/5">Item Name</th>
                <th className="px-10 py-6 w-[15%]">Asset Type</th>
                <th className="px-10 py-6 w-[15%]">Timestamp</th>
                <th className="px-10 py-6 text-right w-[15%]">Signed Value</th>
                <th className="px-10 py-6">Notes</th>
                <th className="px-10 py-6 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {filteredRecords.map((r, i) => {
                const { assetType, isLiability, signedValue } = getRecordMetadata(r);
                return (
                  <tr key={i} className="hover:bg-white/60 transition-all group">
                    <td className="px-10 py-6">
                      {renderItemName((r as any).账户昵称 || (r as any).资产昵称 || (r as any).借款对象)}
                      {activeType === 'loan' && (
                        <span className={`text-[8px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded-full inline-block ${isLiability ? 'bg-rose-500/10 text-rose-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                          {r.借入借出}
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-6">
                      {renderTypeTags(assetType, isLiability)}
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2 text-slate-400 font-black text-xs">
                        <Calendar size={12} className="opacity-50" />
                        {String((r as any).时间)}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-black text-xl tracking-tighter ${isLiability || signedValue < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                          {signedValue.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-0.5">{String((r as any).币种)}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-slate-500 font-medium italic text-xs leading-relaxed max-w-xs truncate">
                        {String((r as any).市值备注 || (r as any).估值备注 || (r as any).借款备注 || '—')}
                      </p>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button className="w-9 h-9 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all hover:scale-110"><Edit2 size={14}/></button>
                        <button className="w-9 h-9 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all hover:scale-110"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={6} className="px-10 py-32 text-center opacity-30 text-xl font-black italic tracking-tighter">No records matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-2xl flex items-center justify-center p-6 z-[100] animate-in fade-in zoom-in duration-300">
          <div className="glass-card rounded-[48px] shadow-3xl w-full max-w-xl p-12 flex flex-col items-center text-center relative bg-white/95 border-white">
             <button onClick={() => setIsAdding(false)} className="absolute right-8 top-8 p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             <div className="w-20 h-20 bg-blue-600/10 rounded-[28px] flex items-center justify-center mb-8 text-blue-600"><Plus size={40} strokeWidth={2.5} /></div>
             <h3 className="text-4xl font-black mb-4 tracking-tighter text-slate-900">Add Memory Record</h3>
             <p className="text-slate-500 mb-12 text-sm leading-relaxed font-medium">Use the Excel Protocol for high-volume synchronization. Direct manual entry is coming in the next build.</p>
             <button onClick={() => setIsAdding(false)} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black tracking-widest uppercase text-xs hover:bg-black transition-all shadow-2xl">Understood</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsView;
