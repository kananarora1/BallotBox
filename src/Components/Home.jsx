// LandingPage.jsx
import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LandingPage = () => {
  const { account, connectWallet, isLoading } = useWeb3();
  const [isAdmin, setIsAdmin] = useState(null);
  const navigate = useNavigate();

  // Check if the connected account is admin
  useEffect(() => {
    if (!isLoading && account) {
      const adminAddress = process.env.REACT_APP_ADMIN_ADDRESS?.toLowerCase();
      const isAdminAccount = account.toLowerCase() === adminAddress;
      setIsAdmin(isAdminAccount);
    }
  }, [account, isLoading]);

  // Handle navigation after wallet connection
  useEffect(() => {
    if (!isLoading && account && isAdmin !== null) {
      const path = isAdmin ? '/admin' : '/voter';
      navigate(path, { replace: true });
    }
  }, [account, isAdmin, isLoading, navigate]);

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      toast.error('No Ethereum wallet detected. Please install MetaMask!');
      return;
    }
    await connectWallet();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center px-4">
      {/* Main Content Container */}
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold text-white">
            BallotBox
          </h1>
          <p className="text-xl text-gray-300">
            Secure, Transparent, and Decentralized Voting Platform
          </p>
        </div>

        {/* Connection Status and Buttons */}
        <div className="space-y-6">
          {!account && !isLoading ? (
            // Connect Wallet Button
            <button
              onClick={handleConnectWallet}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full 
                         transition duration-300 ease-in-out transform hover:scale-105
                         shadow-lg hover:shadow-xl"
            >
              Connect Wallet
            </button>
          ) : isLoading ? (
            // Loading State
            <div className="flex justify-center items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="text-white">Loading...</span>
            </div>
          ) : (
            // Dashboard Navigation Buttons
            <div className="space-y-4">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full
                             transition duration-300 ease-in-out transform hover:scale-105
                             shadow-lg hover:shadow-xl w-64"
                >
                  Admin Dashboard
                </button>
              )}
              {!isAdmin && (
                <button
                  onClick={() => navigate('/voter')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full
                             transition duration-300 ease-in-out transform hover:scale-105
                             shadow-lg hover:shadow-xl w-64"
                >
                  Voter Dashboard
                </button>
              )}
              
              {/* Connected Account Display */}
              <div className="text-gray-400 mt-4">
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-2">Secure</h3>
            <p className="text-gray-300">Blockchain-powered security for your votes</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-2">Transparent</h3>
            <p className="text-gray-300">Fully verifiable voting process</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-2">Decentralized</h3>
            <p className="text-gray-300">No central authority needed</p>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default LandingPage;