import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Components/Home';
import { Web3Provider } from './context/Web3Context';

function App() {
  return(
    <Web3Provider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </Web3Provider>
  )
}

export default App;
