import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CreateGroupModal from "./modals/CreateGroupModal";
import moment from "moment";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { setActiveChat } from "../features/messages/messagesSlice";

const ChatSidebar = ({ users, selectedUserId, onSelectUser, onSelectGroup, currentUser }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { groups, messages, unreadCounts, onlineUsers } = useSelector(
    (state) => state.messages
  );
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showUsers, setShowUsers] = useState(true);
  const [showGroups, setShowGroups] = useState(true);

  const handleSelectUser = (u) => {
    if (!u) return;
    // onSelectUser(u);
    dispatch(setActiveChat({ type: "user", id: u.id }));
    navigate(`/chat?type=user&id=${u.id}`);
    setSearchTerm(""); 
  };

  const handleSelectGroup = (g) => {
    if (!g) return;
    dispatch(setActiveChat({ type: "group", id: g.id }));
    navigate(`/chat?type=group&id=${g.id}`);
    setSearchTerm("");

    // onSelectGroup(g);
  }

  const getLastMessageTime = (id, isGroup = false) => {
    if (!messages || messages.length === 0) return 0;

    const chatMessages = messages.filter((m) =>
      isGroup
        ? m.groupId === id
        : !m.groupId && 
        (
          (m.senderId === currentUser?.id && m.receiverId === id) ||
          (m.senderId === id && m.receiverId === currentUser?.id)
        )
    );
    if (chatMessages.length === 0) return 0;
    return new Date(chatMessages[chatMessages.length - 1].timestamp).getTime();
  };

  const getLastMessage = (id, isGroup = false) => {
    if (!messages || messages.length === 0) return null;

    const chatMessages = messages.filter((m) =>
      isGroup
        ? m.groupId === id
        : !m.groupId && 
        (
          (m.senderId === currentUser?.id && m.receiverId === id) ||
          (m.senderId === id && m.receiverId === currentUser?.id)
        )
    );
    if (chatMessages.length === 0) return null;
    return chatMessages[chatMessages.length - 1];
  };

  const sortedUsers = [...users].sort(
    (a, b) => getLastMessageTime(b.id) - getLastMessageTime(a.id)
  );
  const sortedGroups = [...groups].sort(
    (a, b) => getLastMessageTime(b.id, true) - getLastMessageTime(a.id, true)
  );

  const filteredUsers = sortedUsers.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredGroups = sortedGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatChatTime = (timestamp) => {
    const msgDate = moment(timestamp);
    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "day").startOf("day");

    if (msgDate.isSame(today, "day")) {
      return msgDate.format("HH:mm");
    } else if (msgDate.isSame(yesterday, "day")) {
      return "Yesterday";
    } else {
      return msgDate.format("MMM D YY");
    }
  }

  return (
    <div className="chat-sidebar border-end">
      <div className="chat-group d-flex justify-content-between align-items-center p-3 border-bottom">
        <h5>Chats</h5>
        <button className="btn btn-sm btn-success" onClick={() => setShowModal(true)}>
          + Group
        </button>
      </div>

      <div className="p-2 border-bottom">
        <input 
          type="text"
          className="form-control"
          placeholder="search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <h6
        className="px-3 mt-3 text-muted d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer" }}
        onClick={() => setShowUsers(!showUsers)}
      >
        <span className="d-flex align-items-center gap-1">
          {showUsers ? <FiChevronDown /> : <FiChevronRight />} Users ({filteredUsers.length})
        </span>
      </h6>

      {showUsers && (
        <ul className="list-group list-group-flush">
          {filteredUsers.map((u) => {
            const lastMsg = getLastMessage(u.id);
            const isOnline = !!onlineUsers?.[u.id?.toString()];

            return (
              <li
                key={u.id}
                className={`list-group-item list-group-item-action ${selectedUserId === u.id ? "active" : ""
                  }`}
                onClick={() => handleSelectUser(u)}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="presence-avatar me-2">
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
                      <span
                        className={`presence-dot ${isOnline ? "online" : "offline"}`}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    </div>

                    <div>
                      <div className="fw-bold">{u.name}</div>
                      <div className="d-flex flex-column">
                        <small className="text-muted last-msg">
                          {lastMsg
                            ? lastMsg.type === "image"
                              ? "Image"
                              : lastMsg.content.length > 10
                                ? lastMsg.content.slice(0, 10) + "..."
                                : lastMsg.content
                            : "No messages yet"}
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="text-end">
                    {lastMsg && (
                      <small className="text-muted d-block">
                        {/* {moment(lastMsg.timestamp).format("HH:mm")} */}
                        {formatChatTime(lastMsg.timestamp)}
                      </small>
                    )}
                    {(unreadCounts?.[u.id] ?? 0) > 0 && (
                      <span className="badge bg-success rounded-pill">
                        {unreadCounts[u.id]}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h6
        className="px-3 mt-3 text-muted d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer" }}
        onClick={() => setShowGroups(!showGroups)}
      >
        {/* <span className="d-flex align-items-center gap-1">
          {showGroups ? <FiChevronDown /> : <FiChevronRight />} Groups ({filteredGroups.length})
        </span> */}
        <span className="d-flex align-items-center gap-1">
          {showGroups ? <FiChevronDown /> : <FiChevronRight />} Groups ({filteredGroups.length})
        </span>
      </h6>

      {showGroups && (
        <ul className="list-group list-group-flush">
          {filteredGroups.map((g) => {
            const lastMsg = getLastMessage(g.id, true);
            const onlineCount = (g.members || []).filter((m) => !!onlineUsers?.[m?.toString()]).length;

            return (
              <li
                key={g.id}
                className="list-group-item list-group-item-action"
                onClick={() => handleSelectGroup(g)}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="presence-avatar me-2">
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
                      <span
                        className={`presence-dot group-badge ${onlineCount > 0 ? "online" : "offline"}`}
                        title={onlineCount > 0 ? `${onlineCount} online` : "No one online"}
                      >
                        {onlineCount > 0 ? onlineCount : ""}
                      </span>
                    </div>

                    <div>
                      <div className="fw-bold">{g.name}</div>
                      <small className="text-muted">
                        {lastMsg
                          ? lastMsg.type === "image"
                            ? "Image"
                            : lastMsg.content.length > 10
                              ? lastMsg.content.slice(0, 10) + "..."
                              : lastMsg.content
                          : "No messages yet"}
                      </small>
                    </div>
                  </div>
                  <div className="text-end">
                    {lastMsg && (
                      <small className="text-muted d-block">
                        {/* {moment(lastMsg.timestamp).format("HH:mm")} */}
                        {formatChatTime(lastMsg.timestamp)}
                      </small>
                    )}
                    {(unreadCounts?.[g.id] ?? 0) > 0 && (
                      <span className="badge bg-success rounded-pill">
                        {unreadCounts[g.id]}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CreateGroupModal
        show={showModal}
        onClose={() => setShowModal(false)}
        users={users}
        currentUser={currentUser}
      />
    </div>
  );
};

export default ChatSidebar;