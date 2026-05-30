import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export const saveAuth = async (token, user) => {
  if (!token || !user) return;
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)]
  ]);
};

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(USER_KEY);
    return null;
  }
};

export const setStoredUser = async (user) => {
  if (!user) return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const logout = () => AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);

export const isAdminUser = (user) => user?.role === "admin" || user?.role === "instructor";

export const clearExpiredAuth = logout;
