import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens, ApiResponse } from '@/types';
import api, { getErrorMessage } from '@/services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<
            ApiResponse<{ user: User; tokens: AuthTokens }>
          >('/auth/login', { email, password });

          if (response.data.success && response.data.data) {
            const { user, tokens } = response.data.data;
            set({
              user,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error) {
          set({ isLoading: false, error: getErrorMessage(error) });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<
            ApiResponse<{ user: User; tokens: AuthTokens }>
          >('/auth/register', data);

          if (response.data.success && response.data.data) {
            const { user, tokens } = response.data.data;
            set({
              user,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error) {
          set({ isLoading: false, error: getErrorMessage(error) });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } catch {
          // Ignore logout errors
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      fetchUser: async () => {
        if (!get().accessToken) return;

        set({ isLoading: true });
        try {
          const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');

          if (response.data.success && response.data.data) {
            set({ user: response.data.data.user, isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false, error: getErrorMessage(error) });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.put<ApiResponse<{ user: User }>>(
            '/auth/me',
            data
          );

          if (response.data.success && response.data.data) {
            set({ user: response.data.data.user, isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false, error: getErrorMessage(error) });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
