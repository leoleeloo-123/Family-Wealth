
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

// 高品质矢量 Logo 组件，完美复刻用户提供的钱包金币造型
const BrandLogoSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 金币 */}
    <circle cx="55" cy="30" r="18" fill="#FACC15" />
    <text x="55" y="37" fill="white" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">$</text>
    
    {/* 钱包主体 */}
    <rect x="15" y="42" width="70" height="48" rx="8" fill="#134E4A" />
    <rect x="15" y="48" width="62" height="38" rx="6" fill="#F8FAFC" />
    
    {/* 钱包锁扣 */}
    <rect x="58" y="58" width="28" height="22" rx="6" fill="#4ADE80" />
    <circle cx="68" cy="69" r="3.5" fill="white" />
  </svg>
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
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={26} /> },
    { id: 'Records', label: 'Records', icon: <History size={26} /> },
    { id: 'MasterData', label: 'Master Data', icon: <Database size={26} /> },
    { id: 'DataManagement', label: 'Data Management', icon: <FileSpreadsheet size={26} /> },
    { id: 'Settings', label: 'Settings', icon: <SettingsIcon size={26} /> },
  ];

  return (
    <AppContext.Provider value={{ data, setData, settings, setSettings, generateId }}>
      <div className={`flex h-screen ${settings.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} border-r transition-all duration-300 flex flex-col ${settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-xl z-20'}`}>
          <div className="p-6 flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-4 overflow-hidden">
              {/* Logo 容器：固定宽高比例，防止挤压 */}
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center relative">
                {/* 总是渲染矢量 Logo 作为底色/兜底 */}
                {!useExternalLogo && <BrandLogoSVG />}
                
                {/* 尝试加载外部 logo.png */}
                <img 
                  src="logo.png" 
                  alt="Family Assets Logo" 
                  className={`max-w-full max-h-full object-contain absolute inset-0 transition-opacity duration-300 ${useExternalLogo ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setUseExternalLogo(true)}
                  onError={() => setUseExternalLogo(false)}
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
          
          <nav className="flex-1 px-4 space-y-4 mt-12">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/40 translate-x-1' 
                    : settings.theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className={`transition-transform duration-200 flex-shrink-0 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                {isSidebarOpen && <span className="ml-5 font-black text-[18px] tracking-tight whitespace-nowrap">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-8 border-t border-gray-100/50">
            <div className={`p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all duration-300 ${!isSidebarOpen ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 text-center">Protocol Active</p>
              <p className="text-[11px] font-bold text-slate-600 text-center uppercase tracking-widest">v1.3.0 Stable</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          <header className={`h-24 flex items-center px-12 border-b ${settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-0.5">Navigation Control</span>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{menuItems.find(m => m.id === activeTab)?.label}</h2>
             </div>
             
             <div className="ml-auto flex items-center gap-10">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-1">Base Currency</span>
                  <span className="text-base font-black text-blue-600 tracking-wider">{settings.baseCurrency}</span>
                </div>
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-blue-600/30">
                  {settings.baseCurrency.slice(0,1)}
                </div>
             </div>
          </header>
          
          <div className="flex-1 overflow-auto p-12">
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
