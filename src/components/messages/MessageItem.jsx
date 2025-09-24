import React from "react";
import MessageBubble from "../MessageBubble";

const MessageItem = ({
  msg,
  currentUser,
  selectedGroup,
  isSelected,
  onToggleSelect,
  selectionMode,
  setReplyTo,
  scrollToMessage,
  openForwardModal,
}) => {
  return (
    <MessageBubble
      message={msg}
      isOwn={msg.senderId === currentUser.id}
      showSender={!!selectedGroup}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      selectionMode={selectionMode}
      onReply={(m) =>
        setReplyTo({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          content: m.content,
          type: m.type,
        })
      }
      onJumpToMessage={scrollToMessage}
      onForward={openForwardModal}
    />
  );
};

export default MessageItem;

