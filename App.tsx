
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
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="rgba(251, 191, 36, 0.15)" filter="blur(4px)" />
    <circle cx="50" cy="50" r="45" fill="url(#goldGrad)" stroke="#92400E" strokeWidth="0.5" />
    <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.9" />
        <stop offset="50%" stopColor="white" stopOpacity="0.1" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
    <text x="50" y="69" fill="#78350F" fontSize="62" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif" style={{ opacity: 0.4 }}>$</text>
    <text x="50" y="67" fill="white" fontSize="62" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}>$</text>
    <path d="M18 42 Q 50 15 82 42 Q 50 30 18 42 Z" fill="url(#highlightGrad)" opacity="0.7" />
  </svg>
);

const NavItem: React.FC<{ 
  item: any; 
  activeTab: string; 
  setActiveTab: (tab: any) => void; 
  isSidebarOpen: boolean; 
}> = ({ item, activeTab, setActiveTab, isSidebarOpen }) => (
  <button
    onClick={() => setActiveTab(item.id as any)}
    className={`w-full flex items-center transition-all duration-300 group mb-3 ${
      isSidebarOpen ? 'p-4 rounded-2xl' : 'p-0 h-16 w-16 mx-auto rounded-2xl justify-center'
    } ${
      activeTab === item.id 
        ? 'bg-blue-600/90 text-white shadow-xl shadow-blue-500/30 scale-[1.02] backdrop-blur-md' 
        : 'hover:bg-white/40 text-slate-700 hover:text-slate-900'
    }`}
  >
    <div className={`transition-transform duration-500 flex-shrink-0 ${activeTab === item.id ? 'rotate-[10deg]' : 'group-hover:scale-110'}`}>
      {item.icon}
    </div>
    {isSidebarOpen && (
      <span className="ml-5 font-black text-base md:text-lg lg:text-xl tracking-tight whitespace-nowrap transition-all duration-700 overflow-hidden">
        {item.label}
      </span>
    )}
  </button>
);

interface AppContextType {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  generateId: (prefix: string) => string;
  setActiveTab: (tab: 'Dashboard' | 'Records' | 'MasterData' | 'DataManagement' | 'Settings') => void;
}

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(INITIAL_APP_DATA);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Records' | 'MasterData' | 'DataManagement' | 'Settings'>('Dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('family_asset_settings');
    return saved ? JSON.parse(saved) : {
      theme: 'light',
      baseCurrency: 'CNY',
      fontSize: 'medium',
      dateFormat: 'YYYY-MM-DD',
      language: 'zh'
    };
  });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [useExternalLogo, setUseExternalLogo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('family_asset_data');
    if (saved) try { setData(JSON.parse(saved)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { localStorage.setItem('family_asset_data', JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem('family_asset_settings', JSON.stringify(settings)); }, [settings]);

  const generateId = useCallback((p: string) => `${p}-${Date.now().toString().slice(-6)}`, []);

  const mainMenuItems = [
    { id: 'Dashboard', label: settings.language === 'en' ? 'Dashboard' : '仪表盘', icon: <LayoutDashboard size={24} strokeWidth={2.5} /> },
    { id: 'Records', label: settings.language === 'en' ? 'Records' : '历史记录', icon: <History size={24} strokeWidth={2.5} /> },
    { id: 'MasterData', label: settings.language === 'en' ? 'Master Data' : '基础数据', icon: <Database size={24} strokeWidth={2.5} /> },
    { id: 'DataManagement', label: settings.language === 'en' ? 'Data Management' : '数据管理', icon: <FileSpreadsheet size={24} strokeWidth={2.5} /> },
    { id: 'Settings', label: settings.language === 'en' ? 'Settings' : '系统设置', icon: <SettingsIcon size={24} strokeWidth={2.5} /> },
  ];

  const fontSizeStyles = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.125rem'
  }[settings.fontSize];

  return (
    <AppContext.Provider value={{ data, setData, settings, setSettings, generateId, setActiveTab }}>
      <div 
        className="flex h-screen w-full p-4 gap-4 overflow-hidden transition-all duration-500"
        style={{ fontSize: fontSizeStyles }}
      >
        {/* Glass Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} glass-sidebar rounded-[32px] transition-all duration-500 flex flex-col shadow-2xl relative z-30`}>
          <div className="p-8 flex items-center overflow-hidden">
            <div className={`flex items-center transition-all duration-500 ${isSidebarOpen ? 'gap-4' : 'justify-center w-full'}`}>
              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center relative">
                {!useExternalLogo && <BrandLogoSVG />}
                <img src="logo.png" alt="L" className={`max-w-full max-h-full object-contain absolute inset-0 transition-opacity ${useExternalLogo ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setUseExternalLogo(true)} onError={() => setUseExternalLogo(false)} />
              </div>
              {isSidebarOpen && (
                <h1 className="font-black text-2xl md:text-3xl lg:text-3xl tracking-tighter text-slate-800 animate-in fade-in slide-in-from-left-4 duration-500 transition-all">
                  {settings.language === 'en' ? 'Assets' : '家庭资产'}
                </h1>
              )}
            </div>
          </div>
          
          <nav className={`flex-1 mt-4 overflow-y-auto ${isSidebarOpen ? 'px-5' : 'px-0'}`}>
            {mainMenuItems.map((item) => (
              <NavItem key={item.id} item={item} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} />
            ))}
          </nav>

          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute -right-3 top-20 bg-white/80 backdrop-blur-md border border-white/40 rounded-full p-1 shadow-lg text-slate-400 hover:text-blue-600 transition-colors z-50">
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </aside>

        {/* Main Glass Content */}
        <main className="flex-1 flex flex-col glass-card rounded-[40px] overflow-hidden relative z-20">
          <header className="h-28 md:h-32 flex items-center px-12 border-b border-white/20 bg-white/10 flex-shrink-0 transition-all duration-700">
             <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 tracking-tighter drop-shadow-sm leading-none transition-all duration-700 animate-in fade-in slide-in-from-left-8">
               {mainMenuItems.find(m => m.id === activeTab)?.label}
             </h2>
             
             <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-3 px-5 py-2.5 bg-white/40 border border-white/60 rounded-2xl text-slate-600 shadow-xl backdrop-blur-md">
                  <Globe size={18} className="text-blue-500" />
                  <span className="text-sm font-black tracking-[0.2em]">{settings.baseCurrency}</span>
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
