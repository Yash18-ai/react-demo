import React from "react";

const TypingIndicator = ({ typingUsers, currentUser, selectedUser, selectedGroup }) => {
  const getCurrentChatKey = () => {
    if (selectedUser) return `user:${selectedUser.id?.toString()}`;
    if (selectedGroup) return `group:${selectedGroup.id?.toString()}`;
    return null;
  };

  const key = getCurrentChatKey();
  if (!key) return null;
  const arr = typingUsers?.[key] || [];
  if (!arr || arr.length === 0) return null;

  const otherTypers = arr.filter((u) => u.userId.toString() !== (currentUser?.id?.toString() || ""));
  if (otherTypers.length === 0) return null;

  if (otherTypers.length === 1) {
    return <small className="typing-indicator">{otherTypers[0].userName} is typing...</small>;
  } else if (otherTypers.length === 2) {
    return <small className="typing-indicator">{otherTypers[0].userName} and {otherTypers[1].userName} are typing...</small>;
  } else {
    return <small className="typing-indicator">{otherTypers.length} people are typing...</small>;
  }
};

export default TypingIndicator;