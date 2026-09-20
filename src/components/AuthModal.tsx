import React, { useState } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  Calendar,
  CheckCircle2,
  ArrowRight,
  X
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import {
  db,
  AuthSessionData,
  getOrCreateDeviceId,
  redeemLicenseAndRegisterUser,
  loginWithEmailAndPassword,
  BLOCKED_DEVICE_MESSAGE,
} from '../services/firebaseAuth';

interface AuthModalProps {
  onSuccess: (session: AuthSessionData) => void;
  onClose?: () => void;
  onDeviceBlocked?: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  onClose,
  onDeviceBlocked,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'redeem'>('login');

  // Estado del flujo de canje
  const [redeemStep, setRedeemStep] = useState<'code' | 'register'>('code');
  const [licenseCode, setLicenseCode] = useState('');
  const [validCodeData, setValidCodeData] = useState<any>(null);
  const [expirationText, setExpirationText] = useState('');

  // Estados de registro de cuenta nueva
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Estados de login habitual
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estados de control
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PASO 1: Validar el código sin quemarlo todavía
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = licenseCode.replace(/\s+/g, '').toUpperCase();
    if (!sanitized) {
      setErrorMessage('Por favor, ingresa tu código de activación.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const currentDeviceId = getOrCreateDeviceId();
      const docRef = doc(db, 'suscripciones', sanitized);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setErrorMessage('El código ingresado no existe en el sistema.');
        setIsLoading(false);
        return;
      }

      const data = docSnap.data();

      // Verificar si ya fue utilizado o si está amarrado a otro dispositivo
      const linkedDevice = data.dispositivoVinculado || data.deviceIdAutorizado;
      if (linkedDevice && linkedDevice !== currentDeviceId) {
        setErrorMessage(BLOCKED_DEVICE_MESSAGE);
        if (onDeviceBlocked) {
          onDeviceBlocked(BLOCKED_DEVICE_MESSAGE);
        }
        setIsLoading(false);
        return;
      }

      // Verificar si ya fue utilizado
      if (data.activo === false || data.usado === true || (data.usadoPor && data.usadoPor.trim() !== '')) {
        setErrorMessage('Este código de activación ya fue utilizado o se encuentra inactivo.');
        setIsLoading(false);
        return;
      }

      // Calcular texto de vigencia
      const dias = data.duracionDias || 30;
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + dias);
      const fechaFormateada = fechaFin.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      setValidCodeData(data);
      setExpirationText(fechaFormateada);
      setRedeemStep('register');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // PASO 2: Registrar usuario, amarrar a este dispositivo físico y quemar código
  const handleRegisterAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await redeemLicenseAndRegisterUser(
      licenseCode,
      regEmail,
      regPassword
    );

