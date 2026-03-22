import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from './Auth/supabaseClient'; // Ensure this path is correct
import { LogoSVG } from './Utilities';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const [profileImg, setProfileImg] = useState(localStorage.getItem('profileImg') || null);
    const navigate = useNavigate();
    
    const dropdownRef = useRef(null);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const toggleUserDropdown = () => setIsUserDropdownOpen(!isUserDropdownOpen);

    const handleAuthClick = (mode) => {
        setIsUserDropdownOpen(false); 
        navigate('/auth', { state: { mode } }); 
    };

    // 1. Unified Auth Listener (Supabase + LocalStorage)
    useEffect(() => {
        const fetchNavProfile = async (session) => {
            try {
                if(!session?.user?.id) return;
                const { data } = await supabase
                    .from('users_profile')
                    .select('profile_pic')
                    .eq('id', session.user.id)
                    .single();
                if (data?.profile_pic) {
                    localStorage.setItem('profileImg', data.profile_pic);
                    setProfileImg(data.profile_pic);
                }
            } catch (e) { /* ignore silently */ }
        };

        // Sync with Supabase Session directly
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                setIsLoggedIn(true);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userName', session.user.user_metadata.full_name || 'User');
                fetchNavProfile(session);
            } else {
                setIsLoggedIn(false);
                setProfileImg(null);
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userName');
                localStorage.removeItem('profileImg');
            }
        });

        // Backup listener for manual events
        const checkAuth = () => {
            const authStatus = localStorage.getItem('isLoggedIn') === 'true';
            setIsLoggedIn(authStatus);
            setProfileImg(localStorage.getItem('profileImg') || null);
        };

        window.addEventListener('storage', checkAuth);
        window.addEventListener('profileUpdated', checkAuth);
        
        // Failsafe grab for current active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) fetchNavProfile(session);
        });
        
        return () => {
            subscription.unsubscribe();
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('profileUpdated', checkAuth);
        };
    }, []);

    // 2. Click Outside to Close Logic
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsUserDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isUserDropdownOpen]);

    const handleLogout = async () => {
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('profileImg');
        setIsLoggedIn(false);
        setProfileImg(null);
        setIsUserDropdownOpen(false);
        navigate('/'); 
    };

    return (
        <nav className="home_navbar">
            <div className="home_navbar-container">
                <div className="home-navbar_flex" onClick={() => navigate('/cascadelog')} style={{cursor: 'pointer'}}>
                    <div className="home_nav-logo">
                        <LogoSVG/>
                    </div>
                    <span className="home_logo-text">CascadeLog</span>
                </div>

                <button className="home_menu-toggle" onClick={toggleMenu}>
                    <span className="home_bar"></span>
                    <span className="home_bar"></span>
                    <span className="home_bar"></span>
                </button>

                <ul className={`home_nav-elements ${isMenuOpen ? 'home_active' : ''}`}>
                    <li><Link to="/" className="home_nav-link">Home</Link></li>
                    <li><Link to="/about" className="home_nav-link">About</Link></li>
                    {isLoggedIn && (<li><Link to="/dashboard" className="home_nav-link"> Dashboard</Link>  </li> )}
                </ul>

                <div className="home_login-utils">
                    {isLoggedIn && (
                        <span id="home_username">
                            {localStorage.getItem('userName') || 'User'}
                        </span>
                    )}
                    
                    <div className="home_user-wrapper" ref={dropdownRef}>
                        <div className="home_user-icon" onClick={toggleUserDropdown}>
                            {profileImg ? (
                                <img src={profileImg} alt="User Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="white" width="30" height="30">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                            )}
                        </div>

                        {isUserDropdownOpen && (
                            <div className="home_dropdown-menu">
                                {!isLoggedIn ? (
                                    <>
                                        <button className="dropdown-item" onClick={() => handleAuthClick('signin')}>Sign In</button>
                                        <button className="dropdown-item" onClick={() => handleAuthClick('signup')}>Sign Up</button>
                                    </>
                                ) : (
                                    <button className="dropdown-item logout" onClick={handleLogout}>Logout</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

