import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const { account, connectWallet, isLoading } = useWeb3();
  const [isAdmin, setIsAdmin] = useState(false);
  const [redirected, setRedirected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && account) {
      const admin = process.env.REACT_APP_ADMIN_ADDRESS;
      const adminAddress = admin.toLowerCase();
      setIsAdmin(account.toLowerCase() === adminAddress);
    }
  }, [account, isLoading]);

  useEffect(() => {
    if (account && !redirected) {
      if (isAdmin) {
        console.log('Redirecting to Admin Dashboard');
        navigate('/admin');
      } else {
        console.log('Redirecting to Voter Dashboard');
        navigate('/voter');
      }
      setRedirected(true);
    }
  }, [account, isAdmin, navigate, redirected]);

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(https://source.unsplash.com/1600x900/?voting,election)',
      }}
    >
      <div className="text-center text-white max-w-2xl p-8 bg-black/40 rounded-2xl">
        <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          BallotBox
        </h1>
        <p className="text-xl mb-8 text-gray-300">
          Secure, Transparent, and Decentralized Voting Platform
        </p>

        {!account && !isLoading ? (
          <button
            onClick={connectWallet}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105"
          >
            Connect Wallet
          </button>
        ) : isLoading ? (
          <div className="flex justify-center items-center text-gray-300 space-x-4">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"></svg>
            <span>Loading...</span>
          </div>
        ) : (
          <div className="space-x-4">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full"
              >
                Admin Dashboard
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => navigate('/voter')}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-full"
              >
                Voter Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
