import React, { useMemo, useState, useEffect, useRef } from "react";
import moment from "moment";
import { FiX } from "react-icons/fi";
import "../../assets/css/MessageSearch.css";

const MessageSearch = ({ show, onClose, chatMessages = [], users = [], onJumpToMessage }) => {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    };
  }, [show, onClose]);

  useEffect(() => {
    if (!show) {
      setQuery("");
      setDateFilter("");
    }
  }, [show]);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!chatMessages || chatMessages.length === 0) return [];

    return chatMessages
      .filter((m) => {
        if (dateFilter) {
          const msgDate = moment(m.timestamp);
          const filterDate = moment(dateFilter, "YYYY-MM-DD");
          if (!msgDate.isSame(filterDate, "day")) return false;
        }

        if (!normalizedQuery) return true;

        const text = (m.content || "").toString().toLowerCase();
        if (text.includes(normalizedQuery)) return true;

        const sender = users.find((u) => u.id?.toString() === (m.senderId?.toString() || ""));
        const senderName = (sender?.name || "").toLowerCase();
        if (senderName.includes(normalizedQuery)) return true;

        const ts = m.timestamp ? moment(m.timestamp).format("YYYY-MM-DD HH:mm:ss").toLowerCase() : "";
        if (ts.includes(normalizedQuery)) return true;

        return false;
      })
      .map((m) => {
        let snippet =
          m.content && typeof m.content === "string"
            ? m.content
            : m.type === "image"
            ? "[Image]"
            : "";
        let highlightIndexes = [];
        if (normalizedQuery) {
          const lc = snippet.toLowerCase();
          const idx = lc.indexOf(normalizedQuery);
          if (idx !== -1) highlightIndexes.push([idx, normalizedQuery.length]);
        }
        return { message: m, snippet, highlight: highlightIndexes };
      })
      .sort(
        (a, b) =>
          new Date(b.message.timestamp).getTime() -
          new Date(a.message.timestamp).getTime()
      );
  }, [chatMessages, users, dateFilter, normalizedQuery]);

  const formatSnippet = (text, highlights = []) => {
    if (!text) return <span className="ms-no-text">[no text]</span>;
    if (!highlights || highlights.length === 0)
      return <span>{text.length > 120 ? text.slice(0, 120) + "..." : text}</span>;

    const [start, len] = highlights[0];
    const before = text.slice(0, start);
    const match = text.slice(start, start + len);
    const after = text.slice(start + len);
    const shortBefore = before.length > 60 ? "..." + before.slice(-60) : before;
    const shortAfter = after.length > 60 ? after.slice(0, 60) + "..." : after;

    return (
      <span>
        {shortBefore}
        <mark className="ms-highlight">{match}</mark>
        {shortAfter}
      </span>
    );
  };

  if (!show) return null;

  return (
    <div className="message-search-overlay">
      <div className="message-search-card" ref={modalRef}>
        <div className="ms-top">
          <div className="ms-controls">
            <input
              type="text"
              className="ms-input"
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            <input
              type="date"
              className="ms-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Filter by date"
            />
          </div>

          <button
            className="ms-close-btn"
            onClick={onClose}
            title="Close search"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="ms-body">
          <div className="ms-body-header">
            <small className="ms-result-count">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </small>
            <small className="ms-sorting">Showing newest first</small>
          </div>

          {results.length === 0 ? (
            <div className="ms-empty">No results</div>
          ) : (
            <ul className="ms-list">
              {results.map(({ message, snippet, highlight }) => {
                const sender = users.find(
                  (u) => u.id?.toString() === message.senderId?.toString()
                );
                const title = sender
                  ? sender.name
                  : message.senderName || `User ${message.senderId}`;
                return (
                  <li
                    key={message.id}
                    className="ms-item"
                    onClick={() => {
                      onJumpToMessage(message.id);
                      onClose();
                    }}
                  >
                    <img
                      src={sender?.avatar || "/User.png"}
                      alt={title}
                      className="ms-avatar"
                      onError={(e) => {
                        e.target.onError = null;
                        e.target.src = "/User.png";
                      }}
                    />
                    <div className="ms-content">
                      <div className="ms-top-row">
                        <strong className="ms-title">{title}</strong>
                        <small className="ms-time">
                          {moment(message.timestamp).format("MMM D, h:mm A")}
                        </small>
                      </div>
                      <div className="ms-snippet">
                        {message.type === "image" ? (
                          <em>Image</em>
                        ) : (
                          formatSnippet(snippet, highlight)
                        )}
                      </div>
                      {message.replyTo && (
                        <div className="ms-reply">
                          Reply to: {message.replyTo.senderName || "Someone"}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageSearch;
