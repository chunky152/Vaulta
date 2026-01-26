import { create } from 'zustand';
import type {
  InventoryItem,
  InventorySummary,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  InventorySearchParams,
  ApiResponse,
  PaginatedResponse,
} from '@/types';
import api, { getErrorMessage } from '@/services/api';

interface InventoryState {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  summary: InventorySummary | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  fetchAllInventory: (params?: InventorySearchParams) => Promise<void>;
  fetchBookingInventory: (bookingId: string, params?: InventorySearchParams) => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchItemById: (itemId: string) => Promise<void>;
  addItem: (bookingId: string, data: CreateInventoryItemInput) => Promise<InventoryItem>;
  updateItem: (itemId: string, data: UpdateInventoryItemInput) => Promise<InventoryItem>;
  deleteItem: (itemId: string) => Promise<void>;
  setSelectedItem: (item: InventoryItem | null) => void;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  selectedItem: null,
  summary: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  fetchAllInventory: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<PaginatedResponse<InventoryItem>>('/inventory', {
        params,
      });

      if (response.data.success && response.data.data) {
        set({
          items: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchBookingInventory: async (bookingId, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<PaginatedResponse<InventoryItem>>(
        `/bookings/${bookingId}/inventory`,
        { params }
      );

      if (response.data.success && response.data.data) {
        set({
          items: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchSummary: async () => {
    try {
      const response = await api.get<ApiResponse<{ summary: InventorySummary }>>(
        '/inventory/summary'
      );

      if (response.data.success && response.data.data) {
        set({ summary: response.data.data.summary });
      }
    } catch (error) {
      console.error('Failed to fetch inventory summary:', error);
    }
  },

  fetchItemById: async (itemId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<{ item: InventoryItem }>>(
        `/inventory/${itemId}`
      );

      if (response.data.success && response.data.data) {
        set({
          selectedItem: response.data.data.item,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  addItem: async (bookingId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<{ item: InventoryItem }>>(
        `/bookings/${bookingId}/inventory`,
        data
      );

      if (response.data.success && response.data.data) {
        const item = response.data.data.item;
        set((state) => ({
          items: [item, ...state.items],
          isLoading: false,
        }));
        // Refresh summary
        get().fetchSummary();
        return item;
      }
      throw new Error('Failed to add item');
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  updateItem: async (itemId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<ApiResponse<{ item: InventoryItem }>>(
        `/inventory/${itemId}`,
        data
      );

      if (response.data.success && response.data.data) {
        const updatedItem = response.data.data.item;
        set((state) => ({
          items: state.items.map((i) => (i.id === itemId ? updatedItem : i)),
          selectedItem:
            state.selectedItem?.id === itemId ? updatedItem : state.selectedItem,
          isLoading: false,
        }));
        // Refresh summary
        get().fetchSummary();
        return updatedItem;
      }
      throw new Error('Failed to update item');
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  deleteItem: async (itemId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/inventory/${itemId}`);

      set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
        selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
        isLoading: false,
      }));
      // Refresh summary
      get().fetchSummary();
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  setSelectedItem: (item) => set({ selectedItem: item }),

  clearError: () => set({ error: null }),
}));
