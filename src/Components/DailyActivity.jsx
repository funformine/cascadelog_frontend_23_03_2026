import '../Styles/DailyActivity.css';
import React, { useState, useEffect } from 'react';
import { 
  FiPlay, FiUpload, FiExternalLink, FiAward, FiAlertCircle, 
  FiCheckCircle, FiTrash2, FiEdit3, FiFile, FiX, FiLoader 
} from 'react-icons/fi';
import { supabase } from './Auth/supabaseClient';
import API_BASE_URL from './Auth/Config';
import { LoadingSvg } from './Utilities';
import { useModal } from '../Context/ModalContext';

const DailyActivity = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({ HTML: null, CSS: null, JS: null });
  const [description, setDescription] = useState(""); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [submissionId, setSubmissionId] = useState(null); // Track the record ID
  const { showConfirm } = useModal();
  
  const [popup, setPopup] = useState({ visible: false, message: '' });

  // --- 1. TIMEZONE HELPERS ---
  const todayStr = new Date().toLocaleDateString('en-CA'); 

  const getStartOfTodayISO = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  };

  const displayDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', day: 'numeric', year: 'numeric' 
  });

  const getCacheKey = (userId) => {
    return `daily_submission_${userId}_${todayStr}`;
  };

  const showSuccessPopup = (msg) => {
    setPopup({ visible: true, message: msg });
    setTimeout(() => {
      setPopup({ visible: false, message: '' });
    }, 3000);
  };

  // --- 2. STATUS CHECK (Smart Sync) ---
  useEffect(() => {
    const checkStatusAndCleanup = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const userId = session.user.id;
        const currentCacheKey = getCacheKey(userId);

        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(`daily_submission_${userId}_`) && key !== currentCacheKey) {
            localStorage.removeItem(key);
          }
        });

        const cachedData = localStorage.getItem(currentCacheKey);
        let hasCache = false;

        if (cachedData) {
          const result = JSON.parse(cachedData);
          setIsCompleted(true);
          setIsStarted(true);
          setSelectedFiles(result.files);
          setDescription(result.description || "");
          setSubmissionId(result.id || null); // Load ID from cache
          hasCache = true;
          setLoading(false);
        }

        const startOfDay = getStartOfTodayISO();
        
        const response = await fetch(`${API_BASE_URL}/api/submissions/check-today?date=${startOfDay}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        const result = await response.json();

        if (result.submitted) {
          setIsCompleted(true);
          setIsStarted(true);
          setSelectedFiles(result.data.files);
          setDescription(result.data.description || "");
          setSubmissionId(result.data.id); // Store ID from database
          localStorage.setItem(currentCacheKey, JSON.stringify(result.data));
        } else {
          if (hasCache) {
            localStorage.removeItem(currentCacheKey);
            setIsCompleted(false);
            setIsStarted(false);
            setSelectedFiles({ HTML: null, CSS: null, JS: null });
            setDescription("");
            setSubmissionId(null);
          }
        }

      } catch (err) {
        console.error("Failed to check status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatusAndCleanup();
  }, [todayStr]);

  const handleFileChange = (type, file) => {
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
    if (error) setError(""); 
  };

  const handleRemoveFile = (type) => {
    setSelectedFiles(prev => ({ ...prev, [type]: null }));
  };

  const handleReview = async () => {
    const hasFiles = Object.values(selectedFiles).some(file => file !== null);
    if (!hasFiles) {
      setError("You haven't uploaded any files.");
      return;
    }

    setIsSubmitting(true); 
    const formData = new FormData();
    if (selectedFiles.HTML instanceof File) formData.append('html', selectedFiles.HTML);
    if (selectedFiles.CSS instanceof File)  formData.append('css', selectedFiles.CSS);
    if (selectedFiles.JS instanceof File)   formData.append('js', selectedFiles.JS);
    formData.append('description', description); 

    // CRITICAL: Send existingId so the backend performs an UPDATE
    if (submissionId) {
      formData.append('existingId', submissionId);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("You must be logged in to submit.");
        return;
      }

      // We use POST for both new and updates because Multer/FormData work best with POST
      const response = await fetch(`${API_BASE_URL}/api/submissions/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed");

      // Store the ID returned by the backend for future edits
      if (result.data && result.data.id) {
        setSubmissionId(result.data.id);
      }

      setError("");
      showSuccessPopup(submissionId ? "Update Successful!" : "Submission Successful!"); 
      
      setIsCompleted(true);

      const successData = {
        id: result.data?.id || submissionId, // Include ID in local cache
        description: description,
        files: {
          HTML: selectedFiles.HTML ? { name: selectedFiles.HTML.name } : null,
          CSS: selectedFiles.CSS ? { name: selectedFiles.CSS.name } : null,
          JS: selectedFiles.JS ? { name: selectedFiles.JS.name } : null,
        }
      };
      
      setSelectedFiles(prev => ({
        HTML: prev.HTML ? { name: prev.HTML.name || 'Submitted HTML' } : null,
        CSS: prev.CSS ? { name: prev.CSS.name || 'Submitted CSS' } : null,
        JS: prev.JS ? { name: prev.JS.name || 'Submitted JS' } : null,
      }));

      const cacheKey = getCacheKey(session.user.id);
      localStorage.setItem(cacheKey, JSON.stringify(successData));

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      type: 'danger',
      title: 'Delete Submission?',
      message: 'Are you sure you want to permanently delete your daily code entry? This cannot be recovered.',
      confirmText: 'Yes, Delete'
    });

    if (confirmed) {
      setSelectedFiles({ HTML: null, CSS: null, JS: null });
      setDescription("");
      setIsCompleted(false);
      setIsStarted(false);
      setSubmissionId(null); 

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const cacheKey = getCacheKey(session.user.id);
        localStorage.removeItem(cacheKey);
      }
    }
  };

  const handleEdit = () => {
    setIsCompleted(false); 
  };

  const handleLaunchBattle = () => {
    window.open('https://cssbattle.dev', '_blank');
  };

  const getStatus = () => {
    if (isCompleted) return { text: 'Completed', class: 'DAILYACT_completed' };
    if (isStarted) return { text: 'In Progress', class: 'DAILYACT_active' };
    return { text: 'Pending', class: 'DAILYACT_pending' };
  };

  const status = getStatus();

  if (loading) return <div className="DAILYACT_container" style={{justifyContent:'center', alignItems:'center',height:'80vh'}}>{LoadingSvg()}</div>;

  return (
    <div className="DAILYACT_container DAILYACT_pageFade">
      
      {popup.visible && (
        <div className="DAILYACT_popupOverlay">
          <div className="DAILYACT_popupBox DAILYACT_scaleIn">
            <FiCheckCircle className="DAILYACT_popupIcon" />
            <h3 className="DAILYACT_popupTitle">Success!</h3>
            <p className="DAILYACT_popupMessage">{popup.message}</p>
          </div>
        </div>
      )}

      {/* Left Portion */}
      <div className="DAILYACT_leftPortion DAILYACT_fadeInUp DAILYACT_stagger1">
        <div className="DAILYACT_iframeHeader" onClick={handleLaunchBattle}>
          <span className="DAILYACT_headerTitle">Daily Challenge Portal</span>
          <FiExternalLink className="DAILYACT_headerIcon" />
        </div>
        
        <div className="DAILYACT_promoCard" onClick={handleLaunchBattle}>
          <div className="DAILYACT_promoLogoWrapper">
            <img 
              src="https://cssbattle.dev/images/logo-square.png" 
              alt="CSSBattle Logo" 
              className="DAILYACT_promoLogo"
            />
          </div>
          <h2 className="DAILYACT_promoTitle">Ready for Today's Battle?</h2>
          <p className="DAILYACT_promoNote">
            Improve your CSS skills by replicating targets with the smallest code possible.
          </p>
          <div className="DAILYACT_promoFeatures">
            <span className="DAILYACT_featureTag"><FiAward /> Global Ranking</span>
            <span className="DAILYACT_featureTag"><FiAward /> Daily Targets</span>
          </div>
          <button className="DAILYACT_launchBtn">
            Launch CSSBattle.dev
          </button>
        </div>
      </div>

      {/* Right Portion */}
      <div className="DAILYACT_rightPortion DAILYACT_fadeInUp DAILYACT_stagger2">
        <div className="DAILYACT_statusBox">
          <div className="DAILYACT_statusHeader">
            <h3 className="DAILYACT_boxTitle">Task Status</h3>
            <span className={`DAILYACT_statusBadge ${status.class}`}>
              {status.text}
            </span>
          </div>
          
          <div className="DAILYACT_statusGrid">
            <div className="DAILYACT_statusItem">
              <span className="DAILYACT_itemLabel">Date</span>
              <span className="DAILYACT_itemValue">{displayDate}</span>
            </div>
            <div className="DAILYACT_statusItem">
              <span className="DAILYACT_itemLabel">Current Task Points</span>
              <span className="DAILYACT_itemValue DAILYACT_pointsText">200</span>
            </div>
          </div>

          {!isStarted && !isCompleted && (
            <button className="DAILYACT_startActionBtn" onClick={() => setIsStarted(true)}>
              <FiPlay /> Start Session
            </button>
          )}
        </div>

        {/* Upload Portal */}
        {isStarted && !isCompleted && (
          <div className="DAILYACT_uploadBox DAILYACT_scaleIn">
            <h3 className="DAILYACT_boxTitle">{submissionId ? "Edit Submission" : "Submission Portal"}</h3>
            
            {error && (
              <div className="DAILYACT_validationError">
                <FiAlertCircle /> {error}
              </div>
            )}

            <div className="DAILYACT_uploadGrid">
              {['HTML', 'CSS', 'JS'].map((type) => (
                <label key={type} className={`DAILYACT_uploadLabel ${selectedFiles[type] ? 'DAILYACT_fileSelected' : ''}`}>
                  
                  {selectedFiles[type] && (
                    <div 
                      className="DAILYACT_removeFileBtn"
                      onClick={(e) => {
                        e.preventDefault(); 
                        handleRemoveFile(type);
                      }}
                      title="Remove file"
                    >
                      <FiX />
                    </div>
                  )}

                  <FiUpload className="DAILYACT_uploadIcon" /> 
                  <span className="DAILYACT_uploadText">
                    {selectedFiles[type] ? (selectedFiles[type].name || type) : type}
                  </span>
                  <input 
                    type="file" 
                    accept={`.${type.toLowerCase()}`} 
                    hidden 
                    onChange={(e) => handleFileChange(type, e.target.files[0])}
                  />
                </label>
              ))}
            </div>

            <div className="DAILYACT_descriptionWrapper" style={{marginTop: '20px'}}>
              <label className="DAILYACT_itemLabel">Description (Optional)</label>
              <textarea 
                className="DAILYACT_descriptionBox"
                placeholder="Explain your approach or add notes here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ readOnly: false, backgroundColor: '#fff' }} 
              />
            </div>

            <button 
              className={`DAILYACT_completeBtn ${isSubmitting ? 'DAILYACT_btnDisabled' : ''}`} 
              onClick={handleReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="DAILYACT_spinIcon" /> Processing...
                </>
              ) : (submissionId ? "Update Submission" : "Submit for Review")}
            </button>
          </div>
        )}

        {/* Completed View */}
        {isCompleted && (
          <div className="DAILYACT_uploadBox DAILYACT_scaleIn">
            <div className="DAILYACT_completedHeader">
              <FiCheckCircle className="DAILYACT_successIcon" />
              <div>
                <h3 className="DAILYACT_boxTitle">Submission Received</h3>
              </div>
            </div>

            <div className="DAILYACT_summaryList">
              {Object.entries(selectedFiles).map(([type, file]) => (
                file && (
                  <div key={type} className="DAILYACT_summaryItem">
                    <div className="DAILYACT_summaryIconWrapper">
                      <FiFile />
                    </div>
                    <div className="DAILYACT_summaryDetails">
                      {/* <span className="DAILYACT_summaryName">{file.name}</span> */}
                      {file.url && (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" style={{fontSize: '0.7rem', color:'#2563eb'}}>
                          View Code
                        </a>
                      )}
                      <span className="DAILYACT_summaryType">{type} FILE</span>
                    </div>
                  </div>
                )
              ))}
            </div>

            <div className="DAILYACT_descriptionWrapper">
              <label className="DAILYACT_itemLabel">Description</label>
              <textarea 
                className="DAILYACT_descriptionBox"
                value={description}
                readOnly={true} 
              />
            </div>

            <div className="DAILYACT_actionRow">
              <button className="DAILYACT_editBtn" onClick={handleEdit}>
                <FiEdit3 /> Edit
              </button>
              <button className="DAILYACT_deleteBtn" onClick={handleDelete}>
                <FiTrash2 /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyActivity;