import React, { useState, useEffect } from 'react';
import { supabase } from '../Components/Auth/supabaseClient';
import API_BASE_URL from './Auth/Config';
import {
  FiUpload, FiCheckCircle, FiAlertCircle, FiLoader,
  FiEye, FiDownload, FiCode, FiX, FiImage, FiEdit3, FiCalendar
} from 'react-icons/fi';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { LoadingSvg } from './Utilities';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../Styles/CssUpload.css';
import '../Styles/Gallery.css';

function getISOWeekString(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

const CssUpload = () => {
  const [viewMode, setViewMode] = useState('upload'); // 'upload' | 'gallery'

  // Upload State
  const [title, setTitle] = useState('');
  const [htmlFile, setHtmlFile] = useState(null);
  const [cssFile, setCssFile] = useState(null);
  const [jsFile, setJsFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Gallery State
  const [filterType, setFilterType] = useState('month');
  const [filterDateObj, setFilterDateObj] = useState(new Date());

  const [galleryData, setGalleryData] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const fetchGalleryData = async () => {
    setLoadingGallery(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadingGallery(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/css-battles/all`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch gallery');
      const dbData = await response.json();

      const processedUploads = await Promise.all(dbData.map(async (task) => {
        const fetchText = async (url) => {
          if (!url) return '';
          try {
            const res = await fetch(url);
            return await res.text();
          } catch (e) { return ''; }
        };

        const [htmlContent, cssContent, jsContent] = await Promise.all([
          fetchText(task.html_file),
          fetchText(task.css_file),
          fetchText(task.js_file)
        ]);

        const dateObj = new Date(task.created_at);
        return {
          id: task.id,
          title: task.battle_name || task.title || 'CSS Battle',
          dateObj: dateObj,
          dateStr: dateObj.toISOString().split('T')[0],
          html: htmlContent,
          css: cssContent,
          js: jsContent
        };
      }));

      setGalleryData(processedUploads);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    fetchGalleryData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const saveEdit = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/css-battles/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editRow.title })
      });
      if (!response.ok) throw new Error("Failed to update");
      setEditRow(null);
      showToast("Battle title renamed successfully!");
      fetchGalleryData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const executeDelete = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/css-battles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!response.ok) throw new Error("Failed to delete");
      setDeleteConfirm(null);
      showToast("Battle successfully deleted from your gallery!");
      fetchGalleryData();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!htmlFile && !cssFile && !jsFile) {
      showToast('Please select at least one file to upload.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("You must be logged in to submit a battle.");

      const formData = new FormData();
      formData.append('title', title || `Battle Upload - ${new Date().toLocaleTimeString()}`);
      if (htmlFile) formData.append('html', htmlFile);
      if (cssFile) formData.append('css', cssFile);
      if (jsFile) formData.append('js', jsFile);

      const response = await fetch(`${API_BASE_URL}/api/css-battles/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to upload files');

      showToast("Battle files securely uploaded and saved!");
      setTitle('');
      setHtmlFile(null);
      setCssFile(null);
      setJsFile(null);

      // Reset file input values
      const inputs = ['htmlInput', 'cssInput', 'jsInput'];
      inputs.forEach(id => {
        const el = document.getElementById(`CssUpload_${id}`);
        if (el) el.value = '';
      });

      fetchGalleryData(); // Refresh table

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (upload) => {
    const zip = new JSZip();
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${upload.title || 'CSS Battle'}</title>
    <style>${upload.css || ''}</style>
</head>
<body>
    ${upload.html || ''}
    <script>${upload.js || ''}</script>
</body>
</html>`;

    zip.file("index.html", htmlTemplate);
    zip.file("style.css", upload.css || "/* No CSS */");
    zip.file("script.js", upload.js || "// No JS");

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `Battle_${upload.dateStr}.zip`);
  };

  const filteredGallery = galleryData.filter(item => {
    if (filterType === 'day') {
      const dayStr = filterDateObj.toISOString().split('T')[0];
      return item.dateStr === dayStr;
    } else if (filterType === 'week') {
      const weekStr = getISOWeekString(filterDateObj);
      return getISOWeekString(item.dateObj) === weekStr;
    } else if (filterType === 'month') {
      const monthStr = filterDateObj.toISOString().substring(0, 7);
      return item.dateObj.toISOString().substring(0, 7) === monthStr;
    } else if (filterType === 'year') {
      const yearStr = filterDateObj.getFullYear().toString();
      return item.dateObj.getFullYear().toString() === yearStr;
    }
    return true;
  });

  // Group by Date for display
  const groupedUploads = {};
  filteredGallery.forEach(upload => {
    if (!groupedUploads[upload.dateStr]) {
      groupedUploads[upload.dateStr] = [];
    }
    groupedUploads[upload.dateStr].push(upload);
  });

  const sortedDates = Object.keys(groupedUploads).sort((a, b) => new Date(b) - new Date(a));

  const todaysUploads = galleryData.filter(u => u.dateStr === new Date().toISOString().split('T')[0]);

  const renderPreviewModal = () => {
    if (!previewData) return null;

    return (
      <div className="Gallery_modalOverlay" onClick={() => setPreviewData(null)}>
        <div className="Gallery_modalContent" onClick={(e) => e.stopPropagation()}>
          <div className="Gallery_modalHeader">
            <div className="Gallery_modalTitle">
              <FiCode /> <span>Preview: {previewData.title || previewData.dateStr}</span>
            </div>
            <button className="Gallery_closeBtn" onClick={() => setPreviewData(null)}>
              <FiX />
            </button>
          </div>

          <div className="Gallery_modalBody">
            <div className="Gallery_modalResponsiveWrapper">
              <div className="Gallery_fixedViewport">
                <style>{previewData.css}</style>
                <div
                  className="Gallery_innerHtmlContent"
                  dangerouslySetInnerHTML={{ __html: previewData.html }}
                />
              </div>
            </div>
          </div>

          <div className="Gallery_modalFooter">
            <div className="Gallery_codeIndicator">
              {previewData.html && <span className="badge">HTML</span>}
              {previewData.css && <span className="badge">CSS</span>}
              {previewData.js && <span className="badge">JS</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`CssUpload_wrapper ${viewMode === 'gallery' ? 'CssUpload_wrapper_gallery' : (todaysUploads.length > 0 ? 'CssUpload_wrapper_wide' : '')}`}>
      {renderPreviewModal()}

      {/* Navigation Tab */}
      <div className="CssUpload_viewTabsWrapper">
        <div className="CssUpload_viewTabs">
          <button
            type="button"
            onClick={() => setViewMode('upload')}
            className={`CssUpload_viewTabBtn ${viewMode === 'upload' ? 'active' : ''}`}
          >
            <FiUpload /> Upload Battle
          </button>
          <button
            type="button"
            onClick={() => setViewMode('gallery')}
            className={`CssUpload_viewTabBtn ${viewMode === 'gallery' ? 'active' : ''}`}
          >
            <FiImage /> View Gallery
          </button>
        </div>
      </div>

      {viewMode === 'upload' && (
        <div className={`CssUpload_formContainer ${todaysUploads.length > 0 ? 'CssUpload_hasTodays' : ''} auth_form-fade`}>

          <div className="CssUpload_uploadLeft">
            <h2 className="CssUpload_header">CSS Battle Uploads</h2>
            <p className="CssUpload_desc">
              Submit your HTML, CSS, and JS files for your CSS Battles. You can upload multiple files throughout the day.
            </p>

            <form onSubmit={handleSubmit} className="CssUpload_form">
              <div className="CssUpload_inputGroup">
                <label className="CssUpload_label">Battle Title</label>
                <input
                  type="text"
                  className="CssUpload_input"
                  placeholder="e.g. Target 1 - Square"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="CssUpload_inlineFiles">
                <label className={`CssUpload_fileCard ${htmlFile ? 'active' : ''}`}>
                  <input
                    id="CssUpload_htmlInput"
                    type="file"
                    accept=".html,.txt"
                    hidden
                    onChange={(e) => setHtmlFile(e.target.files[0])}
                  />
                  {htmlFile && (
                    <button type="button" className="CssUpload_removeFileBtn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHtmlFile(null); document.getElementById('CssUpload_htmlInput').value = ''; }}>
                      <FiX />
                    </button>
                  )}
                  <FiCode className="CssUpload_fileIcon" />
                  <div className="title">HTML File</div>
                  <div className="status">{htmlFile ? htmlFile.name : 'Select .html'}</div>
                </label>

                <label className={`CssUpload_fileCard ${cssFile ? 'active' : ''}`}>
                  <input
                    id="CssUpload_cssInput"
                    type="file"
                    accept=".css,.txt"
                    hidden
                    onChange={(e) => setCssFile(e.target.files[0])}
                  />
                  {cssFile && (
                    <button type="button" className="CssUpload_removeFileBtn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCssFile(null); document.getElementById('CssUpload_cssInput').value = ''; }}>
                      <FiX />
                    </button>
                  )}
                  <FiImage className="CssUpload_fileIcon" />
                  <div className="title">CSS File</div>
                  <div className="status">{cssFile ? cssFile.name : 'Select .css'}</div>
                </label>

                <label className={`CssUpload_fileCard ${jsFile ? 'active' : ''}`}>
                  <input
                    id="CssUpload_jsInput"
                    type="file"
                    accept=".js,.txt"
                    hidden
                    onChange={(e) => setJsFile(e.target.files[0])}
                  />
                  {jsFile && (
                    <button type="button" className="CssUpload_removeFileBtn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setJsFile(null); document.getElementById('CssUpload_jsInput').value = ''; }}>
                      <FiX />
                    </button>
                  )}
                  <FiEdit3 className="CssUpload_fileIcon" />
                  <div className="title">JS (Optional)</div>
                  <div className="status">{jsFile ? jsFile.name : 'Select .js'}</div>
                </label>
              </div>

              <button type="submit" className="CssUpload_button" disabled={isLoading}>
                {isLoading ? (
                  <><FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                ) : (
                  <><FiUpload /> Submit Battle Files</>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT SIDE: Today's Uploads */}
          {todaysUploads.length > 0 && (
            <>
              <div className="CssUpload_verticalDivider"></div>
              <div className="CssUpload_todaysSection">
                <h3 className="CssUpload_sectionTitle">Today's Uploads</h3>
                <div className="CssUpload_tableWrapper">
                  <table className="CssUpload_table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Time</th>
                        <th>Files</th>
                        <th align="right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaysUploads.map(upload => (
                        <tr key={upload.id}>
                          <td>
                            {editRow?.id === upload.id ? (
                              <input type="text" value={editRow.title} onChange={e => setEditRow({ ...editRow, title: e.target.value })} className="CssUpload_editInput" autoFocus />
                            ) : upload.title}
                          </td>
                          <td style={{ color: "var(--home-text-muted)", fontSize: "0.85rem" }}>{upload.dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            <div className="CssUpload_tableBadges">
                              {upload.html && <span className="badge">HTML</span>}
                              {upload.css && <span className="badge">CSS</span>}
                              {upload.js && <span className="badge">JS</span>}
                            </div>
                          </td>
                          <td align="right">
                            <div className="CssUpload_tableActions">
                              {editRow?.id === upload.id ? (
                                <>
                                  <button type="button" onClick={() => saveEdit(upload.id)} className="saveBtn"><FiCheckCircle /> Save</button>
                                  <button type="button" onClick={() => setEditRow(null)} className="cancelBtn"><FiX /> Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={() => setEditRow(upload)} className="editBtn" title="Edit"><FiEdit3 /></button>
                                  <button type="button" onClick={() => setDeleteConfirm(upload.id)} className="deleteBtn" title="Delete"><FiX /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="Gallery_modalOverlay" onClick={() => setDeleteConfirm(null)}>
          <div className="Gallery_modalContent" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <FiAlertCircle style={{ fontSize: '3rem', color: 'var(--auth-error-text)', marginBottom: '15px' }} />
            <h3 style={{ marginBottom: '15px', color: 'var(--home-text-dark)' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--home-text-muted)', marginBottom: '30px' }}>Are you entirely sure you want to permanently delete this battle? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} className="CssUpload_button" style={{ flex: 1, background: '#f5f5f5', color: '#555', boxShadow: 'none' }}>Cancel</button>
              <button onClick={() => executeDelete(deleteConfirm)} className="CssUpload_button" style={{ flex: 1, background: 'var(--auth-error-bg)', color: 'white', boxShadow: 'none' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'gallery' && (
        <div className="Gallery_container" style={{ padding: 0, overflow: 'visible', maxHeight: 'none', background: 'transparent' }}>

          <div className="CssUpload_filterHeader">
            <div className="CssUpload_filterTabs">
              {['day', 'week', 'month', 'year'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`CssUpload_filterTabBtn ${filterType === opt ? 'active' : ''}`}
                  onClick={() => setFilterType(opt)}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            <div className="CssUpload_datePickerWrapper">
              <FiCalendar className="CssUpload_calendarIcon" />
              <DatePicker
                selected={filterDateObj}
                onChange={(date) => setFilterDateObj(date)}
                showWeekPicker={filterType === 'week'}
                showMonthYearPicker={filterType === 'month'}
                showYearPicker={filterType === 'year'}
                dateFormat={
                  filterType === 'day' ? 'MMMM d, yyyy' :
                    filterType === 'week' ? 'I/R' :
                      filterType === 'month' ? 'MMMM yyyy' : 'yyyy'
                }
                className="CssUpload_premiumDateInput"
                wrapperClassName="CssUpload_datePickerInternalWrapper"
              />
            </div>
          </div>

          {loadingGallery ? (
            <div className="Gallery_loading">{LoadingSvg()}</div>
          ) : sortedDates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '15px' }}>
              <h3 style={{ color: '#999' }}>No battles found for this filter.</h3>
            </div>
          ) : (
            <div className="CssUpload_galleryGroupContainer">
              {sortedDates.map(dateStr => (
                <div key={dateStr} className="CssUpload_dateGroup">
                  <div className="CssUpload_groupHeader">
                    <h3 className="CssUpload_groupDate">{new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <span className="CssUpload_groupCount">{groupedUploads[dateStr].length} Upload{groupedUploads[dateStr].length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="Gallery_grid">
                    {groupedUploads[dateStr].map((upload, idx) => (
                      <div key={idx} className="Gallery_card Gallery_appear completed">
                        <div className="Gallery_cardScaler">
                          <div className="Gallery_cardPreviewArea">
                            <iframe
                              title={`preview-${dateStr}-${idx}`}
                              srcDoc={`<html><style>${upload.css}</style><body style="margin:0; overflow:hidden;">${upload.html}</body></html>`}
                              className="Gallery_miniPreview"
                              scrolling="no"
                            />
                          </div>
                          <div className="Gallery_cardFooter">
                            <div>
                              <div className="Gallery_dateLabel">{upload.title || 'Battle'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '3px' }}>
                                {upload.dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div className="Gallery_actionIcons">
                              <button className="Gallery_iconBtn" onClick={() => setPreviewData(upload)} title="View Code">
                                <FiEye />
                              </button>
                              <button className="Gallery_iconBtn" onClick={() => handleDownload(upload)} title="Download">
                                <FiDownload />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`CssUpload_toast CssUpload_toast_${toast.type}`}>
          {toast.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
};

export default CssUpload;
