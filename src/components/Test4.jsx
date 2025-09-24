// MessageBubble.jsx code with Read receipts (single tick ✓ for sent, double tick ✓✓ for delivered, blue tick for read) functionality

import React, { useRef } from "react";
import { useDispatch } from "react-redux";
import {
  deleteMessage,
  deleteMessageRemote,
  setEditingMessage,
} from "../features/messages/messagesSlice";
import { MdDelete, MdEdit, MdCheckCircle, MdReply, MdDone, MdDoneAll } from "react-icons/md";
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
}) {
  const dispatch = useDispatch();
  const lastLongPressAt = useRef(0);

  const currentUserId = useSelector((state) => state.messages.currentUserId);

  const handleEdit = (e) => {
    e.stopPropagation();
    if (isOwn) {
      dispatch(setEditingMessage(message));
    }
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
        // text: 
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
          } else {
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

  // determine tick status for own messages
  const messageStatus = message.status || (message.deleted ? "deleted" : "sent");

  const renderTicks = () => {
    if (!isOwn) return null;

    if (message.deleted) return null;

    if (messageStatus === "sent") {
      return <MdDone size={14} style={{ marginLeft: 6, opacity: 0.7 }} title="Sent" />;
    } else if (messageStatus === "delivered") {
      return <MdDoneAll size={14} style={{ marginLeft: 6, opacity: 0.7 }} title="Delivered" />;
    } else if (messageStatus === "read") {
      return <MdDoneAll size={14} style={{ marginLeft: 6, color: "#0b93f6" }} title="Read" />;
    }
    return null;
  };

  return (
    <div
      {...longPress()}
      onClick={handleClick}
      className={`d-flex mb-3 ${isOwn ? "justify-content-end" : "justify-content-start"}`}>
      <div className={`message-bubble ${isOwn ? "own-message" : "other-message"} ${isSelected ? "selected" : ""}`}
        style={{ position: "relative" }}
      >
        <div
          className={`selection-checkbox ${isSelected ? "checked" : ""}`}
          style={{ display: selectionMode ? "flex" : "none" }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(message.id);
          }}
          title={isSelected ? "Unselect" : "Select"}
        >
          {isSelected ? <MdCheckCircle /> : ""}
        </div>

        {showSender && !isOwn && (
          <div className="sender-name fw-bold">{message.senderName}</div>
        )}

        {messageReply && (
          <div onClick={(e) => { e.stopPropagation(); }}>
            {renderReplySnippet(messageReply)}
          </div>
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
                {message.content}{" "}
                {message.edited && <span className="edited-text">(edited)</span>}
              </>
            )}
          </div>
        )}


        {/* <div className="message-footer">
          <small className="text-muted message-time">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>

          <div className="message-actions d-flex align-items-center">
           
            <div className="message-ticks">
              {renderTicks()}
            </div>

            {!isDeletedForEveryone && isOwn && (
              <button className="action-btn edit-btn" onClick={handleEdit}>
                <MdEdit size={14} />
              </button>
            )}

            {!isDeletedForEveryone && (
              <button
                className="action-btn reply-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
                title="Reply"
              >
                <MdReply size={14} />
              </button>
            )}

            {!isDeletedForEveryone && (
              <button className="action-btn delete-btn" onClick={handleDelete}>
                <MdDelete size={14} />
              </button>
            )}

            {isDeletedForEveryone && (
              <button
                className="action-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();

                  Swal.fire({
                    title: "Remove from your chat?",
                    text: "Do you want to remove deleted message from your chat?",
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonText: "Delete for me",
                    cancelButtonText: "Cancel",
                  }).then((result) => {
                    if (result.isConfirmed) {
                      dispatch(deleteMessage({ id: message.id, forEveryone: false }));
                    }
                  });
                }}
              >
                <MdDelete size={14} />
              </button>
            )}
          </div>
        </div> */}

        <div className="message-footer d-flex align-items-center">
          {/* time */}
          <small className="text-muted message-time">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>

          {/* TICKS: moved OUTSIDE .message-actions so they are always visible.
      Use inline style for safe spacing — you can tweak in CSS later. */}
          <div
            className="message-ticks"
            style={{ display: "inline-flex", alignItems: "center", marginLeft: 8 }}
          >
            {renderTicks()}
          </div>

          {/* action buttons (edit/reply/delete) remain in .message-actions */}
          <div className="message-actions ms-2 d-flex align-items-center">
            {!isDeletedForEveryone && isOwn && (
              <button className="action-btn edit-btn" onClick={handleEdit}>
                <MdEdit size={14} />
              </button>
            )}

            {!isDeletedForEveryone && (
              <button
                className="action-btn reply-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
                title="Reply"
              >
                <MdReply size={14} />
              </button>
            )}

            {!isDeletedForEveryone && (
              <button className="action-btn delete-btn" onClick={handleDelete}>
                <MdDelete size={14} />
              </button>
            )}

            {isDeletedForEveryone && (
              <button
                className="action-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();

                  Swal.fire({
                    title: "Remove from your chat?",
                    text: "Do you want to remove deleted message from your chat?",
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonText: "Delete for me",
                    cancelButtonText: "Cancel",
                  }).then((result) => {
                    if (result.isConfirmed) {
                      dispatch(deleteMessage({ id: message.id, forEveryone: false }));
                    }
                  });
                }}
              >
                <MdDelete size={14} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

