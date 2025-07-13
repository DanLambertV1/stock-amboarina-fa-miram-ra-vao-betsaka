import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Define the structure for different module states
export interface ViewState {
  // Common state properties
  searchTerm?: string;
  currentPage?: number;
  itemsPerPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  scrollPosition?: number;
  
  // Module-specific filters
  filters?: {
    [key: string]: any;
  };
  
  // Date ranges
  dateRange?: {
    start: string;
    end: string;
  };
  
  // Selected items
  selectedItems?: Set<string>;
  
  // Modal states
  modals?: {
    [key: string]: boolean;
  };
  
  // Tab states
  activeTab?: string;
  activeSubTab?: string;
}

// Default states for each module
const DEFAULT_STATES: { [key: string]: ViewState } = {
  dashboard: {
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 50,
    scrollPosition: 0,
    filters: {
      register: 'all',
      seller: 'all',
      category: 'all'
    },
    dateRange: {
      start: '',
      end: ''
    }
  },
  sales: {
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 50,
    sortField: 'date',
    sortDirection: 'desc',
    scrollPosition: 0,
    filters: {
      register: 'all',
      seller: 'all',
      category: 'all'
    },
    dateRange: {
      start: '',
      end: ''
    },
    selectedItems: new Set(),
    modals: {
      deleteModal: false
    }
  },
  stock: {
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 50,
    sortField: 'name',
    sortDirection: 'asc',
    scrollPosition: 0,
    filters: {
      category: 'all',
      status: 'all',
      stockLevel: 'all'
    },
    selectedItems: new Set(),
    modals: {
      addModal: false,
      editModal: false,
      deleteModal: false,
      importModal: false
    },
    activeTab: 'list'
  },
  statistics: {
    currentPage: 1,
    itemsPerPage: 50,
    scrollPosition: 0,
    filters: {
      seller: 'all',
      register: 'all',
      category: 'all'
    },
    dateRange: {
      start: '',
      end: ''
    },
    activeTab: 'overview',
    activeSubTab: 'products'
  },
  import: {
    scrollPosition: 0,
    modals: {
      previewModal: false
    },
    activeTab: 'sales'
  },
  notifications: {
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 50,
    scrollPosition: 0,
    filters: {
      category: 'all',
      type: 'all',
      read: 'all'
    },
    activeTab: 'all'
  },
  settings: {
    scrollPosition: 0,
    activeTab: 'profile'
  }
};

// Storage key for persisting state
const STORAGE_KEY = 'globalva_view_states';

// Debounce function to prevent excessive localStorage writes
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Custom hook for managing view state
export function useViewState(moduleId: string) {
  const isInitializedRef = useRef(false);
  const lastSavedStateRef = useRef<string>('');
  
  // Memoize initial state to prevent recalculation
  const initialState = useMemo(() => {
    try {
      const savedStates = localStorage.getItem(STORAGE_KEY);
      if (savedStates) {
        const parsedStates = JSON.parse(savedStates);
        const moduleState = parsedStates[moduleId];
        
        if (moduleState) {
          // Convert selectedItems back to Set if it exists
          if (moduleState.selectedItems && Array.isArray(moduleState.selectedItems)) {
            moduleState.selectedItems = new Set(moduleState.selectedItems);
          }
          
          // Merge with default state to ensure all properties exist
          return { ...DEFAULT_STATES[moduleId], ...moduleState };
        }
      }
    } catch (error) {
      console.warn('Error loading view state:', error);
    }
    
    return DEFAULT_STATES[moduleId] || {};
  }, [moduleId]);

  const [viewState, setViewState] = useState<ViewState>(initialState);

  // Debounced save function to prevent excessive localStorage writes
  const debouncedSave = useMemo(
    () => debounce((state: ViewState) => {
      try {
        const savedStates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        
        // Convert Set to Array for JSON serialization
        const stateToSave = { ...state };
        if (stateToSave.selectedItems instanceof Set) {
          stateToSave.selectedItems = Array.from(stateToSave.selectedItems) as any;
        }
        
        // Only save if state has actually changed
        const stateString = JSON.stringify(stateToSave);
        if (stateString !== lastSavedStateRef.current) {
          savedStates[moduleId] = stateToSave;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedStates));
          lastSavedStateRef.current = stateString;
        }
      } catch (error) {
        console.warn('Error saving view state:', error);
      }
    }, 300),
    [moduleId]
  );

  // Save state to localStorage with debouncing
  useEffect(() => {
    // Skip saving on initial render
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }
    
    debouncedSave(viewState);
  }, [viewState, debouncedSave]);

  // Memoized update functions to prevent unnecessary re-renders
  const updateState = useCallback((updates: Partial<ViewState>) => {
    setViewState(prev => {
      const newState = { ...prev, ...updates };
      // Only update if state actually changed
      if (JSON.stringify(newState) === JSON.stringify(prev)) {
        return prev;
      }
      return newState;
    });
  }, []);

  const updateFilters = useCallback((filterUpdates: { [key: string]: any }) => {
    setViewState(prev => {
      const newFilters = { ...prev.filters, ...filterUpdates };
      // Only update if filters actually changed
      if (JSON.stringify(newFilters) === JSON.stringify(prev.filters)) {
        return prev;
      }
      return { ...prev, filters: newFilters };
    });
  }, []);

  const updateDateRange = useCallback((dateRange: { start: string; end: string }) => {
    setViewState(prev => {
      // Only update if date range actually changed
      if (JSON.stringify(dateRange) === JSON.stringify(prev.dateRange)) {
        return prev;
      }
      return { ...prev, dateRange };
    });
  }, []);

  const updateSelectedItems = useCallback((selectedItems: Set<string>) => {
    setViewState(prev => {
      // Only update if selected items actually changed
      const prevArray = Array.from(prev.selectedItems || new Set());
      const newArray = Array.from(selectedItems);
      if (JSON.stringify(prevArray.sort()) === JSON.stringify(newArray.sort())) {
        return prev;
      }
      return { ...prev, selectedItems };
    });
  }, []);

  const updateModals = useCallback((modalUpdates: { [key: string]: boolean }) => {
    setViewState(prev => {
      const newModals = { ...prev.modals, ...modalUpdates };
      // Only update if modals actually changed
      if (JSON.stringify(newModals) === JSON.stringify(prev.modals)) {
        return prev;
      }
      return { ...prev, modals: newModals };
    });
  }, []);

  const resetState = useCallback(() => {
    setViewState(DEFAULT_STATES[moduleId] || {});
  }, [moduleId]);

  const saveScrollPosition = useCallback((position: number) => {
    setViewState(prev => {
      // Only update if scroll position changed significantly (avoid micro-updates)
      if (Math.abs((prev.scrollPosition || 0) - position) < 10) {
        return prev;
      }
      return { ...prev, scrollPosition: position };
    });
  }, []);

  const restoreScrollPosition = useCallback(() => {
    if (viewState.scrollPosition && viewState.scrollPosition > 0) {
      // Use requestAnimationFrame for smoother scroll restoration
      requestAnimationFrame(() => {
        window.scrollTo({ top: viewState.scrollPosition, behavior: 'auto' });
      });
    }
  }, [viewState.scrollPosition]);

  return {
    viewState,
    updateState,
    updateFilters,
    updateDateRange,
    updateSelectedItems,
    updateModals,
    resetState,
    saveScrollPosition,
    restoreScrollPosition
  };
}

