import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

const ProtectedRoute = ({ adminOnly = false }) => {
  const { account, isLoading } = useWeb3();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!isLoading && account) {
        const adminAddress = process.env.REACT_APP_ADMIN_ADDRESS?.toLowerCase();
        const isAdminAccount = account.toLowerCase() === adminAddress;
        setIsAdmin(isAdminAccount);
        setIsVerified(true);
      }
    };

    verifyAccess();
  }, [account, isLoading]);

  if (isLoading || !isVerified) {
    return <div>Verifying access...</div>;
  }

  if (!account) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/voter" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;