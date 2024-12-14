import React, { createContext, useState, useContext, useEffect } from 'react';
import Web3 from 'web3';

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [web3Instance, setWeb3Instance] = useState(null);

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const connectedAccount = accounts[0];
          setAccount(connectedAccount);
          console.log('Wallet connected:', connectedAccount);

          // Create web3 instance
          const web3 = new Web3(window.ethereum);
          setWeb3Instance(web3);
        }
      } else {
        console.error('MetaMask not found');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    connectWallet();

    // Add event listener for account changes
    const handleAccountsChanged = (newAccounts) => {
      if (newAccounts.length > 0) {
        setAccount(newAccounts[0]);
      } else {
        setAccount(null);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return (
    <Web3Context.Provider value={{ account, isLoading, web3: web3Instance, connectWallet }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
