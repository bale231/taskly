// Port di src/api/auth.ts della webapp.
// Le chiamate di rete (URL, metodi, header, body) sono identiche all'originale:
// cambia solo lo storage dei token, che qui è asincrono (AsyncStorage).
import { API_URL } from "./config";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "../services/storage";

// 🔐 Funzione login con JWT
export const login = async (
  username: string,
  password: string,
  rememberMe: boolean = false
) => {
  try {
    const response = await fetch(`${API_URL}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        remember_me: rememberMe,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true as const,
        accessToken: data.access as string,
        refreshToken: data.refresh as string,
        user: data.user,
        rememberMe: data.remember_me as boolean,
      };
    }

    return {
      success: false as const,
      message: (data.message as string) || "Invalid credentials",
    };
  } catch {
    return { success: false as const, message: "Errore di connessione" };
  }
};

// Singleton refresh: only one refresh at a time, concurrent callers share the promise
let _refreshPromise: Promise<string | null> | null = null;

export async function refreshTokenIfNeeded(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refresh = await getRefreshToken();

    if (!refresh) return null;

    try {
      const res = await fetch(`${API_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!res.ok) return null;

      const data = await res.json();

      await setAccessToken(data.access);
      // Save new refresh token if backend uses token rotation
      if (data.refresh) await setRefreshToken(data.refresh);

      return data.access as string;
    } catch (err) {
      console.error("Errore nel refresh del token:", err);
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/**
 * Decodifica il payload di un JWT senza dipendere da atob(),
 * che non esiste in React Native.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;

    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bits = "";
    for (const c of padded) {
      if (c === "=") continue;
      const idx = chars.indexOf(c);
      if (idx === -1) return null;
      bits += idx.toString(2).padStart(6, "0");
    }

    let json = "";
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      json += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
    }

    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Proactively refresh the access token if it expires within 24 hours.
 * Call this on every app startup to implement sliding expiry:
 * each time the user opens the app, the 30-day refresh window resets.
 */
export async function proactiveTokenRefresh(): Promise<void> {
  const token = await getAccessToken();

  if (!token) return;

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return; // Malformed token - ignore, 401 will handle it

  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Refresh if expired or expiring within 24 hours
  if (expiresAt - now < twentyFourHours) {
    await refreshTokenIfNeeded();
  }
}

// 🔐 Recupero utente corrente tramite JWT
export async function getCurrentUserJWT() {
  let token = await getAccessToken();

  if (!token) return null;

  let res = await fetch(`${API_URL}/jwt-user/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    console.warn("🔁 Token scaduto, provo a rinnovarlo...");
    const newToken = await refreshTokenIfNeeded();

    if (!newToken) return null;

    token = newToken;
    res = await fetch(`${API_URL}/jwt-user/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  if (!res.ok) return null;

  return res.json();
}

// 🔄 Logout locale
export async function logout(): Promise<void> {
  await clearTokens();
}

// 📝 Register
export const register = async (
  username: string,
  email: string,
  password: string
) => {
  const res = await fetch(`${API_URL}/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server error", html: text };
  }
};

/** Header Authorization con il token corrente, o stringa vuota come nell'originale. */
async function authHeader(): Promise<string> {
  return `Bearer ${(await getAccessToken()) || ""}`;
}

// 🧑‍💻 Update profile
export const updateProfile = async (formData: FormData) => {
  const res = await fetch(`${API_URL}/update-profile-jwt/`, {
    method: "POST",
    headers: {
      Authorization: await authHeader(),
    },
    body: formData,
  });
  return res.json();
};

// 🔐 Invia reset password
export const resetPassword = async () => {
  const res = await fetch(`${API_URL}/reset-password/`, {
    method: "POST",
    headers: {
      Authorization: await authHeader(),
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

// 🔐 Aggiorna password da token
export const updatePassword = async (
  uid: string,
  token: string,
  newPassword: string
) => {
  const res = await fetch(`${API_URL}/reset-password/${uid}/${token}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
  return res.json();
};

// 📧 Verifica email
export const sendVerificationEmail = async () => {
  const res = await fetch(`${API_URL}/send-verification-email/`, {
    method: "POST",
    headers: {
      Authorization: await authHeader(),
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

// ❌ Elimina account
export const deactivateAccount = async () => {
  const res = await fetch(`${API_URL}/delete-account/`, {
    method: "DELETE",
    headers: {
      Authorization: await authHeader(),
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

// 🎨 Cambia tema
export const updateTheme = async (theme: string) => {
  const res = await fetch(`${API_URL}/update-theme/`, {
    method: "POST",
    headers: {
      Authorization: await authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme }),
  });
  return res.json();
};

// 🔑 Richiesta reset password via email (usata da ForgotPassword)
export const requestPasswordReset = async (email: string) => {
  const response = await fetch(`${API_URL}/password-reset/request/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
};

// 🔑 Conferma reset password da link email (usata da ResetPassword)
export const confirmPasswordReset = async (
  uid: string,
  token: string,
  newPassword: string
) => {
  const response = await fetch(
    `${API_URL}/password-reset/confirm/${uid}/${token}/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ new_password: newPassword }),
    }
  );

  const data = await response.json();
  return { ok: response.ok, data };
};
