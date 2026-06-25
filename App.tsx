import React, { useState, useEffect } from 'react';
import { PenTool, Calculator, Library, LogOut, Users } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import IsoSketcher from './components/Sketch/IsoSketcher';
import CalculatorHub from './components/Calculators/CalculatorHub';
import FormulaGallery from './components/Reference/FormulaGallery';
import Login from './components/Auth/Login';
import UserManager from './components/Admin/UserManager';
import AppErrorBoundary from './components/Common/AppErrorBoundary';

enum View {
  SKETCH = 'SKETCH',
  CALC = 'CALC',
  GALLERY = 'GALLERY',
  ADMIN = 'ADMIN'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.SKETCH);
  const [user, setUser] = useState<any>(null);

  // Check local storage for saved session on load
  useEffect(() => {
    const savedUser = localStorage.getItem('tubista_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    localStorage.setItem('tubista_user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao deslogar do Firebase:", error);
    }
    setUser(null);
    localStorage.removeItem('tubista_user');
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const NavButton = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center justify-center p-2 w-full transition-colors ${
        currentView === view ? 'text-safety-yellow bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon size={24} />
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-10 shrink-0">
        <h1 className="font-bold text-lg flex items-center gap-2 text-zinc-100">
          <span className="bg-safety-yellow text-black px-2 py-0.5 rounded font-black">TP</span>
          Tubista Pro
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-400 hidden sm:block">
            <span className="font-bold text-slate-300">{user.NOME}</span>
            {user.ADMINISTRADOR === "Sim" && <span className="ml-2 bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Admin</span>}
          </div>
          {user.ADMINISTRADOR === "Sim" && (
            <button onClick={() => setCurrentView(View.ADMIN)} className={`text-slate-400 hover:text-safety-yellow transition-colors ${currentView === View.ADMIN ? 'text-safety-yellow' : ''}`} title="Gerenciar Usuários">
              <Users size={18} />
            </button>
          )}
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-black">
        <AppErrorBoundary>
          {/* IsoSketcher is kept mounted but hidden to preserve state */}
          <div className="w-full h-full" style={{ display: currentView === View.SKETCH ? 'block' : 'none' }}>
            <IsoSketcher />
          </div>
          
          {/* Other components are mounted conditionally */}
          {currentView === View.CALC && <CalculatorHub />}
          {currentView === View.GALLERY && <FormulaGallery />}
          {currentView === View.ADMIN && user.ADMINISTRADOR === "Sim" && <UserManager onBack={() => setCurrentView(View.SKETCH)} />}
        </AppErrorBoundary>
      </main>

      {/* Bottom Navigation */}
      <nav className="h-16 bg-zinc-900 border-t border-zinc-800 flex justify-around items-center shrink-0 z-20 pb-safe">
        <NavButton view={View.SKETCH} icon={PenTool} label="Croqui" />
        <NavButton view={View.CALC} icon={Calculator} label="Cálculos" />
        <NavButton view={View.GALLERY} icon={Library} label="Galeria" />
      </nav>
    </div>
  );
};

export default App;
