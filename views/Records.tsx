
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
    let source: any[] = [];
    if (activeType === 'liquid') source = data.流动资产记录;
    else if (activeType === 'fixed') source = data.固定资产记录;
    else source = data.借入借出记录;

    return source.filter(r => 
      Object.values(r).some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.时间).getTime() - new Date(a.时间).getTime());
  }, [data, activeType, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
        <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 shadow-sm">
          {['liquid', 'fixed', 'loan'].map((type) => (
            <button 
              key={type}
              onClick={() => setActiveType(type as any)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeType === type ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex gap-4 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all shadow-sm outline-none"
            />
          </div>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-black shadow-xl hover:scale-105 transition-all font-bold">
            <Plus size={20} /> New
          </button>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/60 overflow-hidden bg-white/30 backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/40 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/20">
              <tr>
                <th className="px-8 py-5">Item</th>
                <th className="px-8 py-5">Timestamp</th>
                <th className="px-8 py-5 text-right">Value</th>
                <th className="px-8 py-5">Notes</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 text-sm">
              {filteredRecords.map((r, i) => (
                <tr key={i} className="hover:bg-white/50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-800">{String((r as any).账户昵称 || (r as any).资产昵称 || (r as any).成员昵称)}</td>
                  <td className="px-8 py-5 text-slate-400 text-xs font-mono">{String((r as any).时间)}</td>
                  <td className="px-8 py-5 text-right font-black text-indigo-600 tracking-tight">
                    {Number((r as any).市值 || (r as any).估值 || (r as any).借款额 || 0).toLocaleString()} <span className="text-[10px] text-slate-300 font-normal">{String((r as any).币种)}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-500 text-xs truncate max-w-[200px] italic">"{String((r as any).市值备注 || (r as any).估值备注 || (r as any).借款备注 || '-')}"</td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 shadow-sm"><Edit2 size={14}/></button>
                      <button className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-red-600 shadow-sm"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-xl flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="bg-white/90 glass-card rounded-[40px] shadow-2xl w-full max-w-lg p-10 flex flex-col items-center text-center">
             <div className="w-20 h-20 bg-blue-100 rounded-[28px] flex items-center justify-center mb-6 text-blue-600"><Plus size={40} /></div>
             <h3 className="text-2xl font-black mb-4">Add Entry</h3>
             <p className="text-slate-500 mb-10 text-sm leading-relaxed">For consistent integrity, please use the Excel Import module to sync bulk records. Individual entry creation is coming in v2.1.</p>
             <button onClick={() => setIsAdding(false)} className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black tracking-widest uppercase text-xs hover:bg-black transition-all shadow-xl">Understood</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsView;
