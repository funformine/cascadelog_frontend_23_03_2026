import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import Home from './Components/Home'; 
import Auth from './Components/Auth';
import Navbar from './Components/Navbar';
import Footer from './Components/Footer';
import About from './Components/About';
import Dashboard from './Components/Dashboard';
import Gallery from './Components/Gallery';
import ProtectedRoute from './Components/Auth/ProtectedRoute';
import CascadelogMain from './Components/Cascadelog';
import { ModalProvider } from './Context/ModalContext';

// --- Inactivity Handler Component ---
const InactivityHandler = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    let logoutTimer;
    // 30 Minutes in milliseconds
    const INACTIVITY_LIMIT = 30*60 * 1000; 

    const logoutUser = () => {
      if (localStorage.getItem('isLoggedIn') === 'true') {
        console.log("User inactive for 30 mins. Logging out...");
        
        // 1. Clear Storage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('loginTimestamp');
        // Safety clear to remove any other stale data
        localStorage.clear(); 

        // 2. Redirect to Auth Page
        navigate('/auth');
      }
    };

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      
      // Only set the timer if the user is currently logged in
      if (localStorage.getItem('isLoggedIn') === 'true') {
        logoutTimer = setTimeout(logoutUser, INACTIVITY_LIMIT);
      }
    };

    // List of events that count as "Activity"
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Add listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Start the timer initially
    resetTimer();

    // Cleanup listeners on unmount (or page close)
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate]);

  return children;
};

function App() {
  return (
    <Router>
      <ModalProvider>
        <InactivityHandler>
          <Navbar /> 
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/cascadelog" element={<CascadelogMain />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Auth />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
            </Routes>
          </main>
          <Footer/>
        </InactivityHandler>
      </ModalProvider>
    </Router>
  );
}

export default App;