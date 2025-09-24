import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

const ForwardModal = ({ show, onClose, message, users = [], groups = [], onForward }) => {
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!show) {
      setSelectedTargets([]);
      setSearch("");
    }
  }, [show]);

  if (!show) return null;

  const toggleTarget = (type, id) => {
    const key = `${type}:${id}`;
    setSelectedTargets((prev) =>
      prev.some((p) => `${p.type}:${p.id}` === key)
        ? prev.filter((p) => `${p.type}:${p.id}` !== key)
        : [...prev, { type, id }]
    );
  };

  const handleSend = () => {
    if (!message) return;
    if (selectedTargets.length === 0) {
      Swal.fire("Select target", "Please select at least one user or group.", "warning");
      return;
    }
    onForward({ message, targets: selectedTargets });
    Swal.fire("Forwarded", "Message forwarded successfully.", "success");
    onClose();
  };

  const previewText = () => {
    if (!message) return "";
    if (message.type === "image") return "Image";
    if (typeof message.content === "string") {
      return message.content.length > 50 ? message.content.slice(0, 47) + "..." : message.content;
    }
    return "Media";
  };

  const filteredUsers = users.filter((u) =>
    (u.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    (g.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal fade show d-block" tabIndex="-1" onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          
          <div className="modal-header">
            <h5 className="modal-title">Forward Message</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="p-3 border-bottom bg-light">
            <div className="small text-muted mb-1">Message Preview</div>
            <div className="p-2 rounded bg-white shadow-sm">
              <div className="fw-bold">{message.senderName || "Unknown"}</div>
              <div>{previewText()}</div>
              {message.forwarded && <div className="small text-muted">Forwarded</div>}
            </div>
          </div>

          <div className="p-2 border-bottom">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search contacts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="modal-body p-0" style={{ maxHeight: "350px", overflowY: "auto" }}>
            <ul className="list-group list-group-flush">
              <li className="list-group-item fw-bold small bg-light">Users</li>
              {filteredUsers.length === 0 && (
                <li className="list-group-item text-muted small">No users found</li>
              )}
              {filteredUsers.map((u) => (
                <li
                  key={`user-${u.id}`}
                  className="list-group-item d-flex align-items-center"
                  onClick={() => toggleTarget("user", u.id)}
                  style={{ cursor: "pointer" }}
                >
                  <img
                        src={u.avatar || "/User.png"}
                        alt={u.name}
                        className="rounded-circle avatar-img"
                        width="40"
                        height="40"
                        onError={(e) => {
                          e.target.onError = null;
                          e.target.src = "/User.png";
                        }}
                      />
                  <span className="flex-grow-1">{u.name || `User ${u.id}`}</span>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedTargets.some((t) => t.type === "user" && t.id === u.id)}
                    readOnly
                  />
                </li>
              ))}

              <li className="list-group-item fw-bold small bg-light">Groups</li>
              {filteredGroups.length === 0 && (
                <li className="list-group-item text-muted small">No groups found</li>
              )}
              {filteredGroups.map((g) => (
                <li
                  key={`group-${g.id}`}
                  className="list-group-item d-flex align-items-center"
                  onClick={() => toggleTarget("group", g.id)}
                  style={{ cursor: "pointer" }}
                >
                  <img
                        src={g.avatar || "/Group.png"}
                        alt={g.name}
                        className="rounded-circle avatar-img"
                        width="40"
                        height="40"
                        onError={(e) => {
                          e.target.onError = null;
                          e.target.src = "/Group.png";
                        }}
                      />
                  <span className="flex-grow-1">{g.name || `Group ${g.id}`}</span>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedTargets.some((t) => t.type === "group" && t.id === g.id)}
                    readOnly
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={selectedTargets.length === 0}
            >
              Forward ({selectedTargets.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
