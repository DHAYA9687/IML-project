"use client"

import { id } from "date-fns/locale"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react"


interface User {
  id: string
  email: string
  name: string
  role: "student" | "teacher" | string[]
  rollNo?: string
  class?: string
  age?: number


}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  showSuccessToast: (message: string) => void
  showErrorToast: (message: string) => void
  showWarningToast: (message: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const route = useRouter();
  const [loading, setLoading] = useState(true)

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const auth_url = process.env.NEXT_PUBLIC_AUTH_URL;
  const keycloakBaseUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  const redirect_uri = process.env.NEXT_PUBLIC_REDIRECT_URI;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("loggedout")) {
      localStorage.removeItem("user");
      localStorage.removeItem("ID_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      window.history.replaceState({}, document.title, redirect_uri); // Remove query param
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      fetchUserInfo(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserInfo = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        method: "GET",
        credentials: "include", // 🔑 important: send cookies with request
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json(); // backend returns user info
      localStorage.setItem("user", JSON.stringify(data.user));
      console.log("Fetched user info:", data);

      setUser(data.user);
    } catch (err) {
      console.error("Error fetching user:", err);
      localStorage.removeItem("auth_token"); // not needed if you only use cookies
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };


  const login = async (token: string) => {
    localStorage.setItem("auth_token", token)
    await fetchUserInfo(token)
  }

  const logout = () => {
    setUser(null)
    setLoading(false)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user")
    localStorage.removeItem("ID_token")
    localStorage.removeItem("refresh_token")
    window.location.href = "/"
  };
  const showSuccessToast = (message: string) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
    })
  }

  const showErrorToast = (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
    })
  }

  const showLoadingToast = () => {
    toast.loading('Processing your request...', {
      duration: 2000,
      position: 'top-right',
    })
  }

  const showWarningToast = (message: string) => {
    toast(message, {
      icon: '⚠️',
      duration: 4000,
      position: 'top-right',
      style: {
        borderRadius: '10px',
        background: '#f59e0b',
        color: '#fff',
      },
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, showSuccessToast, showErrorToast, showWarningToast }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
