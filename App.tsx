
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Database, 
  Settings as SettingsIcon, 
  FileSpreadsheet, 
  Menu,
  X,
  Globe
} from 'lucide-react';
import { AppData, AppSettings } from './types.ts';
import { INITIAL_APP_DATA } from './constants.tsx';
import DashboardView from './views/Dashboard.tsx';
import RecordsView from './views/Records.tsx';
import MasterDataView from './views/MasterData.tsx';
import DataManagementView from './views/DataManagement.tsx';
import SettingsView from './views/Settings.tsx';

const BrandLogoSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <circle cx="55" cy="30" r="18" fill="url(#coinGrad)" />
    <text x="55" y="37" fill="white" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">$</text>
    <rect x="15" y="42" width="70" height="48" rx="12" fill="#0F172A" />
    <rect x="15" y="48" width="62" height="38" rx="10" fill="rgba(255,255,255,0.9)" />
    <rect x="58" y="58" width="28" height="22" rx="8" fill="#10B981" />
    <circle cx="68" cy="69" r="3.5" fill="white" />
  </svg>
);

const NavItem: React.FC<{ 
  item: any; 
  activeTab: string; 
  setActiveTab: (tab: any) => void; 
  theme: 'light' | 'dark'; 
  isSidebarOpen: boolean; 
}> = ({ item, activeTab, setActiveTab, theme, isSidebarOpen }) => (
  <button
    onClick={() => setActiveTab(item.id as any)}
    className={`w-full flex items-center p-4 rounded-2xl transition-all duration-300 group mb-3 ${
      activeTab === item.id 
        ? 'bg-blue-600/90 text-white shadow-xl shadow-blue-500/30 scale-[1.02] backdrop-blur-md' 
        : 'hover:bg-white/40 text-slate-700 hover:text-slate-900'
    }`}
  >
    <div className={`transition-transform duration-500 ${activeTab === item.id ? 'rotate-[10deg]' : 'group-hover:scale-110'}`}>
      {item.icon}
    </div>
    {isSidebarOpen && <span className="ml-5 font-black text-[17px] tracking-tight">{item.label}</span>}
  </button>
);

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
  const [useExternalLogo, setUseExternalLogo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('family_asset_data');
    if (saved) try { setData(JSON.parse(saved)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { localStorage.setItem('family_asset_data', JSON.stringify(data)); }, [data]);

  const generateId = useCallback((p: string) => `${p}-${Date.now().toString().slice(-6)}`, []);

  const mainMenuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={24} strokeWidth={2.5} /> },
    { id: 'Records', label: 'Records', icon: <History size={24} strokeWidth={2.5} /> },
    { id: 'MasterData', label: 'Master Data', icon: <Database size={24} strokeWidth={2.5} /> },
    { id: 'DataManagement', label: 'Data Management', icon: <FileSpreadsheet size={24} strokeWidth={2.5} /> },
  ];

  return (
    <AppContext.Provider value={{ data, setData, settings, setSettings, generateId }}>
      <div className="flex h-screen w-full p-4 gap-4 overflow-hidden">
        {/* Glass Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} glass-sidebar rounded-[32px] transition-all duration-500 flex flex-col shadow-2xl relative z-30`}>
          <div className="p-8 flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center relative">
                {!useExternalLogo && <BrandLogoSVG />}
                <img src="logo.png" alt="L" className={`max-w-full max-h-full object-contain absolute inset-0 transition-opacity ${useExternalLogo ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setUseExternalLogo(true)} onError={() => setUseExternalLogo(false)} />
              </div>
              <h1 className={`font-black text-2xl tracking-tighter text-slate-800 transition-all duration-500 ${!isSidebarOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
                Assets
              </h1>
            </div>
          </div>
          
          <nav className="flex-1 px-5 mt-4 overflow-y-auto">
            {mainMenuItems.map((item) => (
              <NavItem key={item.id} item={item} activeTab={activeTab} setActiveTab={setActiveTab} theme={settings.theme} isSidebarOpen={isSidebarOpen} />
            ))}
          </nav>

          <div className="p-5 mt-auto flex flex-col gap-4">
            <NavItem item={{ id: 'Settings', label: 'Settings', icon: <SettingsIcon size={24} strokeWidth={2.5} /> }} activeTab={activeTab} setActiveTab={setActiveTab} theme={settings.theme} isSidebarOpen={isSidebarOpen} />
            <div className={`p-4 rounded-3xl bg-white/30 text-center transition-all ${!isSidebarOpen ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol v2.0</p>
            </div>
          </div>

          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute -right-3 top-20 bg-white/80 backdrop-blur-md border border-white/40 rounded-full p-1 shadow-lg text-slate-400 hover:text-blue-600 transition-colors z-50">
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </aside>

        {/* Main Glass Content */}
        <main className="flex-1 flex flex-col glass-card rounded-[40px] overflow-hidden relative z-20">
          <header className="h-20 flex items-center px-12 border-b border-white/20 bg-white/10 flex-shrink-0">
             <h2 className="text-2xl font-black text-slate-800 tracking-tight drop-shadow-sm">
               {activeTab === 'Settings' ? 'Settings' : mainMenuItems.find(m => m.id === activeTab)?.label}
             </h2>
             
             <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-3 px-5 py-2.5 bg-white/40 border border-white/60 rounded-2xl text-slate-600 shadow-sm">
                  <Globe size={18} className="text-blue-500" />
                  <span className="text-sm font-black tracking-widest">{settings.baseCurrency}</span>
                </div>
             </div>
          </header>
          
          <div className="flex-1 overflow-auto p-12 custom-scrollbar">
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
