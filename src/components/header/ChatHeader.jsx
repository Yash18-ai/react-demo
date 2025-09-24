import React from "react";
import { FiSearch } from "react-icons/fi";
import { MdGroup } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import TypingIndicator from "../TypingIndicator";

const ChatHeader = ({
  selectedUser,
  selectedGroup,
  selectedUserOnline,
  selectedUserLastSeen,
  selectedGroupOnlineCount,
  formatLastSeen,
  typingUsers,
  currentUser,
  onSearchToggle,
  onMembersToggle,
  onDeleteClick,
  handleDeleteSelected,
  handleClearChat,
  selectionMode,
  deleteDisabled,
  selectedMessageIds,
}) => {
  const onDeletePressed = () => {
    if (deleteDisabled) return;
    if (selectionMode && typeof handleDeleteSelected === "function") {
      handleDeleteSelected();
    } else if (!selectionMode && typeof handleClearChat === "function") {
      handleClearChat();
    } else if (typeof onDeleteClick === "function") {
      onDeleteClick();
    }
  };

  return (
    <div className="chat-header p-2 border-bottom d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center">
        {selectedUser ? (
          <>
            <img
              src={selectedUser.avatar || "/User.png"}
              alt={selectedUser.name}
              className="rounded-circle me-2 header-avatar"
              onError={(e) => {
                e.target.onError = null;
                e.target.src = "/User.png";
              }}
            />
            <div>
              <strong>{selectedUser.name}</strong>
              <div className="user-status-text">
                {selectedUserOnline ? (
                  <span className="online-text">Online</span>
                ) : selectedUserLastSeen ? (
                  <span>{formatLastSeen(selectedUserLastSeen)}</span>
                ) : (
                  <span>Offline</span>
                )}
              </div>
              <TypingIndicator
                typingUsers={typingUsers}
                currentUser={currentUser}
                selectedUser={selectedUser}
                selectedGroup={selectedGroup}
              />
            </div>
          </>
        ) : (
          <>
            <img
              src={selectedGroup?.avatar || "/Group.png"}
              alt={selectedGroup?.name}
              className="rounded-circle me-2 header-avatar"
              onError={(e) => {
                e.target.onError = null;
                e.target.src = "/Group.png";
              }}
            />
            <div>
              <strong>{selectedGroup?.name}</strong>
              <div className="user-status-text">
                {selectedGroupOnlineCount > 0 ? (
                  <span className="online-text">
                    {selectedGroupOnlineCount} Online
                  </span>
                ) : (
                  <span>No one online</span>
                )}
              </div>
              <TypingIndicator
                typingUsers={typingUsers}
                currentUser={currentUser}
                selectedUser={selectedUser}
                selectedGroup={selectedGroup}
              />
            </div>
          </>
        )}
      </div>

      <div className="d-flex align-items-center">
        <button
          className="btn btn-sm btn-light me-2"
          title="Search messages"
          onClick={onSearchToggle}
        >
          <FiSearch size={18} />
        </button>

        {selectedGroup && (
          <button
            title="Group members"
            className="btn btn-sm btn-outline-secondary group-icon-btn me-2"
            onClick={onMembersToggle}
          >
            <MdGroup size={18} />
            <small>{(selectedGroup.members || []).length}</small>
          </button>
        )}

        <div
          className={`delete-btn-wrapper ${deleteDisabled ? "disabled" : ""}`}
          onClick={onDeletePressed}
          role="button"
          aria-disabled={deleteDisabled}
          style={{ cursor: deleteDisabled ? "not-allowed" : "pointer" }}
        >
          <MdDelete size={20} />
          {selectionMode && (
            <span className="delete-count">{selectedMessageIds.size}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
