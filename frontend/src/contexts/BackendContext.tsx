import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useEthereum } from "./EthereumContext";
import { Movement, TypeOfBatch } from "@/pages/components/CreatePayment";

// Type definitions based on backend Go models
export type User =
  | { status: "not_connected" }
  | { status: "loading" }
  | { status: "not_authenticated"; address: string }
  | { status: "error"; error: string; address: string }
  | { status: "ready"; user: UserInfo };
export interface UserInfo {
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
  is_cancelled: boolean;
  scheduled_at?: string | null;
  recurring_interval?: number | null;
  user: UserInfo;
  transfers: Transfer[];
}

export interface Transfer {
  id?: number;
  destination_user_address: string;
  asset: Asset;
  amount: string;
}

export interface Asset {
  id: number;
  created_at: string;
  symbol: string;
  name: string;
  decimals: number;
  contract_address: string;
  chain_id: number;
}

// Context value type
interface BackendContextValue {
  // User data
  user: User;

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

  requestCookie: (args: {
    message: string;
    signature: string;
    account: string;
  }) => void;

  sendPaymentToBackend: (args: {
    chainId: number;
    movements: Movement[];
    account: string;
    type: TypeOfBatch;
    scheduledAt: number;
    timeInterval?: number;
  }) => void;
  deletePaymentTemplate: (n: number) => void;
  fetchTemplates: () => void;
}

// Create the context
const BackendContext = createContext<BackendContextValue | undefined>(
  undefined,
);

// Backend API base URL - adjust this to match your backend
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Provider props
type BackendProviderProps = React.PropsWithChildren;

// Create the provider component
export function BackendProvider({ children }: BackendProviderProps) {
  const { account: ethereumAccount } = useEthereum();

  // State for user data
  const [user, setUser] = useState<User>({ status: "not_connected" });

  // State for payment templates
  const [templates, setTemplates] = useState<PaymentTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // State for assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const fetchUser = useCallback(
    async (userAddress: string) => {
      setUser({ status: "loading" });
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userAddress}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 404) {
            // User not found is not an error, just means user doesn't exist yet
            setUser({
              status: "error",
              address: userAddress,
              error: "Missing",
            });
          } else if (response.status === 401) {
            setUser({ status: "not_authenticated", address: userAddress });
          } else {
            setUser({
              status: "error",
              address: userAddress,
              error: "Failed to get user",
            });
          }
        } else {
          const userData = (await response.json()) as UserInfo;
          setUser({ status: "ready", user: userData });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser({
          status: "error",
          address: userAddress,
          error: "Error fetching user",
        });
      }
    },
    [setUser],
  );
  const requestCookie = useCallback(
    async ({
      message,
      signature,
      account,
    }: {
      message: string;
      signature: string;
      account: string;
    }) => {
      if (user.status !== "not_authenticated") return;
      await fetch(`${API_BASE_URL}/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: account, message, signature }),
        credentials: "include",
      }).then((r) => {
        console.log(r);
      });
      fetchUser(user.address);
    },
    [user],
  );
  const deletePaymentTemplate = useCallback(
    async (templateId: number) => {
      await fetch(`${API_BASE_URL}/templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
      });

      fetchTemplates();
    },
    [user],
  );

  // Fetch user data as soon as account is connected
  useEffect(() => {
    if (ethereumAccount.status !== "connected") {
      setUser({ status: "not_connected" });
      return;
    }
    fetchUser(ethereumAccount.account);
  }, [ethereumAccount.status]);

  useEffect(() => {
    if (user.status === "ready") fetchTemplates();
  }, [user.status]);

  // Fetch payment templates as soon as account is connected
  const fetchTemplates = useCallback(async () => {
    if (user.status !== "ready") {
      setTemplates([]);
      return;
    }

    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/templates/${user.user.ethereum_address}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          // User not found means no templates
          setTemplates([]);
        } else {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }
      } else {
        const templatesData = (await response.json()) as PaymentTemplate[];
        setTemplates(templatesData || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setTemplatesError(errorMessage);
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [user]);

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

        const assetsData = (await response.json()) as Asset[];
        setAssets(assetsData || []);
      } catch (error) {
        console.error("Error fetching assets:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setAssetsError(errorMessage);
        setAssets([]);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, []);

  const sendPaymentToBackend = useCallback(
    async ({
      chainId,
      movements,
      account,
      type,
      scheduledAt,
      timeInterval,
    }: {
      chainId: number;
      movements: Movement[];
      account: string;
      type: TypeOfBatch;
      scheduledAt: number;
      timeInterval?: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/templates/${account}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: account,
          chainId,
          transfers: movements,
          type,
          scheduledAt,
          timeInterval,
        }),
        credentials: "include",
      });

      fetchTemplates();
    },
    [],
  );

  const value: BackendContextValue = {
    requestCookie,
    // User data
    user,

    // Templates data
    templates,
    isLoadingTemplates,
    templatesError,

    // Assets data
    assets,
    isLoadingAssets,
    assetsError,

    // Utility
    API_BASE_URL,

    sendPaymentToBackend,
    deletePaymentTemplate,
    fetchTemplates,
  };

  return (
    <BackendContext.Provider value={value}>{children}</BackendContext.Provider>
  );
}

// Create the custom hook
export function useBackend(): BackendContextValue {
  const context = useContext(BackendContext);
  if (context === undefined) {
    throw new Error("useBackend must be used within a BackendProvider");
  }
  return context;
}
