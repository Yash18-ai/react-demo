// import React, { useState, useEffect } from "react";
// import { useDispatch } from "react-redux";
// import { setDisappearingSetting } from "../../features/messages/messagesSlice";
// import { socket } from "../../services/socket";

// const OPTIONS = [
//   { key: "24h", label: "24 hours" },
//   { key: "7d", label: "7 days" },
//   { key: "90d", label: "90 days" },
//   { key: "off", label: "Off" },
// ];

// const DisappearModal = ({ show, onClose, chatKey, currentMode }) => {
//   const dispatch = useDispatch();
//   const [mode, setMode] = useState(currentMode || "off");

//   useEffect(() => {
//     setMode(currentMode || "off");
//   }, [currentMode, show]);

//   if (!show) return null;

//   const handleSave = () => {
//     if (!chatKey) {
//       onClose?.();
//       return;
//     }
//     dispatch(setDisappearingSetting({ chatKey, mode }));
//     // Also emit directly for safety (slice will emit too)
//     try {
//       socket.emit("disappear:update", { chatKey, mode, updatedAt: new Date().toISOString() });
//     } catch (e) {
//       // ignore
//     }
//     onClose?.();
//   };

//   return (
//     <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
//       <div className="modal-dialog modal-sm" role="document">
//         <div className="modal-content">
//           <div className="modal-header">
//             <h5 className="modal-title">Message Timer</h5>
//             <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
//           </div>
//           <div className="modal-body">
//             <p className="small text-muted">Select how long messages should remain visible in this chat</p>
//             <div>
//               {OPTIONS.map((o) => (
//                 <div className="form-check" key={o.key}>
//                   <input
//                     className="form-check-input"
//                     type="radio"
//                     name="disappearOption"
//                     id={`disappear-${o.key}`}
//                     checked={mode === o.key}
//                     onChange={() => setMode(o.key)}
//                   />
//                   <label className="form-check-label" htmlFor={`disappear-${o.key}`}>
//                     {o.label}
//                   </label>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="modal-footer">
//             <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
//             <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DisappearModal;

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setDisappearingSetting } from "../../features/messages/messagesSlice";
import { socket } from "../../services/socket";

const OPTIONS = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "90d", label: "90 days" },
  { key: "off", label: "Off" },
];

const DisappearModal = ({ show, onClose, chatKey, currentMode }) => {
  const dispatch = useDispatch();
  const [mode, setMode] = useState(currentMode || "off");

  useEffect(() => {
    setMode(currentMode || "off");
  }, [currentMode, show]);

  if (!show) return null;

  const handleSave = () => {
    if (!chatKey) {
      onClose?.();
      return;
    }
    dispatch(setDisappearingSetting({ chatKey, mode }));
    // Also emit directly for safety (slice will emit too)
    try {
      socket.emit("disappear:update", { chatKey, mode, updatedAt: new Date().toISOString() });
    } catch (e) {
      // ignore
    }
    // keep previous behavior: close modal after save
    onClose?.();
  };

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog modal-sm" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Message Timer</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="small text-muted">Select how long messages should remain visible in this chat</p>
            <div>
              {OPTIONS.map((o) => (
                <div className="form-check" key={o.key}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="disappearOption"
                    id={`disappear-${o.key}`}
                    checked={mode === o.key}
                    onChange={() => setMode(o.key)}
                  />
                  <label className="form-check-label" htmlFor={`disappear-${o.key}`}>
                    {o.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisappearModal;
