
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Database, 
  Trash,
  LayoutGrid,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { TabName, AppData } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

const MasterDataView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData, settings } = context;

  const [activeTab, setActiveTab] = useState<TabName>('成员');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalTab, setModalTab] = useState<TabName>('成员');
  const [editingRows, setEditingRows] = useState<any[]>([]);
  const [originalRecordToUpdate, setOriginalRecordToUpdate] = useState<any>(null);
  const [errorRows, setErrorRows] = useState<number[]>([]);

  const isZh = settings.language === 'zh';
  const masterTabs: TabName[] = ['成员', '机构', '手机', '账户', '保险', '汇率', '固定资产'];
  
  const currentTab = isModalOpen ? modalTab : activeTab;
  const idColumn = EXCEL_STRUCTURE[currentTab][0];

  // Identifies which columns are considered "Nicknames" or "Primary Labels"
  const nicknameFields = ['成员昵称', '机构名称', '设备昵称', '账户昵称', '保险昵称', '资产昵称'];

  const linkedFieldsMapping: Record<string, { idField: string, source: TabName, lookupKey: string }> = {
    '成员昵称': { idField: '成员ID', source: '成员', lookupKey: '成员昵称' },
    '机构名称': { idField: '机构ID', source: '机构', lookupKey: '机构名称' },
    '设备昵称': { idField: '设备ID', source: '手机', lookupKey: '设备昵称' },
    '账户昵称': { idField: '账户ID', source: '账户', lookupKey: '账户昵称' },
    '被保险人': { idField: '被保险人ID', source: '成员', lookupKey: '成员昵称' },
    '受益人': { idField: '受益人ID', source: '成员', lookupKey: '成员昵称' },
  };

  const getNextId = (tab: TabName, currentEditingRows: any[] = []) => {
    const records = data[tab] as any[];
    const allRecords = [...records, ...currentEditingRows];
    const prefixes: Record<string, string> = { '成员': 'M', '机构': 'INST', '手机': 'DEV', '账户': 'ACC', '保险': 'INS', '汇率': 'FX', '固定资产': 'FIX' };
    const prefix = prefixes[tab] || 'ID';
    const tabIdCol = EXCEL_STRUCTURE[tab][0];
    let maxNum = 0;
    allRecords.forEach(r => {
      const idStr = String(r[tabIdCol] || '');
      const numPart = idStr.replace(prefix, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  };

  const filteredData = (data[activeTab] as any[]).filter(item => 
    Object.values(item).some(val => String(val || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = (idKey: string, idVal: string) => {
    const confirmMsg = isZh ? `确定要永久删除 [${idVal}] 吗？` : `Confirm delete [${idVal}]?`;
    if (!window.confirm(confirmMsg)) return;
    const newData = { ...data };
    (newData[activeTab] as any[]) = (newData[activeTab] as any[]).filter(item => item[idKey] !== idVal);
    setData(newData);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setOriginalRecordToUpdate(null);
    setModalTab(activeTab);
    const firstId = getNextId(activeTab);
    setEditingRows([createEmptyRow(activeTab, firstId)]);
    setErrorRows([]);
    setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
    setIsEditMode(true);
    setOriginalRecordToUpdate(record);
    setModalTab(activeTab);
    setEditingRows([{ ...record }]);
    setErrorRows([]);
    setIsModalOpen(true);
  };

  const createEmptyRow = (tab: TabName, customId?: string) => {
    const obj: any = {};
    const tabCols = EXCEL_STRUCTURE[tab];
    tabCols.forEach((col, idx) => {
      if (idx === 0) obj[col] = customId || '';
      else obj[col] = '';
    });
    return obj;
  };

  const handleAddRow = () => {
    const nextId = getNextId(modalTab, editingRows);
    setEditingRows([...editingRows, createEmptyRow(modalTab, nextId)]);
  };

  const handleRemoveEditingRow = (idx: number) => {
    if (editingRows.length > 1) {
      setEditingRows(editingRows.filter((_, i) => i !== idx));
      setErrorRows(errorRows.filter(eIdx => eIdx !== idx).map(eIdx => eIdx > idx ? eIdx - 1 : eIdx));
    }
  };

  const updateEditingRow = (idx: number, field: string, value: any) => {
    const tabIdCol = EXCEL_STRUCTURE[modalTab][0];
    const isReadOnly = field === tabIdCol || Object.values(linkedFieldsMapping).some(m => m.idField === field);
    if (isReadOnly) return;

    const newRows = [...editingRows];
    newRows[idx][field] = value;

    const mapping = linkedFieldsMapping[field];
    if (mapping && mapping.source !== modalTab) {
      const sourceData = data[mapping.source] as any[];
      const matched = sourceData.find(item => String(item[mapping.lookupKey]) === String(value));
      if (matched) {
        const sourceIdKey = mapping.source === '成员' ? '成员ID' : mapping.source === '机构' ? '机构ID' : mapping.source === '手机' ? '设备ID' : '账户ID';
        newRows[idx][mapping.idField] = matched[sourceIdKey];
      } else {
        newRows[idx][mapping.idField] = '';
      }
    }
    setEditingRows(newRows);
    if (value && errorRows.includes(idx)) setErrorRows(errorRows.filter(i => i !== idx));
  };

  const handleSaveModal = () => {
    // Validation: Nicknames must not be empty
    const currentNicknameField = EXCEL_STRUCTURE[modalTab].find(col => nicknameFields.includes(col));
    const invalidIndices: number[] = [];
    
    if (currentNicknameField) {
      editingRows.forEach((row, i) => {
        if (!row[currentNicknameField] || String(row[currentNicknameField]).trim() === '') {
          invalidIndices.push(i);
        }
      });
    }

    if (invalidIndices.length > 0) {
      setErrorRows(invalidIndices);
      alert(isZh ? "保存失败：请确保所有行的昵称/名称字段均已填写。" : "Save Failed: Please ensure all nickname/name fields are filled.");
      return;
    }

    const newData = { ...data };
    const tabIdCol = EXCEL_STRUCTURE[modalTab][0];
    if (isEditMode && originalRecordToUpdate) {
      (newData[modalTab] as any[]) = (newData[modalTab] as any[]).map(r => r[tabIdCol] === originalRecordToUpdate[tabIdCol] ? editingRows[0] : r);
    } else {
      (newData[modalTab] as any[]) = [...(newData[modalTab] as any[]), ...editingRows];
    }
    setData(newData);
    setIsModalOpen(false);
    setActiveTab(modalTab);
  };

  const switchModalTab = (tab: TabName) => {
    if (isEditMode) return;
    setModalTab(tab);
    const firstId = getNextId(tab);
    setEditingRows([createEmptyRow(tab, firstId)]);
    setErrorRows([]);
  };

  const renderCellContent = (row: any, col: string) => {
    const value = row[col];
    const isPassword = col === '密码';
    const showPass = showPasswords[row[idColumn]];
    if (isPassword) {
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400">{showPass ? String(value) : '••••••••'}</span>
          <button onClick={(e) => { e.stopPropagation(); setShowPasswords(prev => ({ ...prev, [row[idColumn]]: !showPass })); }} className="text-slate-300 hover:text-blue-500 transition-colors p-1">
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      );
    }
    if (col === idColumn) {
      return (
        <span className="font-mono text-[10px] xl:text-[12px] bg-slate-900/5 border border-slate-900/5 px-3 py-1.5 rounded-xl text-slate-500 font-black tracking-widest uppercase shadow-inner">
          {String(value)}
        </span>
      );
    }
    if (typeof value === 'string' && value.includes('|||')) {
      const tags = value.split('|||').map(t => t.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap gap-2 max-w-[200px] xl:max-w-md">
          {tags.map((tag, i) => (
            <span key={i} className="px-3 py-1.5 bg-indigo-50/50 text-indigo-500 border border-indigo-100/50 rounded-2xl text-[10px] xl:text-[12px] font-black uppercase tracking-tight shadow-sm">{tag}</span>
          ))}
        </div>
      );
    }
    if (typeof value === 'number') {
      return <span className="font-black text-slate-800 text-sm xl:text-2xl tracking-tighter">{value.toLocaleString()}</span>;
    }
    return <span className="font-bold text-slate-600 text-sm xl:text-xl tracking-tight leading-tight block truncate max-w-[150px] xl:max-w-[400px]">{value !== null && value !== undefined ? String(value) : '—'}</span>;
  };

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2 p-1.5 bg-white/40 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-lg w-full xl:w-auto overflow-x-auto no-scrollbar">
            {masterTabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 xl:flex-none px-6 xl:px-10 py-4 rounded-[24px] text-[10px] xl:text-xs font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white shadow-2xl scale-[1.02] -translate-y-[1px]' : 'text-slate-400 hover:text-slate-800 hover:bg-white/50'}`}>{tab}</button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch xl:min-w-[600px]">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
              <input type="text" placeholder={isZh ? `搜索 ${activeTab} 的核心节点...` : `Search across ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white/40 backdrop-blur-md border border-white/60 rounded-[32px] focus:ring-8 focus:ring-blue-500/5 outline-none font-bold text-slate-700 placeholder:text-slate-300 text-sm xl:text-xl shadow-inner transition-all" />
            </div>
            <button onClick={openAddModal} className="px-12 py-5 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-widest text-xs xl:text-base hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-4 whitespace-nowrap"><Plus size={24} strokeWidth={3} /> {isZh ? '新增记录' : 'ADD RECORD'}</button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[48px] border border-white/60 shadow-2xl overflow-hidden relative transition-all duration-700">
        <div className="overflow-x-auto custom-scrollbar-wide">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-white/40 backdrop-blur-3xl sticky top-0 z-10">
              <tr>
                {EXCEL_STRUCTURE[activeTab].map(col => (
                  <th key={col} className="px-12 py-10 text-[9px] xl:text-base font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/30 whitespace-nowrap">{col}</th>
                ))}
                <th className="px-12 py-10 text-[9px] xl:text-base font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/30 text-center w-48">{isZh ? '操作' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/60 transition-all duration-500 group">
                  {EXCEL_STRUCTURE[activeTab].map(col => (
                    <td key={col} className="px-12 py-8 xl:py-12">{renderCellContent(row, col)}</td>
                  ))}
                  <td className="px-12 py-8 xl:py-12">
                    <div className="flex justify-center gap-5">
                      <button onClick={() => openEditModal(row)} className="w-12 h-12 xl:w-16 xl:h-16 bg-emerald-50 shadow-sm border border-emerald-100 rounded-2xl xl:rounded-3xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all hover:scale-110"><Edit2 size={window.innerWidth > 1024 ? 24 : 18} /></button>
                      <button onClick={() => handleDelete(idColumn, row[idColumn])} className="w-12 h-12 xl:w-16 xl:h-16 bg-rose-50 shadow-sm border border-rose-100 rounded-2xl xl:rounded-3xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all hover:scale-110"><Trash2 size={window.innerWidth > 1024 ? 24 : 18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr><td colSpan={EXCEL_STRUCTURE[activeTab].length + 1} className="px-12 py-60 text-center"><div className="flex flex-col items-center gap-8 opacity-20"><LayoutGrid className="w-32 h-32 text-slate-400" strokeWidth={1} /><p className="text-2xl xl:text-5xl font-black italic tracking-tighter text-slate-500">{isZh ? '未发现匹配的架构节点' : 'No matching infrastructure nodes.'}</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync Modal: Extra Wide (90vw) with mandatory nickname highlighting */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in-95 duration-500">
          <div className="glass-card rounded-[40px] sm:rounded-[48px] shadow-4xl w-full max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden bg-white border-white">
             
             <header className="px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-100 flex flex-col gap-6 relative bg-white/80">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter text-slate-900">{isEditMode ? (isZh ? '编辑节点' : 'Edit Node') : (isZh ? '同步架构' : 'Sync Architecture')}</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">{isZh ? '资产主权同步协议 · 逻辑锁定' : 'Asset Sovereignty Protocol · Logical Locking'}</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-300 hover:text-slate-600 transition-all shadow-sm"><X size={24} strokeWidth={2.5} /></button>
                </div>
                {!isEditMode && (
                  <div className="flex items-center justify-start">
                    <div className="flex bg-slate-900/5 p-1 rounded-2xl border border-slate-200/50 shadow-inner overflow-x-auto no-scrollbar">
                      {masterTabs.map(tab => (
                        <button key={tab} onClick={() => switchModalTab(tab)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${modalTab === tab ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>
                      ))}
                    </div>
                  </div>
                )}
             </header>

             <div className="flex-1 overflow-auto p-6 sm:p-10 bg-slate-50/20 custom-scrollbar-wide">
                <div className="min-w-max">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-slate-50/90 backdrop-blur-xl">
                        {EXCEL_STRUCTURE[modalTab].map(col => {
                          const isNickname = nicknameFields.includes(col);
                          return (
                            <th key={col} className="px-4 pb-4 text-[10px] font-black uppercase tracking-[0.2em] min-w-[150px]">
                              <span className={isNickname ? 'text-blue-600' : 'text-slate-400'}>{col}</span>
                              {isNickname && <span className="ml-1 text-[8px] text-rose-500 font-black tracking-normal">({isZh ? '必填' : 'REQ'})</span>}
                            </th>
                          );
                        })}
                        {!isEditMode && <th className="px-4 pb-4 w-12 text-center"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {editingRows.map((row, idx) => (
                        <tr key={idx} className={`group hover:bg-white transition-all ${errorRows.includes(idx) ? 'bg-rose-50/30' : ''}`}>
                          {EXCEL_STRUCTURE[modalTab].map((col, colIdx) => {
                            const tabIdCol = EXCEL_STRUCTURE[modalTab][0];
                            const isPrimaryId = col === tabIdCol;
                            const isDerivedId = Object.values(linkedFieldsMapping).some(m => m.idField === col);
                            const isReadOnly = isPrimaryId || isDerivedId;
                            const mapping = linkedFieldsMapping[col];
                            const showDropdown = mapping && mapping.source !== modalTab;
                            const isNickname = nicknameFields.includes(col);
                            
                            if (showDropdown) {
                                const sourceData = data[mapping.source] as any[];
                                return (
                                  <td key={col} className="px-2 py-4">
                                    <select value={row[col] || ''} onChange={(e) => updateEditingRow(idx, col, e.target.value)} className={`w-full bg-white border rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm ${errorRows.includes(idx) && isNickname && !row[col] ? 'border-rose-300 ring-4 ring-rose-500/10' : 'border-slate-200'}`}>
                                      <option value="">-- {isZh ? '选择' : 'Select'} --</option>
                                      {sourceData.map((item, i) => (<option key={i} value={item[mapping.lookupKey]}>{item[mapping.lookupKey]}</option>))}
                                    </select>
                                  </td>
                                );
                            }
                            return (
                              <td key={col} className="px-2 py-4">
                                <input value={row[col] || ''} onChange={(e) => updateEditingRow(idx, col, e.target.value)} className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm ${isReadOnly ? 'bg-slate-100/50 text-slate-400 border-slate-200 cursor-not-allowed font-mono' : 'bg-white text-slate-800'} ${errorRows.includes(idx) && isNickname && !row[col] ? 'border-rose-400 bg-rose-50/50 ring-4 ring-rose-500/10' : 'border-slate-200'}`} placeholder={`${col}${isNickname ? (isZh ? ' (必填)' : ' *') : ''}`} readOnly={isReadOnly} />
                              </td>
                            );
                          })}
                          {!isEditMode && (<td className="px-2 py-4"><button onClick={() => handleRemoveEditingRow(idx)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm"><Trash size={16}/></button></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!isEditMode && (<button onClick={handleAddRow} className="mt-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-all bg-white/40 px-6 py-2.5 rounded-2xl border border-slate-100 hover:border-blue-100 shadow-sm group"><Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform" /> {isZh ? '追加新的节点行' : 'Append Node Row'}</button>)}
             </div>

             <footer className="px-6 sm:px-10 py-6 sm:py-8 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-end gap-4 items-center">
                {errorRows.length > 0 && <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-tighter mr-auto"><AlertCircle size={16} /> {isZh ? '存在未填写的必填项' : 'Missing required fields'}</div>}
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">{isZh ? '取消' : 'Cancel'}</button>
                <button onClick={handleSaveModal} className="px-12 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/10"><Save size={18}/> {isZh ? (isEditMode ? '提交修改' : '确认同步') : (isEditMode ? 'Commit Edit' : 'Apply Sync')}</button>
             </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataView;
