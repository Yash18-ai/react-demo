// Message Pinned functionality

// MessageBubble.jsx

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteMessage,
  setEditingMessage,
  pinMessage,      // NEW
  unpinMessage,    // NEW
} from "../features/messages/messagesSlice";
import { MdDelete, MdEdit, MdCheckCircle, MdReply, MdMoreVert, MdPushPin } from "react-icons/md";
import { TiArrowForward } from "react-icons/ti";
import { useLongPress } from "use-long-press";
import Swal from "sweetalert2";
import { MdBlockFlipped } from "react-icons/md";

export default function MessageBubble({
  message,
  isOwn,
  showSender,
  isSelected = false,
  onToggleSelect = () => { },
  selectionMode = false,
  onReply = () => { },
  onJumpToMessage = () => { },
  onForward = () => { },
}) {
  const dispatch = useDispatch();
  const lastLongPressAt = useRef(0);

  const currentUserId = useSelector((state) => state.messages.currentUserId);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleEdit = (e) => {
    e.stopPropagation();
    if (isOwn) {
      dispatch(setEditingMessage(message));
    }
    setMenuOpen(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();

    let messageTime = message && message.timestamp ? new Date(message.timestamp).getTime() : 0;
    let currentTime = Date.now();
    let timePassed = currentTime - messageTime

    let TWO_MINUTES = 2 * 60 * 1000;
    let canDeleteForEveryone = timePassed <= TWO_MINUTES;

    let isSender = currentUserId && message.senderId && currentUserId.toString() === message.senderId.toString();

    let alreadyDeleted = message.deleted || message.type === "deleted";

    if (alreadyDeleted) {
      Swal.fire({
        title: "Delete message?",
        text: "Do you want to delete this message from your chat?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          dispatch(deleteMessage({ id: message.id, forEveryone: false }));
        }
      });
      return;
    }

    if (isSender && canDeleteForEveryone) {
      Swal.fire({
        title: "Delete message?",
        icon: "warning",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Delete for everyone",
        denyButtonText: "Delete for me",
        cancelButtonText: "Cancel"
      })
        .then((result) => {
          if (result.isConfirmed) {
            dispatch(deleteMessage({ id: message.id, forEveryone: true, deletedBy: currentUserId || null }));
          } else if (result.isDenied) {
            dispatch(deleteMessage({ id: message.id, forEveryone: false }));
          }
        })
    }
    else {
      Swal.fire({
        title: `Delete message?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete for me",
        cancelButtonText: "Cancel"
      })
        .then((result) => {
          if (result.isConfirmed) {
            dispatch(deleteMessage({ id: message.id, forEveryone: false }));
          }
        });
    }
    setMenuOpen(false);
  };

  // NEW: pin/unpin handlers
  const handlePinToggle = (e) => {
    e.stopPropagation();
    if (!message) return;

    if (message.pinned) {
      dispatch(unpinMessage({ id: message.id, unpinnedBy: currentUserId || null }));
      Swal.fire("Unpinned", "Message removed from pinned messages.", "success");
    } else {
      dispatch(pinMessage({ id: message.id, pinnedBy: currentUserId || null }));
      Swal.fire("Pinned", "Message added to pinned messages.", "success");
    }
    setMenuOpen(false);
  };

  const longPress = useLongPress(() => {
    lastLongPressAt.current = Date.now();
    onToggleSelect(message.id);
  },
    {
      threshold: 500,
      captureEvent: true,
      detect: 'both',
    }
  );

  const handleClick = (e) => {
    const now = Date.now();
    if (now - lastLongPressAt.current < 500) {
      return;
    }
    onToggleSelect(message.id);
  }

  const isDeletedForEveryone = message.deleted || message.type === "deleted";

  const renderMessageContent = (message) => {
    if (!message.mentions || message.mentions.length === 0 || message.type !== "text") {
      return message.content;
    }

    const mentions = [...message.mentions].sort((a, b) => a.offset - b.offset);
    const parts = [];
    let lastIndex = 0;

    mentions.forEach((mention) => {
      const startOfMention = mention.offset;
      const endOfMention = startOfMention + `@${mention.name}`.length;

      if (startOfMention > lastIndex) {
        parts.push(message.content.slice(lastIndex, startOfMention));
      }

      parts.push(
        <span
          key={`mention-${mention.userId}-${startOfMention}`}
          className="mention fw-bold text-primary"
          style={{ cursor: "pointer" }}
          onClick={(event) => {
            event.stopPropagation();
            console.log("Mention clicked:", mention.userId);
          }}
        >
          @{mention.name}
        </span>
      );

      lastIndex = endOfMention;
    });

    if (lastIndex < message.content.length) {
      parts.push(message.content.slice(lastIndex));
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  const renderReplySnippet = (reply) => {
    if (!reply) return null;
    const replySender = reply.senderName || "Unknown";
    let snippet = "";

    if (reply.type === "image") {
      snippet = "Image";
    } else if (reply.type === "text") {
      snippet = reply.content ? (typeof reply.content === "string" ? reply.content : "") : "";
      if (snippet.length > 80) snippet = snippet.slice(0, 77) + "...";
    } else {
      snippet = reply.content || "";
    }

    return (
      <div
        className="reply-snippet mb-2 p-3 rounded"
        style={{ background: "#f1f1f1", borderLeft: "3px solid #ccc", cursor: "pointer" }}
        title="Jump to original message"
        onClick={(e) => {
          e.stopPropagation();

          if (reply && reply.id && onJumpToMessage) {
            onJumpToMessage(reply.id);
          } else {
            Swal.fire({
              icon: "info",
              title: "Original message not available",
              text: "cannot jump to the original message."
            });
          }
        }}
      >
        <div className="reply-sender small fw-bold">{replySender}</div>
        <div className="reply-content small text-truncate">{snippet || <em>Media</em>}</div>
      </div>
    );
  };

  const messageReply = message.replyTo || null;

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  return (
    <div
      {...longPress()}
      onClick={handleClick}
      className={`d-flex mb-3 ${isOwn ? "justify-content-end" : "justify-content-start"}`}>
      <div className={`message-bubble ${isOwn ? "own-message" : "other-message"} ${selectionMode ? "selection-mode" : ""} ${isSelected ? "selected" : ""}`}>
        <div
          className={`selection-checkbox ${isSelected ? "checked" : ""}`}
          style={{ display: selectionMode ? "flex" : "none" }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(message.id);
          }}
          title={isSelected ? "Unselect" : "Select"}
        >
          {isSelected ? <MdCheckCircle className="selection-icon" /> : ""}
        </div>

        {showSender && !isOwn && (
          <div className="sender-name fw-bold">{message.senderName}</div>
        )}

        {messageReply && (
          <div onClick={(e) => { e.stopPropagation(); }}>
            {renderReplySnippet(messageReply)}
          </div>
        )}

        {message.forwarded && (
          <div className="forwarded-badge small fst-italic">Forwarded</div>
        )}

        {message.type === "image" ? (
          <img src={message.content} alt="sent-img" className="chat-image" />
        ) : (
          <div className="message-text">
            {isDeletedForEveryone ? (
              <span className="deleted-message d-flex align-items-center text-muted">
                <MdBlockFlipped style={{ marginRight: "4px" }} />
                This message was deleted
              </span>
            ) : (
              <>
                {renderMessageContent(message)}{" "}
                {message.edited && <span className="edited-text">(edited)</span>}
              </>
            )}
          </div>
        )}

        <div className="message-footer d-flex align-items-center justify-content-between mt-2">
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted message-time">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>

            {/* SMALL PIN ICON: visible if the message is pinned */}
            {message.pinned && (
              <MdPushPin
                title="Pinned message"
                style={{ marginLeft: 6, fontSize: 16, opacity: 0.85 }}
                className="text-muted pinned-indicator"
              />
            )}
          </div>

          <div className="bubble-menu-wrapper" ref={menuRef}>
            <button
              className="btn btn-sm btn-light more-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((s) => !s);
              }}
              title="Options"
            >
              <MdMoreVert />
            </button>

            {menuOpen && (
              <div className="more-menu shadow-sm">
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onReply(message);
                  }}
                >
                  <MdReply size={16} className="me-2" /> Reply
                </button>

                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    if (onForward && typeof onForward === "function")
                      onForward(message);
                  }}
                >
                  <TiArrowForward size={16} className="me-2" /> Forward
                </button>

                {isOwn && !isDeletedForEveryone && (
                  <button className="dropdown-item" onClick={handleEdit}>
                    <MdEdit size={16} className="me-2" /> Edit
                  </button>
                )}

                {/* NEW: Pin / Unpin option */}
                {!isDeletedForEveryone && (
                  <button className="dropdown-item" onClick={handlePinToggle}>
                    <MdPushPin size={16} className="me-2" />
                    {message.pinned ? "Unpin message" : "Pin message"}
                  </button>
                )}

                <button className="dropdown-item text-danger" onClick={handleDelete}>
                  <MdDelete size={16} className="me-2" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



// PinnedMessage.jsx


// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { unpinMessage } from "../../features/messages/messagesSlice";
// import { MdClose, MdPushPin } from "react-icons/md";
// import Swal from "sweetalert2";

// /**
//  * PinnedMessages
//  *
//  * Props:
//  * - pinnedMessages: array of pinned message objects for the current chat (already filtered by ChatWindow)
//  * - onJumpToMessage: function(messageId)
//  */
// export default function PinnedMessages({ pinnedMessages = [], onJumpToMessage }) {
//   const dispatch = useDispatch();
//   const currentUserId = useSelector((s) => s.messages.currentUserId);

//   const [showModal, setShowModal] = useState(false);

//   // If no pinned messages, return null (no bar)
//   if (!pinnedMessages || pinnedMessages.length === 0) return null;

//   const openModal = (e) => {
//     if (e) e.stopPropagation();
//     setShowModal(true);
//   };

//   const closeModal = (e) => {
//     if (e) e && e.stopPropagation();
//     setShowModal(false);
//   };

//   const handleUnpin = (e, id) => {
//     e.stopPropagation();

//     // Confirm first
//     Swal.fire({
//       title: "Unpin message?",
//       text: "Remove this message from pinned messages?",
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Yes, unpin",
//       cancelButtonText: "Cancel",
//     }).then((res) => {
//       if (res.isConfirmed) {
//         dispatch(unpinMessage({ id, unpinnedBy: currentUserId || null }));
//         // Close modal (if open) and show success
//         setShowModal(false);
//         Swal.fire("Unpinned", "Message removed from pinned messages.", "success");
//       }
//     });
//   };

//   const handleSelectAndClose = (e, id) => {
//     e.stopPropagation();
//     if (onJumpToMessage) onJumpToMessage(id);
//     setShowModal(false);
//   };

//   return (
//     <>
//       <div
//         className="pinned-bar p-2 border-bottom d-flex align-items-center"
//         style={{ background: "#fff", cursor: "pointer" }}
//         onClick={openModal}
//         title="Open pinned messages"
//       >
//         <div className="d-flex align-items-center">
//           <MdPushPin className="me-2" />
//           <strong className="me-2">Pinned</strong>
//           <small className="text-muted">({pinnedMessages.length})</small>
//         </div>

//         <div className="ms-auto small text-muted" style={{ fontSize: 12 }}>
//           Click to view
//         </div>
//       </div>

//       {showModal && (
//         <div
//           className="pinned-modal-backdrop"
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.4)",
//             zIndex: 1050,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             padding: 12,
//           }}
//           onClick={closeModal}
//         >
//           <div
//             className="pinned-modal shadow-sm"
//             style={{
//               width: "min(720px, 96%)",
//               maxHeight: "80vh",
//               overflow: "auto",
//               background: "#fff",
//               borderRadius: 8,
//               padding: 12,
//             }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="d-flex align-items-center mb-2">
//               <MdPushPin className="me-2" />
//               <h5 className="mb-0 me-auto">Pinned messages ({pinnedMessages.length})</h5>
//               <button className="btn btn-sm btn-light" onClick={closeModal} title="Close">
//                 <MdClose />
//               </button>
//             </div>

//             <div className="pinned-list d-flex flex-column gap-2">
//               {pinnedMessages.map((p) => (
//                 <div
//                   key={p.id}
//                   className="pinned-item d-flex align-items-start p-2 rounded shadow-sm"
//                   style={{ cursor: "pointer", background: "#f8f9fa" }}
//                 >
//                   <div
//                     style={{ flex: 1 }}
//                     onClick={(e) => handleSelectAndClose(e, p.id)}
//                     title={p.content ? (typeof p.content === "string" ? p.content : "Open message") : "Open message"}
//                   >
//                     <div className="small fw-bold">{p.senderName || "Unknown"}</div>
//                     <div className="small text-truncate" style={{ maxWidth: "100%" }}>
//                       {p.type === "image" ? <em>Image</em> : (typeof p.content === "string" ? p.content : "")}
//                     </div>
//                     <div className="small text-muted" style={{ fontSize: 11 }}>
//                       {new Date(p.timestamp).toLocaleString()}
//                     </div>
//                   </div>

//                   <div style={{ marginLeft: 8 }}>
//                     <button
//                       className="btn btn-sm btn-light"
//                       onClick={(e) => handleUnpin(e, p.id)}
//                       title="Unpin"
//                     >
//                       <MdClose />
//                     </button>
//                   </div>
//                 </div>
//               ))}

//               {pinnedMessages.length === 0 && (
//                 <div className="text-center text-muted p-3">No pinned messages</div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
