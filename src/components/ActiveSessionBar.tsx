import React from 'react';
import { LogOut, ShieldCheck, User } from 'lucide-react';
import { AuthSessionData } from '../services/firebaseAuth';

interface ActiveSessionBarProps {
  session: AuthSessionData | null;
  onLogout: () => void;
}

export const ActiveSessionBar: React.FC<ActiveSessionBarProps> = ({
  session,
  onLogout,
}) => {
  return (
    <header
      id="barra-sesion-activa"
      style={{ backgroundColor: '#0f172a', borderBottomColor: '#1e293b' }}
      className="w-full border-b px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs shrink-0 select-none z-40 relative backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 overflow-hidden text-slate-300">
        <span className="flex items-center gap-1 text-[#38bdf8] font-bold">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#38bdf8]" />
          <span className="hidden sm:inline">Suscripción Activa</span>
        </span>

        <span className="text-slate-600 hidden sm:inline">•</span>

        <div className="flex items-center gap-1 text-slate-400 truncate max-w-[200px] sm:max-w-xs">
          <User className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span className="truncate font-mono text-[11px] text-slate-200">
            {session?.identifier || 'Docente Autorizado'}
          </span>
        </div>
      </div>

      <button
        id="btn-cerrar-sesion-docente"
        type="button"
        onClick={onLogout}
        style={{ backgroundColor: '#ef4444' }}
        className="hover:bg-red-600 active:scale-95 text-white font-medium text-xs py-1 px-2.5 sm:px-3 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        title="Cerrar sesión y volver al modal de acceso"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Cerrar sesión / Salir</span>
      </button>
    </header>
  );
};
