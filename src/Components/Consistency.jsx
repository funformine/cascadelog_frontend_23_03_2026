import React, { useState, useEffect, useMemo } from 'react';
import { FiInfo, FiChevronDown, FiActivity, FiLoader } from 'react-icons/fi';
import { supabase } from '../Components/Auth/supabaseClient'; // Ensure path is correct
import '../Styles/Consistency.css';
import API_BASE_URL from './Auth/Config';
import { LoadingSvg } from './Utilities';

const Consistency = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  
  // State for real data
  const [userUploads, setUserUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  const years = [2026, 2025, 2024];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // --- FETCH REAL DATA ---
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/submissions/consistency`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();
        setUserUploads(data); // Expecting array: [{ date: '2026-01-18' }, ...]

      } catch (err) {
        console.error("Error loading consistency stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const graphData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // Count submissions for this specific date
      const count = userUploads.filter(u => u.date === dateStr).length;
      return { day, count };
    });
  }, [selectedYear, selectedMonth, userUploads]);

  if (loading) {
    return (
      <div className="Cons_container" style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'80vh' }}>
        <LoadingSvg/>
      </div>
    );
  }

  return (
    <div className="Cons_container">
      <div className="Cons_card fade-in-up">
        
        {/* Header Section */}
        <div className="Cons_header anim-delay-1">
          <div className="Cons_titleGroup">
            <span className="Cons_count">{userUploads.length}</span>
            <span className="Cons_subtitle">total submissions</span>
            <FiInfo className="Cons_infoIcon" />
          </div>

          <div className="Cons_dropdownWrapper">
            <button className="Cons_yearBtn" onClick={() => setIsYearOpen(!isYearOpen)}>
              {selectedYear} <FiChevronDown />
            </button>
            {isYearOpen && (
              <div className="Cons_dropdownMenu scale-in">
                {years.map(y => (
                  <div key={y} className="Cons_dropdownItem" onClick={() => { setSelectedYear(y); setIsYearOpen(false); }}>{y}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="Cons_heatmapWrapper anim-delay-2">
          <div className="Cons_gridContainer">
            {months.map((m, mIndex) => (
              <div key={m} className="Cons_monthColumn">
                <div className="Cons_squareGrid">
                  {/* Create 31 squares (max days) for grid visual */}
                  {[...Array(31)].map((_, dIndex) => {
                    const dateStr = `${selectedYear}-${String(mIndex + 1).padStart(2, '0')}-${String(dIndex + 1).padStart(2, '0')}`;
                    const hasUpload = userUploads.some(u => u.date === dateStr);
                    
                    // Optional: Grey out invalid days (e.g. Feb 30)
                    const isValidDate = new Date(selectedYear, mIndex, dIndex + 1).getMonth() === mIndex;
                    
                    if (!isValidDate) return <div key={dIndex} className="Cons_square empty" />;

                    return (
                      <div 
                        key={dIndex} 
                        className={`Cons_square ${hasUpload ? 'active' : ''}`} 
                        title={`${m} ${dIndex + 1}: ${hasUpload ? 'Completed' : 'Missed'}`}
                      />
                    );
                  })}
                </div>
                <span className="Cons_monthLabel">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph Section */}
        <div className="Cons_graphSection anim-delay-3">
          <div className="Cons_graphHeader">
            <h3 className="Cons_graphTitle"><FiActivity /> Daily Activity Trends</h3>
            <div className="Cons_dropdownWrapper">
              <button className="Cons_yearBtn" onClick={() => setIsMonthOpen(!isMonthOpen)}>
                {months[selectedMonth]} <FiChevronDown />
              </button>
              {isMonthOpen && (
                <div className="Cons_dropdownMenu scale-in">
                  {months.map((m, idx) => (
                    <div key={m} className="Cons_dropdownItem" onClick={() => { setSelectedMonth(idx); setIsMonthOpen(false); }}>{m}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="Cons_chartContainer">
            <div className="Cons_yAxis">
              <span>Post</span>
              <span>Miss</span>
            </div>
            <div className="Cons_barsWrapper">
              {graphData.map((data) => (
                <div key={data.day} className="Cons_barGroup">
                  <div 
                    className={`Cons_bar ${data.count > 0 ? 'active' : ''}`} 
                    style={{ height: data.count > 0 ? '100%' : '15%' }}
                    title={`${months[selectedMonth]} ${data.day}: ${data.count} submissions`}
                  />
                  {/* Only show label for every 5th day to avoid clutter */}
                  {data.day % 5 === 0 && <span className="Cons_barLabel">{data.day}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consistency;