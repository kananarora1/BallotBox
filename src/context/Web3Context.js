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
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request wallet accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        throw new Error('No wallet account found.');
      }

      // Set the connected account
      const connectedAccount = accounts[0];
      setAccount(connectedAccount);
      console.log('Wallet connected:', connectedAccount);

      // Set up Web3 instance
      const web3 = new Web3(window.ethereum);
      setWeb3Instance(web3);
    } catch (error) {
      console.error('Wallet connection error:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.ethereum && window.ethereum.isMetaMask) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const existingAccount = accounts[0];
            setAccount(existingAccount);
            console.log('Existing wallet connection found:', existingAccount);

            // Create Web3 instance for existing connection
            const web3 = new Web3(window.ethereum);
            setWeb3Instance(web3);
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkWalletConnection();

    // Add wallet event listeners
    const handleAccountsChanged = (newAccounts) => {
      if (newAccounts.length > 0) {
        setAccount(newAccounts[0]);
      } else {
        setAccount(null);
      }
    };

    const handleChainChanged = () => {
      console.log('Network changed, reloading...');
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
