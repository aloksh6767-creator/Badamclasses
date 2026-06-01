import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "badamclasses_mobile_token";
const USER_KEY = "badamclasses_mobile_user";

export type AppUser = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: "student" | "admin" | "instructor" | string;
};

export const saveSession = async (token: string, user: AppUser) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const getStoredUser = async (): Promise<AppUser | null> => {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};
