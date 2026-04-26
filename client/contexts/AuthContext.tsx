import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAuthToken, saveAuthToken, clearAllData, saveUserData, getUserData } from "@/lib/storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  twoFactorEnabled: boolean;
}

interface Wallet {
  id: string;
  gydBalance: string;
  gydsBalance: string;
  internetFundsBalance: string;
  address: string;
}

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  updateProfile: (input: { username: string; email: string; currentPassword: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getAuthToken();
      if (token) {
        const savedUser = await getUserData<User>();
        if (savedUser) {
          setUser(savedUser);
          await refreshWallet();
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();
    
    await saveAuthToken(data.token);
    await saveUserData(data.user);
    setUser(data.user);
    setWallet(data.wallet);
  }

  async function register(username: string, email: string, password: string, pin: string) {
    const response = await apiRequest("POST", "/api/auth/register", { 
      username, 
      email, 
      password, 
      pin 
    });
    const data = await response.json();
    
    await saveAuthToken(data.token);
    await saveUserData(data.user);
    setUser(data.user);
    setWallet(data.wallet);
  }

  async function logout() {
    await clearAllData();
    setUser(null);
    setWallet(null);
  }

  async function updateProfile(input: { username: string; email: string; currentPassword: string }) {
    const response = await apiRequest("PATCH", "/api/auth/profile", input);
    const data = await response.json();
    await saveUserData(data.user);
    setUser(data.user);
    return data.user as User;
  }

  async function refreshWallet() {
    try {
      const res = await apiRequest("GET", "/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      }
    } catch (error) {
      console.error("Failed to refresh wallet:", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshWallet,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
