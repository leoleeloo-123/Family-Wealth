
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Calendar, 
  Filter, 
  Clock, 
  User, 
  ArrowRight, 
  RotateCcw, 
  LayoutList,
  Save,
  Trash
} from 'lucide-react';
import { TabName, LiquidAssetRecord, FixedAssetRecord, LoanRecord } from '../types';

const RecordsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData, settings } = context;

  const [activeType, setActiveType] = useState<'liquid' | 'fixed' | 'loan'>('liquid');
  const [viewMode, setViewMode] = useState<'all' | 'latest'>('all');
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'liquid' | 'fixed' | 'loan'>('liquid');
  const [editingRows, setEditingRows] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalRecordToUpdate, setOriginalRecordToUpdate] = useState<any>(null);

  const isZh = settings.language === 'zh';

  const splitValue = (val: any): string[] => {
    if (typeof val !== 'string') return [String(val || '')];
    return val.split('|||').map(s => s.trim()).filter(Boolean);
  };

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

    return { 
      members, 
      accounts: Array.from(new Set(rawAccounts)).sort(), 
      assetTypes: Array.from(new Set(rawAssetTypes)).sort() 
    };
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

  const getRecordMetadata = (r: any, typeOverride?: 'liquid' | 'fixed' | 'loan') => {
    const type = typeOverride || activeType;
    let assetType = '';
    let isLiability = false;
    let rawValue = Number((r as any).市值 || (r as any).估值 || (r as any).借款额 || 0);

    if (type === 'liquid') {
      const acc = data.账户.find(a => a.账户ID === r.账户ID || a.账户昵称 === r.账户昵称);
      assetType = acc?.资产类型 || '资产';
      isLiability = assetType.includes('负债') || assetType.includes('信用卡') || assetType.includes('应付');
    } else if (type === 'fixed') {
      assetType = '资产';
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

  const handleDelete = (record: any) => {
    const confirmMsg = isZh ? "确定要永久删除这条记录吗？" : "Are you sure you want to permanently delete this record?";
    if (window.confirm(confirmMsg)) {
      const newData = { ...data };
      if (activeType === 'liquid') newData.流动资产记录 = newData.流动资产记录.filter(r => r !== record);
      else if (activeType === 'fixed') newData.固定资产记录 = newData.固定资产记录.filter(r => r !== record);
      else newData.借入借出记录 = newData.借入借出记录.filter(r => r !== record);
      setData(newData);
    }
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
        if (!latestMap.has(id) || new Date(r.时间).getTime() > new Date(latestMap.get(id).时间).getTime()) latestMap.set(id, r);
      });
      processed = Array.from(latestMap.values());
    }
    return processed.sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
  }, [data, activeType, viewMode, selectedAssetType, selectedMember, selectedAccount, startDate, endDate]);

  // Modal Handlers
  const openAddModal = () => {
    setModalType(activeType);
    setIsEditMode(false);
    setOriginalRecordToUpdate(null);
    setEditingRows([createEmptyRow(activeType)]);
    setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
    setModalType(activeType);
    setIsEditMode(true);
    setOriginalRecordToUpdate(record);
    setEditingRows([{ ...record }]);
    setIsModalOpen(true);
  };

  const createEmptyRow = (type: 'liquid' | 'fixed' | 'loan') => {
    const now = new Date().toISOString().split('T')[0];
    if (type === 'liquid') return { 账户ID: '', 账户昵称: '', 时间: now, 币种: settings.baseCurrency, 市值: 0, 市值备注: '' };
    if (type === 'fixed') return { 资产ID: '', 资产昵称: '', 时间: now, 币种: settings.baseCurrency, 估值: 0, 估值备注: '' };
    return { 成员ID: '', 成员昵称: '', 借入借出: '借入', 资产类型: '现金', 时间: now, 币种: settings.baseCurrency, 借款额: 0, 借款对象: '', 结清: '否', 借款备注: '' };
  };

  const handleAddRow = () => {
    setEditingRows([...editingRows, createEmptyRow(modalType)]);
  };

  const handleRemoveRow = (idx: number) => {
    if (editingRows.length > 1) {
      setEditingRows(editingRows.filter((_, i) => i !== idx));
    }
  };

  const updateRow = (idx: number, field: string, value: any) => {
    const newRows = [...editingRows];
    newRows[idx][field] = value;
    
    // Auto-fill lookups - FIXED to prevent setting currency to undefined if master data field is missing
    if (modalType === 'liquid' && field === '账户昵称') {
      const acc = data.账户.find(a => a.账户昵称 === value);
      if (acc) {
        newRows[idx].账户ID = acc.账户ID;
        // Only overwrite currency if it exists in master data, otherwise keep existing/default
        if (acc.币种) newRows[idx].币种 = acc.币种;
      }
    } else if (modalType === 'fixed' && field === '资产昵称') {
      const asset = data.固定资产.find(a => a.资产昵称 === value);
      if (asset) {
        newRows[idx].资产ID = asset.资产ID;
        if (asset.币种) newRows[idx].币种 = asset.币种;
      }
    } else if (modalType === 'loan' && field === '成员昵称') {
      const mem = data.成员.find(m => m.成员昵称 === value);
      if (mem) newRows[idx].成员ID = mem.成员ID;
    }

    setEditingRows(newRows);
  };

  const handleSaveModal = () => {
    const newData = { ...data };
    if (isEditMode && originalRecordToUpdate) {
      const row = editingRows[0];
      if (modalType === 'liquid') newData.流动资产记录 = newData.流动资产记录.map(r => r === originalRecordToUpdate ? row : r);
      else if (modalType === 'fixed') newData.固定资产记录 = newData.固定资产记录.map(r => r === originalRecordToUpdate ? row : r);
      else newData.借入借出记录 = newData.借入借出记录.map(r => r === originalRecordToUpdate ? row : r);
    } else {
      if (modalType === 'liquid') newData.流动资产记录 = [...newData.流动资产记录, ...editingRows];
      else if (modalType === 'fixed') newData.固定资产记录 = [...newData.固定资产记录, ...editingRows];
      else newData.借入借出记录 = [...newData.借入借出记录, ...editingRows];
    }
    setData(newData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col gap-4">
        {/* Row 1: Filters */}
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
            <div className="flex flex-1 items-center gap-2 overflow-hidden min-w-0">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent outline-none font-black text-slate-800 text-sm sm:text-base md:text-lg flex-1 cursor-pointer min-w-0" />
              <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent outline-none font-black text-slate-800 text-sm sm:text-base md:text-lg flex-1 cursor-pointer min-w-0" />
            </div>
          </div>

          <div className="xl:col-span-4 flex gap-4 h-full">
            <button onClick={openAddModal} className="flex-1 bg-slate-900 text-white rounded-[28px] font-black uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl">
              <Plus size={18} strokeWidth={3} /> {isZh ? '新增记录' : 'NEW ENTRY'}
            </button>
            <button onClick={handleReset} className="px-6 bg-rose-500 text-white rounded-[28px] font-black uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 hover:bg-rose-600 transition-all shadow-lg border border-rose-400">
              <RotateCcw size={18} strokeWidth={3} /> {isZh ? '重置' : 'RESET'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[40px] overflow-hidden border-white/60 shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/40 text-[8px] sm:text-[10px] md:text-xs lg:text-sm font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] border-b border-white/20">
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
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-sm sm:text-lg md:text-xl lg:text-2xl tracking-tight leading-tight">{String((r as any).账户昵称 || (r as any).资产昵称 || (r as any).借款对象)}</span>
                      </div>
                      {activeType === 'loan' && (
                        <div className="mt-2.5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isLiability ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'}`}>
                            {isLiability ? (isZh ? '借入（应付）' : 'Borrowing') : (isZh ? '借出（应收）' : 'Lending')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex flex-wrap gap-1.5">
                        {splitValue(assetType).map((t, idx) => (
                          <span key={idx} className={`px-3 py-1.5 border rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest ${isLiability ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm" : "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm"}`}>
                            {t}
                          </span>
                        ))}
                      </div>
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
                        <span className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mt-1">{String((r as any).币种 || settings.baseCurrency)}</span>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      <p className="text-slate-500 font-medium italic text-xs leading-relaxed max-w-xs truncate group-hover:whitespace-normal transition-all">
                        {String((r as any).市值备注 || (r as any).估值备注 || (r as any).借款备注 || '—')}
                      </p>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex justify-center gap-4 transition-all">
                        <button onClick={() => openEditModal(r)} className="w-10 h-10 bg-emerald-50 shadow-sm rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-100 transition-all hover:scale-110 border border-emerald-100">
                          <Edit2 size={16}/>
                        </button>
                        <button onClick={() => handleDelete(r)} className="w-10 h-10 bg-rose-50 shadow-sm rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-all hover:scale-110 border border-rose-100">
                          <Trash2 size={16}/>
                        </button>
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

      {/* Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-8 z-[100] animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-card rounded-[40px] sm:rounded-[56px] shadow-4xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden bg-white/95 border-white">
             <header className="px-10 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter text-slate-900">{isEditMode ? (isZh ? '编辑记录' : 'Edit Record') : (isZh ? '新增历史记录' : 'Batch Record Entry')}</h3>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">{isZh ? '资产历史同步协议' : 'Asset History Synchronization Protocol'}</p>
                </div>
                {!isEditMode && (
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    {(['liquid', 'fixed', 'loan'] as const).map(type => (
                      <button key={type} onClick={() => { setModalType(type); setEditingRows([createEmptyRow(type)]); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modalType === type ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400'}`}>
                        {type === 'liquid' ? (isZh ? '流动' : 'Liquid') : type === 'fixed' ? (isZh ? '固定' : 'Fixed') : (isZh ? '借贷' : 'Loan')}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setIsModalOpen(false)} className="absolute right-8 top-8 p-3 hover:bg-slate-100 rounded-full text-slate-300"><X size={24} /></button>
             </header>

             <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {modalType === 'liquid' && <>
                        <th className="px-4 pb-4">{isZh ? '关联账户' : 'Account'}</th>
                        <th className="px-4 pb-4">{isZh ? '时间' : 'Date'}</th>
                        <th className="px-4 pb-4">{isZh ? '市值' : 'Valuation'}</th>
                        <th className="px-4 pb-4">{isZh ? '币种' : 'CCY'}</th>
                        <th className="px-4 pb-4">{isZh ? '备注' : 'Notes'}</th>
                      </>}
                      {modalType === 'fixed' && <>
                        <th className="px-4 pb-4">{isZh ? '关联资产' : 'Asset'}</th>
                        <th className="px-4 pb-4">{isZh ? '时间' : 'Date'}</th>
                        <th className="px-4 pb-4">{isZh ? '估值' : 'Valuation'}</th>
                        <th className="px-4 pb-4">{isZh ? '币种' : 'CCY'}</th>
                        <th className="px-4 pb-4">{isZh ? '备注' : 'Notes'}</th>
                      </>}
                      {modalType === 'loan' && <>
                        <th className="px-4 pb-4">{isZh ? '关联成员' : 'Member'}</th>
                        <th className="px-4 pb-4">{isZh ? '方向' : 'Dir'}</th>
                        <th className="px-4 pb-4">{isZh ? '借款对象' : 'Party'}</th>
                        <th className="px-4 pb-4">{isZh ? '时间' : 'Date'}</th>
                        <th className="px-4 pb-4">{isZh ? '金额' : 'Amount'}</th>
                        <th className="px-4 pb-4">{isZh ? '结清' : 'Paid'}</th>
                        <th className="px-4 pb-4">{isZh ? '备注' : 'Notes'}</th>
                      </>}
                      {!isEditMode && <th className="px-4 pb-4 w-12 text-center"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {editingRows.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                        {modalType === 'liquid' && <>
                          <td className="px-2 py-4">
                            <select value={row.账户昵称} onChange={(e) => updateRow(idx, '账户昵称', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                              <option value="">-- {isZh ? '选择账户' : 'Select'} --</option>
                              {data.账户.map(a => <option key={a.账户ID} value={a.账户昵称}>{a.账户昵称}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-4"><input type="date" value={row.时间} onChange={(e) => updateRow(idx, '时间', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" /></td>
                          <td className="px-2 py-4"><input type="number" value={row.市值} onChange={(e) => updateRow(idx, '市值', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-blue-600 outline-none" /></td>
                          <td className="px-2 py-4">
                            <select value={row.币种} onChange={(e) => updateRow(idx, '币种', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black outline-none">
                              {Array.from(new Set([...data.汇率.map(r => r.报价币种), settings.baseCurrency])).filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-4"><input type="text" value={row.市值备注} onChange={(e) => updateRow(idx, '市值备注', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none" placeholder="..." /></td>
                        </>}
                        {modalType === 'fixed' && <>
                          <td className="px-2 py-4">
                            <select value={row.资产昵称} onChange={(e) => updateRow(idx, '资产昵称', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none">
                              <option value="">-- {isZh ? '选择资产' : 'Select'} --</option>
                              {data.固定资产.map(a => <option key={a.资产ID} value={a.资产昵称}>{a.资产昵称}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-4"><input type="date" value={row.时间} onChange={(e) => updateRow(idx, '时间', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" /></td>
                          <td className="px-2 py-4"><input type="number" value={row.估值} onChange={(e) => updateRow(idx, '估值', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-amber-600 outline-none" /></td>
                          <td className="px-2 py-4">
                             <select value={row.币种} onChange={(e) => updateRow(idx, '币种', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black outline-none">
                                {Array.from(new Set([...data.汇率.map(r => r.报价币种), settings.baseCurrency])).filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                          </td>
                          <td className="px-2 py-4"><input type="text" value={row.估值备注} onChange={(e) => updateRow(idx, '估值备注', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none" placeholder="..." /></td>
                        </>}
                        {modalType === 'loan' && <>
                          <td className="px-1 py-4">
                            <select value={row.成员昵称} onChange={(e) => updateRow(idx, '成员昵称', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold outline-none">
                               <option value="">-</option>
                               {data.成员.map(m => <option key={m.成员ID} value={m.成员昵称}>{m.成员昵称}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-4">
                            <select value={row.借入借出} onChange={(e) => updateRow(idx, '借入借出', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold outline-none">
                              <option value="借入">{isZh ? '借入' : 'In'}</option>
                              <option value="借出">{isZh ? '借出' : 'Out'}</option>
                            </select>
                          </td>
                          <td className="px-1 py-4"><input type="text" value={row.借款对象} onChange={(e) => updateRow(idx, '借款对象', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold outline-none" placeholder="..." /></td>
                          <td className="px-1 py-4"><input type="date" value={row.时间} onChange={(e) => updateRow(idx, '时间', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold outline-none" /></td>
                          <td className="px-1 py-4"><input type="number" value={row.借款额} onChange={(e) => updateRow(idx, '借款额', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-black text-rose-600 outline-none" /></td>
                          <td className="px-1 py-4">
                             <select value={row.结清} onChange={(e) => updateRow(idx, '结清', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold outline-none">
                                <option value="否">{isZh ? '否' : 'No'}</option>
                                <option value="是">{isZh ? '是' : 'Yes'}</option>
                             </select>
                          </td>
                          <td className="px-1 py-4"><input type="text" value={row.借款备注} onChange={(e) => updateRow(idx, '借款备注', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-medium outline-none" /></td>
                        </>}
                        {!isEditMode && (
                          <td className="px-2 py-4">
                            <button onClick={() => handleRemoveRow(idx)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                              <Trash size={14}/>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isEditMode && (
                  <button onClick={handleAddRow} className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all">
                    <Plus size={16} strokeWidth={3} /> {isZh ? '添加新行' : 'Append New Row'}
                  </button>
                )}
             </div>

             <footer className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white transition-all">{isZh ? '取消' : 'Cancel'}</button>
                <button onClick={handleSaveModal} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/10">
                  <Save size={18}/> {isZh ? (isEditMode ? '保存修改' : '确认入库') : (isEditMode ? 'Save Changes' : 'Commit to Vault')}
                </button>
             </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsView;
