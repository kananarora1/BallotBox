import React, { useEffect, useState, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useWeb3 } from './Web3Context';

const ProtectedRoute = ({ adminOnly = false }) => {
  const { account, isLoading } = useWeb3();
  const location = useLocation();
  
  const adminCheck = useMemo(() => {
    const adminAddress = process.env.REACT_APP_ADMIN_ADDRESS?.trim().toLowerCase();
    const currentAccount = account?.toLowerCase();

    return {
      isAdmin: adminAddress === currentAccount,
      adminAddress,
      currentAccount
    };
  }, [account]);

  if (isLoading) {
    return <div>Verifying wallet details...</div>;
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