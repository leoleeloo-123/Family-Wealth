
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Plus, Edit2, Trash2, X, Calendar, Filter, Clock, User, ArrowRight, RotateCcw, LayoutList } from 'lucide-react';

const RecordsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, settings } = context;

  const [activeType, setActiveType] = useState<'liquid' | 'fixed' | 'loan'>('liquid');
  const [viewMode, setViewMode] = useState<'all' | 'latest'>('all');
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const splitValue = (val: any): string[] => {
    if (typeof val !== 'string') return [String(val || '')];
    return val.split('|||').map(s => s.trim()).filter(Boolean);
  };

  const isZh = settings.language === 'zh';

  const filterOptions = useMemo(() => {
    const members = Array.from(new Set(data.成员.flatMap(m => splitValue(m.成员昵称)))).sort();
    
    let rawAccounts: string[] = [];
    let rawAssetTypes: string[] = [];

    if (activeType === 'liquid') {
      rawAccounts = data.账户.flatMap(a => splitValue(a.账户昵称));
      rawAssetTypes = data.账户.flatMap(a => splitValue(a.资产类型));
    } else if (activeType === 'fixed') {
      rawAccounts = data.固定资产.flatMap(a => splitValue(a.资产昵称));
      rawAssetTypes = ['资产'];
    } else {
      rawAccounts = data.借入借出记录.flatMap(l => splitValue(l.借款对象));
      rawAssetTypes = data.借入借出记录.flatMap(l => splitValue(l.资产类型));
    }

    const accounts = Array.from(new Set(rawAccounts)).sort();
    const assetTypes = Array.from(new Set(rawAssetTypes)).sort();
    
    return { members, accounts, assetTypes };
  }, [data, activeType]);

  const handleReset = () => {
    setSelectedAssetType('all');
    setSelectedMember('all');
    setSelectedAccount('all');
    setStartDate('');
    setEndDate('');
    setActiveType('liquid');
    setViewMode('all');
  };

  const getRecordMetadata = (r: any) => {
    let assetType = '';
    let isLiability = false;
    let rawValue = Number((r as any).市值 || (r as any).估值 || (r as any).借款额 || 0);

    if (activeType === 'liquid') {
      const acc = data.账户.find(a => a.账户ID === r.账户ID);
      assetType = acc?.资产类型 || '资产';
      isLiability = assetType.includes('负债') || assetType.includes('信用卡') || assetType.includes('应付');
    } else if (activeType === 'fixed') {
      assetType = '资产';
      isLiability = false;
    } else {
      assetType = (r as any).资产类型 || '资产';
      if (r.借入借出 === '借入') {
        isLiability = true;
        rawValue = -Math.abs(rawValue);
      } else {
        isLiability = false;
        rawValue = Math.abs(rawValue);
      }
    }

    return { assetType, isLiability, signedValue: rawValue };
  };

  const filteredRecords = useMemo(() => {
    let source: any[] = [];
    if (activeType === 'liquid') source = data.流动资产记录;
    else if (activeType === 'fixed') source = data.固定资产记录;
    else source = data.借入借出记录;

    let processed = source.filter(r => {
      const { assetType } = getRecordMetadata(r);
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

      const typeMatch = selectedAssetType === 'all' || splitValue(assetType).includes(selectedAssetType);

      return dateInRange && memberMatch && accountMatch && typeMatch;
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
  }, [data, activeType, viewMode, selectedAssetType, selectedMember, selectedAccount, startDate, endDate]);

  const renderItemName = (name: any) => {
    const parts = splitValue(name);
    return (
      <div className="flex flex-col">
        <span className="font-black text-slate-800 text-sm sm:text-lg md:text-xl lg:text-2xl tracking-tight leading-tight">{parts[0]}</span>
      </div>
    );
  };

  const renderTypeTags = (typeString: string, isLiability: boolean) => {
    const types = splitValue(typeString);
    const baseClass = isLiability 
      ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm" 
      : "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm";
    
    return (
      <div className="flex flex-wrap gap-1.5">
        {types.map((t, idx) => (
          <span key={idx} className={`px-3 py-1.5 border rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest ${baseClass}`}>
            {t}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col gap-4">
        {/* Row 1: Filters (Category, View, Member, Account) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center"><Filter size={18} /></div>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">{isZh ? '类别' : 'CATEGORY'}</span>
            </div>
            <div className="flex bg-slate-900/5 p-1 rounded-2xl w-full lg:w-auto">
              {(['liquid', 'fixed', 'loan'] as const).map((type) => (
                <button key={type} onClick={() => setActiveType(type)} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-tighter sm:tracking-widest transition-all ${activeType === type ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                  {type === 'liquid' ? (isZh ? '流动' : 'LIQUID') : type === 'fixed' ? (isZh ? '固定' : 'FIXED') : (isZh ? '借贷' : 'LOAN')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center"><Clock size={18} /></div>
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">{isZh ? '视图' : 'VIEW MODE'}</span>
            </div>
            <div className="flex bg-slate-900/5 p-1 rounded-2xl w-full lg:w-auto">
              {(['all', 'latest'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-tighter sm:tracking-widest transition-all ${viewMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                  {mode === 'all' ? (isZh ? '全部' : 'ALL') : (isZh ? '最新' : 'LATEST')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4">
             <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center flex-shrink-0"><User size={18} /></div>
             <div className="flex-1 min-w-0 flex items-center justify-between">
               <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none flex-shrink-0 mr-4">{isZh ? '成员' : 'MEMBER'}</span>
               <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="flex-1 bg-transparent border-none outline-none font-black text-slate-800 text-sm sm:text-base md:text-lg appearance-none cursor-pointer truncate text-right pr-2">
                 <option value="all">{isZh ? '全部成员' : 'All Members'}</option>
                 {filterOptions.members.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
             </div>
          </div>

          <div className="p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4">
             <div className="w-9 h-9 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center flex-shrink-0"><Filter size={18} /></div>
             <div className="flex-1 min-w-0 flex items-center justify-between">
               <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none flex-shrink-0 mr-4">
                {activeType === 'liquid' ? (isZh ? '账户' : 'ACCOUNT') : activeType === 'fixed' ? (isZh ? '资产' : 'ASSET') : (isZh ? '对象' : 'LENDER')}
               </span>
               <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="flex-1 bg-transparent border-none outline-none font-black text-slate-800 text-sm sm:text-base md:text-lg appearance-none cursor-pointer truncate text-right pr-2">
                 <option value="all">{isZh ? '全部项' : 'All Items'}</option>
                 {filterOptions.accounts.map(a => <option key={a} value={a}>{a}</option>)}
               </select>
             </div>
          </div>
        </div>

        {/* Row 2: Asset Type, Dates, Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-3 p-4 rounded-[28px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg flex items-center gap-4">
             <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center flex-shrink-0"><LayoutList size={18} /></div>
             <div className="flex-1 min-w-0 flex items-center justify-between">
               <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none flex-shrink-0 mr-4">{isZh ? '资产类型' : 'ASSET TYPE'}</span>
               <select value={selectedAssetType} onChange={(e) => setSelectedAssetType(e.target.value)} className="flex-1 bg-transparent border-none outline-none font-black text-slate-800 text-sm sm:text-base md:text-lg appearance-none cursor-pointer truncate text-right pr-2">
                 <option value="all">{isZh ? '全部类型' : 'All Types'}</option>
                 {filterOptions.assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
               </select>
             </div>
          </div>

          <div className="xl:col-span-5 p-4 rounded-[28px] bg-white/40 border-white/60 backdrop-blur-xl flex items-center gap-4 px-6 shadow-lg overflow-hidden">
            <Calendar size={18} className="text-slate-400 flex-shrink-0" />
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent outline-none font-black text-slate-800 text-sm sm:text-base md:text-lg flex-1 cursor-pointer min-w-0" />
              <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent outline-none font-black text-slate-800 text-sm sm:text-base md:text-lg flex-1 cursor-pointer min-w-0" />
            </div>
          </div>

          <div className="xl:col-span-4 flex gap-4 h-full">
            <button onClick={() => setIsAdding(true)} className="flex-1 bg-slate-900 text-white rounded-[28px] font-black uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl">
              <Plus size={18} strokeWidth={3} /> {isZh ? '新增记录' : 'NEW ENTRY'}
            </button>
            <button onClick={handleReset} className="px-6 bg-white/60 text-slate-600 rounded-[28px] font-black uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-lg border border-white/60">
              <RotateCcw size={18} strokeWidth={3} /> {isZh ? '重置' : 'RESET'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[40px] overflow-hidden border-white/60 shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/40 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/20">
                <th className="px-12 py-8 min-w-[220px]">{isZh ? '项目名称' : 'ITEM NAME'}</th>
                <th className="px-12 py-8 min-w-[150px]">{isZh ? '资产类型' : 'ASSET TYPE'}</th>
                <th className="px-12 py-8 min-w-[150px]">{isZh ? '记录时间' : 'TIMESTAMP'}</th>
                <th className="px-12 py-8 text-right min-w-[180px]">{isZh ? '数值 (折合)' : 'SIGNED VALUE'}</th>
                <th className="px-12 py-8">{isZh ? '备注' : 'NOTES'}</th>
                <th className="px-12 py-8 text-center w-32">{isZh ? '操作' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {filteredRecords.map((r, i) => {
                const { assetType, isLiability, signedValue } = getRecordMetadata(r);
                return (
                  <tr key={i} className="hover:bg-white/60 transition-all group">
                    <td className="px-12 py-8">
                      {renderItemName((r as any).账户昵称 || (r as any).资产昵称 || (r as any).借款对象)}
                      {activeType === 'loan' && (
                        <div className="mt-2.5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isLiability ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'}`}>
                            {isLiability ? (isZh ? '借入（应付）' : 'Borrowing') : (isZh ? '借出（应收）' : 'Lending')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      {renderTypeTags(assetType, isLiability)}
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-2.5 text-slate-400 font-black text-[10px] md:text-xs">
                        <Calendar size={13} className="opacity-40" />
                        {String((r as any).时间)}
                      </div>
                    </td>
                    <td className="px-12 py-8 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-black text-lg sm:text-xl md:text-2xl tracking-tighter ${isLiability || signedValue < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                          {signedValue.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mt-1">{String((r as any).币种)}</span>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      <p className="text-slate-500 font-medium italic text-xs leading-relaxed max-w-xs truncate group-hover:whitespace-normal transition-all">
                        {String((r as any).市值备注 || (r as any).估值备注 || (r as any).借款备注 || '—')}
                      </p>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all hover:scale-110 border border-slate-50"><Edit2 size={16}/></button>
                        <button className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all hover:scale-110 border border-slate-50"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={6} className="px-12 py-40 text-center opacity-30 text-2xl font-black italic tracking-tighter">{isZh ? '未找到符合条件的记录' : 'No records matching filters.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-2xl flex items-center justify-center p-6 z-[100] animate-in fade-in zoom-in duration-300">
          <div className="glass-card rounded-[48px] shadow-3xl w-full max-w-xl p-14 flex flex-col items-center text-center relative bg-white/95 border-white">
             <button onClick={() => setIsAdding(false)} className="absolute right-10 top-10 p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={26} /></button>
             <div className="w-24 h-24 bg-blue-600/10 rounded-[32px] flex items-center justify-center mb-10 text-blue-600 shadow-inner"><Plus size={48} strokeWidth={2.5} /></div>
             <h3 className="text-4xl font-black mb-5 tracking-tighter text-slate-900">{isZh ? '新增历史记录' : 'New History Segment'}</h3>
             <p className="text-slate-500 mb-14 text-base leading-relaxed font-medium">{isZh ? '请使用数据管理中的 Excel 导入功能进行批量同步。手动录入界面正在开发中。' : 'Please utilize the Excel Import Protocol for mass record synchronization. Manual entry is currently in development.'}</p>
             <button onClick={() => setIsAdding(false)} className="w-full py-6 bg-slate-900 text-white rounded-[28px] font-black tracking-widest uppercase text-xs hover:bg-black transition-all shadow-2xl">{isZh ? '确定' : 'Confirm'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsView;
