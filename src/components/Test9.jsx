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
  forwardMessage,
  setEditingMessage
} from "../features/messages/messagesSlice";
import MembersModal from "./modals/MembersModal";
import ForwardModal from "./modals/ForwardModal";
import MessageSearch from "./search/MessageSearch";
import ChatInput from "./input/ChatInput";
import ChatHeader from "./header/ChatHeader";
import MessageList from "./messages/MessageList";
import ReplyPreview from "./ReplyPreview";
import ImagePreview from "./ImagePreview";
import Swal from "sweetalert2";
import moment from "moment";
import PinnedMessages from "./messages/PinnedMessages";

const ChatWindow = ({ currentUser, selectedUser, selectedGroup }) => {
  const dispatch = useDispatch();

  // <-- ensure defaults to avoid undefined access errors
  const messagesState = useSelector((state) => state.messages || {});
  const {
    messages = [],
    groups = [],
    onlineUsers = {},
    lastSeen = {},
    editingMessage = null,
    typingUsers = {},
    pinnedMessages = []
  } = messagesState;

  const users = useSelector((state) => (state.usersData && state.usersData.users) ? state.usersData.users : []);

  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState(null);

  const [replyTo, setReplyTo] = useState(null);

  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  const [showSearch, setShowSearch] = useState(false);

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

  // safe filter: if neither selectedUser nor selectedGroup, return false so no messages included
  const chatMessages = (messages || []).filter((m) =>
    selectedUser
      ? (m.senderId === currentUser?.id && m.receiverId === selectedUser?.id) ||
      (m.senderId === selectedUser?.id && m.receiverId === currentUser?.id)
      : selectedGroup
        ? m.groupId === selectedGroup.id
        : false
  );

  const hasChatMessages = chatMessages.length > 0;
  const selectionMode = selectedMessageIds.size > 0;

  useEffect(() => {
    if (!hasChatMessages) {
      setSelectedMessageIds(new Set());
    }
  }, [hasChatMessages]);

  const canSendInSelectedGroup = (() => {
    if (!selectedGroup || !currentUser) return false;
    const memberIds = (selectedGroup.members || []).map(String);
    const myId = currentUser.id?.toString();

    if (!memberIds.includes(myId)) {
      return false;
    }

    if (selectedGroup.isPrivate) {
      const adminIds = (selectedGroup.admins || []).map(String);
      return adminIds.includes(myId);
    }

    return true;
  })();

  const isMemberOfSelectedGroup = (selectedGroup && currentUser)
    ? (Array.isArray(selectedGroup.members) && selectedGroup.members.map(String).includes(currentUser.id.toString()))
    : false;


  const handleSend = () => {

    sendTypingStopForCurrentChat();

    if (editingMessage) {

      // FIX: use `messages` (array) not `message` (undefined)
      const currentMsg = (messages || []).find(m => m.id === editingMessage.id);
      if (currentMsg && !currentMsg.deleted && currentMsg.type !== "deleted") {
        dispatch(editMessage({ id: editingMessage.id, newContent: input }));
      } else {
        const msg = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          senderName: currentUser.name,
          receiverId: selectedUser ? selectedUser.id : null,
          groupId: selectedGroup ? selectedGroup.id : null,
          content: input,
          type: "text",
          timestamp: new Date().toISOString(),
          replyTo: replyTo ? {
            id: replyTo.id,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName,
            content: replyTo.content,
            type: replyTo.type,
          } : undefined,
        };
        dispatch(sendMessage(msg));
        dispatch(setEditingMessage(null));
      }
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

    dispatch(typingStart(payload));

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

  useEffect(() => {
    const makeKey = () => {
      if (selectedUser) return `user:${selectedUser.id?.toString()}`;
      if (selectedGroup) return `group:${selectedGroup.id?.toString()}`;
      return null;
    };
  
    const prevKey = currentChatKeyRef.current;
    const newKey = makeKey();
  
    if (prevKey && prevKey !== newKey && currentUser?.id) {
      const [type, ...rest] = prevKey.split(":");
      const id = rest.join(":");
      if (type && id) {
        dispatch(typingStop({ type, id, userId: currentUser.id }));
      }
    }
  
    currentChatKeyRef.current = newKey;
  
    return () => {
      if (currentUser?.id && newKey) {
        const [type, ...rest] = newKey.split(":");
        const id = rest.join(":");
        if (type && id) {
          dispatch(typingStop({ type, id, userId: currentUser.id }));
        }
      }
    };
  }, [selectedUser?.id, selectedGroup?.id, currentUser?.id, dispatch]);
  

  const handleInputChange = (e) => {
    setInput(e.target.value);
    triggerTypingStart();
  };

  const openForwardModal = (message) => {
    setMessageToForward(message);
    setForwardModalOpen(true);
  };

  const closeForwardModal = () => {
    setMessageToForward(null);
    setForwardModalOpen(false);
  }

  const handleForwardDispatch = ({ message, targets }) => {

    if (!message || !Array.isArray(targets) || targets.length === 0) return;

    dispatch(forwardMessage({ message, targets }));
    closeForwardModal();
  }

  // ---- compute pinned messages relevant to current chat, safely ----
  const filteredPinned = (pinnedMessages || []).filter((p) => {
    if (selectedGroup) {
      // ensure p.groupId exists and compare strings safely
      return p.groupId && p.groupId.toString() === selectedGroup.id?.toString();
    } else if (selectedUser) {
      return !p.groupId && (p.senderId === selectedUser.id || p.senderId === currentUser?.id || p.senderId === null);
    }
    return false;
  });

  // -- RENDER --
  return (
    <div className="chat-window d-flex flex-column flex-grow-1" style={{ position: "relative" }}>
      <ChatHeader
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        selectedUserOnline={selectedUserOnline}
        selectedUserLastSeen={selectedUserLastSeen}
        selectedGroupOnlineCount={selectedGroupOnlineCount}
        typingUsers={typingUsers}
        currentUser={currentUser}
        deleteDisabled={deleteDisabled}
        selectionMode={selectionMode}
        selectedMessageIds={selectedMessageIds}
        handleDeleteSelected={handleDeleteSelected}
        handleClearChat={handleClearChat}
        onSearchToggle={() => setShowSearch(true)}
        onMembersToggle={() => setShowMembersModal(true)}
        onDeleteClick={handleDeleteSelected}
        setShowSearch={setShowSearch}
        setShowMembersModal={setShowMembersModal}
        formatLastSeen={formatLastSeen}
      />

      <MessageSearch
        show={showSearch}
        onClose={() => setShowSearch(false)}
        chatMessages={chatMessages}
        users={users}
        onJumpToMessage={scrollToMessage}
        currentUser={currentUser}
      />

      {/* show pinned bar only if there are pinned messages for this chat (WhatsApp-like) */}
      {filteredPinned.length > 0 && (
        <PinnedMessages
          pinnedMessages={filteredPinned}
          onJumpToMessage={scrollToMessage}
        />
      )}

      <div className="messages flex-grow-1 p-3 overflow-auto">
        <MessageList
          chatMessages={chatMessages}
          currentUser={currentUser}
          selectedMessageIds={selectedMessageIds}
          selectionMode={selectionMode}
          onToggleSelect={onToggleSelect}
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
          messageRefs={messageRefs}
        />
        <div ref={messagesEndRef} />
      </div>

      {selectedGroup && !isMemberOfSelectedGroup ? (
        <div className="p-3 text-center text-muted border-top">
          You are no longer a member of this group. You cannot send messages.
        </div>
      ) : selectedGroup && isMemberOfSelectedGroup && !canSendInSelectedGroup ? (
        <div className="p-3 text-center text-muted border-top">
          Only group admins can send messages.
        </div>
      ) : (
        <>
          <ReplyPreview replyTo={replyTo} cancelReply={() => setReplyTo(null)} />
          <ImagePreview previewFiles={previewFiles} setPreviewFiles={setPreviewFiles} />

          <ChatInput
            input={input}
            setInput={setInput}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            emojiButtonRef={emojiButtonRef}
            emojiPickerRef={emojiPickerRef}
            handleEmojiSelect={handleEmojiSelect}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            handleSend={handleSend}
            handleInputChange={handleInputChange}
            selectedGroup={selectedGroup}
            groupMembers={groupMembers}
          />
        </>
      )}

      <MembersModal
        show={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        selectedGroup={selectedGroup}
        currentUser={currentUser}
        users={users}
        onlineUsers={onlineUsers}
        lastSeen={lastSeen}
        memberToAdd={memberToAdd}
        setMemberToAdd={setMemberToAdd}
        handleAddMember={handleAddMember}
        handleRemoveMember={handleRemoveMember}
        handleLeaveGroup={handleLeaveGroup}
        formatLastSeen={formatLastSeen}
      />

      <ForwardModal
        show={forwardModalOpen}
        onClose={closeForwardModal}
        message={messageToForward}
        users={users}
        groups={groups}
        onForward={handleForwardDispatch}
      />
    </div>
  );
};

export default ChatWindow;
