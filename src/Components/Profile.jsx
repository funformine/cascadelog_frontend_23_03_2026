import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FiUser, FiPhone, FiLock, FiEye, FiEyeOff, 
  FiEdit3, FiActivity, FiTrendingUp, FiCamera, FiCheck, FiX, FiLoader 
} from 'react-icons/fi';
import { supabase } from './Auth/supabaseClient'; 
import '../Styles/Profile.css';
import API_BASE_URL from './Auth/Config';
import { LoadingSvg } from './Utilities';
import { useModal } from '../Context/ModalContext';

const Profile = () => {
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null); // Full API Data
  const [profileImg, setProfileImg] = useState(null);   // Avatar URL
  const { showAlert } = useModal();
  
  // About Me States
  const [description, setDescription] = useState(""); 
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingAbout, setIsSavingAbout] = useState(false);

  // Password Edit States
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passwords, setPasswords] = useState({ old: '', new: '' });

  const fileInputRef = useRef(null);

  // --- 1. FETCH FULL PROFILE DATA ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/full-profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) throw new Error("Failed to load profile");

        const data = await response.json();
        setProfileData(data);
        
        // Initialize Fields from DB
        if (data.details.profileImg) setProfileImg(data.details.profileImg);
        if (data.details.about) setDescription(data.details.about);

      } catch (err) {
        console.error("Profile Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // --- 2. HANDLE IMAGE UPLOAD ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optimistic UI Update
    setProfileImg(URL.createObjectURL(file));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE_URL}/api/update-avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Update with server URL to ensure consistency
      setProfileImg(result.url);
      localStorage.setItem('profileImg', result.url);
      window.dispatchEvent(new Event("profileUpdated"));

    } catch (err) {
      console.error("Upload failed", err);
      showAlert({
        type: 'danger',
        title: 'Update Failed',
        message: "We couldn't save your new profile picture. Please try again or check your connection.",
        confirmText: 'Dismiss'
      });
    }
  };

  // --- 3. HANDLE ABOUT ME SAVE ---
  const handleSaveAbout = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setIsSavingAbout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_BASE_URL}/api/update-about`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ about: description })
      });

      if (!response.ok) throw new Error("Failed to update");
      
      setIsEditing(false); // Exit edit mode

    } catch (err) {
      console.error(err);
      showAlert({
        type: 'warning',
        title: 'Save Interrupted',
        message: "Your bio couldn't be saved at this moment. Please double-check your network.",
        confirmText: 'Okay'
      });
    } finally {
      setIsSavingAbout(false);
    }
  };

  // --- 4. COMPUTE WEEKLY GRAPH DATA ---
  const currentWeekData = useMemo(() => {
    if (!profileData || !profileData.activity) return [];

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday start

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const isActive = profileData.activity.dates.includes(dateStr);

      return { 
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        active: isActive,
        isToday: date.toDateString() === today.toDateString()
      };
    });
  }, [profileData]);

  if (loading) {
    return (
      <div className="Prof_container" style={{display:'flex', justifyContent:'center', alignItems:'center',height:'100vh'}}>
        <LoadingSvg/>
      </div>
    );
  }

  // Safe Defaults
  const user = profileData?.details || { name: "User", email: "...", phone: "Not Set" };
  const stats = profileData?.stats || { streak: 0, monthly: 0 };
  const recentTasks = profileData?.activity?.recent || [];

  return (
    <div className="Prof_container fade-in">
      <div className="Prof_mainGrid">
        
        {/* --- LEFT COLUMN --- */}
        <div className="Prof_leftCol slide-up" style={{ animationDelay: '0.1s' }}>
          
          {/* Main Info Card */}
          <div className="Prof_card Prof_mainInfo">
            <div className="Prof_avatarWrapper">
              <div className="Prof_avatar">
                {profileImg ? (
                  <img src={profileImg} alt="Profile" className="Prof_imgPreview" />
                ) : (
                  <FiUser />
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                style={{display: 'none'}} 
                accept="image/*" 
              />
              <button className="Prof_editAvatar" onClick={() => fileInputRef.current.click()}>
                <FiCamera />
              </button>
            </div>
            
            <h2 className="Prof_userName">{user.name}</h2>
            <p className="Prof_userEmail">{user.email}</p>
            
            <div className="Prof_statsMini">
              <div className="Prof_statItem">
                  <span className="Prof_statVal">{stats.streak}</span>
                  <span className="Prof_statLab">Streak</span>
              </div>
              <div className="Prof_statItem">
                  <span className="Prof_statVal">{stats.monthly}</span>
                  <span className="Prof_statLab">Monthly</span>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="Prof_card Prof_details">
            <div className="Prof_sectionHeader">
               <h3 className="Prof_sectionTitle">Details</h3>
            </div>
            
            <div className="Prof_field">
              <label><FiPhone /> Phone</label>
              <p>{user.phone}</p>
            </div>

            <div className="Prof_field">
              <label><FiLock /> Password</label>
              {!isChangingPass ? (
                <div className="Prof_passwordWrapper">
                  <input type={showPassword ? "text" : "password"} value="********" readOnly />
                  <button className="Prof_miniEdit" onClick={() => setIsChangingPass(true)}><FiEdit3 /></button>
                </div>
              ) : (
                <div className="Prof_passChangeArea scale-in">
                  <input 
                    type="password" 
                    placeholder="New Password" 
                    className="Prof_passInput"
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  />
                  <div className="Prof_passActions">
                    <button className="Prof_confirmBtn" onClick={() => setIsChangingPass(false)}><FiCheck /> Update</button>
                    <button className="Prof_cancelBtn" onClick={() => setIsChangingPass(false)}><FiX /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="Prof_rightCol slide-up" style={{ animationDelay: '0.3s' }}>
          
          {/* Recent Submissions Card */}
          <div className="Prof_card Prof_history">
            <h3 className="Prof_sectionTitle">Recent Submissions</h3>
            <div className="Prof_taskList">
              {recentTasks.length > 0 ? (
                recentTasks.map((task, index) => (
                  <div key={index} className="Prof_taskItem">
                    <div className="Prof_taskIcon"><FiActivity /></div>
                    <div className="Prof_taskDetails">
                      <span className="Prof_taskName">
                        {task.name.length > 40 ? task.name.substring(0, 40) + "..." : task.name}
                      </span>
                      <span className="Prof_taskDate">{task.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="Prof_emptyState">
                   <p>No recent activity found.</p>
                </div>
              )}
            </div>
          </div>

          {/* About Me & Graph Card */}
          <div className="Prof_card Prof_aboutCard">
             <div className="Prof_aboutGrid">
                
                {/* Description Block */}
                <div className="Prof_descriptionBlock">
                   <div className="Prof_sectionHeader">
                      <h3 className="Prof_sectionTitle">About Me</h3>
                      <button 
                        className="Prof_editBtn" 
                        onClick={handleSaveAbout}
                        disabled={isSavingAbout}
                      >
                        <FiEdit3 /> {isSavingAbout ? "Saving..." : (isEditing ? "Save" : "Edit")}
                      </button>
                   </div>
                   
                   {isEditing ? (
                      <textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="Prof_textarea" 
                        placeholder="Tell us about yourself..."
                      />
                   ) : (
                      <p className="Prof_descText">
                        {description || "No description added yet."}
                      </p>
                   )}
                </div>

                {/* Graph Block */}
                <div className="Prof_graphBlock">
                   <h4 className="Prof_graphTitle"><FiTrendingUp /> Current Week</h4>
                   <div className="Prof_chartArea">
                      {currentWeekData.map((day, i) => (
                        <div key={i} className="Prof_barGroup">
                           <div className="Prof_barTrack">
                              <div 
                                className={`Prof_bar ${day.active ? 'active' : ''} ${day.isToday ? 'isToday' : ''}`} 
                                style={{ height: day.active ? '100%' : '15%' }}
                              ></div>
                           </div>
                           <span className={`Prof_dayLabel ${day.isToday ? 'active' : ''}`}>{day.label}</span>
                        </div>
                      ))}
                   </div>
                   <span className="Prof_graphStatus">
                     {stats.streak > 0 
                       ? `🔥 ${stats.streak} Day Streak!` 
                       : 'Start your streak today!'}
                   </span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;