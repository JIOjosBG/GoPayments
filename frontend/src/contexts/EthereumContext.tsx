/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

// Type definitions
export type EthereumAccountState =
  | { status: "loading" }
  | { status: "connected"; account: string }
  | { status: "error"; error: string }
  | { status: "idle" };

// Ethereum provider interface (EIP-1193)
interface EthereumProviderAPI {
  request(args: { method: string; params?: unknown[] }): Promise<unknown[]>;
  on(event: string, handler: (...args: any[]) => void): void;
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
  sendCallsViaWallet: (
    chainId: number,
    calls: { to: string; value: bigint; data: string }[],
  ) => Promise<string>;
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

  useEffect(() => {
    if (!window.ethereum) {
      setAccount({ status: "error", error: "No window.ethereum" });
      return;
    }
    window.ethereum.on("accountsChanged", (accounts: string[]) =>
      setAccount({ status: "connected", account: accounts[0] }),
    );
  }, [window]);

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
  }, [window, setAccount]);

  useEffect(() => requestAccount(), [requestAccount]);

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

  const sendCallsViaWallet = useCallback(
    async (
      chainId: number,
      calls: { to: string; value: bigint; data: string }[],
    ) => {
      if (account.status !== "connected") return "";
      if (!window.ethereum) return "";

      const params = [
        {
          version: "2.0.0",
          from: account.account,
          chainId: "0x" + chainId.toString(16),
          calls,
        },
      ];

      try {
        await window.ethereum.request({
          method: "wallet_sendCalls",
          params,
        });
        return "";
        // return (bundleId as any as string).split(":")[1];
      } catch (err) {
        console.error("sendCalls failed:", err);
        return "";
      }
    },
    [window, account],
  );

  const value: EthereumContextValue = {
    account,
    requestAccount,
    signLoginMessage,
    sendCallsViaWallet,
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