// Optimized hook for managing scroll position
export function useScrollPosition(moduleId: string) {
  const { saveScrollPosition, restoreScrollPosition } = useViewState(moduleId);
  const isRestoringRef = useRef(false);
  const lastScrollTimeRef = useRef(0);

  useEffect(() => {
    // Restore scroll position when component mounts
    isRestoringRef.current = true;
    restoreScrollPosition();
    
    // Reset restoring flag after a short delay
    const resetTimer = setTimeout(() => {
      isRestoringRef.current = false;
    }, 500);

    // Optimized scroll handler with throttling
    const handleScroll = () => {
      // Don't save scroll position while restoring
      if (isRestoringRef.current) return;
      
      const now = Date.now();
      // Throttle scroll events to every 100ms
      if (now - lastScrollTimeRef.current < 100) return;
      
      lastScrollTimeRef.current = now;
      saveScrollPosition(window.scrollY);
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      clearTimeout(resetTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [saveScrollPosition, restoreScrollPosition]);

  return { saveScrollPosition, restoreScrollPosition };
}

// Context for sharing view state across components
import { createContext, useContext, ReactNode } from 'react';

interface ViewStateContextType {
  getViewState: (moduleId: string) => ViewState;
  updateViewState: (moduleId: string, updates: Partial<ViewState>) => void;
  resetViewState: (moduleId: string) => void;
}

const ViewStateContext = createContext<ViewStateContextType | null>(null);

export function ViewStateProvider({ children }: { children: ReactNode }) {
  // Memoize context functions to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    const getViewState = (moduleId: string): ViewState => {
      try {
        const savedStates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const moduleState = savedStates[moduleId];
        
        if (moduleState) {
          // Convert selectedItems back to Set if it exists
          if (moduleState.selectedItems && Array.isArray(moduleState.selectedItems)) {
            moduleState.selectedItems = new Set(moduleState.selectedItems);
          }
          
          return { ...DEFAULT_STATES[moduleId], ...moduleState };
        }
      } catch (error) {
        console.warn('Error loading view state:', error);
      }
      
      return DEFAULT_STATES[moduleId] || {};
    };

    const updateViewState = (moduleId: string, updates: Partial<ViewState>) => {
      try {
        const savedStates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const currentState = savedStates[moduleId] || DEFAULT_STATES[moduleId] || {};
        
        // Convert Set to Array for JSON serialization
        const updatesToSave = { ...updates };
        if (updatesToSave.selectedItems instanceof Set) {
          updatesToSave.selectedItems = Array.from(updatesToSave.selectedItems) as any;
        }
        
        savedStates[moduleId] = { ...currentState, ...updatesToSave };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedStates));
      } catch (error) {
        console.warn('Error updating view state:', error);
      }
    };

    const resetViewState = (moduleId: string) => {
      try {
        const savedStates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        savedStates[moduleId] = DEFAULT_STATES[moduleId] || {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedStates));
      } catch (error) {
        console.warn('Error resetting view state:', error);
      }
    };

    return { getViewState, updateViewState, resetViewState };
  }, []);

  return (
    <ViewStateContext.Provider value={contextValue}>
      {children}
    </ViewStateContext.Provider>
  );
}

export function useViewStateContext() {
  const context = useContext(ViewStateContext);
  if (!context) {
    throw new Error('useViewStateContext must be used within a ViewStateProvider');
  }
  return context;
}