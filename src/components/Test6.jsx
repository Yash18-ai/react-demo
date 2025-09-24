import { createSlice } from "@reduxjs/toolkit";
import { socket } from "../../services/socket";

let navigateFn = null;

export const setNavigator = (fn) => {
  navigateFn = typeof fn === "function" ? fn : null;
}

function showNotification(message, isMentioned = false) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    let options = {
      icon: "/User.png",
      requireInteraction: true,
    };

    let bodyText;
    if (isMentioned) {
      bodyText = `${message.senderName} mentioned you`;
    } else if (message.type === "image") {
      bodyText = `${message.senderName} sent an image`;
      options.image = message.content;
    } else {
      bodyText = message.content;
    }

    options.body = bodyText;

    const notif = new Notification(message.senderName || "New Message", options);

    notif.onclick = () => {
      try {
        notif.close();
  
        if (document.visibilityState === "hidden") {
          window.focus();
        }
  
        // if (message.groupId) {
        //   window.location.href = `/chat?type=group&id=${message.groupId}`;
        // } else {
        //   window.location.href = `/chat?type=user&id=${message.senderId}`;
        // }
  
        if (navigateFn) {
          if (message.groupId) {
            navigateFn(`/chat?type=group&id=${message.groupId}`);
          } else {
            const targetId = message.senderId || message.receiverId || "";
            navigateFn(`/chat?type=user&id=${targetId}`);
          }
        } else {
          if (message.groupId) {
            window.location.href = `/chat?type=group&id=${message.groupId}`;
          } else {
            window.location.href = `/chat?type=user&id=${message.senderId}`;
          }
        }
      } catch (e) {
        console.error("notification click handling failed", e);
      }
    };
  }
}

