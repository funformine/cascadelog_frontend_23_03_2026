import React, { useState, useEffect } from 'react';
import { supabase } from '../Auth/supabaseClient';
import API_BASE_URL from '../Auth/Config';
import { 
  FiActivity, FiUser, FiCode, FiClock, FiTrash2, FiEdit3, 
  FiSave, FiX, FiSearch, FiLayers, FiZap, FiDownload, FiExternalLink, 
  FiCheckCircle, FiCalendar, FiFilter, FiLock, FiChevronDown, FiCheck, 
  FiEye, FiEyeOff, FiUpload
} from 'react-icons/fi';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useModal } from '../../Context/ModalContext';
import '../../Styles/AdminManagement.css';

const UserActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activityType, setActivityType] = useState('cssBattles');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'day', 'week', 'month'
  const [userFilter, setUserFilter] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(null); // stores the activity object for preview
  const [user, setUser] = useState(null);
  const { showConfirm, showAlert } = useModal();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    getSession();
  }, []);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/admin/activity?type=${activityType}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('FETCH ERROR:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivity(); }, [activityType]);

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleEditInit = (act) => {
    setEditingId(act.id);
    setEditFormData({
      battle_name: act.battle_name || act.description,
      html_file: act.html_file || '',
      css_file: act.css_file || '',
      js_file: act.js_file || ''
    });
  };

  const handleSave = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('type', activityType);
      formData.append('battle_name', editFormData.battle_name);
      
      // Send existing URLs or 'null' for removal
      formData.append('html_file', editFormData.html_file || 'null');
      formData.append('css_file', editFormData.css_file || 'null');
      formData.append('js_file', editFormData.js_file || 'null');

      // Append raw files if newly uploaded
      if (editFormData.newHtml) formData.append('html', editFormData.newHtml);
      if (editFormData.newCss) formData.append('css', editFormData.newCss);
      if (editFormData.newJs) formData.append('js', editFormData.newJs);

      const response = await fetch(`${API_BASE_URL}/api/admin/activity/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData
      });
      if (response.ok) { 
        setEditingId(null); 
        fetchActivity(); 
        triggerToast("Update verified."); 
      }
    } catch (e) { 
      console.error('Save Error:', e); 
      triggerToast("Update failed.");
    }
  };

  const handleToggleVisibility = async (id, currentVisibility) => {
    const isVisible = currentVisibility !== false;
    const confirmed = await showConfirm({
      type: isVisible ? 'admin' : 'success',
      title: isVisible ? 'Hide Submission?' : 'Retrieve Submission?',
      message: isVisible 
        ? "Hide this content from the user's dashboard and the public gallery?" 
        : "Make this content visible to the user and the community again?",
      confirmText: isVisible ? 'Hide Now' : 'Restore Visibility'
    });
    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/admin/activity-visibility/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: activityType, visibility: !isVisible })
      });
      if (response.ok) {
        setActivities(prev => prev.map(a => a.id === id ? { ...a, visibility: !isVisible } : a));
        setUserHistory(prev => prev.map(h => h.id === id ? { ...h, visibility: !isVisible } : h));
        triggerToast(isVisible ? "Record hidden." : "Record restored.");
      }
    } catch (e) {
      console.error(e);
      showAlert({ type: 'danger', title: 'Action Failed', message: 'Could not update visibility.' });
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      type: 'danger',
      title: 'Remove Activity?',
      message: 'Are you sure you want to delete this activity record from the platform logs?',
      confirmText: 'Delete Record'
    });
    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE_URL}/api/admin/activity/${id}?type=${activityType}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      fetchActivity();
      triggerToast("Record archived.");
    } catch (e) { console.error('Delete Error:', e); }
  };

  const [userHistory, setUserHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [renderedStore, setRenderedStore] = useState({}); // { id: htmlString }

  const handleLivePreview = async (act) => {
    setShowPreview(act);
    setHistoryLoading(true);
    setRenderedStore({});
    
    try {
      const userId = act.user_id;
      const { data: { session } } = await supabase.auth.getSession();
      
      const [bRes, tRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/activity?type=cssBattles`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch(`${API_BASE_URL}/api/admin/activity?type=dailyTasks`, { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);
      
      const [bData, tData] = await Promise.all([bRes.json(), tRes.json()]);
      
      const filteredHistory = activityType === 'cssBattles' 
        ? bData.filter(i => i.user_id === userId).map(i => ({...i, type: 'cssBattles'}))
        : tData.filter(i => i.user_id === userId).map(i => ({...i, type: 'dailyTasks'}));

      const allUserHistory = [...filteredHistory].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      
      setUserHistory(allUserHistory);
      setHistoryLoading(false); // Data is in, now fetch contents

      // Async fetch contents without blocking the modal UI
      allUserHistory.forEach(async (item) => {
        try {
          const fetchFile = async (url) => { if(!url) return ''; const r = await fetch(url); return await r.text(); };
          const [html, css] = await Promise.all([fetchFile(item.html_file), fetchFile(item.css_file)]);
          const fullHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { margin: 0; padding: 0; width: 400px; height: 300px; overflow: hidden; background: #000; }
                  ${css}
                </style>
              </head>
              <body>${html}</body>
            </html>
          `;
          setRenderedStore(prev => ({ ...prev, [item.id]: fullHtml }));
        } catch (e) {
          console.error(`Failed to fetch content for ${item.id}`, e);
        }
      });
    } catch (e) {
      console.error(e);
      setHistoryLoading(false);
    }
  };

  const internalToggleVisibility = async (id, type, currentVisibility) => {
    const isVisible = currentVisibility !== false;
    const confirmed = await showConfirm({
      type: isVisible ? 'admin' : 'success',
      title: isVisible ? 'Hide Submission?' : 'Retrieve Submission?',
      message: 'Visible content appears in the public gallery and user profile.',
      confirmText: isVisible ? 'Hide Now' : 'Restore'
    });
    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE_URL}/api/admin/activity-visibility/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, visibility: !isVisible })
      });
      
      setUserHistory(prev => prev.map(h => h.id === id ? { ...h, visibility: !isVisible } : h));
      setActivities(prev => prev.map(a => a.id === id ? { ...a, visibility: !isVisible } : a));
      triggerToast("Visibility state synchronized.");
    } catch (e) { console.error(e); }
  };

  const uniqueUsers = [...new Set(activities.map(a => a.users_profile?.full_name || 'System User'))].sort();

  const filteredAct = (activities || []).filter(act => {
    const actDate = new Date(act.created_at);
    const now = new Date();
    
    // Time Filtering
    if (timeFilter === 'day') {
      if (actDate.toDateString() !== now.toDateString()) return false;
    } else if (timeFilter === 'week') {
      const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
      if (actDate < oneWeekAgo) return false;
    } else if (timeFilter === 'month') {
      if (actDate.getMonth() !== now.getMonth() || actDate.getFullYear() !== now.getFullYear()) return false;
    }

    // User Filtering
    if (userFilter !== 'all') {
      const userName = act.users_profile?.full_name || 'System User';
      if (userName !== userFilter) return false;
    }

    // Search
    const searchMatch = ((act.battle_name || act.description || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (act.users_profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return searchMatch;
  });

  return (
    <div className="Admin_container">
      {toast.show && <div className="Admin_toast"><FiCheckCircle /> <span>{toast.message}</span></div>}

      <div className="Admin_header">
        <div className="Admin_titleGroup">
          <div className="Admin_iconCircle" style={{ background: activityType === 'cssBattles' ? 'var(--home-gradient)' : '#7c3aed' }}>
            {activityType === 'cssBattles' ? <FiActivity className="Admin_mainIcon" /> : <FiZap className="Admin_mainIcon" />}
          </div>
          <div className="Admin_headerText">
            <h1>Platform Activity</h1>
            <span className="Admin_subtitle">Content Governance & Audit Logs</span>
          </div>
        </div>
        
        <div className="Admin_headerRight">
          <div className="Admin_typeToggle">
            <button className={activityType === 'cssBattles' ? 'active' : ''} onClick={() => setActivityType('cssBattles')}><FiZap /> <span>Css Battles</span></button>
            <button className={activityType === 'dailyTasks' ? 'active' : ''} onClick={() => setActivityType('dailyTasks')}><FiActivity /> <span>Daily Activity</span></button>
          </div>
          <div className="Admin_profileBox" title={user?.email || 'Admin Profile'}>
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Admin" className="Admin_headerAvatar" />
            ) : (
              <div className="Admin_headerAvatarPlaceholder">
                <FiUser />
              </div>
            )}
            <div className="Admin_profileStatus"></div>
          </div>
        </div>
      </div>

      <div className="Admin_toolbar">
        <div className="Admin_searchRow">
          <div className="Admin_searchBar"><FiSearch /><input type="text" placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="Admin_entryCount"><strong>{filteredAct.length}</strong> Entries</div>
        </div>

        <div className="Admin_filterRow">
          <div className="Admin_customDropdown">
            <div 
              className={`Admin_dropdownHeader ${isTimeOpen ? 'isOpen' : ''}`}
              onClick={() => { setIsTimeOpen(!isTimeOpen); setIsUserOpen(false); }}
            >
              <FiClock />
              <span className="Admin_selectedText">
                {timeFilter === 'all' ? 'Any Time' : timeFilter === 'day' ? 'Today' : timeFilter === 'week' ? 'Past 7 Days' : 'This Month'}
              </span>
              <FiChevronDown className="Admin_dropdownArrow" />
            </div>
            {isTimeOpen && (
              <div className="Admin_dropdownList">
                {[
                  { val: 'all', label: 'Any Time' },
                  { val: 'day', label: 'Today Only' },
                  { val: 'week', label: 'Past 7 Days' },
                  { val: 'month', label: 'This Month' }
                ].map(opt => (
                  <div 
                    key={opt.val}
                    className={`Admin_dropdownItem ${timeFilter === opt.val ? 'active' : ''}`}
                    onClick={() => { setTimeFilter(opt.val); setIsTimeOpen(false); }}
                  >
                    {opt.label}
                    {timeFilter === opt.val && <FiCheck />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="Admin_customDropdown">
            <div 
              className={`Admin_dropdownHeader ${isUserOpen ? 'isOpen' : ''}`}
              onClick={() => { setIsUserOpen(!isUserOpen); setIsTimeOpen(false); }}
            >
              <FiUser />
              <span className="Admin_selectedText">{userFilter === 'all' ? 'All Authors' : userFilter}</span>
              <FiChevronDown className="Admin_dropdownArrow" />
            </div>
            {isUserOpen && (
              <div className="Admin_dropdownList" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <div 
                  className={`Admin_dropdownItem ${userFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setUserFilter('all'); setIsUserOpen(false); }}
                >
                  All Authors
                  {userFilter === 'all' && <FiCheck />}
                </div>
                {uniqueUsers.map(u => (
                  <div 
                    key={u}
                    className={`Admin_dropdownItem ${userFilter === u ? 'active' : ''}`}
                    onClick={() => { setUserFilter(u); setIsUserOpen(false); }}
                  >
                    {u}
                    {userFilter === u && <FiCheck />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="Admin_tableWrapper">
        {loading ? (
          <div className="Admin_loader">
            <div className="Admin_loaderPulse"></div>
            <h3>Scanning Platform Logs</h3>
            <p>Retrieving session audit history...</p>
          </div>
        ) : (
          <table className="Admin_table">
            <thead>
              <tr>
                <th width="20%">Reference</th>
                <th>Author</th>
                <th>Category</th>
                <th>Uploaded At</th>
                <th width="25%">Files Uploaded</th>
                <th align="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAct.length === 0 ? (
                <tr><td colSpan="6" align="center" style={{padding: '50px', color: '#999'}}>No activities match these filters.</td></tr>
              ) : filteredAct.map(act => (
                <tr key={act.id} className={`${act.visibility === false ? 'Admin_rowHidden' : ''}`}>
                  <td>
                    {editingId === act.id ? (
                      <input className="Admin_inlineInput" value={editFormData.battle_name} onChange={(e) => setEditFormData({...editFormData, battle_name: e.target.value})} />
                    ) : (
                      <div className="Admin_actRef">
                        <strong>{act.battle_name || act.description}</strong>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="Admin_tableAuthor">
                      {act.users_profile?.profile_pic ? (
                        <div className="Admin_miniAvatarImg" style={{ backgroundImage: `url(${act.users_profile.profile_pic})` }} />
                      ) : (
                        <div className="Admin_miniAvatarIcon"><FiUser /></div>
                      )}
                      <div className="Admin_authorMeta">
                        <span className="name">
                          {act.users_profile?.full_name || 'System'}
                          {act.users_profile?.status === false && (
                            <span className="Admin_actBlockedBadge" title="Author is blocked"><FiLock /></span>
                          )}
                        </span>
                        <span className="email">{act.users_profile?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={`Admin_sourceTag ${activityType === 'cssBattles' ? 'battle' : 'task'}`}>{activityType === 'cssBattles' ? 'Battle' : 'Task'}</span></td>
                  <td>
                    <div className="Admin_actTiming">
                      <div className="Admin_logDate">{new Date(act.created_at).toLocaleDateString()}</div>
                      <div className="Admin_logTime">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </td>
                  <td>
                    {editingId === act.id ? (
                      <div className="Admin_fileEditContainer">
                        <div className="Admin_editFileRow">
                          <span className="type">HTML:</span>
                          {editFormData.html_file ? (
                            <div className="Admin_existingFile">
                               <a href={editFormData.html_file} target="_blank" rel="noreferrer" className="fileName">{editFormData.html_file.split('/').pop()}</a>
                               <button className="del" onClick={() => setEditFormData({...editFormData, html_file: null})} title="Remove Existing"><FiX /></button>
                            </div>
                          ) : <span className="empty">None</span>}
                          <input type="file" id={`html-${act.id}`} className="Admin_hiddenFile" accept=".html,.txt" onChange={(e) => setEditFormData({...editFormData, newHtml: e.target.files[0]})} />
                          <label htmlFor={`html-${act.id}`} className="Admin_fileLabel"><FiUpload /> Choose HTML</label>
                          {editFormData.newHtml && <span className="pending">New: {editFormData.newHtml.name}</span>}
                        </div>
                        <div className="Admin_editFileRow">
                           <span className="type">CSS:</span>
                           {editFormData.css_file ? (
                             <div className="Admin_existingFile">
                               <a href={editFormData.css_file} target="_blank" rel="noreferrer" className="fileName">{editFormData.css_file.split('/').pop()}</a>
                               <button className="del" onClick={() => setEditFormData({...editFormData, css_file: null})} title="Remove Existing"><FiX /></button>
                             </div>
                           ) : <span className="empty">None</span>}
                           <input type="file" id={`css-${act.id}`} className="Admin_hiddenFile" accept=".css,.txt" onChange={(e) => setEditFormData({...editFormData, newCss: e.target.files[0]})} />
                           <label htmlFor={`css-${act.id}`} className="Admin_fileLabel"><FiUpload /> Choose CSS</label>
                           {editFormData.newCss && <span className="pending">New: {editFormData.newCss.name}</span>}
                        </div>
                        <div className="Admin_editFileRow">
                           <span className="type">JS:</span>
                           {editFormData.js_file ? (
                             <div className="Admin_existingFile">
                               <a href={editFormData.js_file} target="_blank" rel="noreferrer" className="fileName">{editFormData.js_file.split('/').pop()}</a>
                               <button className="del" onClick={() => setEditFormData({...editFormData, js_file: null})} title="Remove Existing"><FiX /></button>
                             </div>
                           ) : <span className="empty">None</span>}
                           <input type="file" id={`js-${act.id}`} className="Admin_hiddenFile" accept=".js,.txt" onChange={(e) => setEditFormData({...editFormData, newJs: e.target.files[0]})} />
                           <label htmlFor={`js-${act.id}`} className="Admin_fileLabel"><FiUpload /> Choose JS</label>
                           {editFormData.newJs && <span className="pending">New: {editFormData.newJs.name}</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="Admin_filePills">
                        {act.html_file ? <a href="#" onClick={(e) => { e.preventDefault(); handleLivePreview(act); }} title="Analyze Submission" className="pill pill-html"><FiExternalLink /> Analyze</a> : <span className="pill empty">No HTML</span>}
                        {act.css_file && <a href={act.css_file} target="_blank" rel="noreferrer" className="pill pill-css"><FiCode /> CSS</a>}
                        {act.js_file && <a href={act.js_file} target="_blank" rel="noreferrer" className="pill pill-js"><FiCode /> JS</a>}
                      </div>
                    )}
                  </td>
                  <td align="right">
                    <div className="Admin_actionRow">
                      {editingId === act.id ? (
                        <>
                          <button className="Admin_saveBtn" onClick={() => handleSave(act.id)}><FiSave /></button>
                          <button className="Admin_cancelBtn" onClick={() => setEditingId(null)}><FiX /></button>
                        </>
                      ) : (
                        <>
                          <button 
                            className={`Admin_visibilityBtn ${act.visibility === false ? 'hidden' : 'visible'}`} 
                            onClick={() => handleToggleVisibility(act.id, act.visibility)}
                            title={act.visibility === false ? "Restore Visibility" : "Hide Content"}
                          >
                            {act.visibility === false ? <FiEyeOff /> : <FiEye />}
                          </button>
                          <button className="Admin_editBtn" onClick={() => handleEditInit(act)} title="Modify Source"><FiEdit3 /></button>
                          <button className="Admin_deleteBtn" onClick={() => handleDelete(act.id)} title="Archive Record"><FiTrash2 /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Analysis Modal */}
      {showPreview && (
        <div className="Admin_modalOverlay" onClick={() => setShowPreview(null)}>
          <div className="Admin_analyzeModal" onClick={(e) => e.stopPropagation()}>
            <div className="Admin_modalHeader">
              <button className="Admin_modalClose" onClick={() => setShowPreview(null)}><FiX /></button>
              <div className="Admin_modalTitleBox">
                  <h2>User Activity Analysis</h2>
                  <div className="Admin_modalUserInfo">
                    <strong>{showPreview.users_profile?.full_name}</strong>
                    <span>{showPreview.users_profile?.email}</span>
                  </div>
              </div>
              <div className="Admin_headerRight">
                 <div className="Admin_profileBox" title={showPreview.users_profile?.full_name}>
                    {showPreview.users_profile?.avatar_url ? (
                      <img src={showPreview.users_profile.avatar_url} alt="User" className="Admin_headerAvatar" />
                    ) : (
                      <div className="Admin_headerAvatarPlaceholder">
                        <FiUser />
                      </div>
                    )}
                    <div className="Admin_profileStatus"></div>
                 </div>
              </div>
            </div>

            <div className="Admin_modalBody">
              {historyLoading ? (
                <div className="Admin_loader">
                  <div className="Admin_loaderPulse"></div>
                  <p>Indexing archives...</p>
                </div>
              ) : (
                <div className="Admin_analyzeGrid">
                  {userHistory.map(item => (
                    <div key={item.id} className={`Admin_analyzeCard ${item.visibility === false ? 'isHidden' : ''}`}>
                      <div className="Admin_analyzeHeader">
                        <span className={`Admin_sourceTag ${item.type === 'cssBattles' ? 'battle' : 'task'}`}>{item.type === 'cssBattles' ? 'Battle' : 'Task'}</span>
                        <div className="Admin_analyzeActions">
                           <button 
                             className={`Admin_cardVisBtn ${item.visibility === false ? 'isHidden' : ''}`}
                             onClick={() => internalToggleVisibility(item.id, item.type, item.visibility)}
                           >
                             {item.visibility === false ? <FiEyeOff /> : <FiEye />}
                           </button>
                        </div>
                      </div>
                      
                      <div className="Admin_analyzePreview">
                         {renderedStore[item.id] ? (
                           <iframe 
                             title="Preview" 
                             srcDoc={renderedStore[item.id]}
                             frameBorder="0"
                           />
                         ) : item.html_file ? (
                           <div className="Admin_noPreview">
                             <div className="Admin_miniLoader" />
                             Rendering...
                           </div>
                         ) : <div className="Admin_noPreview">No Source</div>}
                      </div>

                      <div className="Admin_analyzeFooter">
                        <strong>{item.battle_name || item.description}</strong>
                        <span className="date">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivity;
