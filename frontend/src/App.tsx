import './App.css';
import Home from './pages/Home';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

function App(): React.ReactElement {
  return (<Router>
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  </Router>);
}

export default App;
