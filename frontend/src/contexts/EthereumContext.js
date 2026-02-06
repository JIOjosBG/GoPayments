// UserContext.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the context
const EthereumContext = createContext();

// Create the provider component
export function EthereumProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const requestAccount = useCallback(() => {
    setIsLoadingAccount(true);
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_requestAccounts' }).then((accounts) => {
        setAccount(accounts[0]);
        setIsLoadingAccount(false);
      }).catch((error) => {
        console.error('Error getting account:', error);
        setIsLoadingAccount(false);
      });
    } else {
      setIsLoadingAccount(false);
    }
  }, []);
  const value = {
    account,
    isLoadingAccount,
    requestAccount,
  };

  return <EthereumContext.Provider value={value}>{children}</EthereumContext.Provider>;
}

// Create the custom hook
export function useEthereum() {
  const context = useContext(EthereumContext);
  if (context === undefined) {
    throw new Error('useEthereum must be used within a EthereumProvider');
  }
  return context;
}

