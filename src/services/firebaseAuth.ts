import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyACxGWJBhaeKo4lz015Lz691L4gpHLLHRtM",
  authDomain: "reduccion-cuadricula-3f6b0.firebaseapp.com",
  databaseURL: "https://reduccion-cuadricula-3f6b0-default-rtdb.firebaseio.com",
  projectId: "reduccion-cuadricula-3f6b0",
  storageBucket: "reduccion-cuadricula-3f6b0.firebasestorage.app",
  messagingSenderId: "143509305132",
  appId: "1:143509305132:web:8c8faaa929b39cda1cde89"
};

// Inicialización de Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const AUTH_STORAGE_KEY = 'auth_token_reduccion';

export interface AuthSessionData {
  type: 'code' | 'email';
  identifier: string;
  activatedAt: number;
  data?: Record<string, unknown>;
}

/**
 * Obtiene la sesión guardada en localStorage si existe
 */
export function getStoredSession(): AuthSessionData | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    if (raw.startsWith('{')) {
      return JSON.parse(raw) as AuthSessionData;
    }
    // Compatibilidad si se guardó solo el código en string
    return {
      type: 'code',
      identifier: raw.trim(),
      activatedAt: Date.now(),
    };
  } catch (err) {
    console.warn('Error leyendo sesión local:', err);
    return null;
  }
}

/**
 * Guarda la sesión autorizada en localStorage
 */
export function saveSession(session: AuthSessionData): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Error guardando sesión local:', err);
  }
}

/**
 * Limpia la sesión de localStorage y cierra sesión en Firebase
 */
export async function logoutSession(): Promise<void> {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    await signOut(auth);
  } catch (err) {
    console.warn('Error cerrando sesión:', err);
  }
}

/**
 * Valida un código de activación en la colección 'suscripciones' de Firestore
 */
export async function validateLicenseCode(rawCode: string): Promise<{
  success: boolean;
  message?: string;
  session?: AuthSessionData;
}> {
  // Convertir automáticamente a mayúsculas y quitar espacios en blanco accidentales
  const cleanCode = (rawCode || '').trim().toUpperCase();

  if (!cleanCode) {
    return {
      success: false,
      message: 'Por favor, ingresa un código de activación.',
    };
  }

  try {
    const docRef = doc(db, 'suscripciones', cleanCode);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.activo === true) {
        const session: AuthSessionData = {
          type: 'code',
          identifier: cleanCode,
          activatedAt: Date.now(),
          data,
        };
        saveSession(session);
        return { success: true, session };
      } else {
        return {
          success: false,
          message: 'La suscripción asociada a este código se encuentra inactiva o ha expirado.',
        };
      }
    } else {
      return {
        success: false,
        message: 'Código de activación no encontrado. Verifica que esté bien escrito.',
      };
    }
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string };
    console.error('Error al validar código en Firestore:', error);
    return {
      success: false,
      message: `Error al validar suscripción: ${error?.message || 'Verifica la conexión a internet o el estado del servicio.'}`,
    };
  }
}

/**
 * Inicia sesión con Correo y Contraseña en Firebase Auth y verifica vigencia en Firestore
 */
export async function loginWithEmailAndPassword(
  emailInput: string,
  passwordInput: string
): Promise<{
  success: boolean;
  message?: string;
  session?: AuthSessionData;
}> {
  const email = (emailInput || '').trim();
  const password = passwordInput || '';

  if (!email || !password) {
    return {
      success: false,
      message: 'Por favor, completa el correo y la contraseña.',
    };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Verificar en la colección 'suscripciones' si cuenta con registro activo
    let isActive = false;
    let subscriptionData: Record<string, unknown> | undefined = undefined;

    // 1. Intentar consulta por UID
    try {
      const uidDoc = await getDoc(doc(db, 'suscripciones', user.uid));
      if (uidDoc.exists() && uidDoc.data()?.activo === true) {
        isActive = true;
        subscriptionData = uidDoc.data();
      }
    } catch (e) {
      console.warn('Verificación por UID falló:', e);
    }

    // 2. Intentar consulta por Email como ID de documento
    if (!isActive && user.email) {
      try {
        const emailDoc = await getDoc(doc(db, 'suscripciones', user.email.toLowerCase().trim()));
        if (emailDoc.exists() && emailDoc.data()?.activo === true) {
          isActive = true;
          subscriptionData = emailDoc.data();
        }
      } catch (e) {
        console.warn('Verificación por ID email falló:', e);
      }
    }

    // 3. Intentar consulta por campo email en la colección
    if (!isActive && user.email) {
      try {
        const q = query(
          collection(db, 'suscripciones'),
          where('email', '==', user.email.toLowerCase().trim())
        );
        const querySnapshot = await getDocs(q);
        const matchingDoc = querySnapshot.docs.find(
          (d) => d.data()?.activo === true
        );
        if (matchingDoc) {
          isActive = true;
          subscriptionData = matchingDoc.data();
        }
      } catch (e) {
        console.warn('Consulta por campo email falló:', e);
      }
    }

    // Si no se encontró registro activo en 'suscripciones'
    if (!isActive) {
      await signOut(auth);
      return {
        success: false,
        message: 'Acceso denegado: Tu cuenta no tiene una suscripción activa (activo: true) registrada en el sistema.',
      };
    }

    const session: AuthSessionData = {
      type: 'email',
      identifier: user.email || user.uid,
      activatedAt: Date.now(),
      data: subscriptionData,
    };

    saveSession(session);
    return { success: true, session };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error('Error al iniciar sesión:', error);

    let friendlyMessage = 'No fue posible iniciar sesión.';
    switch (error?.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        friendlyMessage = 'Correo o contraseña incorrectos.';
        break;
      case 'auth/invalid-email':
        friendlyMessage = 'El formato del correo electrónico es inválido.';
        break;
      case 'auth/user-disabled':
        friendlyMessage = 'Esta cuenta ha sido deshabilitada por el administrador.';
        break;
      case 'auth/too-many-requests':
        friendlyMessage = 'Demasiados intentos fallidos. Por favor espera unos minutos.';
        break;
      default:
        friendlyMessage = error?.message || 'Error de conexión o autenticación.';
        break;
    }

    return { success: false, message: friendlyMessage };
  }
}

/**
 * Escucha cambios en el estado de autenticación de Firebase
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
