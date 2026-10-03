import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ethers, BrowserProvider, Signer } from "ethers";
import { Web3MicroPayClient } from "../web3-client";
import { DEPLOYMENT_INFO } from "@web3-micropay/shared";

export const SEPOLIA_CHAIN_ID = 11155111;
export const LOCAL_CHAIN_ID = 31337;

export interface WalletContextType {
  address: string | null;
  chainId: number | null;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  error: string | null;
  client: Web3MicroPayClient | null;
  signer: Signer | null;
  provider: BrowserProvider | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>("0.0");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Web3MicroPayClient | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const vaultAddress =
    (import.meta as any).env?.VITE_MICROPAY_VAULT_ADDRESS ||
    DEPLOYMENT_INFO?.vaultAddress ||
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const refreshBalance = useCallback(async () => {
    if (!provider || !address) return;
    try {
      const bal = await provider.getBalance(address);
      setBalance(ethers.formatEther(bal));
    } catch {
      // ignore transient balance fetch error
    }
  }, [provider, address]);

  const initWallet = useCallback(async (injected: any) => {
    try {
      setIsConnecting(true);
      setError(null);
      const browserProvider = new BrowserProvider(injected);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("No Ethereum accounts found in wallet.");
      }

      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);
      const userSigner = await browserProvider.getSigner();
      const userAddress = await userSigner.getAddress();

      const newClient = new Web3MicroPayClient(
        browserProvider,
        vaultAddress,
        BigInt(currentChainId),
        userSigner
      );

      setProvider(browserProvider);
      setSigner(userSigner);
      setAddress(userAddress);
      setChainId(currentChainId);
      setClient(newClient);

      const bal = await browserProvider.getBalance(userAddress);
      setBalance(ethers.formatEther(bal));
    } catch (err: any) {
      if (err.code === 4001 || err?.message?.includes("rejected")) {
        setError("Transaction rejected by wallet.");
      } else {
        setError(err.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [vaultAddress]);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("No EVM wallet detected. Please install MetaMask, Coinbase Wallet, or Rabby.");
      return;
    }
    await initWallet((window as any).ethereum);
  }, [initWallet]);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setBalance("0.0");
    setSigner(null);
    setProvider(null);
    setClient(null);
    setError(null);
  }, []);

  const switchToSepolia = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // 11155111 in hex
      });
    } catch (switchError: any) {
      // 4902 means network has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Ethereum Sepolia",
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://rpc.sepolia.org", "https://ethereum-sepolia.publicnode.com"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError: any) {
          setError(addError.message || "Failed to add Sepolia network");
        }
      } else {
        setError(switchError.message || "Failed to switch to Sepolia network");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;

    // Auto-reconnect if already authorized
    const checkAuthorized = async () => {
      try {
        const browserProvider = new BrowserProvider(ethereum);
        const accounts = await browserProvider.send("eth_accounts", []);
        if (accounts && accounts.length > 0) {
          const network = await browserProvider.getNetwork();
          const currentChainId = Number(network.chainId);
          const userSigner = await browserProvider.getSigner();
          const userAddress = await userSigner.getAddress();

          const newClient = new Web3MicroPayClient(
            browserProvider,
            vaultAddress,
            BigInt(currentChainId),
            userSigner
          );

          setProvider(browserProvider);
          setSigner(userSigner);
          setAddress(userAddress);
          setChainId(currentChainId);
          setClient(newClient);

          const bal = await browserProvider.getBalance(userAddress);
          setBalance(ethers.formatEther(bal));
        }
      } catch {
        // silent fail on initial check
      }
    };
    checkAuthorized();

    const handleAccountsChanged = async (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else {
        const nextAddress = accounts[0];
        setAddress(nextAddress);
        try {
          const browserProvider = new BrowserProvider(ethereum);
          const nextSigner = await browserProvider.getSigner(nextAddress);
          const network = await browserProvider.getNetwork();
          const currentChainId = Number(network.chainId);
          const nextClient = new Web3MicroPayClient(
            browserProvider,
            vaultAddress,
            BigInt(currentChainId),
            nextSigner
          );
          setProvider(browserProvider);
          setSigner(nextSigner);
          setClient(nextClient);
          const bal = await browserProvider.getBalance(nextAddress);
          setBalance(ethers.formatEther(bal));
        } catch {
          // ignore transient error
        }
      }
    };

    const handleChainChanged = (newChainIdHex: string) => {
      setChainId(parseInt(newChainIdHex, 16));
      window.location.reload();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [disconnectWallet, vaultAddress]);

  const isConnected = !!address && !!signer;
  const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID && chainId !== LOCAL_CHAIN_ID;

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        balance,
        isConnected,
        isConnecting,
        isWrongNetwork,
        error,
        client,
        signer,
        provider,
        connectWallet,
        disconnectWallet,
        switchToSepolia,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    return {
      address: null,
      chainId: null,
      balance: "0.0",
      isConnected: false,
      isConnecting: false,
      isWrongNetwork: false,
      error: null,
      client: null,
      signer: null,
      provider: null,
      connectWallet: async () => {},
      disconnectWallet: () => {},
      switchToSepolia: async () => {},
      refreshBalance: async () => {},
    };
  }
  return context;
};
