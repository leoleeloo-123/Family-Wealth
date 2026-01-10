
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Database, 
  Settings as SettingsIcon, 
  FileSpreadsheet, 
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Building2,
  Smartphone,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { AppData, AppSettings, TabName } from './types.ts';
import { INITIAL_APP_DATA } from './constants.tsx';
import DashboardView from './views/Dashboard.tsx';
import RecordsView from './views/Records.tsx';
import MasterDataView from './views/MasterData.tsx';
import DataManagementView from './views/DataManagement.tsx';
import SettingsView from './views/Settings.tsx';

// Global Context for easier state access
interface AppContextType {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  generateId: (prefix: string) => string;
}

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(INITIAL_APP_DATA);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Records' | 'MasterData' | 'DataManagement' | 'Settings'>('Dashboard');
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    baseCurrency: 'CNY',
    fontSize: 'medium',
    dateFormat: 'YYYY-MM-DD'
  });
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Persistence (mocked local storage for refresh safety)
  useEffect(() => {
    const saved = localStorage.getItem('family_asset_data');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('family_asset_data', JSON.stringify(data));
  }, [data]);

  const generateId = useCallback((prefix: string) => {
    return `${prefix}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
  }, []);

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={24} /> },
    { id: 'Records', label: 'Records', icon: <History size={24} /> },
    { id: 'MasterData', label: 'Master Data', icon: <Database size={24} /> },
    { id: 'DataManagement', label: 'Data Management', icon: <FileSpreadsheet size={24} /> },
    { id: 'Settings', label: 'Settings', icon: <SettingsIcon size={24} /> },
  ];

  return (
    <AppContext.Provider value={{ data, setData, settings, setSettings, generateId }}>
      <div className={`flex h-screen ${settings.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} border-r transition-all duration-300 flex flex-col ${settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="p-6 flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-blue-50 rounded-2xl overflow-hidden shadow-sm border border-blue-100/50">
                <img 
                  src="logo.png" 
                  alt="Logo" 
                  className="w-10 h-10 object-contain" 
                  onError={(e) => {
                    // Fallback to an icon if logo.png is missing
                    e.currentTarget.parentElement!.innerHTML = '<div class="text-blue-600 font-black text-xl">FA</div>';
                  }}
                />
              </div>
              <h1 className={`font-black text-2xl tracking-tighter text-slate-900 truncate transition-all duration-300 ${!isSidebarOpen ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'}`}>
                Family Assets
              </h1>
            </div>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          
          <nav className="flex-1 px-4 space-y-3 mt-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 translate-x-1' 
                    : settings.theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                {isSidebarOpen && <span className="ml-5 font-bold text-[17px] tracking-tight">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-8 border-t border-gray-100/50">
            <div className={`p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all duration-300 ${!isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Local Instance</p>
              <p className="text-[11px] font-bold text-slate-600">v1.0.4 Premium Edition</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className={`h-20 flex items-center px-10 border-b ${settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">{menuItems.find(m => m.id === activeTab)?.label}</h2>
             <div className="ml-auto flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Currency Protocol</span>
                  <span className="text-sm font-bold text-blue-600">{settings.baseCurrency} Active</span>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100 font-black text-xs shadow-sm">
                  {settings.baseCurrency.slice(0,1)}
                </div>
             </div>
          </header>
          
          <div className="flex-1 overflow-auto p-10">
            {activeTab === 'Dashboard' && <DashboardView />}
            {activeTab === 'Records' && <RecordsView />}
            {activeTab === 'MasterData' && <MasterDataView />}
            {activeTab === 'DataManagement' && <DataManagementView />}
            {activeTab === 'Settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;
