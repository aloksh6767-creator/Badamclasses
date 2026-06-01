import { AppUser, clearSession, saveSession } from "./authStore";
import { apiFetch } from "./client";

type AuthResponse = {
  token?: string;
  user?: AppUser;
  student?: AppUser;
  message?: string;
};

const persistAuth = async (payload: AuthResponse) => {
  const token = payload.token;
  const user = payload.user || payload.student;
  if (!token || !user) throw new Error(payload.message || "Login response is missing session details.");
  await saveSession(token, user);
  return user;
};

export const login = async (email: string, password: string) => {
  const payload = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return persistAuth(payload);
};

export const signup = async (name: string, email: string, password: string, phone?: string) => {
  const payload = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone })
  });
  return persistAuth(payload);
};

export const forgotPassword = (email: string) => {
  return apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
};

export const logout = clearSession;