const initialState = {
  messages: [],
  groups: [],
  unreadCounts: {},
  currentUserId: null,
  activeChat: null,
  onlineUsers: {},
  lastSeen: {},
  editingMessage: null,
  typingUsers: {},
  pinnedMessages: [],
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    sendMessage: (state, action) => {
      const payload = action.payload || {};
      if (payload.groupId) {
        const g = state.groups.find((x) => x.id === payload.groupId);
        if (g && g.isPrivate) {
          const currentUid = state.currentUserId ? state.currentUserId.toString() : null;
          const admins = (g.admins || []).map(String);
          if (!currentUid || !admins.includes(currentUid)) {
            return;
          }
        }
      }

      socket.emit("chat:message", action.payload);
    },

    sendImage: (state, action) => {
      const payload = action.payload || {};
      if (payload.groupId) {
        const g = state.groups.find((x) => x.id === payload.groupId);
        if (g && g.isPrivate) {
          const currentUid = state.currentUserId ? state.currentUserId.toString() : null;
          const admins = (g.admins || []).map(String);
          if (!currentUid || !admins.includes(currentUid)) {
            return;
          }
        }
      }
      socket.emit("chat:image", action.payload);
    },

    forwardMessage: (state, action) => {
      const messageInfo = action.payload;
      if (!messageInfo || !messageInfo.message || !Array.isArray(messageInfo.targets)) {
        return;
      }

      const originalMessage = messageInfo.message;
      const forwardedFromInfo = {
        senderId: originalMessage.senderId,
        senderName: originalMessage.senderName,
        originalMessageId: originalMessage.id,
        originalType: originalMessage.type,
      };

      messageInfo.targets.forEach((target) => {
        if (!target || !target.type || target.id == null) {
          return;
        }

        if (target.type === "group") {
          const g = state.groups.find((x) => x.id === target.id);
          if (g && g.isPrivate) {
            const currentUid = state.currentUserId ? state.currentUserId.toString() : null;
            const admins = (g.admins || []).map(String);
            if (!currentUid || !admins.includes(currentUid)) {
              return;
            }
          }
        }

        let newMessage;
        if (target.type === "user") {
          newMessage = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            senderId: state.currentUserId,
            senderName: "",
            receiverId: target.id,
            groupId: null,
            content: originalMessage.content,
            type: originalMessage.type || "text",
            timestamp: new Date().toISOString(),
            forwarded: true,
            forwardedFrom: forwardedFromInfo,
            mentions: originalMessage.mentions || [],
          };
        } else if (target.type === "group") {
          newMessage = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            senderId: state.currentUserId,
            senderName: "",
            receiverId: null,
            groupId: target.id,
            content: originalMessage.content,
            type: originalMessage.type || "text",
            timestamp: new Date().toISOString(),
            forwarded: true,
            forwardedFrom: forwardedFromInfo,
            mentions: originalMessage.mentions || [],
          };
        }

        socket.emit("chat:message", newMessage);
      });
    },

    receiveMessage: (state, action) => {
      const payload = action.payload;
      if (!payload) return;

      const { senderId, groupId } = payload;

      if (groupId) {
        const group = state.groups.find((g) => g.id === groupId);
        const currentUid = state.currentUserId ? state.currentUserId.toString() : null;

        if (!group || !currentUid || !(Array.isArray(group.members) && group.members.map(String).includes(currentUid))) {
          return;
        }
      }

      state.messages.push(payload);

      if (state.currentUserId != null) {
        if (groupId) {
          if (senderId !== state.currentUserId && !(state.activeChat?.type === "group" && state.activeChat.id === groupId)) {
            state.unreadCounts[groupId] = (state.unreadCounts[groupId] || 0) + 1;
          }
        } else {
          if (senderId !== state.currentUserId && !(state.activeChat?.type === "user" && state.activeChat.id === senderId)) {
            state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
          }
        }
      }

      if (
        state.currentUserId != null &&
        payload.senderId !== state.currentUserId &&
        !(
          (state.activeChat?.type === "user" && state.activeChat.id === senderId) ||
          (state.activeChat?.type === "group" && state.activeChat.id === groupId)
        )
      ) {
        const isMentioned = payload.groupId && payload.mentions && payload.mentions.some(m => m.userId.toString() === state.currentUserId?.toString())
        showNotification(payload, isMentioned);
      }
    },

    receiveImage: (state, action) => {
      const payload = action.payload;
      if (!payload) return;

      const { senderId, groupId } = payload;

      if (groupId) {
        const group = state.groups.find((g) => g.id === groupId);
        const currentUid = state.currentUserId ? state.currentUserId.toString() : null;

        if (!group || !currentUid || !(Array.isArray(group.members) && group.members.map(String).includes(currentUid))) {
          return;
        }
      }

      state.messages.push(payload);

      if (state.currentUserId != null) {
        if (groupId) {
          if (senderId !== state.currentUserId &&
            !(state.activeChat?.type === "group" &&
              state.activeChat.id === groupId)) {
            state.unreadCounts[groupId] = (state.unreadCounts[groupId] || 0) + 1;
          }
        } else {
          if (senderId !== state.currentUserId &&
            !(state.activeChat?.type === "user" &&
              state.activeChat.id === senderId)) {
            state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
          }
        }
      }

      if (
        state.currentUserId != null &&
        payload.senderId !== state.currentUserId &&
        !(
          (state.activeChat?.type === "user" && state.activeChat.id === senderId) ||
          (state.activeChat?.type === "group" && state.activeChat.id === groupId)
        )
      ) {
        const isMentioned = payload.groupId && payload.mentions && payload.mentions.some(m => m.userId.toString() === state.currentUserId?.toString());
        showNotification(payload, isMentioned);
      }
    },

    editMessage: (state, action) => {
      const { id, newContent } = action.payload;
      const msg = state.messages.find((m) => m.id === id);
      if (msg) {
        msg.content = newContent;
        msg.edited = true;

        socket.emit("chat:edit", {
          ...msg,
          content: newContent,
          edited: true,
        });
      }
      state.editingMessage = null;
    },

    editMessageRemote: (state, action) => {
      const updatedMsg = action.payload;
      const msg = state.messages.find((m) => m.id === updatedMsg.id);
      if (msg) {
        msg.content = updatedMsg.content;
        msg.edited = updatedMsg.edited;
      }
    },

    setEditingMessage: (state, action) => {
      state.editingMessage = action.payload;
    },

    markAsRead: (state, action) => {
      const chatId = action.payload;
      state.unreadCounts[chatId] = 0;
    },

    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
      if (action.payload) {
        state.unreadCounts[action.payload.id] = 0;
      }
    },

    createGroup: (state, action) => {
      const newGroup = action.payload || {};
      const normalized = {
        ...newGroup,
        id: newGroup.id?.toString() || Date.now().toString(),
        members: Array.isArray(newGroup.members) ? newGroup.members.map(String) : [],
        creator: newGroup.creator != null ? newGroup.creator.toString() : null,
        isPrivate: !!newGroup.isPrivate,
        admins: Array.isArray(newGroup.admins) ? newGroup.admins.map(String) : (newGroup.isPrivate && newGroup.creator ? [newGroup.creator.toString()] : []),
      };

      if (!state.groups.some((g) => g.id === normalized.id)) {
        state.groups.push(normalized);
      }
      socket.emit("group:create", normalized);
    },

    receiveGroup: (state, action) => {
      const payload = action.payload || {};
      const normalized = {
        ...payload,
        id: payload.id?.toString(),
        members: Array.isArray(payload.members) ? payload.members.map(String) : [],
        creator: payload.creator != null ? payload.creator.toString() : null,
        isPrivate: !!payload.isPrivate,
        admins: Array.isArray(payload.admins) ? payload.admins.map(String) : (payload.isPrivate && payload.creator ? [payload.creator.toString()] : []),
      };

      const exists = state.groups?.some((g) => g.id === normalized.id);
      if (!exists) {
        state.groups.push(normalized);
      }
    },

    updateGroupMembers: (state, action) => {
      const { groupId, members } = action.payload;
      if (!groupId) return;

      const gIndex = state.groups.findIndex((g) => g.id === groupId)
      if (gIndex === -1) return;

      const updatedMembers = Array.from(new Set((members || []).map(String)));

      const previousAdmins = (state.groups[gIndex].admins || []).map(String);
      const filteredAdmins = previousAdmins.filter((a) => updatedMembers.includes(a));

      const updatedGroup = {
        ...state.groups[gIndex],
        members: updatedMembers,
        admins: filteredAdmins,
      };
      state.groups[gIndex] = updatedGroup;
      socket.emit("group:update", updatedGroup);
    },

    updateGroupAdmins: (state, action) => {
      const payload = action.payload;
      const groupId = payload.groupId;
      const admins = payload.admins;

      if (!groupId) return;

      const groupIndex = state.groups.findIndex((g) => g.id === groupId);

      if (groupIndex === -1) return;

      let adminList = [];
      if (Array.isArray(admins)) {
        adminList = admins.map((id) => String(id));
      }

      let memberList = [];
      if (Array.isArray(state.groups[groupIndex].members)) {
        memberList = state.groups[groupIndex].members.map((id) => String(id));
      }

      let validAdmins = adminList.filter((adminId) => memberList.includes(adminId));

      validAdmins = [...new Set(validAdmins)];

      const updatedGroup = {
        ...state.groups[groupIndex],
        admins: validAdmins,
      };

      state.groups[groupIndex] = updatedGroup;

      socket.emit("group:update", updatedGroup);
    },

    receiveGroupUpdate: (state, action) => {
      const updatedGroup = action.payload || {};
      if (!updatedGroup || !updatedGroup.id) return;

      const normalized = {
        ...updatedGroup,
        id: updatedGroup.id?.toString(),
        members: Array.isArray(updatedGroup.members) ? updatedGroup.members.map(String) : [],
        creator: updatedGroup.creator != null ? updatedGroup.creator.toString() : null,
        isPrivate: !!updatedGroup.isPrivate,
        admins: Array.isArray(updatedGroup.admins) ? updatedGroup.admins.map(String) : (updatedGroup.isPrivate && updatedGroup.creator ? [updatedGroup.creator.toString()] : []),
      };

      const index = state.groups.findIndex((g) => g.id === normalized.id);

      if (index === -1) {
        state.groups.push(normalized);
      } else {
        state.groups[index] = { ...state.groups[index], ...normalized };
      }
    },

    setCurrentUser: (state, action) => {
      state.currentUserId = action.payload;
      if (action.payload) {
        socket.emit("presence:online", action.payload);
      }
    },

    setUserOffline: (state, action) => {
      const userId = action.payload || state.currentUserId;

      if (userId) {
        socket.emit("presence:offline", userId);
      }
      state.currentUserId = null;

      if (userId && state.onlineUsers[userId]) {
        delete state.onlineUsers[userId];
      }

      if (userId) {
        state.lastSeen = {
          ...state.lastSeen,
          [userId.toString()]: new Date().toISOString()
        };
      }
    },

    pinMessage: (state, action) => {
      const { id, pinnedBy = null } = action.payload || {};
      if (!id) return;

      const msg = state.messages.find((m) => m.id === id);
      if (!msg) return;

      msg.pinned = true;
      msg.pinnedBy = pinnedBy || state.currentUserId || null;

      const snapshot = {
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        type: msg.type,
        timestamp: msg.timestamp,
        groupId: msg.groupId || null,
        pinnedBy: msg.pinnedBy,
      };

      if (!state.pinnedMessages.some((p) => p.id === snapshot.id)) {
        state.pinnedMessages.unshift(snapshot);
      }

      try {
        const chatKey = msg.groupId
          ? `group:${msg.groupId}`
          : `user:${(msg.senderId && msg.receiverId)
            ? (msg.senderId === state.currentUserId
              ? msg.receiverId
              : msg.senderId)
            : msg.senderId || ""}`;
        socket.emit("chat:pin", { id: snapshot.id, pinned: true, pinnedBy: snapshot.pinnedBy, chatKey });
      } catch (e) {
        console.error("socket emit chat:pin failed", e);
      }
    },

    unpinMessage: (state, action) => {
      const { id, unpinnedBy = null } = action.payload || {};
      if (!id) return;

      const msg = state.messages.find((m) => m.id === id);
      if (msg) {
        delete msg.pinned;
        msg.pinnedBy = null;
      }

      state.pinnedMessages = state.pinnedMessages.filter((p) => p.id !== id);

      try {
        socket.emit("chat:pin", { id, pinned: false, pinnedBy: unpinnedBy || state.currentUserId || null, chatKey: null });
      } catch (e) {
        console.error("socket emit chat:unpin failed", e);
      }
    },

    receivePinUpdate: (state, action) => {
      const payload = action.payload || {};
      if (!payload || !payload.id) return;

      const { id, pinned, pinnedBy } = payload;
      if (pinned) {
        const msg = state.messages.find((m) => m.id === id);
        if (msg) {
          msg.pinned = true;
          msg.pinnedBy = pinnedBy || null;
          const snapshot = {
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            content: msg.content,
            type: msg.type,
            timestamp: msg.timestamp,
            groupId: msg.groupId || null,
            pinnedBy: msg.pinnedBy,
          };
          if (!state.pinnedMessages.some((p) => p.id === snapshot.id)) {
            state.pinnedMessages.unshift(snapshot);
          }
        } else {
          const existing = state.pinnedMessages.find((p) => p.id === id);
          if (!existing) {
            state.pinnedMessages.unshift({
              id,
              senderId: null,
              senderName: "Unknown",
              content: "",
              type: "text",
              timestamp: new Date().toISOString(),
              groupId: null,
              pinnedBy: pinnedBy || null,
            });
          }
        }
      } else {
        const found = state.messages.find((m) => m.id === id);
        if (found) {
          delete found.pinned;
          found.pinnedBy = null;
        }
        state.pinnedMessages = state.pinnedMessages.filter((p) => p.id !== id);
      }
    },

    deleteMessage: (state, action) => {
      const data = action.payload;
      let messageId = null;
      let deleteForEveryone = false;
      let deletedBy = null;

      if (typeof data === "string") {
        messageId = data;
      }
      else if (typeof data === "object" && data !== null) {
        messageId = data.id;
        deleteForEveryone = !!data.forEveryone;
        deletedBy = data.deletedBy || null;
      }
      else {
        return;
      }

      if (!messageId) return;

      if (deleteForEveryone) {
        const msg = state.messages.find((m) => m.id === messageId);

        if (msg) {
          msg.type = "deleted";
          msg.deleted = true;
          msg.deletedBy = deletedBy;
        }

        state.pinnedMessages = state.pinnedMessages.filter((p) => p.id !== messageId);

        socket.emit("chat:delete", {
          id: messageId,
          forEveryone: true,
          deletedBy: deletedBy,
        });
      }
      else {
        state.messages = state.messages.filter((m) => m.id !== messageId);
        state.pinnedMessages = state.pinnedMessages.filter((p) => p.id !== messageId);
      }
    },

    deleteMessageRemote: (state, action) => {
      const data = action.payload;
      if (!data) return;

      if (typeof data === "string") {
        const messageId = data;

        const msg = state.messages.find((m) => m.id === messageId);

        if (msg) {
          msg.type = "deleted";
          msg.deleted = true;
          msg.deletedBy = null;
        }

        state.pinnedMessages = state.pinnedMessages.filter((p) => p.id !== messageId);
        return;
      }

      const messageId = data.id;
      const deleteForEveryone = data.forEveryone;
      const deletedBy = data.deletedBy || null;

      if (!messageId) return;

      if (deleteForEveryone) {
        const msg = state.messages.find((m) => m.id === messageId);

        if (msg) {
          msg.type = "deleted";
          msg.deleted = true;
          msg.deletedBy = deletedBy;
        }
      }
    },

    clearChat: (state, action) => {
      const { userId, groupId, currentUserId } = action.payload;
      const filteredMessages = state.messages.filter((m) => {
        if (groupId) {
          return m.groupId !== groupId;
        } else if (userId) {
          return (
            !(m.senderId === userId && m.receiverId === currentUserId) &&
            !(m.senderId === currentUserId && m.receiverId === userId)
          );
        }
        return true;
      });
      state.messages = filteredMessages;

      if (groupId) {
        state.pinnedMessages = state.pinnedMessages.filter((p) => p.groupId !== groupId);
      } else if (userId) {
        state.pinnedMessages = state.pinnedMessages.filter((p) => {
          const isBetween = (!p.groupId) && (p.senderId === userId || p.senderId === currentUserId);
          return !isBetween;
        });
      }
    },

    setPresenceList: (state, action) => {
      const list = action.payload || [];
      state.onlineUsers = {};
      state.lastSeen = {};

      if (Array.isArray(list) && list.length > 0 && typeof list[0] === "object") {
        list.forEach((p) => {
          const uid = p.userId?.toString();
          if (!uid) return;

          if (p.online) {
            state.onlineUsers[uid] = true;
            state.lastSeen[uid] = null;
          } else if (p.lastSeen) {
            state.lastSeen[uid] = p.lastSeen;
          } else {
            state.lastSeen[uid] = null;
          }
        });
      } else {
        list.forEach((id) => {
          state.onlineUsers[id.toString()] = true;
        });
      }
    },

    receivePresenceUpdate: (state, action) => {
      const { userId, online, lastSeen: ls } = action.payload || {};
      if (!userId) return;
      const uid = userId.toString();
      if (online) {
        state.onlineUsers[uid] = true;
        state.lastSeen[uid] = null;
      } else {
        if (state.onlineUsers[uid]) {
          delete state.onlineUsers[uid];
        }
        if (ls) {
          state.lastSeen[uid] = ls;
        } else {
          state.lastSeen[uid] = new Date().toISOString();
        }
      }
    },

    typingStart: (state, action) => {
      const p = action.payload;
      if (!p || !p.type || p.id == null || !p.userId) return;

      const idStr = (p.id !== undefined && p.id !== null) ? p.id.toString() : "";
      const userIdStr = p.userId.toString();
      const key = `${p.type}:${idStr}`;

      try {
        socket.emit("typing:start", { type: p.type, id: idStr, userId: userIdStr, userName: p.userName || null });
      } catch (e) {
        console.error(e);
      }

      if (!state.typingUsers) state.typingUsers = {};

      const arr = state.typingUsers[key] ? [...state.typingUsers[key]] : [];
      if (!arr.some((u) => u.userId && u.userId.toString() === userIdStr)) {
        arr.push({ userId: userIdStr, userName: p.userName || "Someone" });
      }
      state.typingUsers[key] = arr;
    },

    typingStop: (state, action) => {
      const p = action.payload;
      if (!p || !p.type || p.id == null || !p.userId) return;

      const idStr = (p.id !== undefined && p.id !== null) ? p.id.toString() : "";
      const userIdStr = p.userId.toString();
      const key = `${p.type}:${idStr}`;

      try {
        socket.emit("typing:stop", { type: p.type, id: idStr, userId: userIdStr });
      } catch (e) {
        console.error(e);
      }

      if (!state.typingUsers) state.typingUsers = {};
      const arr = state.typingUsers[key] ? [...state.typingUsers[key]] : [];
      state.typingUsers[key] = arr.filter((u) => u.userId.toString() !== userIdStr);
      if (state.typingUsers[key] && state.typingUsers[key].length === 0) {
        delete state.typingUsers[key];
      }
    },

    receiveTypingStart: (state, action) => {
      const p = action.payload;
      if (!p || !p.type || p.id == null || !p.userId) return;

      let key;
      if (p.type === "user") {
        key = `user:${p.userId.toString()}`;
      } else {
        const idStr = (p.id !== undefined && p.id !== null) ? p.id.toString() : "";
        key = `${p.type}:${idStr}`;
      }

      if (!state.typingUsers) state.typingUsers = {};
      const arr = state.typingUsers[key] ? [...state.typingUsers[key]] : [];
      const userIdStr = p.userId.toString();
      if (!arr.some((u) => u.userId && u.userId.toString() === userIdStr)) {
        arr.push({ userId: userIdStr, userName: p.userName || "Someone" });
      }
      state.typingUsers[key] = arr;
    },

    receiveTypingStop: (state, action) => {
      const p = action.payload;
      if (!p || !p.type || p.id == null || !p.userId) return;

      let key;
      if (p.type === "user") {
        key = `user:${p.userId.toString()}`;
      } else {
        const idStr = (p.id !== undefined && p.id !== null) ? p.id.toString() : "";
        key = `${p.type}:${idStr}`;
      }

      if (!state.typingUsers) state.typingUsers = {};
      const arr = state.typingUsers[key] ? [...state.typingUsers[key]] : [];
      const userIdStr = p.userId.toString();
      state.typingUsers[key] = arr.filter((u) => u.userId.toString() !== userIdStr);
      if (state.typingUsers[key] && state.typingUsers[key].length === 0) {
        delete state.typingUsers[key];
      }
    },
  }
});

