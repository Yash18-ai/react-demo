import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  deleteMessage,
  setEditingMessage,
  pinMessage,
  unpinMessage,
} from "../features/messages/messagesSlice";
import { MdDelete, MdEdit, MdCheckCircle, MdReply, MdMoreVert, MdPushPin } from "react-icons/md";
import { TiArrowForward } from "react-icons/ti";
import { useLongPress } from "use-long-press";
import { useSelector } from "react-redux";
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
  }

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
      {/* <div className={`message-bubble ${isOwn ? "own-message" : "other-message"} ${isSelected ? "selected" : ""}`}> */}
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
                {/* {message.content}{" "} */}
                {renderMessageContent(message)}{" "}
                {message.edited && <span className="edited-text">(edited)</span>}
              </>
            )}
          </div>
        )}

        <div className="message-footer d-flex align-items-center justify-content-between mt-2">
          <small className="text-muted message-time">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>

          {message.pinned && (
            <MdPushPin
              title="Pinned message"
              style={{ marginLeft: 6, fontSize: 16, opacity: 0.85 }}
              className="text-muted pinned-indicator"
            />
          )}

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
