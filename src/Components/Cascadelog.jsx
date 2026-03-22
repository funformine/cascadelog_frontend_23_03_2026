import React from 'react';
import { FiCode, FiActivity, FiCpu, FiTrendingUp, FiCheckCircle, FiLayout } from 'react-icons/fi';
import '../Styles/Cascadelog.css';

const CascadelogMain = () => {
  const advantages = [
      {
          icon: <FiCode />,
          title: <>Daily <a href="https://cssbattle.dev" target="_blank" rel="noreferrer" className="CascadeMain_link">CSS Battle</a> Showcase</>,
          desc: <>A dedicated platform to upload and display daily <a href="https://cssbattle.dev" target="_blank" rel="noreferrer" className="CascadeMain_link">CSS Battle</a> solutions, turning code into a visual gallery.</>,
      },
    {
      icon: <FiCpu />,
      title: "Custom HTML/CSS/JS Compiler",
      desc: "Utilizes a proprietary compiler logic to render front-end code instantly without external dependencies."
    },
    {
      icon: <FiActivity />,
      title: "Consistency Tracking",
      desc: "Visualizing your growth with a daily consistency graph to ensure no day goes without a masterpiece."
    },
    {
      icon: <FiLayout />,
      title: "Strict 400x300 Precision",
      desc: "Every preview is locked to a perfect 400x300 viewport, ensuring pixel-perfect matching with original designs."
    },
    {
      icon: <FiTrendingUp />,
      title: "Skill Evolution",
      desc: "Monitor your progress as your solutions become more optimized and cleaner over time."
    },
    {
      icon: <FiCheckCircle />,
      title: "Responsive Validation",
      desc: "Features advanced scaling logic that maintains internal resolution regardless of the viewing device."
    }
  ];

  return (
    <div className="CascadeMain_pageContainer">
      {/* Hero Section */}
      <header className="CascadeMain_hero">
        <h1 className="CascadeMain_title">Cascade<span>log</span></h1>
        <p className="CascadeMain_subtitle">The Ultimate Showcase for Daily CSS Mastery</p>
      </header>

      {/* Advantage Grid */}
      <section className="CascadeMain_gridSection">
        <h2 className="CascadeMain_sectionHeading">Platform Advantages</h2>
        <div className="CascadeMain_advantageGrid">
          {advantages.map((item, index) => (
            <div key={index} className="CascadeMain_advantageCard">
              <div className="CascadeMain_iconWrapper">{item.icon}</div>
              <h3 className="CascadeMain_cardTitle">{item.title}</h3>
              <p className="CascadeMain_cardDesc">{item.desc}</p>
              <div className="CascadeMain_cardBgAccent"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Indicator of Consistency */}
      <section className="CascadeMain_consistencyBanner">
        <div className="CascadeMain_bannerContent">
          <h3>Maintaining The Streak</h3>
          <p>The Cascadelog backend on Render tracks every submission to build your personal contribution heat-map.</p>
        </div>
      </section>
    </div>
  );
};

export default CascadelogMain;