export const {
  sendMessage,
  sendImage,
  forwardMessage,
  receiveMessage,
  receiveImage,
  editMessage,
  editMessageRemote,
  setEditingMessage,
  markAsRead,
  createGroup,
  receiveGroup,
  updateGroupMembers,
  updateGroupAdmins,
  receiveGroupUpdate,
  setCurrentUser,
  setUserOffline,
  deleteMessage,
  deleteMessageRemote,
  setActiveChat,
  clearChat,
  setPresenceList,
  receivePresenceUpdate,
  typingStart,
  typingStop,
  receiveTypingStart,
  receiveTypingStop,
  pinMessage,
  unpinMessage,
  receivePinUpdate,
} = messagesSlice.actions;

// export default messagesSlice.reducer;



// ChatSidebar.jsx

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
  };

  const handleSelectGroup = (g) => {
    if (!g) return;
    dispatch(setActiveChat({ type: "group", id: g.id }));
    navigate(`/chat?type=group&id=${g.id}`);
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


// Chat.jsx


import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow from "../components/ChatWindow";
import { fetchUsers } from "../features/users/usersSlice";
import { setCurrentUser, setActiveChat } from "../features/messages/messagesSlice";
import { setNavigator } from "../features/messages/messagesSlice";
import "../assets/css/Chat.css";

// export default function Chat() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get("type");
    const id = queryParams.get("id");
    
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { users } = useSelector((state) => state.usersData);
    const { groups } = useSelector((state) => state.messages);
    const currentUser = useSelector((state) => state.auth.user?.user);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        dispatch(fetchUsers());
    }, [dispatch]);

    useEffect(() => {
        if (currentUser?.id) {
            dispatch(setCurrentUser(currentUser.id));
        }
    }, [currentUser, dispatch]);

    useEffect(() => {
        setNavigator(navigate);
        return () => {
            setNavigator(null);
        };
    }, [navigate]);

    useEffect(() => {
        if (type === "user" && id) {
            const user = users.find((u) => u.id.toString() === id);
            if (user) {
                setSelectedUser(user);
                setSelectedGroup(null);
                dispatch(setActiveChat({ type: "user", id: user.id }));
            }
        } else if (type === "group" && id) {
            const group = groups.find((g) => g.id.toString() === id);
            if (group) {
                setSelectedGroup(group);
                setSelectedUser(null);
                dispatch(setActiveChat({ type: "group", id: group.id }));
            }
        }
    }, [type, id, users, groups, dispatch]);

    return (
        <div className="chat-container d-flex">
            <ChatSidebar
                users={users.filter((u) => u.id !== currentUser?.id)}
                selectedUserId={selectedUser?.id}
                onSelectUser={(u) => {
                    setSelectedUser(u);
                    setSelectedGroup(null);
                    dispatch(setActiveChat({ type: "user", id: u.id }));
                    window.location.href = `/chat?type=user&id=${u.id}`;
                }}
                onSelectGroup={(g) => {
                    setSelectedGroup(g);
                    setSelectedUser(null);
                    dispatch(setActiveChat({ type: "group", id: g.id }));
                    window.location.href = `/chat?type=group&id=${g.id}`;
                }}
                currentUser={currentUser}
            />

            {selectedUser || selectedGroup ? (
                <ChatWindow
                    currentUser={currentUser}
                    selectedUser={selectedUser}
                    selectedGroup={selectedGroup}
                />
            ) : (
                <div className="chat-placeholder">
                    <div className="placeholder-content">
                        <img src="/assets/chat.png" alt="logo" className="placeholder-logo" />
                        <h2>Chat Web</h2>
                        <p>Send and receive messages without keeping your phone online.</p>
                        <small>
                            Use Chat Web on up to 4 linked devices and 1 phone at the same time.
                        </small>
                    </div>
                </div>
            )}
        </div>
    );
// }


