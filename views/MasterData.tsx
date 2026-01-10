
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Plus, Search, MoreVertical, Trash2, Eye, EyeOff } from 'lucide-react';
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
          <span>{showPass ? String(value) : '••••••••'}</span>
          <button 
            onClick={() => setShowPasswords(prev => ({ ...prev, [row[idColumn]]: !showPass }))}
            className="text-slate-400 hover:text-blue-500"
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      );
    }

    if (col.includes('ID')) {
      return (
        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
          {String(value)}
        </span>
      );
    }

    if (value instanceof Date) return value.toLocaleDateString();
    return value !== null && value !== undefined ? String(value) : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {masterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl"
          />
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700">
          <Plus size={20} /> New {activeTab}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {EXCEL_STRUCTURE[activeTab].map(col => (
                  <th key={col} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{col}</th>
                ))}
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {EXCEL_STRUCTURE[activeTab].map(col => (
                    <td key={col} className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {renderCellContent(row, col)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleDelete(idColumn, row[idColumn])}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterDataView;
