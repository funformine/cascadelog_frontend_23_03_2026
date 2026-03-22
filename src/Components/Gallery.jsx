import React, { useState, useEffect } from 'react';
import { 
  FiLock, FiAlertCircle, FiChevronLeft, FiChevronRight, 
  FiDownload, FiEye, FiX, FiCode, FiLoader 
} from 'react-icons/fi';
import JSZip from 'jszip'; 
import { saveAs } from 'file-saver';
import { supabase } from '../Components/Auth/supabaseClient'; 
import '../Styles/Gallery.css';
import API_BASE_URL from './Auth/Config';
import { LoadingSvg } from './Utilities';

const Gallery = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [previewData, setPreviewData] = useState(null);
  const [userUploads, setUserUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const today = new Date();

  // --- Fetch Data ---
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/submissions/gallery?month=${month}&year=${year}`, {
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
          const dateStr = dateObj.toISOString().split('T')[0];

          return {
            date: dateStr,
            html: htmlContent,
            css: cssContent,
            js: jsContent,
            id: task.id
          };
        }));

        setUserUploads(processedUploads);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [month, year]);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const handleDownload = async (upload) => {
    const zip = new JSZip();
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Masterpiece - ${upload.date}</title>
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
    saveAs(content, `Project_${upload.date}.zip`);
  };

  // Find the renderPreviewModal function in your Gallery.jsx and replace it with this:
const renderPreviewModal = () => {
  if (!previewData) return null;

  return (
    <div className="Gallery_modalOverlay" onClick={() => setPreviewData(null)}>
      <div className="Gallery_modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="Gallery_modalHeader">
          <div className="Gallery_modalTitle">
            <FiCode /> <span>Preview: {previewData.date}</span>
          </div>
          <button className="Gallery_closeBtn" onClick={() => setPreviewData(null)}>
            <FiX />
          </button>
        </div>

        {/* --- MODAL BODY START --- */}
        <div className="Gallery_modalBody">
          <div className="Gallery_modalResponsiveWrapper">
            <div className="Gallery_fixedViewport">
              {/* Using a style tag + div to replace the iframe */}
              <style>{previewData.css}</style>
              <div 
                className="Gallery_innerHtmlContent"
                dangerouslySetInnerHTML={{ __html: previewData.html }} 
              />
            </div>
          </div>
        </div>
        {/* --- MODAL BODY END --- */}

        <div className="Gallery_modalFooter">
          <div className="Gallery_codeIndicator">
            {previewData.html && <span className="badge">HTML</span>}
            <span className="badge">CSS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderGridItems = () => {
    const items = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDay = new Date(year, month, d);
      const yearStr = currentDay.getFullYear();
      const monthStr = String(currentDay.getMonth() + 1).padStart(2, '0');
      const dayStr = String(currentDay.getDate()).padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;
      
      const upload = userUploads.find(u => u.date === dateString);
      
      const isFuture = currentDay > today;
      const isPastMissed = !isFuture && !upload && currentDay.setHours(0,0,0,0) < today.setHours(0,0,0,0);

      items.push(
        <div 
          key={d} 
          className={`Gallery_card Gallery_appear ${isFuture ? 'locked' : isPastMissed ? 'missed' : 'completed'}`}
          style={{ animationDelay: `${Math.min(d * 0.05, 0.8)}s` }}
        >
          {/* SCALER WRAPPER: This is fixed to 400x370 and zooms out */}
          <div className="Gallery_cardScaler">
            
            {/* Top: 300px Preview */}
            <div className="Gallery_cardPreviewArea">
              {isFuture ? (
                 <div className="Gallery_statusIcon"><FiLock /> <p>Locked</p></div>
              ) : isPastMissed ? (
                 <div className="Gallery_statusIcon"><FiAlertCircle /> <p>Missed</p></div>
              ) : upload ? (
                <iframe
                  title={`preview-${d}`}
                  srcDoc={`<html><style>${upload.css}</style><body style="margin:0; overflow:hidden;">${upload.html}</body></html>`}
                  className="Gallery_miniPreview"
                  scrolling="no"
                />
              ) : (
                 <div className="Gallery_statusIcon"><FiLoader className="spin"/></div>
              )}
            </div>

            {/* Bottom: 70px Footer */}
            <div className="Gallery_cardFooter">
              <span className="Gallery_dateLabel">{d} {currentDay.toLocaleDateString('en-US', { month: 'short' })}</span>
              {upload && (
                <div className="Gallery_actionIcons">
                  <button className="Gallery_iconBtn" onClick={() => setPreviewData(upload)} title="View Code">
                    <FiEye />
                  </button>
                  <button className="Gallery_iconBtn" onClick={() => handleDownload(upload)} title="Download">
                    <FiDownload />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }
    return items;
  };

  return (
    <div className="Gallery_container Gallery_fadePage">
      {renderPreviewModal()}
      <div className="Gallery_header Gallery_slideDown">
        <div className="Gallery_nav">
          <button className="Gallery_navBtn" onClick={() => changeMonth(-1)}><FiChevronLeft /></button>
          <div className="Gallery_monthDisplay">
            <h2>{currentDate.toLocaleString('default', { month: 'long' })}</h2>
            <span>{year}</span>
          </div>
          <button className="Gallery_navBtn" onClick={() => changeMonth(1)}><FiChevronRight /></button>
        </div>

      </div>
      {loading ? (<div className="Gallery_loading">{LoadingSvg()}</div>) : (<div className="Gallery_grid">{renderGridItems()}</div>)}
          
      <div className="Gallery_gridWrapper">
      </div>
    </div>
  );
};

export default Gallery;

