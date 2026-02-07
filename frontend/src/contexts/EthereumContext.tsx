import React, { createContext, useContext, useState, useCallback } from "react";

// Type definitions
export type EthereumAccountState =
  | { status: "loading" }
  | { status: "connected"; account: string }
  | { status: "error"; error: string }
  | { status: "idle" };

// Ethereum provider interface (EIP-1193)
interface EthereumProviderAPI {
  request(args: { method: string; params?: unknown[] }): Promise<unknown[]>;
}

// Extend Window interface
declare global {
  interface Window {
    ethereum?: EthereumProviderAPI;
  }
}

// Context value type
interface EthereumContextValue {
  account: EthereumAccountState;
  requestAccount: () => void;
  signLoginMessage: () => Promise<{
    message: string;
    signature: string;
    account: string;
  } | null>;
}

// Create the context
const EthereumContext = createContext<EthereumContextValue | undefined>(
  undefined,
);

// Provider props
type EthereumProviderProps = React.PropsWithChildren;

export function EthereumProvider({ children }: EthereumProviderProps) {
  const [account, setAccount] = useState<EthereumAccountState>({
    status: "idle",
  });

  const requestAccount = useCallback(() => {
    setAccount({ status: "loading" });
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_requestAccounts" })
        .then((accounts) => {
          const accountsArray = accounts as string[];
          setAccount({ status: "connected", account: accountsArray[0] });
        })
        .catch((error: Error) => {
          console.error("Error getting account:", error);
          setAccount({ status: "error", error: error.message });
        });
    } else {
      setAccount({ status: "error", error: "No Ethereum provider found" });
    }
  }, []);

  const signLoginMessage = useCallback(async (): Promise<{
    message: string;
    signature: string;
    account: string;
  } | null> => {
    if (!window.ethereum) return null;

    if (account.status !== "connected") return null;
    const message = `Welcome to GoPayments!
Address: ${account.account}
Timestamp: ${Date.now()}

Sign this message to log in. Do not share this message with anyone.`;
    const signature = await window.ethereum
      .request({
        method: "personal_sign",
        params: [message, account.account],
      })
      .catch((e) => {
        console.log("Error signing", e);
      });
    if (typeof signature !== "string") return null;
    return { account: account.account, message, signature };
  }, [window, account]);

  const value: EthereumContextValue = {
    account,
    requestAccount,
    signLoginMessage,
  };

  return (
    <EthereumContext.Provider value={value}>
      {children}
    </EthereumContext.Provider>
  );
}

// Create the custom hook
export function useEthereum(): EthereumContextValue {
  const context = useContext(EthereumContext);
  if (context === undefined) {
    throw new Error("useEthereum must be used within a EthereumProvider");
  }
  return context;
}
