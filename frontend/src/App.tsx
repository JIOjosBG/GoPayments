import "./App.css";
import Home from "./pages/Home";
import Assets from "./pages/Assets";
import History from "./pages/History";
import Header from "./pages/components/Header";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import React from "react";

const Layout = () => (
  <>
    <Header />
    <Outlet />
  </>
);

function App(): React.ReactElement {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
