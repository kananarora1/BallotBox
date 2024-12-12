import React from 'react';
import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Components/Home';
import { Web3Provider } from './context/Web3Context';
import ProtectedRoute from './context/protectedRoute';
import AdminDashboard from './Components/Admin';

function App() {
  return(
    <Web3Provider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Router>
    </Web3Provider>
  )
}

export default App;
