import React, { useState, useEffect } from 'react';
import {
  FiTarget,
  FiActivity,
  FiSettings,
  FiTerminal,
  FiImage,
  FiLogOut,
  FiChevronRight,
  FiChevronLeft,
  FiUser,
  FiUpload
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { supabase } from './Auth/supabaseClient';
import Playground from '../Components/Playground'; // Import your new page component
import CssUpload from './CssUpload'; // Import CssUpload page
import UserManagement from './Admin/UserManagement';
import UserActivity from './Admin/UserActivity';
import { FiUsers, FiActivity as FiPlatformActivity } from 'react-icons/fi';
import '../Styles/Dashboard.css';
import DailyActivity from './DailyActivity';
import Gallery from './Gallery';
import Consistency from './Consistency';
import Profile from './Profile';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(localStorage.getItem('dash_active_tab') || 'daily Activity');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('dash_active_tab', tab);
  };

  useEffect(() => {
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      updateAdminState(session);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      updateAdminState(session);
    });

    const updateAdminState = (session) => {
      const userEmail = session?.user?.email?.toLowerCase().trim();
      const currentIsAdmin = userEmail === 'cascadeadmin@gmail.com';
      
      setIsAdmin(currentIsAdmin);

      const savedTab = localStorage.getItem('dash_active_tab');
      
      if (currentIsAdmin) {
        // If it's an admin, ensure the saved tab is an admin tab. If not, default to User Management.
        const adminTabs = ['User Management', 'Platform Activity'];
        if (!savedTab || !adminTabs.includes(savedTab)) {
          handleTabChange('User Management');
        } else {
          setActiveTab(savedTab);
        }
      } else {
        // If it's a regular user, ensure the saved tab is a user tab. If not, default to Daily Activity.
        const userTabs = ['daily Activity', 'playground', 'cssUpload', 'gallery', 'Consistency', 'Profile'];
        if (!savedTab || !userTabs.includes(savedTab)) {
          handleTabChange('daily Activity');
        } else {
          setActiveTab(savedTab);
        }
      }
    };

    checkCurrentSession();
    return () => subscription.unsubscribe();
  }, []);

  const menuItems = isAdmin 
    ? [
        { name: 'User Management', icon: <FiUsers /> },
        { name: 'Platform Activity', icon: <FiPlatformActivity /> }
      ]
    : [
        { name: 'daily Activity', icon: <FiActivity /> },
        { name: 'playground', icon: <FiTerminal /> },
        { name: 'cssUpload', icon: <FiUpload /> },
        { name: 'gallery', icon: <FiImage /> },
        { name: 'Consistency', icon: <FiTarget /> },
        { name: 'Profile', icon: <FiUser /> }
      ];

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event("storage"));
    navigate('/auth');
  };

  // Helper function to render the correct component based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'playground':
        return <div style={{ height: '79vh', width: '79vw' }}><Playground /></div>
      case 'cssUpload':
        return <CssUpload />
      case 'daily Activity':
        return <DailyActivity />;
      case 'gallery':
        return <Gallery />;
      case 'Consistency':
        return <Consistency />;
      case 'Profile':
        return <Profile />;
      case 'User Management':
        return <UserManagement />;
      case 'Platform Activity':
        return <UserActivity />;
      default:
        return (
          <div className="Dash_card">
            <h3 style={{ textTransform: 'capitalize' }}>{activeTab}</h3>
            <p>This section is currently under development.</p>
          </div>
        );
    }
  };

  return (
    <div className={`Dash_container ${isCollapsed ? 'collapsed' : ''}`}>
      <aside className="Dash_sidebar">
        <div className="Dash_sidebarHeader">
          {!isCollapsed && (
            <h2 className="Dash_logoText">
              Cascade<span>Log</span>
            </h2>
          )}

          <button
            className="Dash_toggleBtn"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="Dash_nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`Dash_navItem ${activeTab === item.name ? 'Dash_active' : ''}`}
              onClick={() => handleTabChange(item.name)}
            >
              <span className="Dash_icon">{item.icon}</span>
              <span className="Dash_linkText">{item.name}</span>
              {activeTab === item.name && !isCollapsed && <FiChevronRight className="Dash_indicator" />}
            </button>
          ))}

          {/* <button className="Dash_logoutBtn" onClick={handleLogout}>
            <FiLogOut />
            <span className="Dash_linkText">Logout</span>
          </button> */}
        </nav>
      </aside>

      <main className="Dash_main">
        <section className="Dash_contentBody">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;