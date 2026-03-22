import React, { createContext, useContext, useState } from 'react';
import { FiX, FiCheck, FiAlertTriangle, FiInfo, FiTrash2, FiShield } from 'react-icons/fi';
import '../Styles/CustomModal.css';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info', // 'info', 'danger', 'warning', 'success', 'admin'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isAlert: false,
  });

  const showConfirm = ({ 
    type = 'info', 
    title = 'Confirm Access?', 
    message = 'Are you sure about this action?', 
    confirmText = 'Proceed', 
    cancelText = 'Cancel',
    isAlert = false
  }) => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        type,
        title,
        message,
        confirmText,
        cancelText,
        isAlert,
        onConfirm: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const showAlert = (options) => showConfirm({ ...options, isAlert: true });

  const getIcon = (type) => {
    switch(type) {
      case 'danger': return <FiTrash2 className="Modal_mainIcon" />;
      case 'warning': return <FiAlertTriangle className="Modal_mainIcon" />;
      case 'admin': return <FiShield className="Modal_mainIcon" />;
      case 'success': return <FiCheck className="Modal_mainIcon" />;
      default: return <FiInfo className="Modal_mainIcon" />;
    }
  };

  return (
    <ModalContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      {modal.isOpen && (
        <div className="Modal_overlay" onClick={modal.isAlert ? modal.onConfirm : modal.onCancel}>
          <div 
            className={`Modal_container Modal_type-${modal.type}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <button className="Modal_close" onClick={modal.isAlert ? modal.onConfirm : modal.onCancel}>
              <FiX />
            </button>
            
            <div className={`Modal_iconWrap Modal_iconWrap-${modal.type}`}>
               {getIcon(modal.type)}
            </div>

            <div className="Modal_content">
              <h2 className="Modal_title">{modal.title}</h2>
              <p className="Modal_message">{modal.message}</p>
            </div>

            <div className="Modal_actions">
              {!modal.isAlert && (
                <button 
                  className="Modal_btnCancel" 
                  onClick={modal.onCancel}
                >
                  {modal.cancelText}
                </button>
              )}
              <button 
                className={`Modal_btnConfirm Modal_btnConfirm-${modal.type}`}
                onClick={modal.onConfirm}
                style={modal.isAlert ? { flex: 1 } : {}}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
