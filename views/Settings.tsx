
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Moon, Sun, Type, Globe, Clock, ShieldAlert } from 'lucide-react';
import { BASE_CURRENCIES } from '../constants';

const SettingsView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { settings, setSettings, setData } = context;

  const handleClearData = () => {
    if (window.confirm("CRITICAL: This will wipe all current data in the application. Ensure you have an Excel backup. Continue?")) {
      setData({
        成员: [], 机构: [], 手机: [], 账户: [], 保险: [], 汇率: [], 固定资产: [],
        流动资产记录: [], 固定资产记录: [], 借入借出记录: [], 企业分红记录: []
      });
      localStorage.removeItem('family_asset_data');
      alert("All data cleared.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* UI & Theme */}
      <section className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
        <h3 className="text-xl font-bold">Preferences</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Sun size={18} className="text-orange-500" /> Appearance
            </label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button 
                onClick={() => setSettings({...settings, theme: 'light'})}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${settings.theme === 'light' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
              >
                Light
              </button>
              <button 
                onClick={() => setSettings({...settings, theme: 'dark'})}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${settings.theme === 'dark' ? 'bg-slate-800 shadow text-white' : 'text-gray-500'}`}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Globe size={18} className="text-blue-500" /> Base Currency
            </label>
            <select 
              value={settings.baseCurrency}
              onChange={(e) => setSettings({...settings, baseCurrency: e.target.value})}
              className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              {BASE_CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Type size={18} className="text-emerald-500" /> Font Size
            </label>
            <select 
              value={settings.fontSize}
              onChange={(e) => setSettings({...settings, fontSize: e.target.value as any})}
              className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              <option value="small">Small (Condensed)</option>
              <option value="medium">Medium (Standard)</option>
              <option value="large">Large (Comfortable)</option>
            </select>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Clock size={18} className="text-purple-500" /> Date Format
            </label>
            <select 
              value={settings.dateFormat}
              onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
              className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50 p-8 rounded-2xl border border-red-200 space-y-4">
        <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
          <ShieldAlert size={24} /> Danger Zone
        </h3>
        <p className="text-red-600 text-sm">These actions are permanent and cannot be undone within the application.</p>
        <button 
          onClick={handleClearData}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all"
        >
          Reset All Local Data
        </button>
      </section>

      <footer className="text-center text-sm text-gray-400">
        Family Asset Management System - Local Only Browser Instance
      </footer>
    </div>
  );
};

export default SettingsView;
