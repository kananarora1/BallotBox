import React, { useMemo } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useWeb3 } from './Web3Context';

const ProtectedRoute = ({ adminOnly = false }) => {
  const { account, isLoading } = useWeb3();

  // Check admin status only when account changes
  const adminCheck = useMemo(() => {
    if (!account) return { isAdmin: false };

    const adminAddress = process.env.REACT_APP_ADMIN_ADDRESS?.trim().toLowerCase();
    const currentAccount = account.toLowerCase();
    return {
      isAdmin: adminAddress === currentAccount,
    };
  }, [account]);

  if (isLoading) {
    return <div className="loading">Verifying wallet details...</div>;
  }

  if (!account) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !adminCheck.isAdmin) {
    return <Navigate to="/voter" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
