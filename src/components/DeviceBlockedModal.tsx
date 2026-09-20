import React from 'react';
import { ShieldAlert, Lock, Laptop, ArrowLeft, ExternalLink } from 'lucide-react';
import { getOrCreateDeviceId, BLOCKED_DEVICE_MESSAGE } from '../services/firebaseAuth';

interface DeviceBlockedModalProps {
  message?: string;
  onClose: () => void;
}

export const DeviceBlockedModal: React.FC<DeviceBlockedModalProps> = ({
  message = BLOCKED_DEVICE_MESSAGE,
  onClose,
}) => {
  const currentDeviceId = getOrCreateDeviceId();

  return (
    <div
      id="modal-dispositivo-bloqueado"
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-200"
    >
      <div
        id="tarjeta-dispositivo-bloqueado"
        className="w-full max-w-md bg-stone-900 border-2 border-rose-500/70 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl shadow-rose-950/60 relative overflow-hidden"
      >
        {/* Resplandor ambiental de advertencia */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Icono de Candado / Seguridad */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20 animate-pulse">
          <Lock className="w-8 h-8 text-rose-400 stroke-[2.5]" />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Textos Principales */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span>Dispositivo No Autorizado</span>
          </div>

          <h3 className="text-2xl font-black text-white font-cinzel tracking-tight">
            Acceso Restringido
          </h3>

          <p className="text-xs sm:text-sm text-rose-200 font-medium leading-relaxed px-1">
            {message}
          </p>
        </div>

        {/* Información Técnica de Hardware / Navegador */}
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 text-left space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-stone-300 font-semibold">
            <Laptop className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Huella de este navegador (Device ID):</span>
          </div>

          <div className="bg-stone-900 px-3 py-2 rounded-xl border border-stone-800 font-mono text-[11px] text-amber-300 truncate select-all">
            {currentDeviceId}
          </div>

          <p className="text-[11px] text-stone-400 leading-normal pt-1">
            Esta licencia fue activada y anclada a otro equipo o navegador. Para salvaguardar los derechos de autor y licencias docentes, no está permitido el uso simultáneo o transferencia no autorizada entre equipos.
          </p>
        </div>

        {/* Acciones */}
        <div className="pt-2 flex flex-col gap-2.5">
          <button
            id="btn-cerrar-modal-bloqueo"
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-5 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Entendido / Volver al Inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
