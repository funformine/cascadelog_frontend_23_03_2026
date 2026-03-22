import React from 'react';
import '../Styles/About.css';

const About = () => {
  return (
  <div className="About_Container">
      <div className="About_wrapper">
        
        {/* Portion 1: Founder & Personal Vision - Added Entry Animation */}
        <div className="About_portion About_fadeInUp About_stagger1">
          <div className="About_founderCard">
            <div className="About_imgWrapper">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" 
                alt="Thanush S" 
                className="About_founderImg" 
              />
            </div>
            <h2 className="About_founderName">Thanush S</h2>
            <p className="About_founderTitle">Founder & Lead Developer</p>
          </div>
          
          <div className="About_textGrid">
             <div className="About_gridBox">
              <h4>Developer Experience</h4>
              <p>Focused on building intuitive tools that simplify the coding journey for developers of all levels.</p>
            </div>
            <div className="About_gridBox">
              <h4>Vision for Growth</h4>
              <p>Aiming to create a global ecosystem where knowledge sharing and code reuse become second nature.</p>
            </div>
          </div>
        </div>

        {/* Portion 2: Project Capabilities - Added Entry Animation */}
        <div className="About_portion About_fadeInUp About_stagger2">
          <h3 className="About_gridHeader">Project Ecosystem</h3>
          <div className="About_textGrid">
            <div className="About_gridBox">
              <h4>Real-Time Sync</h4>
              <p>Experience zero-latency updates between your local workspace and our secure cloud.</p>
            </div>
            <div className="About_gridBox">
              <h4>Code Integrity</h4>
              <p>Advanced indexing ensures your HTML, CSS, and JS snippets remain structured.</p>
            </div>
            <div className="About_gridBox">
              <h4>Scalability</h4>
              <p>Designed to handle thousands of snippets without compromising on UI performance.</p>
            </div>
            <div className="About_gridBox">
              <h4>Collaboration</h4>
              <p>Bridge the gap between developers by sharing logic through a centralized hub.</p>
            </div>
            <div className="About_gridBox">
              <h4>Secure Storage</h4>
              <p>Industry-standard encryption to keep your intellectual property safe and private.</p>
            </div>
            <div className="About_gridBox">
              <h4>Customizable UI</h4>
              <p>Modern, eye-friendly interface designed for peak productivity and late-night coding.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seamless Infinite Loop Footer - Added Slide In */}
      <div className="About_fullWidthSection About_slideUpFooter">
        <div className="About_marquee">
              <div className="About_track">
                  <div className="About_infoGroup">
                    <span>EMAIL: support@cascadelog.com</span>
                    <span>ADDRESS: 123 Dev Lane, Tech City</span>
                    <span>CONTACT: +1 (555) 000-1234</span>
                    <span>VERSION: v2.0.4 - 2026 Edition</span>
                    <span>COPYRIGHTS: 2026@copyright</span>
                  </div>
                  <div className="About_infoGroup" aria-hidden="true">
                    <span>EMAIL: support@cascadelog.com</span>
                    <span>ADDRESS: 123 Dev Lane, Tech City</span>
                    <span>CONTACT: +1 (555) 000-1234</span>
                    <span>VERSION: v2.0.4 - 2026 Edition</span>
                    <span>COPYRIGHTS: 2026@copyright</span>
                  </div>
              </div>
        </div>
      </div>
    
    </div>
  );
};

export default About;