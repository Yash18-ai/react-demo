import React from "react";
import moment from "moment";
import MessageBubble from "../MessageBubble";
import DateSeparator from "./DateSeparator";

const MessageList = ({
  chatMessages,
  currentUser,
  selectedMessageIds,
  selectionMode,
  onToggleSelect,
  onReply,
  onJumpToMessage,
  onForward,
  messageRefs
}) => {
  return (
    <div className="messages flex-grow-1 p-3 overflow-auto">
      {chatMessages.length === 0 ? (
        <div className="text-center text-muted">No messages yet</div>
      ) : (
        chatMessages.map((msg, index) => {
          const prevMsg = chatMessages[index - 1];
          const showDateSeparator =
            !prevMsg || !moment(msg.timestamp).isSame(prevMsg.timestamp, "day");

          return (
            <div
              key={`${msg.id}-${index}`}
              ref={(el) => {
                if (el) messageRefs.current[msg.id] = el;
                else delete messageRefs.current[msg.id];
              }}
            >
              {showDateSeparator && <DateSeparator timestamp={msg.timestamp} />}
              <MessageBubble
                message={msg}
                isOwn={msg.senderId === currentUser.id}
                showSender={!!msg.groupId}
                isSelected={selectedMessageIds.has(msg.id)}
                onToggleSelect={onToggleSelect}
                selectionMode={selectionMode}
                onReply={onReply}
                onJumpToMessage={onJumpToMessage}
                onForward={onForward}
              />
            </div>
          );
        })
      )}
    </div>
  );
};

export default MessageList;

