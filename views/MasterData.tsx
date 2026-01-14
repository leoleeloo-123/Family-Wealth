
import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  LayoutGrid,
  Eye,
  EyeOff,
  AlertCircle,
  Trash
} from 'lucide-react';
import { TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

// Color logic shared with Dashboard
const generateColorFromType = (typeStr: string) => {
  if (!typeStr) return '#475569';
  let hash = 0;
  for (let i = 0; i < typeStr.length; i++) {
    hash = typeStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 60%, 45%)`;
};

const TYPE_COLOR_MAP: Record<string, string> = {
  '银行': '#dc2626', 'Bank': '#dc2626',
  '券商': '#2563eb', 'Securities': '#2563eb',
  '加密货币': '#d97706', 'Crypto': '#d97706',
  '保险': '#db2777', 'Insurance': '#db2777',
  '支付': '#0891b2', 'Payment': '#0891b2',
  '房地产': '#7c3aed', 'Real Estate': '#7c3aed',
  '车辆': '#0d9488', 'Vehicle': '#0d9488',
  '股权': '#4f46e5', 'Equity': '#4f46e5',
  '珠宝': '#be123c', 'Jewelry': '#be123c'
};

const MasterDataView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData, settings } = context;

  const [activeTab, setActiveTab] = useState<TabName>('成员');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalTab, setModalTab] = useState<TabName>('成员');
  const [editingRows, setEditingRows] = useState<any[]>([]);
  const [originalRecordToUpdate, setOriginalRecordToUpdate] = useState<any>(null);
  const [errorRows, setErrorRows] = useState<number[]>([]);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const isZh = settings.language === 'zh';
  const masterTabs: TabName[] = ['成员', '机构', '手机', '账户', '保险', '汇率', '固定资产'];
  const currentTab = isModalOpen ? modalTab : activeTab;
  const idColumn = EXCEL_STRUCTURE[currentTab][0];
  const nicknameFields = ['成员昵称', '机构名称', '设备昵称', '账户昵称', '保险昵称', '资产昵称'];

  const linkedFieldsMapping: Record<string, { idField: string, source: TabName, lookupKey: string }> = {
    '成员昵称': { idField: '成员ID', source: '成员', lookupKey: '成员昵称' },
    '机构名称': { idField: '机构ID', source: '机构', lookupKey: '机构名称' },
    '设备昵称': { idField: '设备ID', source: '手机', lookupKey: '设备昵称' },
    '账户昵称': { idField: '账户ID', source: '账户', lookupKey: '账户昵称' },
    '被保险人': { idField: '被保险人ID', source: '成员', lookupKey: '成员昵称' },
    '受益人': { idField: '受益人ID', source: '成员', lookupKey: '成员昵称' },
  };

  const filteredData = (data[activeTab] as any[]).filter(item => 
    Object.values(item).some(val => String(val || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const onTopScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };
  const onTableScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  useEffect(() => { onTableScroll(); }, [activeTab, filteredData]);

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
    setEditingRows([createEmptyRow(activeTab, getNextId(activeTab))]);
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

  const createEmptyRow = (tab: TabName, customId?: string) => {
    const obj: any = {};
    EXCEL_STRUCTURE[tab].forEach((col, idx) => { obj[col] = idx === 0 ? (customId || '') : ''; });
    return obj;
  };

  const handleAddRow = () => {
    setEditingRows([...editingRows, createEmptyRow(modalTab, getNextId(modalTab, editingRows))]);
  };

  const handleRemoveEditingRow = (idx: number) => {
    if (editingRows.length > 1) {
      setEditingRows(editingRows.filter((_, i) => i !== idx));
    }
  };

  const updateEditingRow = (idx: number, field: string, value: any) => {
    const tabIdCol = EXCEL_STRUCTURE[modalTab][0];
    if (field === tabIdCol || Object.values(linkedFieldsMapping).some(m => m.idField === field)) return;

    const newRows = [...editingRows];
    newRows[idx][field] = value;

    const mapping = linkedFieldsMapping[field];
    if (mapping && mapping.source !== modalTab) {
      const sourceData = data[mapping.source] as any[];
      const matched = sourceData.find(item => String(item[mapping.lookupKey] || '').trim().toLowerCase() === String(value || '').trim().toLowerCase());
      if (matched) newRows[idx][mapping.idField] = matched[EXCEL_STRUCTURE[mapping.source][0]];
      else newRows[idx][mapping.idField] = '';
    }
    setEditingRows(newRows);
  };

  const handleSaveModal = () => {
    const nickField = EXCEL_STRUCTURE[modalTab].find(col => nicknameFields.includes(col));
    const invalid = editingRows.reduce((acc, row, i) => (!row[nickField!] ? [...acc, i] : acc), [] as number[]);
    if (invalid.length > 0) { setErrorRows(invalid); return; }

    const newData = { ...data };
    const idKey = EXCEL_STRUCTURE[modalTab][0];
    if (isEditMode) (newData[modalTab] as any[]) = (newData[modalTab] as any[]).map(r => r[idKey] === originalRecordToUpdate[idKey] ? editingRows[0] : r);
    else (newData[modalTab] as any[]) = [...(newData[modalTab] as any[]), ...editingRows];
    
    setData(newData);
    setIsModalOpen(false);
  };

  const renderCellContent = (row: any, col: string) => {
    const value = row[col];
    if (col === '密码') {
      const show = showPasswords[row[idColumn]];
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400">{show ? String(value) : '••••••••'}</span>
          <button onClick={() => setShowPasswords(p => ({...p, [row[idColumn]]: !show}))} className="p-1 text-slate-300 hover:text-blue-500 transition-colors"><Eye size={14} /></button>
        </div>
      );
    }
    if (col === idColumn) return <span className="font-mono text-[10px] xl:text-[12px] bg-slate-900/5 px-3 py-1.5 rounded-xl text-slate-500 font-black tracking-widest">{String(value)}</span>;
    
    // TYPE-BASED COLOR DISPLAY IN TABLE
    if (activeTab === '账户' && col === '账户昵称') {
      const inst = data.机构.find(i => i.机构ID === row.机构ID || i.机构名称 === row.机构名称);
      const typeStr = inst?.机构类型 || '其他';
      const color = TYPE_COLOR_MAP[typeStr] || generateColorFromType(typeStr);
      return (
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm" style={{ backgroundColor: color }}>{String(value)[0]}</div>
          <span className="font-bold text-slate-800 text-sm xl:text-xl truncate max-w-[300px]">{String(value)}</span>
        </div>
      );
    }
    if (activeTab === '固定资产' && col === '资产昵称') {
      const typeStr = row.固定资产类型 || '其他';
      const color = TYPE_COLOR_MAP[typeStr] || generateColorFromType(typeStr);
      return (
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm" style={{ backgroundColor: color }}>{String(value)[0]}</div>
          <span className="font-bold text-slate-800 text-sm xl:text-xl truncate max-w-[300px]">{String(value)}</span>
        </div>
      );
    }

    if (col === '代表色HEX') return <div className="flex items-center gap-2"><div className="w-5 h-5 rounded border" style={{ backgroundColor: String(value || '#ccc') }}></div><span className="font-mono text-[11px] text-slate-400">{String(value || '#—')}</span></div>;
    if (typeof value === 'number') return <span className="font-black text-slate-800 text-sm xl:text-2xl tracking-tighter">{value.toLocaleString()}</span>;
    return <span className="font-bold text-slate-600 text-sm xl:text-xl truncate max-w-[400px] block">{value !== null && value !== undefined ? String(value) : '—'}</span>;
  };

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/40 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-lg w-full xl:w-auto overflow-x-auto no-scrollbar">
          {masterTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 xl:flex-none px-6 xl:px-10 py-4 rounded-[24px] text-[10px] xl:text-xs font-black uppercase tracking-widest transition-all duration-500 ${activeTab === tab ? 'bg-slate-900 text-white shadow-2xl scale-[1.02]' : 'text-slate-400 hover:text-slate-800'}`}>{tab}</button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 xl:min-w-[600px]">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input type="text" placeholder={isZh ? `搜索 ${activeTab}...` : `Search ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white/40 border border-white/60 rounded-[32px] outline-none font-bold text-slate-700 text-sm xl:text-xl transition-all shadow-inner" />
          </div>
          <button onClick={openAddModal} className="px-12 py-5 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-widest text-xs xl:text-base hover:bg-blue-700 shadow-xl flex items-center justify-center gap-4"><Plus size={24} strokeWidth={3} /> {isZh ? '新增' : 'ADD'}</button>
        </div>
      </div>

      <div className="glass-card rounded-[48px] border border-white/60 shadow-2xl overflow-hidden relative">
        <div ref={topScrollRef} onScroll={onTopScroll} className="overflow-x-auto custom-scrollbar-wide bg-slate-50/20 border-b border-white/10"><div style={{ width: tableContainerRef.current?.scrollWidth || '100%', height: '1px' }}></div></div>
        <div ref={tableContainerRef} onScroll={onTableScroll} className="overflow-x-auto custom-scrollbar-wide">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-white/40 backdrop-blur-3xl sticky top-0 z-10">
              <tr>
                {EXCEL_STRUCTURE[activeTab].map(col => <th key={col} className="px-12 py-10 text-[9px] xl:text-base font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/30 whitespace-nowrap">{col}</th>)}
                <th className="px-12 py-10 text-[9px] xl:text-base font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/30 text-center w-48">{isZh ? '操作' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/60 transition-all duration-500 group">
                  {EXCEL_STRUCTURE[activeTab].map(col => <td key={col} className="px-12 py-8 xl:py-12">{renderCellContent(row, col)}</td>)}
                  <td className="px-12 py-8 xl:py-12">
                    <div className="flex justify-center gap-5">
                      <button onClick={() => openEditModal(row)} className="w-12 h-12 xl:w-16 xl:h-16 bg-emerald-50 shadow-sm border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(idColumn, row[idColumn])} className="w-12 h-12 xl:w-16 xl:h-16 bg-rose-50 shadow-sm border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in-95 duration-500">
          <div className="glass-card rounded-[48px] shadow-4xl w-full max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden bg-white">
             <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                <div><h3 className="text-2xl font-black tracking-tighter">{isEditMode ? '编辑节点' : '新增记录'}</h3></div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
             </header>
             <div className="flex-1 overflow-auto p-10 bg-slate-50/20 custom-scrollbar-wide">
                <table className="w-full text-left">
                  <thead><tr>{EXCEL_STRUCTURE[modalTab].map(col => <th key={col} className="px-4 pb-4 text-[10px] font-black uppercase text-slate-400">{col}</th>)}</tr></thead>
                  <tbody>{editingRows.map((row, idx) => (
                    <tr key={idx}>
                      {EXCEL_STRUCTURE[modalTab].map(col => {
                        const isId = col === idColumn;
                        const isLink = !!linkedFieldsMapping[col];
                        return (
                          <td key={col} className="px-2 py-4">
                            <input value={row[col] || ''} onChange={(e) => updateEditingRow(idx, col, e.target.value)} className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none ${isId ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} readOnly={isId} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}</tbody>
                </table>
             </div>
             <footer className="px-10 py-8 border-t flex justify-end gap-4"><button onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl font-black uppercase text-[10px] text-slate-400">取消</button><button onClick={handleSaveModal} className="px-12 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">确认</button></footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataView;
