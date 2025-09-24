// ChatWindow.jsx code with Read receipts (single tick ✓ for sent, double tick ✓✓ for delivered, blue tick for read) functionality.

import React, { useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  sendMessage,
  sendImage,
  clearChat,
  editMessage,
  deleteMessage,
  updateGroupMembers,
  typingStart,
  typingStop,
  markMessagesRead,
} from "../features/messages/messagesSlice";
import MessageBubble from "./MessageBubble";
import { IoMdSend } from "react-icons/io";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { MdOutlineEmojiEmotions, MdCancel, MdGroup } from "react-icons/md";
import { FaImage } from "react-icons/fa";
import moment from "moment";
import Swal from "sweetalert2";
import { MdDelete } from "react-icons/md";
import { CiCircleRemove } from "react-icons/ci";

const ChatWindow = ({ currentUser, selectedUser, selectedGroup }) => {
  const dispatch = useDispatch();

  const { messages, onlineUsers, lastSeen, editingMessage, typingUsers } = useSelector((state) => state.messages);
  const users = useSelector((state) => state.usersData.users || []);

  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState(null);

  const [replyTo, setReplyTo] = useState(null);

  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});

  const typingTimerRef = useRef(null);
  const currentChatKeyRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setInput(editingMessage.content);
      setReplyTo(null);
    }
  }, [editingMessage]);

  const chatMessages = messages.filter((m) =>
    selectedUser
      ? (m.senderId === currentUser?.id && m.receiverId === selectedUser?.id) ||
      (m.senderId === selectedUser?.id && m.receiverId === currentUser?.id)
      : selectedGroup
        ? m.groupId === selectedGroup.id
        : []
  );

  const hasChatMessages = chatMessages.length > 0;
  const selectionMode = selectedMessageIds.size > 0;

  useEffect(() => {
    if (!hasChatMessages) {
      setSelectedMessageIds(new Set());
    }
  }, [hasChatMessages]);

  const isMemberOfSelectedGroup = (selectedGroup && currentUser)
    ? (Array.isArray(selectedGroup.members) && selectedGroup.members.map(String).includes(currentUser.id.toString()))
    : false;

  const handleSend = () => {
    sendTypingStopForCurrentChat();

    if (editingMessage) {
      dispatch(editMessage({ id: editingMessage.id, newContent: input }));
      setInput("");
      return;
    }

    if (previewFiles.length > 0) {
      previewFiles.forEach((fileData) => {
        const msg = {
          id: Date.now().toString() + Math.random(),
          senderId: currentUser.id,
          senderName: currentUser.name,
          receiverId: selectedUser ? selectedUser.id : null,
          groupId: selectedGroup ? selectedGroup.id : null,
          content: fileData,
          type: "image",
          timestamp: new Date().toISOString(),
          groupMembers: selectedGroup ? (selectedGroup.members || []).map(String) : undefined,
          status: "sent",
          replyTo: replyTo ? {
            id: replyTo.id,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName,
            content: replyTo.content,
            type: replyTo.type
          } : undefined,
        };
        dispatch(sendImage(msg));
      });
      setPreviewFiles([]);
      setReplyTo(null);
      return;
    }

    if (!input.trim()) return;
    const msg = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: selectedUser ? selectedUser.id : null,
      groupId: selectedGroup ? selectedGroup.id : null,
      content: input,
      type: "text",
      timestamp: new Date().toISOString(),
      groupMembers: selectedGroup ? (selectedGroup.members || []).map(String) : undefined,
      status: "sent",
      replyTo: replyTo ? {
        id: replyTo.id,
        senderId: replyTo.senderId,
        senderName: replyTo.senderName,
        content: replyTo.content,
        type: replyTo.type
      } : undefined,
    };
    dispatch(sendMessage(msg));
    setInput("");
    setShowEmojiPicker(false);
    setReplyTo(null);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewFiles((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleEmojiSelect = (emoji) => {
    setInput((prev) => prev + emoji.native);
    triggerTypingStart();
  };

  const handleClearChat = () => {
    if (!hasChatMessages) return;

    Swal.fire({
      title: "Are you sure you want clear all messages?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, clear it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (!result.isConfirmed) return;

      if (selectedUser) {
        dispatch(clearChat({ userId: selectedUser.id, currentUserId: currentUser.id }));
      } else if (selectedGroup) {
        dispatch(clearChat({ groupId: selectedGroup.id, currentUserId: currentUser.id }));
      }
      setSelectedMessageIds(new Set());
      Swal.fire("Cleared!", "All messages have been cleared.", "success");
    });
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) return;

    Swal.fire({
      title: `Are you sure you want delete ${ids.length} selected message(s)?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete them!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        const TWO_MIN = 2 * 60 * 1000;
        ids.forEach((id) => {
          const msg = messages.find((m) => m.id === id);
          if (!msg) {
            dispatch(deleteMessage(id));
            return;
          }

          const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
          const diff = Date.now() - ts;
          const amISender = currentUser && msg.senderId && currentUser.id.toString() === msg.senderId.toString();

          if (amISender && ts > 0 && diff < TWO_MIN) {
            dispatch(deleteMessage({ id: id, forEveryone: true, deletedBy: currentUser?.id || null }))
          } else {
            dispatch(deleteMessage({ id: id, forEveryone: false }))
          }
        });

        setSelectedMessageIds(new Set());
        Swal.fire("Deleted!", "Selected Message(s) deleted.", "success");
      }
    });
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- NEW: when opening / viewing the chat, mark other people's messages as read
  useEffect(() => {
    if (!currentUser) return;
    if (!selectedUser && !selectedGroup) return;

    // find messages in current chat that are from others and not marked as 'read'
    const unreadFromOthers = chatMessages.filter((m) => {
      if (!m || !m.id) return false;
      if (!m.senderId) return false;
      const isFromOther = m.senderId.toString() !== currentUser.id.toString();
      const notRead = m.status !== "read";
      return isFromOther && notRead;
    }).map((m) => m.id);

    if (unreadFromOthers.length > 0) {
      // dispatch action that marks locally and emits 'message:read' to server
      dispatch(markMessagesRead(unreadFromOthers));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, selectedGroup?.id, chatMessages.length, currentUser?.id]);

  const selectedUserOnline = selectedUser
    ? !!onlineUsers?.[selectedUser.id?.toString()]
    : false;

  const selectedGroupOnlineCount = selectedGroup
    ? (selectedGroup.members || []).filter((m) => !!onlineUsers?.[m?.toString()]).length
    : 0;

  const formatLastSeen = (ts) => {
    if (!ts) return null;
    const m = moment(ts);
    if (!m.isValid()) return null;

    if (m.isSame(moment(), "day")) {
      return `Last seen today at ${m.format("h:mm A")}`;
    } else if (m.isSame(moment().subtract(1, "day"), "day")) {
      return `Last seen yesterday at ${m.format("h:mm A")}`;
    } else if (m.isSame(moment(), "year")) {
      return `Last seen ${m.format("MMMM D [at] h:mm A")}`;
    } else {
      return `Last seen ${m.format("MMMM D, YYYY [at] h:mm A")}`;
    }
  };

  const selectedUserLastSeen = selectedUser
    ? lastSeen?.[selectedUser.id?.toString()]
    : null;

  const onToggleSelect = (msgId) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      }
      else {
        next.add(msgId);
      }
      return next;
    });
  };

  const deleteDisabled = !selectionMode && !hasChatMessages;

  let groupMembers = [];
  if (selectedGroup) {
    groupMembers = (selectedGroup.members || []).map((memberId) => {
      const foundUser = users.find((u) => u.id.toString() === memberId.toString());

      if (foundUser) {
        return foundUser;
      }

      return {
        id: memberId,
        name: `User ${memberId}`,
        avatar: "/User.png",
      };
    });
  }

  let availableToAdd = [];
  if (selectedGroup) {
    availableToAdd = users
      .filter((u) => {
        const userId = u.id.toString();

        const memberIds = (selectedGroup.members || []).map((m) => m.toString());

        return !memberIds.includes(userId);
      })
      .filter((u) => {
        return u.id.toString() !== currentUser.id.toString();
      });
  }

  const handleAddMember = () => {
    if (!memberToAdd || !selectedGroup) {
      return;
    }

    const existingMembers = (selectedGroup.members || []).map((m) => m.toString());

    existingMembers.push(memberToAdd.toString());

    const newMembers = [];
    for (let i = 0; i < existingMembers.length; i++) {
      if (!newMembers.includes(existingMembers[i])) {
        newMembers.push(existingMembers[i]);
      }
    }

    dispatch(
      updateGroupMembers({
        groupId: selectedGroup.id,
        members: newMembers,
      })
    );

    setMemberToAdd(null);
  };

  const handleRemoveMember = (memberId) => {
    if (!selectedGroup) {
      return;
    }

    const creatorId = selectedGroup.creator ? selectedGroup.creator.toString() : null;

    const memberIdText = memberId.toString();

    if (creatorId && creatorId === memberIdText) {
      Swal.fire("Cannot remove", "The group creator cannot be removed.", "warning");
      return;
    }

    if (!currentUser && currentUser.id.toString() !== creatorId) {
      Swal.fire("Not allowed", "Only the group creator can remove members.", "warning");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to remove this member from the group?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      const members = selectedGroup.members.map((m) => m.toString());

      const updatedMembers = members.filter((m) => m !== memberIdText);

      dispatch(
        updateGroupMembers({
          groupId: selectedGroup.id,
          members: updatedMembers,
        })
      );

      Swal.fire("Removed!", "The member has been removed from the group.", "success");
    })

  }

  const handleLeaveGroup = () => {
    if (!selectedGroup || !currentUser) return;

    const myId = currentUser.id.toString();
    const groupCreatorId = selectedGroup.creator ? selectedGroup.creator.toString() : null;

    if (groupCreatorId && groupCreatorId === myId) {
      Swal.fire(
        "Cannot leave",
        "As the group creator, you cannot leave the group.",
        "warning"
      );
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to leave this group?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, leave",
      cancelButtonText: "Cancel"
    })
      .then((result) => {
        if (!result.isConfirmed) return;

        const allMembers = (selectedGroup.members || []).map((m) => m.toString());

        const updatedMembers = allMembers.filter((m) => m !== myId);

        dispatch(
          updateGroupMembers({
            groupId: selectedGroup.id,
            members: updatedMembers,
          })
        );

        setShowMembersModal(false);

        Swal.fire("Left group", "You have left the group.", "success");
      })
  }

  const cancelReply = () => {
    setReplyTo(null);
  };

  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];
  
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
  
      messageElement.classList.add("message-highlight");
  
      setTimeout(() => {
        messageElement.classList.remove("message-highlight");
      }, 2000);
    } else {
      Swal.fire({
        icon: "info",
        title: "Message not available",
        text: "Original message is not available in this chat.",
      });
    }
  };

  const getCurrentChatKey = () => {
    if (selectedUser) return `user:${selectedUser.id?.toString()}`;
    if (selectedGroup) return `group:${selectedGroup.id?.toString()}`;
    return null;
  };

  const triggerTypingStart = () => {
    if (!currentUser || (!selectedUser && !selectedGroup)) return;

    const payload = selectedUser
      ? { type: "user", id: selectedUser.id, userId: currentUser.id, userName: currentUser.name }
      : { type: "group", id: selectedGroup.id, userId: currentUser.id, userName: currentUser.name };

    // dispatch typingStart (also emits over socket)
    dispatch(typingStart(payload));

    // reset stop timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      sendTypingStopForCurrentChat();
    }, 2000);
  };

  const sendTypingStopForCurrentChat = () => {
    if (!currentUser || (!selectedUser && !selectedGroup)) return;

    const payload = selectedUser
      ? { type: "user", id: selectedUser.id, userId: currentUser.id }
      : { type: "group", id: selectedGroup.id, userId: currentUser.id };

    dispatch(typingStop(payload));

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  // when switching chats or unmounting, ensure to stop typing for previous chat
  useEffect(() => {
    const prevKey = currentChatKeyRef.current;
    const newKey = getCurrentChatKey();
    if (prevKey && prevKey !== newKey) {
      // send stop for previous chat as cleanup
      if (currentUser) {
        const parts = prevKey.split(":");
        const type = parts[0];
        const id = parts.slice(1).join(":");
        if (type && id) {
          dispatch(typingStop({ type, id, userId: currentUser.id }));
        }
      }
    }
    currentChatKeyRef.current = newKey;

    return () => {
      // on unmount, send typing stop
      if (currentUser) {
        const key = getCurrentChatKey();
        if (key) {
          const parts = key.split(":");
          const type = parts[0];
          const id = parts.slice(1).join(":");
          if (type && id) {
            dispatch(typingStop({ type, id, userId: currentUser.id }));
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, selectedGroup?.id, currentUser?.id]);

  // input change handler
  const handleInputChange = (e) => {
    setInput(e.target.value);
    triggerTypingStart();
  };

  const renderTypingIndicator = () => {
    const key = getCurrentChatKey();
    if (!key) return null;
    const arr = typingUsers?.[key] || [];
    if (!arr || arr.length === 0) return null;

    // filter out current user if present
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

  return (
    <div className="chat-window d-flex flex-column flex-grow-1">
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
                <div>
                  {renderTypingIndicator()}
                </div>
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
                <div className="d-flex align-items-center">
                  <strong>{selectedGroup?.name}</strong>
                </div>
                <div className="user-status-text">
                  {selectedGroupOnlineCount > 0 ? (
                    <span className="online-text">
                      {selectedGroupOnlineCount} Online
                    </span>
                  ) : (
                    <span>No one online</span>
                  )}
                </div>
                <div>
                  {renderTypingIndicator()}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="d-flex align-items-center">
          {selectedGroup && (
            <button
              title="Group members"
              className="btn btn-sm btn-outline-secondary group-icon-btn"
              onClick={() => setShowMembersModal(true)}
            >
              <MdGroup size={18} />
              <small>{(selectedGroup.members || []).length}</small>
            </button>
          )}

          <div
            className={`delete-btn-wrapper ${deleteDisabled ? "disabled" : ""}`}
            onClick={() => {
              if (deleteDisabled) return;
              if (selectionMode) handleDeleteSelected();
              else handleClearChat();
            }}
            role="button"
            aria-disabled={deleteDisabled}
          >
            <MdDelete size={20} />
            {selectionMode && (
              <span className="delete-count">
                {selectedMessageIds.size}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="messages flex-grow-1 p-3 overflow-auto"
        onClick={(e) => {
          if (!e.target.closest(".message-bubble")) {
            setSelectedMessageIds(new Set());
          }
        }}
      >
        {chatMessages.length === 0 ? (
          <div className="text-center text-muted">No messages yet</div>
        ) : (
          chatMessages.map((msg, index) => {
            const prevMsg = chatMessages[index - 1];
            const showDateSeparator =
              !prevMsg || !moment(msg.timestamp).isSame(prevMsg.timestamp, "day");

            return (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el) {
                    messageRefs.current[msg.id] = el;
                  } else {
                    delete messageRefs.current[msg.id];
                  }
                }}
              >
                {showDateSeparator && (
                  <div
                    className="text-center my-2"
                    style={{ fontSize: "0.8rem", color: "#666" }}
                  >
                    {moment(msg.timestamp).calendar(null, {
                      sameDay: "[Today]",
                      lastDay: "[Yesterday]",
                      lastWeek: "dddd",
                      sameElse: "MMMM D, YYYY",
                    })}
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={msg.senderId === currentUser.id}
                  showSender={!!selectedGroup}
                  isSelected={selectedMessageIds.has(msg.id)}
                  onToggleSelect={onToggleSelect}
                  selectionMode={selectionMode}
                  onReply={(m) => {
                    setReplyTo({
                      id: m.id,
                      senderId: m.senderId,
                      senderName: m.senderName,
                      content: m.content,
                      type: m.type
                    });
                  }}
                  onJumpToMessage={scrollToMessage}
                />
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {previewFiles.length > 0 && (
        <div className="p-2 border-top d-flex flex-wrap">
          {previewFiles.map((file, idx) => (
            <div
              key={idx}
              className="d-flex align-items-center border rounded p-1 me-2 mb-2"
              style={{ maxWidth: "150px" }}
            >
              <img
                src={file}
                alt="preview"
                style={{ maxHeight: "60px", borderRadius: "6px" }}
                className="me-2"
              />
              <button
                className="btn btn-sm btn-danger"
                onClick={() =>
                  setPreviewFiles((prev) => prev.filter((_, index) => index !== idx))
                }
              >
                <MdCancel />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedGroup && !isMemberOfSelectedGroup ? (
        <div className="p-3 text-center text-muted border-top">
          You are no longer a member of this group. You cannot send messages.
        </div>
      ) : (
        <>
          {replyTo && (
            <div className="reply-preview p-2 border-top d-flex align-items-start">
              <div style={{ flex: 1 }}>
                <div className="small fw-bold">{replyTo.senderName}</div>
                <div className="small text-truncate" style={{ maxWidth: "100%" }}>
                  {replyTo.type === "image" ? <em>Image</em> : replyTo.content}
                </div>
              </div>
              <button
                className="btn btn-sm btn-light ms-2"
                onClick={cancelReply}
                title="Cancel reply"
              >
                <MdCancel />
              </button>
            </div>
          )}

          <div className="chat-input">
            <button
              ref={emojiButtonRef}
              className="btn btn-light me-2"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
            >
              <MdOutlineEmojiEmotions size={20} />
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              onChange={handleImageUpload}
            />

            <button
              className="btn btn-light me-2"
              onClick={() => fileInputRef.current.click()}
            >
              <FaImage />
            </button>

            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="emoji-picker">
                <Picker data={data} onEmojiSelect={handleEmojiSelect} />
              </div>
            )}

            <input
              className="form-control me-2 flex-grow-1"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
            />

            <button
              className="btn btn-primary d-flex align-items-center justify-content-center"
              onClick={handleSend}
            >
              <IoMdSend size={20} />
            </button>
          </div>
        </>
      )}

      {showMembersModal && selectedGroup && (
        <div className="modal-backdrop">
          <div className="modal-dialog modal-md">
            <div className="modal-content p-3">

              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <img
                    src={selectedGroup.avatar || "/Group.png"}
                    alt={selectedGroup.name}
                    className="rounded-circle me-2 modal-group-avatar"
                    onError={(e) => {
                      e.target.onError = null;
                      e.target.src = "/Group.png";
                    }}
                  />
                  <div>
                    <h5 className="mb-0">{selectedGroup.name}</h5>
                    <small className="text-muted">{(selectedGroup.members || []).length} members</small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {currentUser && (selectedGroup.members || []).map(String).includes(currentUser.id.toString()) && (
                    <button
                      className={`btn btn-sm ${selectedGroup.creator && selectedGroup.creator.toString() === currentUser.id.toString() ? "btn-outline-secondary" : "btn-warning"}`}
                      onClick={handleLeaveGroup}
                      title="Leave group"
                    >
                      Leave
                    </button>
                  )}
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowMembersModal(false)}>
                    <MdCancel size={20} />
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <small className="text-muted">Created by:{" "}
                  {(selectedGroup.creator && users.find(u => u.id.toString() === selectedGroup.creator))
                    ? users.find(u => u.id.toString() === selectedGroup.creator).name
                    : "Unknown"}
                </small>
              </div>

              <div style={{ maxHeight: 300, overflow: "auto" }} className="member-list">
                {groupMembers.map((m) => (
                  <div
                    key={m.id}
                    className="d-flex align-items-center justify-content-between p-2 border-bottom member-row"
                  >
                    <div className="d-flex align-items-center">
                      <img
                        src={m.avatar || "/User.png"}
                        alt={m.name}
                        width={40}
                        height={40}
                        className="rounded-circle me-3"
                      />
                      <div>
                        <div className="fw-bold">{m.name}</div>
                        <div>
                          <small className="text-muted">
                            {onlineUsers?.[m.id?.toString()]
                              ? "Online"
                              : lastSeen?.[m.id?.toString()]
                                ? formatLastSeen(lastSeen[m.id?.toString()])
                                : "Offline"}
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center">
                      {selectedGroup.creator &&
                        m.id.toString() === selectedGroup.creator.toString() && (
                          <span className="admin-badge">Admin</span>
                        )}

                      {selectedGroup.creator &&
                        currentUser &&
                        currentUser.id &&
                        currentUser.id.toString() === selectedGroup.creator.toString() &&
                        m.id.toString() !== selectedGroup.creator.toString() && (
                          <button
                            className="btn btn-sm btn-danger ms-2"
                            onClick={() => handleRemoveMember(m.id)}
                            title="Remove member"
                          >
                            <CiCircleRemove size={18} />
                          </button>
                        )}
                    </div>
                  </div>
                ))}

                {groupMembers.length === 0 && (
                  <div className="text-muted p-2">No members</div>
                )}
              </div>

              <div className="mt-3">
                <h6>Add member</h6>
                <div className="d-flex gap-2 align-items-center">
                  <select className="form-select" value={memberToAdd || ""} onChange={(e) => setMemberToAdd(e.target.value)}>
                    <option value="">Select user to add</option>
                    {availableToAdd.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={handleAddMember} disabled={!memberToAdd}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
