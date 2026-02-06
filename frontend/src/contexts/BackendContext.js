import { createContext, useContext, useState, useEffect } from 'react';
import { useEthereum } from './EthereumContext';

// Create the context
const BackendContext = createContext();

// Backend API base URL - adjust this to match your backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Create the provider component
export function BackendProvider({ children }) {
  const { account } = useEthereum();
  
  // State for user data
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState(null);

  // State for payment templates
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);

  // State for assets
  const [assets, setAssets] = useState([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState(null);

  // Fetch user data
  // Fetch user data as soon as account is connected
  useEffect(() => {
    const fetchUser = async (userAddress) => {
      if (!userAddress) {
        setUser(null);
        return;
      }

      setIsLoadingUser(true);
      setUserError(null);
      try {
console.log("response.ok")
        
        const response = await fetch(`${API_BASE_URL}/users/${userAddress}`);
        
console.log(response.ok)
        if (!response.ok) {
          if (response.status === 404) {
            // User not found is not an error, just means user doesn't exist yet
            setUser(null);
          } else {
            throw new Error(`Failed to fetch user: ${response.statusText}`);
          }
        } else {
          const userData = await response.json();
          console.log(userData)
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUserError(error.message);
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    if (account) {
      fetchUser(account);
    } else {
      setUser(null);
    }
  }, [account]);

  // Fetch payment templates as soon as account is connected
  useEffect(() => {
    const fetchTemplates = async (userAddress) => {
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
          const templatesData = await response.json();
          setTemplates(templatesData || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        setTemplatesError(error.message);
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    if (account) {
      fetchTemplates(account);
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

        const assetsData = await response.json();
        setAssets(assetsData || []);
      } catch (error) {
        console.error('Error fetching assets:', error);
        setAssetsError(error.message);
        setAssets([]);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, []);


  const value = {
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
export function useBackend() {
  const context = useContext(BackendContext);
  if (context === undefined) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
}
