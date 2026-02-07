import React, { createContext, useContext, useState, useEffect } from 'react';
import { useEthereum } from './EthereumContext';

// Type definitions based on backend Go models
export interface User {
  id: number;
  created_at: string;
  email?: string;
  username?: string;
  ethereum_address: string;
  is_anonymous: boolean;
  payment_templates?: PaymentTemplate[];
}

export interface PaymentTemplate {
  id: number;
  created_at: string;
  user_id: number;
  name: string;
  is_active: boolean;
  scheduled_at?: string | null;
  recurring_interval?: number | null;
  user?: User;
  transfers?: Transfer[];
}

export interface Transfer {
  id?: number;
  destination_user?: User;
  asset?: Asset;
  amount?: string;
  [key: string]: unknown; // Allow for other properties
}

export interface Asset {
  id: number;
  created_at: string;
  symbol: string;
  name: string;
  decimals: number;
  contract_address?: string;
  chain_id: number;
}

// Context value type
interface BackendContextValue {
  // User data
  user: User | null;
  isLoadingUser: boolean;
  userError: string | null;

  // Templates data
  templates: PaymentTemplate[];
  isLoadingTemplates: boolean;
  templatesError: string | null;

  // Assets data
  assets: Asset[];
  isLoadingAssets: boolean;
  assetsError: string | null;

  // Utility
  API_BASE_URL: string;
}

// Create the context
const BackendContext = createContext<BackendContextValue | undefined>(undefined);

// Backend API base URL - adjust this to match your backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Provider props
type BackendProviderProps = React.PropsWithChildren;

// Create the provider component
export function BackendProvider({ children }: BackendProviderProps) {
  const { account } = useEthereum();
  
  // State for user data
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);
  const [userError, setUserError] = useState<string | null>(null);

  // State for payment templates
  const [templates, setTemplates] = useState<PaymentTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // State for assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Fetch user data as soon as account is connected
  useEffect(() => {
    const fetchUser = async (userAddress: string) => {
      if (!userAddress) {
        setUser(null);
        return;
      }

      setIsLoadingUser(true);
      setUserError(null);
      try {
        console.log("response.ok");
        
        const response = await fetch(`${API_BASE_URL}/users/${userAddress}`);
        
        console.log(response.ok);
        if (!response.ok) {
          if (response.status === 404) {
            // User not found is not an error, just means user doesn't exist yet
            setUser(null);
          } else {
            throw new Error(`Failed to fetch user: ${response.statusText}`);
          }
        } else {
          const userData = await response.json() as User;
          console.log(userData);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setUserError(errorMessage);
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    // Extract account address if connected
    if (account.status === 'connected' && account.account) {
      fetchUser(account.account);
    } else {
      setUser(null);
    }
  }, [account]);

  // Fetch payment templates as soon as account is connected
  useEffect(() => {
    const fetchTemplates = async (userAddress: string) => {
      if (!userAddress) {
        setTemplates([]);
        return;
      }

      setIsLoadingTemplates(true);
      setTemplatesError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/templates/${userAddress}`);

        if (!response.ok) {
          if (response.status === 404) {
            // User not found means no templates
            setTemplates([]);
          } else {
            throw new Error(`Failed to fetch templates: ${response.statusText}`);
          }
        } else {
          const templatesData = await response.json() as PaymentTemplate[];
          setTemplates(templatesData || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setTemplatesError(errorMessage);
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    // Extract account address if connected
    if (account.status === 'connected' && account.account) {
      fetchTemplates(account.account);
    } else {
      setTemplates([]);
    }
  }, [account]);

  // Fetch assets once on mount
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      setAssetsError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/assets`);

        if (!response.ok) {
          throw new Error(`Failed to fetch assets: ${response.statusText}`);
        }

        const assetsData = await response.json() as Asset[];
        setAssets(assetsData || []);
      } catch (error) {
        console.error('Error fetching assets:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setAssetsError(errorMessage);
        setAssets([]);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, []);

  const value: BackendContextValue = {
    // User data
    user,
    isLoadingUser,
    userError,
    // Not exposing fetchUser, since it's handled by useEffect

    // Templates data
    templates,
    isLoadingTemplates,
    templatesError,
    // Not exposing fetchTemplates, since it's handled by useEffect

    // Assets data
    assets,
    isLoadingAssets,
    assetsError,
    // Not exposing fetchAssets, since it's handled by useEffect

    // Utility
    API_BASE_URL,
  };

  return (
    <BackendContext.Provider value={value}>
      {children}
    </BackendContext.Provider>
  );
}

// Create the custom hook
export function useBackend(): BackendContextValue {
  const context = useContext(BackendContext);
  if (context === undefined) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
}
