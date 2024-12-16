import React, { createContext, useState, useContext, useEffect } from 'react';
import Web3 from 'web3';

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [web3Instance, setWeb3Instance] = useState(null);
  const [error, setError] = useState(null);

  // Function to handle wallet connection
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install it to connect your wallet.');
      }

      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }


      setAccount(accounts[0]);

      // Initialize Web3
      const web3 = new Web3(window.ethereum);
      setWeb3Instance(web3);

      console.log('Connected to wallet:', accounts[0]);
    } catch (err) {
      console.error('Error connecting wallet:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check existing wallet connection
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        setIsLoading(true);
        console.log('Account in context:', account);

        if (window.ethereum && window.ethereum.isMetaMask) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);

            // Set up Web3
            const web3 = new Web3(window.ethereum);
            setWeb3Instance(web3);

            console.log('Existing connection found:', accounts[0]);
          }
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkWalletConnection();

    // Wallet event listeners
    const handleAccountsChanged = (newAccounts) => {
      if (newAccounts.length > 0) {
        setAccount(newAccounts[0]);
      } else {
        setAccount(null);
        setWeb3Instance(null);
      }
    };

    const handleChainChanged = () => {
      console.log('Network changed, refreshing connection...');
      setAccount(null);
      setWeb3Instance(null);
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
    <Web3Context.Provider value={{ account, isLoading, web3: web3Instance, connectWallet, error }}>
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
