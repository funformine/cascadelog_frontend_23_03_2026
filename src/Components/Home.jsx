import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar'; 
import '../Styles/Home.css';

const Home = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Trigger animations shortly after mount
        setIsLoaded(true);
    }, []);
    const navigate = useNavigate();

    return (
        <div id="home_body" className={isLoaded ? 'is-animated' : ''}>
            <main className="home_main-wrapper">
                <section className="home_left-section">
                    <h1 className="home_slogan-text">
                        Store, Organize, <br />
                        <span className="home_highlight">and Preserve</span> <br />
                        Your Frontend Masterpieces.
                    </h1>
                    <p className="home_sub-text">
                        A dedicated space to archive your logic, refine your style, and keep your daily code legacy alive.
                    </p>
                    
                    <button className="home_cta-button" onClick={() => navigate('/dashboard')}>Access Gallery</button>
                </section>

                <section className="home_right-section">
                    <div className="home_image-grid">
                        <div className="home_img-card home_card-1"></div>
                        <div className="home_img-card home_card-2"></div>
                        <div className="home_img-card home_card-3"></div>
                        <div className="home_img-card home_card-4"></div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Home;