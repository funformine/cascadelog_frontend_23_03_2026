import React, { useState, useEffect } from 'react';
import { supabase } from '../Auth/supabaseClient';
import API_BASE_URL from '../Auth/Config';
import { FiUsers, FiTrash2, FiActivity, FiTarget, FiSearch, FiRefreshCcw, FiX, FiMail, FiCalendar, FiSmartphone, FiInfo, FiLock, FiUnlock, FiAlertCircle, FiShield, FiChevronDown, FiCheck } from 'react-icons/fi';
import { useModal } from '../../Context/ModalContext';
import '../../Styles/AdminManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'blocked'
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const { showConfirm } = useModal();

  const fetchUsers = async () => {
    setLoading(true);
    console.log('--- ADMIN FETCH USERS START ---');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session Status:', session ? 'Found' : 'Missing', sessionError || '');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      console.log('API HTTP Status:', response.status);
      
      const data = await response.json();
      console.log('Final Data processed:', data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) { console.error('FRONTEND CATCH ERROR (Admin Users):', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      type: 'danger',
      title: 'Delete User?',
      message: 'This action cannot be undone. All user profile data will be purged.',
      confirmText: 'Purge Account'
    });
    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE_URL}/api/admin/user/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleToggleBlock = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'unblock' : 'block';
    
    const confirmed = await showConfirm({
      type: newStatus ? 'success' : 'admin',
      title: `${newStatus ? 'Unblock' : 'Block'} User?`,
      message: `Are you sure you want to ${action} this user's platform access?`,
      confirmText: `${newStatus ? 'Unblock Now' : 'Block Access'}`
    });
    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/admin/user-block/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser({ ...selectedUser, status: newStatus });
        }
      } else {
        const errorData = await response.json();
        console.error('Status update failed:', errorData.error);
      }
    } catch (e) { 
      console.error(e);
    }
  };

  const filteredUsers = users.filter(u => {
    // 1. Status Filter
    if (statusFilter === 'active' && u.status === false) return false;
    if (statusFilter === 'blocked' && u.status !== false) return false;

    // 2. Search Filter
    const query = searchTerm.toLowerCase();
    const matchesSearch = (u.full_name || '').toLowerCase().includes(query) ||
                          (u.email || '').toLowerCase().includes(query);
    
    return matchesSearch;
  });

  return (
    <div className="Admin_container">
      <div className="Admin_header">
        <div className="Admin_titleGroup">
          <div className="Admin_iconCircle">
            <FiUsers className="Admin_mainIcon" />
          </div>
          <div className="Admin_headerText">
            <h1>User Management</h1>
            <span className="Admin_subtitle">Platform Administration & User Governance</span>
          </div>
        </div>
        <div className="Admin_headerActions">
          <div className="Admin_userCountBadge">
            <strong>{filteredUsers.length}</strong> {filteredUsers.length === 1 ? 'User' : 'Users'}
          </div>
          <button onClick={fetchUsers} className="Admin_refreshBtn" title="Refresh List">
            <FiRefreshCcw />
          </button>
        </div>
      </div>

      <div className="Admin_toolbar">
        <div className="Admin_searchRow">
          <div className="Admin_searchBar">
            <FiSearch />
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="Admin_filterRow">
           <div className="Admin_customDropdown">
              <div 
                className={`Admin_dropdownHeader ${isStatusOpen ? 'isOpen' : ''}`}
                onClick={() => setIsStatusOpen(!isStatusOpen)}
              >
                <FiShield />
                <span className="Admin_selectedText">
                  {statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active Users' : 'Blocked Users'}
                </span>
                <FiChevronDown className="Admin_dropdownArrow" />
              </div>

              {isStatusOpen && (
                <div className="Admin_dropdownList">
                  {[
                    { val: 'all', label: 'All Status' },
                    { val: 'active', label: 'Active Users' },
                    { val: 'blocked', label: 'Blocked Users' }
                  ].map(opt => (
                    <div 
                      key={opt.val}
                      className={`Admin_dropdownItem ${statusFilter === opt.val ? 'active' : ''}`}
                      onClick={() => { setStatusFilter(opt.val); setIsStatusOpen(false); }}
                    >
                      {opt.label}
                      {statusFilter === opt.val && <FiCheck />}
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
            <h3>Synchronizing Database</h3>
            <p>Fetching latest platform member list...</p>
          </div>
        ) : (
          <table className="Admin_table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Streak</th>
                <th>Total Uploads</th>
                <th>Last Activity</th>
                <th align="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="6" align="center" className="Admin_emptyState">No members match your current filter criteria.</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className={user.status === false ? 'Admin_rowBlocked' : ''}>
                  <td>
                    <div className="Admin_userInfo">
                      <div 
                        className={`Admin_avatar pointer ${user.profile_pic ? 'hasImage' : ''}`} 
                        onClick={() => setSelectedUser(user)}
                        style={user.profile_pic ? { backgroundImage: `url(${user.profile_pic})` } : {}}
                      >
                        {!user.profile_pic && (user.full_name || 'U')[0]}
                      </div>
                      <div className="Admin_userMeta">
                        <span className="name">{user.full_name || 'Unknown User'}</span>
                        <span className="uid">{user.id.slice(0,8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`Admin_statusTag ${user.status === false ? 'blocked' : 'active'}`}>
                      {user.status === false ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="Admin_statBadge streak">
                      <FiTarget /> {user.streak || 0}
                    </div>
                  </td>
                  <td>
                    <div className="Admin_statBadge uploads">
                      <FiActivity /> {user.upload_count || 0}
                    </div>
                  </td>
                  <td className="Admin_time">
                    {new Date(user.last_activity).toLocaleDateString()} at {new Date(user.last_activity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td align="right">
                    <div className="Admin_actionGroup">
                      <button 
                        className={`Admin_blockBtn ${user.status === false ? 'unblock' : 'block'}`} 
                        onClick={() => handleToggleBlock(user.id, user.status !== false)}
                        title={user.status === false ? "Unblock User" : "Block User"}
                      >
                        {user.status === false ? <FiUnlock /> : <FiLock />}
                      </button>
                      <button className="Admin_deleteBtn" onClick={() => handleDelete(user.id)} title="Delete User">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Profile Popup Modal */}
      {selectedUser && (
        <div className="Admin_modalOverlay" onClick={() => setSelectedUser(null)}>
          <div className={`Admin_profileModal ${selectedUser.status === false ? 'isBlocked' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="Admin_modalClose" onClick={() => setSelectedUser(null)}>
              <FiX />
            </button>
            
            <div className="Admin_modalHeader">
              <div 
                className={`Admin_modalAvatar ${selectedUser.profile_pic ? 'hasImage' : ''}`}
                style={selectedUser.profile_pic ? { backgroundImage: `url(${selectedUser.profile_pic})` } : {}}
              >
                {!selectedUser.profile_pic && (selectedUser.full_name || 'U')[0]}
              </div>
              <div className="Admin_modalTitleBox">
                <h2>{selectedUser.full_name || 'User Profile'}</h2>
                {selectedUser.status === false && <span className="Admin_blockedBadge"><FiAlertCircle /> Account Blocked</span>}
              </div>
              <span className="Admin_modalId">User ID: {selectedUser.id}</span>
            </div>

            <div className="Admin_modalBody">
              <div className="Admin_infoGrid">
                <div className="Admin_infoItem">
                  <FiMail />
                  <div className="Admin_infoText">
                    <label>Email Address</label>
                    <span>{selectedUser.email || 'N/A'}</span>
                  </div>
                </div>
                <div className="Admin_infoItem">
                  <FiSmartphone />
                  <div className="Admin_infoText">
                    <label>Phone Number</label>
                    <span>{selectedUser.phone || 'Not Provided'}</span>
                  </div>
                </div>
                <div className="Admin_infoItem">
                  <FiCalendar />
                  <div className="Admin_infoText">
                    <label>Last Activity</label>
                    <span>{new Date(selectedUser.last_activity).toLocaleString()}</span>
                  </div>
                </div>
                <div className="Admin_infoItem">
                  <FiInfo />
                  <div className="Admin_infoText">
                    <label>About / Bio</label>
                    <span>{selectedUser.about || 'User has not added a bio yet.'}</span>
                  </div>
                </div>
              </div>

              <div className="Admin_modalStats">
                <div className="stat">
                  <span className="label">Streak</span>
                  <span className="value">{selectedUser.streak} Days</span>
                </div>
                <div className="stat">
                  <span className="label">Submissions</span>
                  <span className="value">{selectedUser.upload_count}</span>
                </div>
                <div className="stat">
                    <span className="label">Account Status</span>
                    <span className={`value status ${selectedUser.status === false ? 'blocked' : 'active'}`}>
                        {selectedUser.status === false ? 'Blocked' : 'Active'}
                    </span>
                </div>
              </div>
              
              <div className="Admin_modalActions">
                 <button 
                  className={`Admin_modalBlockBtn ${selectedUser.status === false ? 'unblock' : 'block'}`}
                  onClick={() => handleToggleBlock(selectedUser.id, selectedUser.status !== false)}
                >
                  {selectedUser.status === false ? <><FiUnlock /> Unblock User</> : <><FiLock /> Block User</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
