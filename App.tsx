
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
    className={`flex items-center transition-all duration-300 group ${
      // Desktop Styles: Use flex-none to prevent vertical expansion
      'sm:flex-none sm:mb-2 ' + 
      (isSidebarOpen ? 'sm:px-6 sm:py-4 sm:rounded-2xl sm:w-full sm:justify-start' : 'sm:p-0 sm:h-14 sm:w-14 sm:mx-auto sm:rounded-xl sm:justify-center') +
      // Mobile Styles: Keep flex-1 for balanced bottom nav
      ' flex-1 flex-col sm:flex-row justify-center p-2 rounded-xl ' +
      // Active Styles
      (activeTab === item.id 
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 sm:scale-[1.02] backdrop-blur-md' 
        : 'hover:bg-white/40 text-slate-700 hover:text-slate-900')
    }`}
  >
    <div className={`transition-transform duration-500 flex-shrink-0 ${activeTab === item.id ? 'rotate-[10deg]' : 'group-hover:scale-110'}`}>
      {React.cloneElement(item.icon, { size: 20, className: 'sm:w-6 sm:h-6' })}
    </div>
    
    <span className={`sm:ml-5 font-black text-[10px] sm:text-sm md:text-base lg:text-lg tracking-tight whitespace-nowrap transition-all duration-700 overflow-hidden text-center sm:text-left ${
      !isSidebarOpen ? 'sm:hidden' : 'block'
    }`}>
      {item.label}
    </span>
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
    { id: 'Dashboard', label: settings.language === 'en' ? 'Dashboard' : '仪表盘', icon: <LayoutDashboard strokeWidth={2.5} /> },
    { id: 'Records', label: settings.language === 'en' ? 'Records' : '历史记录', icon: <History strokeWidth={2.5} /> },
    { id: 'MasterData', label: settings.language === 'en' ? 'Master Data' : '基础数据', icon: <Database strokeWidth={2.5} /> },
    { id: 'DataManagement', label: settings.language === 'en' ? 'Data Management' : '数据管理', icon: <FileSpreadsheet strokeWidth={2.5} /> },
    { id: 'Settings', label: settings.language === 'en' ? 'Settings' : '系统设置', icon: <SettingsIcon strokeWidth={2.5} /> },
  ];

  const fontSizeStyles = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.125rem'
  }[settings.fontSize];

  return (
    <AppContext.Provider value={{ data, setData, settings, setSettings, generateId, setActiveTab }}>
      <div 
        className="flex flex-col-reverse sm:flex-row h-screen w-full p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden transition-all duration-500"
        style={{ fontSize: fontSizeStyles }}
      >
        {/* Glass Navigation - Adaptive Sidebar/BottomBar */}
        <aside className={`${
          isSidebarOpen ? 'sm:w-80' : 'sm:w-24'
        } w-full flex-shrink-0 glass-sidebar rounded-[24px] sm:rounded-[32px] transition-all duration-500 flex flex-row sm:flex-col shadow-2xl relative z-30`}>
          
          <div className="hidden sm:flex p-8 items-center overflow-hidden">
            <div className={`flex items-center transition-all duration-500 ${isSidebarOpen ? 'gap-4' : 'justify-center w-full'}`}>
              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center relative">
                {!useExternalLogo && <BrandLogoSVG />}
                <img src="logo.png" alt="L" className={`max-w-full max-h-full object-contain absolute inset-0 transition-opacity ${useExternalLogo ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setUseExternalLogo(true)} onError={() => setUseExternalLogo(false)} />
              </div>
              {isSidebarOpen && (
                <h1 className="font-black text-2xl tracking-tighter text-slate-800 animate-in fade-in slide-in-from-left-4 duration-500">
                  {settings.language === 'en' ? 'Assets' : '家庭资产'}
                </h1>
              )}
            </div>
          </div>
          
          {/* Vertical items on desktop (sm:justify-start), horizontal on mobile (justify-around) */}
          <nav className={`flex-1 flex flex-row sm:flex-col items-center justify-around sm:justify-start sm:mt-2 p-2 sm:p-4 overflow-x-auto no-scrollbar`}>
            {mainMenuItems.map((item) => (
              <NavItem key={item.id} item={item} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} />
            ))}
          </nav>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="hidden sm:block absolute -right-3 top-24 bg-white/80 backdrop-blur-md border border-white/40 rounded-full p-1.5 shadow-lg text-slate-400 hover:text-blue-600 transition-colors z-50"
          >
            {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </aside>

        <main className="flex-1 flex flex-col glass-card rounded-[24px] sm:rounded-[40px] overflow-hidden relative z-20">
          <header className="h-20 sm:h-32 flex items-center px-6 sm:px-12 border-b border-white/20 bg-white/10 flex-shrink-0">
             <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black text-slate-800 tracking-tighter drop-shadow-sm leading-none animate-in fade-in slide-in-from-left-8">
               {mainMenuItems.find(m => m.id === activeTab)?.label}
             </h2>
          </header>
          
          <div className="flex-1 overflow-auto p-4 sm:p-12 custom-scrollbar">
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