    if (result.success && result.session) {
      onSuccess(result.session);
    } else {
      setErrorMessage(result.message || 'Error al registrar el acceso.');
      if (result.deviceBlocked && onDeviceBlocked) {
        onDeviceBlocked(result.message || BLOCKED_DEVICE_MESSAGE);
      }
    }
    setIsLoading(false);
  };

  // INICIO DE SESIÓN HABITUAL (Correo y contraseña con validación estricta de dispositivo)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginWithEmailAndPassword(loginEmail, loginPassword);

    if (result.success && result.session) {
      onSuccess(result.session);
    } else {
      setErrorMessage(result.message || 'Error de autenticación.');
      if (result.deviceBlocked && onDeviceBlocked) {
        onDeviceBlocked(result.message || BLOCKED_DEVICE_MESSAGE);
      }
    }
    setIsLoading(false);
  };

  return (
    <div
      id="modal-validacion-acceso"
      style={{ backgroundColor: '#0f172a' }}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto select-none backdrop-blur-md"
    >
      <div
        id="tarjeta-central-acceso"
        style={{ backgroundColor: '#1e293b' }}
        className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#334155] shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden transition-all"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-[#38bdf8] mb-4 shadow-inner">
          <ShieldCheck className="w-7 h-7 text-[#38bdf8]" />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-sky-500/10 text-[#38bdf8] border border-sky-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Acceso y Validación Docente</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
          Control de Acceso al Juego
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 mb-6 max-w-xs leading-relaxed">
          Ingresa con tus credenciales de docente o activa una nueva licencia institucional.
        </p>

        {/* Selector de Pestañas */}
        <div className="w-full grid grid-cols-2 p-1 bg-[#0f172a] rounded-xl border border-[#334155] mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-[#1e293b] text-white shadow-md border border-[#334155]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4 text-[#38bdf8]" />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('redeem');
              setRedeemStep('code');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'redeem'
                ? 'bg-[#1e293b] text-white shadow-md border border-[#334155]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4 text-[#38bdf8]" />
            <span>Canjear Licencia</span>
          </button>
        </div>

        {/* Mensaje de error */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-red-950/60 border border-red-700/80 rounded-xl text-red-200 text-xs font-semibold flex items-start gap-2.5 text-left animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* PESTAÑA 1: LOGIN HABITUAL */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="docente@ejemplo.com"
                disabled={isLoading}
                style={{ backgroundColor: '#0f172a' }}
                className="w-full border border-[#334155] focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/30 text-white text-sm py-2.5 px-3.5 rounded-xl outline-none placeholder:text-slate-500 transition-all"
              />
            </div>

            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                disabled={isLoading}
                style={{ backgroundColor: '#0f172a' }}
                className="w-full border border-[#334155] focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/30 text-white text-sm py-2.5 px-3.5 rounded-xl outline-none placeholder:text-slate-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* PESTAÑA 2: CANJEAR CÓDIGO */}
        {activeTab === 'redeem' && (
          <>
            {redeemStep === 'code' ? (
              <form onSubmit={handleVerifyCode} className="w-full space-y-4">
                <div className="text-left">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Código de Activación
                  </label>
                  <input
                    type="text"
                    value={licenseCode}
                    onChange={(e) => {
                      setLicenseCode(e.target.value.toUpperCase());
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onBlur={() => {
                      setLicenseCode((prev) => prev.trim().toUpperCase());
                    }}
                    placeholder="SUB-XXXXXX"
                    autoFocus
                    disabled={isLoading}
                    style={{ backgroundColor: '#0f172a' }}
                    className="w-full border border-[#334155] focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/30 text-sky-300 font-mono text-center text-base sm:text-lg tracking-widest uppercase font-bold py-3 px-4 rounded-xl outline-none placeholder:text-slate-600 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                    Ingresa el código único para verificar su vigencia.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Verificando código...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                      <span>Continuar al Registro</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterAndActivate} className="w-full space-y-4 text-left">
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-left text-xs">
                    <p className="font-bold text-emerald-300">Licencia confirmada</p>
                    <p className="text-slate-300">
                      Vigente hasta: <strong className="text-white">{expirationText}</strong>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Correo para tu cuenta
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="tucorreo@ejemplo.com"
                    autoFocus
                    disabled={isLoading}
                    style={{ backgroundColor: '#0f172a' }}
                    className="w-full border border-[#334155] focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/30 text-white text-sm py-2.5 px-3.5 rounded-xl outline-none placeholder:text-slate-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Crea tu Contraseña
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isLoading}
                    style={{ backgroundColor: '#0f172a' }}
                    className="w-full border border-[#334155] focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/30 text-white text-sm py-2.5 px-3.5 rounded-xl outline-none placeholder:text-slate-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Creando cuenta y activando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>Activar Cuenta y Entrar</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Separador inferior para alumnos */}
        <div className="mt-6 pt-4 border-t border-[#334155] w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-1.5">
          <span>¿Eres alumno con enlace de sala?</span>
          <span className="text-[#38bdf8] font-medium">
            Acceso directo sin contraseña
          </span>
        </div>
      </div>
    </div>
  );
};