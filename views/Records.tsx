import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const RecordsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData, settings } = context;

  const [activeType, setActiveType] = useState<'liquid' | 'fixed' | 'loan'>('liquid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filteredRecords = useMemo(() => {
    switch(activeType) {
      case 'liquid':
        return data.流动资产记录.filter(r => 
          String(r.账户昵称 || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(r.市值备注 || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      case 'fixed':
        return data.固定资产记录.filter(r => 
          String(r.资产昵称 || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
      case 'loan':
        return data.借入借出记录.filter(r => 
          String(r.借款对象 || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(r.成员昵称 || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
    }
  }, [data, activeType, searchTerm]);

  const handleDelete = (index: number) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    const newData = { ...data };
    if (activeType === 'liquid') newData.流动资产记录.splice(index, 1);
    else if (activeType === 'fixed') newData.固定资产记录.splice(index, 1);
    else if (activeType === 'loan') newData.借入借出记录.splice(index, 1);
    setData(newData);
  };

  const renderVal = (val: any) => {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-white p-1 rounded-lg border border-gray-200">
          <button 
            onClick={() => setActiveType('liquid')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeType === 'liquid' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-50'}`}
          >
            Liquid Assets
          </button>
          <button 
            onClick={() => setActiveType('fixed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeType === 'fixed' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-50'}`}
          >
            Fixed Assets
          </button>
          <button 
            onClick={() => setActiveType('loan')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeType === 'loan' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-50'}`}
          >
            Lend/Borrow
          </button>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md">
            <Plus size={18} /> Add Record
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {activeType === 'liquid' && (
              <tr>
                <th className="px-6 py-4 border-b">Account</th>
                <th className="px-6 py-4 border-b">Time</th>
                <th className="px-6 py-4 border-b text-right">Value (Orig)</th>
                <th className="px-6 py-4 border-b text-right">Base {renderVal(settings.baseCurrency)}</th>
                <th className="px-6 py-4 border-b">Remarks</th>
                <th className="px-6 py-4 border-b text-center">Actions</th>
              </tr>
            )}
            {activeType === 'fixed' && (
              <tr>
                <th className="px-6 py-4 border-b">Asset</th>
                <th className="px-6 py-4 border-b">Time</th>
                <th className="px-6 py-4 border-b text-right">Valuation</th>
                <th className="px-6 py-4 border-b">Remarks</th>
                <th className="px-6 py-4 border-b text-center">Actions</th>
              </tr>
            )}
            {activeType === 'loan' && (
              <tr>
                <th className="px-6 py-4 border-b">Member</th>
                <th className="px-6 py-4 border-b">Type</th>
                <th className="px-6 py-4 border-b">Counterparty</th>
                <th className="px-6 py-4 border-b text-right">Amount</th>
                <th className="px-6 py-4 border-b">Settled?</th>
                <th className="px-6 py-4 border-b text-center">Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.map((record, i) => (
              <tr key={i} className="hover:bg-gray-50 text-sm transition-colors">
                {activeType === 'liquid' && (
                  <>
                    <td className="px-6 py-4 font-medium">{renderVal((record as any).账户昵称)}</td>
                    <td className="px-6 py-4 text-gray-500">{renderVal((record as any).时间)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {Number((record as any).市值 || 0).toLocaleString()} {renderVal((record as any).币种)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-blue-600">--</td>
                    <td className="px-6 py-4 text-gray-400 truncate max-w-xs">{renderVal((record as any).市值备注)}</td>
                  </>
                )}
                {activeType === 'fixed' && (
                  <>
                    <td className="px-6 py-4 font-medium">{renderVal((record as any).资产昵称)}</td>
                    <td className="px-6 py-4 text-gray-500">{renderVal((record as any).时间)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {Number((record as any).估值 || 0).toLocaleString()} {renderVal((record as any).币种)}
                    </td>
                    <td className="px-6 py-4 text-gray-400 truncate max-w-xs">{renderVal((record as any).估值备注)}</td>
                  </>
                )}
                {activeType === 'loan' && (
                  <>
                    <td className="px-6 py-4 font-medium">{renderVal((record as any).成员昵称)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${renderVal((record as any).借入借出) === '借出' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {renderVal((record as any).借入借出)}
                      </span>
                    </td>
                    <td className="px-6 py-4">{renderVal((record as any).借款对象)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {Number((record as any).借款额 || 0).toLocaleString()} {renderVal((record as any).币种)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold ${renderVal((record as any).结清) === '是' ? 'text-green-600' : 'text-orange-500'}`}>
                        {renderVal((record as any).结清) === '是' ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </>
                )}
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(i)} className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold">Add New Record</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm italic border border-blue-100">
                Data management is prioritized via Excel synchronization. For bulk additions, update your spreadsheet and use "Data Management" → "Import".
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end">
              <button onClick={() => setIsAdding(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsView;