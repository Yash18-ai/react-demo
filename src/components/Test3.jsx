// server.js and messageSlice.jsx file with Read receipts (single tick ✓ for sent, double tick ✓✓ for delivered, blue tick for read) functionality

// server.js

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "http://localhost:3000/",
    origin: "http://192.168.1.98:3000/",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = {};
const socketUserMap = {};
const lastSeen = {};

// helper to get socket ids for a user id
function getSocketIdsForUser(userId) {
  const sids = [];
  for (const sid of Object.keys(socketUserMap)) {
    if (socketUserMap[sid] === userId) sids.push(sid);
  }
  return sids;
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  const allUserIds = new Set([
    ...Object.keys(onlineUsers),
    ...Object.keys(lastSeen),
  ]);

  const presenceList = Array.from(allUserIds).map((id) => ({
    userId: id,
    online: !!onlineUsers[id],
    lastSeen: lastSeen[id] || null,
  }));

  socket.emit("presence:init", presenceList);

  // chat message: server will broadcast 'chat:message' and also emit message:delivered
  socket.on("chat:message", (msg) => {
    try {
      if (!msg || !msg.id || !msg.senderId) return;

      // broadcast baseline message event to everyone (status = 'sent' by default)
      const baseMsg = { ...msg, status: msg.status || "sent" };
      io.emit("chat:message", baseMsg);

      // attempt to deliver to intended recipients and collect deliveredTo
      const deliveredTo = [];

      if (msg.receiverId) {
        // private message
        const receiverId = msg.receiverId.toString();
        const receiverSids = getSocketIdsForUser(receiverId);
        receiverSids.forEach((sid) => {
          io.to(sid).emit("chat:message", { ...msg, status: "delivered" });
        });
        if (receiverSids.length > 0) deliveredTo.push(receiverId);
      } else if (msg.groupId && Array.isArray(msg.groupMembers)) {
        // group message: msg should contain groupMembers array (client should include)
        const members = msg.groupMembers.map((m) => m.toString()).filter((m) => m !== msg.senderId.toString());
        members.forEach((memberId) => {
          const sids = getSocketIdsForUser(memberId);
          sids.forEach((sid) => {
            io.to(sid).emit("chat:message", { ...msg, status: "delivered" });
          });
          if (sids.length > 0) deliveredTo.push(memberId);
        });
      }

      // notify sender socket(s) about delivery
      const senderSids = getSocketIdsForUser(msg.senderId.toString());
      if (senderSids.length > 0) {
        io.to(senderSids).emit("message:delivered", {
          id: msg.id,
          deliveredTo,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("chat:message error", err);
    }
  });

  socket.on("chat:image", (msg) => {
    io.emit("chat:image", msg);
    // reuse same delivery logic as text message
    // attempt to notify delivery
    try {
      const deliveredTo = [];
      if (msg.receiverId) {
        const receiverId = msg.receiverId.toString();
        const receiverSids = getSocketIdsForUser(receiverId);
        receiverSids.forEach((sid) => {
          io.to(sid).emit("chat:image", { ...msg, status: "delivered" });
        });
        if (receiverSids.length > 0) deliveredTo.push(receiverId);
      } else if (msg.groupId && Array.isArray(msg.groupMembers)) {
        const members = msg.groupMembers.map((m) => m.toString()).filter((m) => m !== msg.senderId.toString());
        members.forEach((memberId) => {
          const sids = getSocketIdsForUser(memberId);
          sids.forEach((sid) => {
            io.to(sid).emit("chat:image", { ...msg, status: "delivered" });
          });
          if (sids.length > 0) deliveredTo.push(memberId);
        });
      }

      const senderSids = getSocketIdsForUser(msg.senderId.toString());
      if (senderSids.length > 0) {
        io.to(senderSids).emit("message:delivered", {
          id: msg.id,
          deliveredTo,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("chat:image delivery error", err);
    }
  });

  socket.on("group:create", (group) => {
    io.emit("group:create", group);
  });

  socket.on("group:update", (group) => {
    io.emit("group:update", group);
  });

  socket.on("group:delete", (payload) => {
    io.emit("group:delete", payload);
  });

  socket.on("chat:delete", (msgId) => {
    io.emit("chat:delete", msgId);
  });

  socket.on("chat:edit", (payload) => {
    io.emit("chat:edit", payload);
  });

  socket.on("presence:online", (userId) => {
    if (!userId) return;
    const uid = userId.toString();

    socketUserMap[socket.id] = uid;
    onlineUsers[uid] = true;
    lastSeen[uid] = null;

    io.emit("presence:update", { userId: uid, online: true, lastSeen: null });
    console.log(`User ${uid} is online`);
  });

  socket.on("presence:offline", (userId) => {
    if (!userId) return;
    const uid = userId.toString();

    const ts = new Date().toISOString();
    lastSeen[uid] = ts;
    if (onlineUsers[uid]) delete onlineUsers[uid];

    for (const sid of Object.keys(socketUserMap)) {
      if (socketUserMap[sid] === uid) {
        delete socketUserMap[sid];
      }
    }

    io.emit("presence:update", { userId: uid, online: false, lastSeen: ts });
    console.log(`User ${uid} is offline (manual)`);
  });

  socket.on("typing:start", (payload) => {
    console.log('[SERVER] typing:start received from socket', socket.id, payload);
    try {
      if (!payload || !payload.type || payload.id == null || !payload.userId) return;

      if (payload.type === "user") {
        const targetId = payload.id.toString();
        let delivered = 0;
        for (const sid of Object.keys(socketUserMap)) {
          if (socketUserMap[sid] === targetId) {
            io.to(sid).emit("typing:start", payload);
            delivered++;
          }
        }
        console.log(`[SERVER] typing:start -> private target ${targetId}, delivered to ${delivered} sockets`);
      } else {
        io.emit("typing:start", payload);
        console.log(`[SERVER] typing:start -> broadcast to all (group)`);
      }
    } catch (err) {
      console.error("typing:start error", err);
    }
  });

  socket.on("typing:stop", (payload) => {
    console.log('[SERVER] typing:stop received from socket', socket.id, payload);
    try {
      if (!payload || !payload.type || payload.id == null || !payload.userId) return;

      if (payload.type === "user") {
        const targetId = payload.id.toString();
        let delivered = 0;
        for (const sid of Object.keys(socketUserMap)) {
          if (socketUserMap[sid] === targetId) {
            io.to(sid).emit("typing:stop", payload);
            delivered++;
          }
        }
        console.log(`[SERVER] typing:stop -> private target ${targetId}, delivered to ${delivered} sockets`);
      } else {
        io.emit("typing:stop", payload);
        console.log(`[SERVER] typing:stop -> broadcast to all (group)`);
      }
    } catch (err) {
      console.error("typing:stop error", err);
    }
  });

  // Read receipts: when a client marks a message read
  socket.on("message:read", (payload) => {
    try {
      if (!payload || !payload.id || !payload.readerId) return;

      const readPayload = {
        id: payload.id,
        readerId: payload.readerId,
        timestamp: new Date().toISOString(),
      };

      // notify the sender(s) that the message was read
      // We expect payload may include senderId; if not, broadcast read to all (safer)
      if (payload.senderId) {
        const senderSids = getSocketIdsForUser(payload.senderId.toString());
        if (senderSids.length > 0) {
          io.to(senderSids).emit("message:read", readPayload);
        }
      } else {
        // fallback: broadcast to all (sender will ignore if not relevant)
        io.emit("message:read", readPayload);
      }
    } catch (err) {
      console.error("message:read error", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    const userId = socketUserMap[socket.id];
    if (userId) {
      delete socketUserMap[socket.id];

      const ts = new Date().toISOString();
      lastSeen[userId] = ts;
      if (onlineUsers[userId]) delete onlineUsers[userId];

      io.emit("presence:update", { userId: userId.toString(), online: false, lastSeen: ts });
      console.log(`User ${userId} is offline (disconnect)`);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});


// messageSlice.jsx

import { createSlice } from "@reduxjs/toolkit";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://192.168.1.98:5001";
export const socket = io(SOCKET_URL, { transports: ["websocket"] });

function showNotification(message) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    let options = {
      icon: "/User.png",
      requireInteraction: true,
    };

    if (message.type === "image") {
      options.body = `${message.senderName} sent an image`;
      options.image = message.content;
    } else {
      options.body = message.content;
    }

    const notif = new Notification(message.senderName || "New Message", options);

    notif.onclick = () => {
      notif.close();

      if (document.visibilityState === "hidden") {
        window.focus();
      }

      if (message.groupId) {
        window.location.href = `/chat?type=group&id=${message.groupId}`;
      } else {
        window.location.href = `/chat?type=user&id=${message.senderId}`;
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
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    // sendMessage & sendImage keep same behaviour (emit only) - server will broadcast back
    sendMessage: (state, action) => {
      socket.emit("chat:message", action.payload);
    },

    sendImage: (state, action) => {
      socket.emit("chat:image", action.payload);
    },

    // when server broadcasts a chat message — dedupe by id and update status if needed
    receiveMessage: (state, action) => {
      const payload = action.payload;
      if (!payload || !payload.id) return;

      // validate membership for group messages (existing logic retained)
      const { senderId, groupId } = payload;

      if (groupId) {
        const group = state.groups.find((g) => g.id === groupId);
        const currentUid = state.currentUserId ? state.currentUserId.toString() : null;

        if (!group || !currentUid || !(Array.isArray(group.members) && group.members.map(String).includes(currentUid))) {
          return;
        }
      }

      // find existing message
      const existing = state.messages.find((m) => m.id === payload.id);
      if (existing) {
        // update fields (content/status/edited etc.) but keep existing properties where appropriate
        Object.assign(existing, { ...existing, ...payload });
        // if payload.status exists, update
        if (payload.status) existing.status = payload.status;
        return;
      }

      // default status if not provided
      if (!payload.status) payload.status = "sent";

      state.messages.push(payload);

      // unread logic (same as before)
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
        showNotification(payload);
      }
    },

    receiveImage: (state, action) => {
      const payload = action.payload;
      if (!payload || !payload.id) return;

      const { senderId, groupId } = payload;

      if (groupId) {
        const group = state.groups.find((g) => g.id === groupId);
        const currentUid = state.currentUserId ? state.currentUserId.toString() : null;

        if (!group || !currentUid || !(Array.isArray(group.members) && group.members.map(String).includes(currentUid))) {
          return;
        }
      }

      const existing = state.messages.find((m) => m.id === payload.id);
      if (existing) {
        Object.assign(existing, { ...existing, ...payload });
        if (payload.status) existing.status = payload.status;
        return;
      }

      if (!payload.status) payload.status = "sent";
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
        showNotification(payload);
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
      const newGroup = action.payload;
      if (!state.groups.some((g) => g.id === newGroup.id)) {
        state.groups.push(newGroup);
      }
      socket.emit("group:create", newGroup);
    },

    receiveGroup: (state, action) => {
      const exists = state.groups?.some((g) => g.id === action.payload.id);
      if (!exists) {
        state.groups.push(action.payload);
      }
    },

    updateGroupMembers: (state, action) => {
      const { groupId, members } = action.payload;
      if (!groupId) return;

      const gIndex = state.groups.findIndex((g) => g.id === groupId)
      if (gIndex === -1) return;

      const updatedGroup = {
        ...state.groups[gIndex],
        members: Array.from(new Set(members.map((m) => m.toString()))),
      };
      state.groups[gIndex] = updatedGroup;
      socket.emit("group:update", updatedGroup);
    },

    receiveGroupUpdate: (state, action) => {
      const updatedGroup = action.payload;
      if (!updatedGroup || !updatedGroup.id) return;

      const index = state.groups.findIndex((g) => g.id === updatedGroup.id);

      if (index === -1) {
        state.groups.push(updatedGroup);
      } else {
        state.groups[index] = { ...state.groups[index], ...updatedGroup };
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

        socket.emit("chat:delete", {
          id: messageId,
          forEveryone: true,
          deletedBy: deletedBy,
        });
      }
      else {
        state.messages = state.messages.filter((m) => m.id !== messageId);
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

    // NEW: message delivered notification from server
    messageDelivered: (state, action) => {
      const payload = action.payload;
      if (!payload || !payload.id) return;
      const msg = state.messages.find((m) => m.id === payload.id);
      if (msg) {
        // if deliveredTo contains someone other than sender, mark as delivered
        if (Array.isArray(payload.deliveredTo) && payload.deliveredTo.length > 0) {
          msg.status = "delivered";
          msg.deliveredTo = payload.deliveredTo;
        } else {
          // if no deliveredTo, keep as sent
          if (!msg.status) msg.status = "sent";
        }
      }
    },

    // NEW: message read by receiver
    messageReadRemote: (state, action) => {
      const payload = action.payload;
      if (!payload || !payload.id || !payload.readerId) return;
      const msg = state.messages.find((m) => m.id === payload.id);
      if (msg) {
        msg.status = "read";
        if (!msg.readBy) msg.readBy = [];
        if (!msg.readBy.includes(payload.readerId.toString())) {
          msg.readBy.push(payload.readerId.toString());
        }
      }
    },

    // Called locally to mark message(s) as read and emit to server
    markMessagesRead: (state, action) => {
      const ids = Array.isArray(action.payload) ? action.payload : [action.payload];
      const readerId = state.currentUserId;
      ids.forEach((id) => {
        const msg = state.messages.find((m) => m.id === id);
        if (msg) {
          msg.status = "read";
          if (!msg.readBy) msg.readBy = [];
          if (!msg.readBy.includes(readerId?.toString())) {
            msg.readBy.push(readerId?.toString());
          }
        }
        // emit to server
        try {
          socket.emit("message:read", {
            id,
            readerId: readerId,
            senderId: msg ? msg.senderId : undefined,
          });
        } catch (e) {
          console.error("emit message:read error", e);
        }
      });
    },

    // other existing reducers kept as-is...
  }
});

export const {
  sendMessage,
  sendImage,
  receiveMessage,
  receiveImage,
  editMessage,
  editMessageRemote,
  setEditingMessage,
  markAsRead,
  createGroup,
  receiveGroup,
  updateGroupMembers,
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
  // new exports
  messageDelivered,
  messageReadRemote,
  markMessagesRead,
} = messagesSlice.actions;

export default messagesSlice.reducer;

export const initSocket = (store) => {
  socket.on("connect", () => {
    console.log("Connected to socket server:", socket.id);
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const state = store.getState();
    const currentUserId = state.messages.currentUserId;
    if (currentUserId) {
      socket.emit("presence:online", currentUserId);
    }
  });

  socket.on("chat:message", (msg) => {
    store.dispatch(receiveMessage(msg));
  });

  socket.on("chat:image", (msg) => {
    store.dispatch(receiveImage(msg));
  });

  socket.on("group:create", (group) => {
    store.dispatch(receiveGroup(group));
  });

  socket.on("group:update", (group) =>{
    store.dispatch(receiveGroupUpdate(group));
  });

  socket.on("chat:delete", (msgId) => {
    store.dispatch(deleteMessageRemote(msgId));
  });

  socket.on("chat:edit", (payload) => {
    store.dispatch(editMessageRemote(payload));
  });

  // socket.on("presence:init", (list) => {
  //   store.dispatch(setPresenceList(list));
  // });

  // socket.on("presence:update", (payload) => {
  //   store.dispatch(receivePresenceUpdate(payload));
  // });

  socket.on("presence:init", (list) => {
    store.dispatch(setPresenceList(list));
  
    // Mark messages as delivered for any of our sent messages if recipient already online
    try {
      const stateNow = store.getState();
      const currentUserId = stateNow.messages.currentUserId;
      if (!currentUserId) return;
  
      // normalize online user ids from list (list may be array of objects or ids)
      const onlineIds = Array.isArray(list)
        ? list.map((p) => (typeof p === "object" && p ? (p.userId || p.id || "").toString() : (p ? p.toString() : ""))).filter(Boolean)
        : [];
  
      if (onlineIds.length === 0) return;
  
      const ourSentPending = (stateNow.messages.messages || []).filter((m) => {
        if (!m || !m.id) return false;
        // only messages we sent
        if (!m.senderId || m.senderId.toString() !== currentUserId.toString()) return false;
        // skip already delivered/read
        if (m.status === "delivered" || m.status === "read") return false;
  
        // private messages to an online recipient
        if (m.receiverId && onlineIds.includes(m.receiverId.toString())) return true;
  
        // group messages where an online member is part of groupMembers (and not the sender)
        if (m.groupId && Array.isArray(m.groupMembers)) {
          const mems = m.groupMembers.map((x) => (x || "").toString());
          return mems.some((id) => onlineIds.includes(id) && id !== currentUserId.toString());
        }
  
        return false;
      });
  
      ourSentPending.forEach((m) => {
        // dispatch delivered for each pending message (deliveredTo includes the online ids that are recipients)
        const deliveredTo = [];
  
        if (m.receiverId && onlineIds.includes(m.receiverId.toString())) {
          deliveredTo.push(m.receiverId.toString());
        }
        if (m.groupId && Array.isArray(m.groupMembers)) {
          (m.groupMembers || []).forEach((gm) => {
            const gid = (gm || "").toString();
            if (onlineIds.includes(gid) && gid !== currentUserId.toString()) {
              deliveredTo.push(gid);
            }
          });
        }
  
        if (deliveredTo.length > 0) {
          store.dispatch(
            messageDelivered({
              id: m.id,
              deliveredTo,
              timestamp: new Date().toISOString(),
            })
          );
        }
      });
    } catch (err) {
      console.error("presence:init delivered-mark error", err);
    }
  });

  socket.on("presence:update", (payload) => {
    store.dispatch(receivePresenceUpdate(payload));
  
    // When a user becomes online, mark our sent messages to that user (or group messages where they are a member)
    try {
      if (!payload || !payload.userId) return;
  
      const becameOnline = !!payload.online;
      if (!becameOnline) return;
  
      const stateNow = store.getState();
      const currentUserId = stateNow.messages.currentUserId;
      if (!currentUserId) return;
  
      const uidStr = payload.userId.toString();
  
      // find messages that we sent that are not yet delivered/read and are addressed to this user
      const pending = (stateNow.messages.messages || []).filter((m) => {
        if (!m || !m.id) return false;
        if (!m.senderId || m.senderId.toString() !== currentUserId.toString()) return false;
        if (m.status === "delivered" || m.status === "read") return false;
  
        // private message to that user
        if (m.receiverId && m.receiverId.toString() === uidStr) return true;
  
        // group message where that user is a member (and not the sender)
        if (m.groupId && Array.isArray(m.groupMembers)) {
          const mems = m.groupMembers.map((x) => (x || "").toString());
          if (mems.includes(uidStr) && uidStr !== currentUserId.toString()) return true;
        }
  
        return false;
      });
  
      pending.forEach((m) => {
        store.dispatch(
          messageDelivered({
            id: m.id,
            deliveredTo: [uidStr],
            timestamp: new Date().toISOString(),
          })
        );
      });
    } catch (err) {
      console.error("presence:update delivered-mark error", err);
    }
  });
  
  

  // NEW: delivery/read listeners
  socket.on("message:delivered", (payload) => {
    // payload: { id, deliveredTo, timestamp }
    store.dispatch(messageDelivered(payload));
  });

  // socket.on("message:read", (payload) => {
  //   // payload: { id, readerId, timestamp }
  //   store.dispatch(messageReadRemote(payload));
  // });

  socket.on("message:read", (payload) => {
    // payload: { id, readerId, timestamp, ... }
    // Ensure UI shows delivered tick before read if read arrives before delivered (race).
    try {
      const stateNow = store.getState();
      const msg = (stateNow.messages && stateNow.messages.messages)
        ? stateNow.messages.messages.find((m) => m.id === payload.id)
        : null;
  
      // If message exists locally and wasn't marked delivered yet -> show delivered first
      if (msg && msg.status !== "delivered" && msg.status !== "read") {
        // mark delivered first (deliveredTo fallback includes readerId)
        store.dispatch(
          messageDelivered({
            id: payload.id,
            deliveredTo: payload.readerId ? [payload.readerId] : (msg.deliveredTo || []),
            timestamp: new Date().toISOString(),
          })
        );
  
        // then dispatch read after a short delay so user sees double-grey then blue
        setTimeout(() => {
          store.dispatch(messageReadRemote(payload));
        }, 300);
      } else {
        // normal path
        store.dispatch(messageReadRemote(payload));
      }
    } catch (err) {
      console.error("message:read handler error", err);
      store.dispatch(messageReadRemote(payload));
    }
  });
  

  socket.on("typing:start", (payload) => {
    console.log('[CLIENT] socket.on typing:start', payload);
    store.dispatch(receiveTypingStart(payload));
  });

  socket.on("typing:stop", (payload) => {
    console.log('[CLIENT] socket.on typing:stop', payload);
    store.dispatch(receiveTypingStop(payload));
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  window.addEventListener("beforeunload", () => {
    const state = store.getState();
    const currentUserId = state.messages.currentUserId;

    if (currentUserId) {
      socket.emit("presence:offline", currentUserId);
    }
  });
};

