
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
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'Records', label: 'Records', icon: <History size={20} /> },
    { id: 'MasterData', label: 'Master Data', icon: <Database size={20} /> },
    { id: 'DataManagement', label: 'Data Management', icon: <FileSpreadsheet size={20} /> },
    { id: 'Settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
  ];

  return (
    <AppContext.Provider value={{ data, setData, settings, setSettings, generateId }}>
      <div className={`flex h-screen ${settings.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} border-r transition-all duration-300 flex flex-col ${settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="p-4 flex items-center justify-between">
            <h1 className={`font-bold text-xl truncate ${!isSidebarOpen && 'hidden'}`}>Family Assets</h1>
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <nav className="flex-1 px-2 space-y-2 mt-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : settings.theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                }`}
              >
                {item.icon}
                {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
            {isSidebarOpen ? 'v1.0 Local Only' : 'v1.0'}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className={`h-16 flex items-center px-8 border-b ${settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
             <h2 className="text-lg font-semibold">{menuItems.find(m => m.id === activeTab)?.label}</h2>
             <div className="ml-auto flex items-center gap-4">
                <div className="text-sm font-medium px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                  Base: {settings.baseCurrency}
                </div>
             </div>
          </header>
          
          <div className="flex-1 overflow-auto p-8">
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
