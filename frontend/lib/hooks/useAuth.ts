"use client";

import { useEffect, useState } from "react";

import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  decodeAccessToken,
  getAccessToken,
  getStoredAuthUser,
  isTokenExpired,
} from "@/lib/utils/permissions";

import { API_URL } from "@/lib/utils/api";

interface AuthState {
  userId: number | null;
  roles: string[];
  firstName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    userId: null,
    roles: [],
    firstName: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = getAccessToken();
    const payload = token ? decodeAccessToken(token) : null;
    const storedUser = getStoredAuthUser();

    if (!payload || isTokenExpired(payload)) {
      setState({
        userId: null,
        roles: [],
        firstName: storedUser?.firstName ?? null,
        isAuthenticated: false,
        isLoading: false,
      });

      return;
    }

    setState({
      userId: payload.sub,
      roles: payload.roles,
      firstName: payload.firstName || storedUser?.firstName || null,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = async (): Promise<void> => {
    const token = getAccessToken();

    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);

      setState({
        userId: null,
        roles: [],
        firstName: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  return {
    ...state,
    logout,
  };
}
