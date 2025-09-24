// Polls functionality code

// server.js (updated)
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://192.168.1.98:3000/",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = {};
const socketUserMap = {};
const lastSeen = {};
const groups = {}; // in-memory store for groups, keyed by group.id

// new: polls store (in-memory)
const polls = {}; // keyed by poll.id

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

  const normGroup = (g) => {
    if (!g || !g.id) return null;
    return {
      ...g,
      id: g.id.toString(),
      members: Array.isArray(g.members) ? g.members.map(String) : [],
      admins: Array.isArray(g.admins) ? g.admins.map(String) : (g.isPrivate && g.creator ? [g.creator.toString()] : []),
      creator: g.creator != null ? g.creator.toString() : null,
      isPrivate: !!g.isPrivate,
    };
  };

  const normPoll = (p) => {
    if (!p || !p.id) return null;
    return {
      ...p,
      id: p.id.toString(),
      creatorId: p.creatorId != null ? p.creatorId.toString() : null,
      creatorName: p.creatorName || null,
      groupId: p.groupId != null ? p.groupId.toString() : null,
      receiverId: p.receiverId != null ? p.receiverId.toString() : null,
      options: Array.isArray(p.options) ? p.options.map((o, idx) => ({
        id: o.id != null ? o.id.toString() : `opt_${idx}`,
        text: o.text || "",
        votes: Array.isArray(o.votes) ? o.votes.map(String) : [],
      })) : [],
      multi: !!p.multi,
      closed: !!p.closed,
      timestamp: p.timestamp || new Date().toISOString(),
    };
  };

  socket.on("chat:message", (msg) => {
    try {
      if (!msg) return;
      // If group message, enforce private-group admins only rule
      if (msg.groupId) {
        const gid = msg.groupId.toString();
        const g = groups[gid];
        if (g && g.isPrivate) {
          const senderId = msg.senderId != null ? msg.senderId.toString() : null;
          const admins = (g.admins || []).map(String);
          if (!senderId || !admins.includes(senderId)) {
            socket.emit("chat:send:error", {
              reason: "not_admin",
              message: "Only group admins can send messages in this private group.",
              groupId: gid,
            });
            console.log(`[SERVER] message rejected from ${senderId} to private group ${gid} (not admin)`);
            return;
          }
        }
      }

      io.emit("chat:message", msg);
    } catch (err) {
      console.error("chat:message error", err);
    }
  });

  socket.on("chat:image", (msg) => {
    try {
      if (!msg) return;
      if (msg.groupId) {
        const gid = msg.groupId.toString();
        const g = groups[gid];
        if (g && g.isPrivate) {
          const senderId = msg.senderId != null ? msg.senderId.toString() : null;
          const admins = (g.admins || []).map(String);
          if (!senderId || !admins.includes(senderId)) {
            socket.emit("chat:send:error", {
              reason: "not_admin",
              message: "Only group admins can send images in this private group.",
              groupId: gid,
            });
            console.log(`[SERVER] image rejected from ${senderId} to private group ${gid} (not admin)`);
            return;
          }
        }
      }

      io.emit("chat:image", msg);
    } catch (err) {
      console.error("chat:image error", err);
    }
  });

  // Poll: create
  socket.on("poll:create", (poll) => {
    try {
      const p = normPoll(poll);
      if (!p || !p.id) return;

      // if group and group is private -> only admins can create polls (keep same rule as messages)
      if (p.groupId) {
        const g = groups[p.groupId];
        if (g && g.isPrivate) {
          const creatorId = p.creatorId;
          const admins = (g.admins || []).map(String);
          if (!creatorId || !admins.includes(creatorId)) {
            socket.emit("chat:send:error", {
              reason: "not_admin",
              message: "Only group admins can create polls in this private group.",
              groupId: p.groupId,
            });
            console.log(`[SERVER] poll creation rejected from ${creatorId} to private group ${p.groupId} (not admin)`);
            return;
          }
        }
      }

      // Normalize option votes
      p.options.forEach(o => {
        o.votes = o.votes || [];
      });

      polls[p.id] = p;

      // broadcast as both a "poll:create" and as a "chat:message" (so clients that expect message list see it)
      io.emit("poll:create", p);
      io.emit("chat:message", {
        id: p.id,
        senderId: p.creatorId,
        senderName: p.creatorName,
        receiverId: p.receiverId || null,
        groupId: p.groupId || null,
        content: p, // store poll object in content for legacy clients
        type: "poll",
        timestamp: p.timestamp,
      });

      console.log(`[SERVER] poll created ${p.id}`);
    } catch (err) {
      console.error("poll:create error", err);
    }
  });

  // Poll: vote
  socket.on("poll:vote", (payload) => {
    try {
      if (!payload || !payload.pollId || !payload.userId || payload.optionId == null) return;
      const pid = payload.pollId.toString();
      const uid = payload.userId.toString();
      const optId = payload.optionId.toString();

      const p = polls[pid];
      if (!p) return;

      if (p.closed) {
        // ignore votes to closed polls
        return;
      }

      // find any existing vote(s) by this user
      if (p.multi) {
        // multi-select: toggle option membership
        const option = p.options.find(o => o.id === optId);
        if (!option) return;
        if (!Array.isArray(option.votes)) option.votes = [];
        const idx = option.votes.indexOf(uid);
        if (idx === -1) {
          option.votes.push(uid);
        } else {
          option.votes.splice(idx, 1);
        }
      } else {
        // single choice: remove user from any other option, then add to chosen (toggle)
        p.options.forEach(o => {
          o.votes = (o.votes || []).filter(v => v !== uid);
        });
        const option = p.options.find(o => o.id === optId);
        if (!option) return;
        // if user already voted same option -> allow un-vote (toggle)
        const already = (option.votes || []).includes(uid);
        if (!already) option.votes.push(uid);
        // if already => nothing (we removed above) -> now it's un-voted
      }

      polls[pid] = p;

      io.emit("poll:update", p);
      console.log(`[SERVER] poll ${pid} updated by ${uid}`);
    } catch (err) {
      console.error("poll:vote error", err);
    }
  });

  socket.on("poll:close", (payload) => {
    try {
      if (!payload || !payload.pollId) return;
      const pid = payload.pollId.toString();
      const p = polls[pid];
      if (!p) return;

      // if group is private only admins can close (follow message rule)
      if (p.groupId) {
        const g = groups[p.groupId];
        if (g && g.isPrivate) {
          const actorId = payload.userId ? payload.userId.toString() : null;
          const admins = (g.admins || []).map(String);
          if (!actorId || !admins.includes(actorId)) {
            socket.emit("chat:send:error", {
              reason: "not_admin",
              message: "Only group admins can close polls in this private group.",
              groupId: p.groupId,
            });
            console.log(`[SERVER] poll close rejected from ${actorId} to private group ${p.groupId} (not admin)`);
            return;
          }
        }
      }

      p.closed = true;
      polls[pid] = p;
      io.emit("poll:close", { pollId: pid, closedBy: payload.userId || null, poll: p });
      io.emit("poll:update", p); // also broadcast update
      console.log(`[SERVER] poll ${pid} closed`);
    } catch (err) {
      console.error("poll:close error", err);
    }
  });

  socket.on("group:create", (group) => {
    try {
      const g = normGroup(group);
      if (!g || !g.id) return;
      groups[g.id] = g;
      io.emit("group:create", g);
      console.log(`[SERVER] group created: ${g.id}`, { isPrivate: g.isPrivate, admins: g.admins });
    } catch (err) {
      console.error("group:create error", err);
    }
  });

  socket.on("group:update", (group) => {
    try {
      const g = normGroup(group);
      if (!g || !g.id) return;
      const prev = groups[g.id] || {};
      const merged = {
        ...prev,
        ...g,
        members: Array.isArray(g.members) ? g.members.map(String) : (prev.members || []).map(String),
        admins: Array.isArray(g.admins) ? g.admins.map(String) : (prev.admins || []).map(String),
        isPrivate: !!g.isPrivate,
      };
      merged.admins = (merged.admins || []).filter(a => (merged.members || []).includes(a));
      groups[g.id] = merged;
      io.emit("group:update", merged);
      console.log(`[SERVER] group updated: ${g.id}`);
    } catch (err) {
      console.error("group:update error", err);
    }
  });

  socket.on("group:delete", (payload) => {
    io.emit("group:delete", payload);
    if (payload && payload.id) {
      delete groups[payload.id.toString()];
    }
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
    try{
      if (!payload || !payload.type || payload.id == null || !payload.userId) return;

      if (payload.type === "user") {
        const targetId = payload.id.toString();
        let delivered = 0;
        for(const sid of Object.keys(socketUserMap)) {
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


// src/features/messages/messagesSlice.js (updated)
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
    } else if (message.type === "poll") {
      bodyText = `${message.senderName} created a poll: ${message.content?.question || ""}`;
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
  polls: {}, // local cache keyed by poll.id (optional)
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    // existing reducers unchanged (kept as in your original file)...
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

      // if it's a poll message, cache poll
      if (payload.type === "poll" && payload.content && payload.content.id) {
        state.polls = {
          ...state.polls,
          [payload.content.id.toString()]: payload.content,
        };
      }

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

    // edit/delete/other reducers (kept from your original file)...
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

    // ---------- Poll related reducers ----------

    // create a poll client-side -> send to server
    createPoll: (state, action) => {
      const payload = action.payload || {};
      // payload should include question, options[], creatorId, groupId/receiverId, multi (optional)
      const poll = {
        id: payload.id || (Date.now().toString() + Math.random().toString(36).slice(2)),
        question: payload.question || "",
        options: Array.isArray(payload.options) ? payload.options.map((o, idx) => ({
          id: o.id ? o.id.toString() : `opt_${idx}`,
          text: o.text || "",
          votes: []
        })) : [],
        creatorId: payload.creatorId || state.currentUserId || null,
        creatorName: payload.creatorName || null,
        groupId: payload.groupId || null,
        receiverId: payload.receiverId || null,
        multi: !!payload.multi,
        closed: false,
        timestamp: payload.timestamp || new Date().toISOString(),
      };

      // push as a chat message (so it appears in messages array)
      const pollMsg = {
        id: poll.id,
        senderId: poll.creatorId,
        senderName: poll.creatorName,
        receiverId: poll.receiverId || null,
        groupId: poll.groupId || null,
        content: poll,
        type: "poll",
        timestamp: poll.timestamp,
      };

      state.messages.push(pollMsg);
      state.polls = { ...state.polls, [poll.id]: poll };

      // emit to server
      try {
        socket.emit("poll:create", poll);
      } catch (e) {
        console.error("socket emit poll:create failed", e);
      }
    },

    // when server broadcasts a poll:create
    receivePoll: (state, action) => {
      const poll = action.payload;
      if (!poll || !poll.id) return;
      // ensure we don't duplicate message if already present
      const exists = state.messages.some(m => m.id === poll.id);
      const pollMsg = {
        id: poll.id,
        senderId: poll.creatorId,
        senderName: poll.creatorName,
        receiverId: poll.receiverId || null,
        groupId: poll.groupId || null,
        content: poll,
        type: "poll",
        timestamp: poll.timestamp || new Date().toISOString(),
      };
      if (!exists) {
        state.messages.push(pollMsg);
      } else {
        // update existing
        const idx = state.messages.findIndex(m => m.id === poll.id);
        if (idx !== -1) state.messages[idx] = { ...state.messages[idx], content: poll, type: "poll" };
      }

      state.polls = { ...state.polls, [poll.id]: poll };
    },

    // client initiates a vote -> emit to server
    votePoll: (state, action) => {
      const payload = action.payload || {};
      if (!payload.pollId || !payload.userId || payload.optionId == null) return;

      // local optimistic update (apply same logic as server)
      const pid = payload.pollId.toString();
      const uid = payload.userId.toString();
      const optId = payload.optionId.toString();

      // update local poll cache & messages
      const localPoll = state.polls[pid];
      if (localPoll) {
        if (localPoll.closed) {
          // do nothing
        } else {
          if (localPoll.multi) {
            const option = localPoll.options.find(o => o.id === optId);
            if (option) {
              const idx = (option.votes || []).indexOf(uid);
              if (idx === -1) option.votes.push(uid);
              else option.votes.splice(idx, 1);
            }
          } else {
            localPoll.options.forEach(o => {
              o.votes = (o.votes || []).filter(v => v !== uid);
            });
            const option = localPoll.options.find(o => o.id === optId);
            if (option) {
              const already = (option.votes || []).includes(uid);
              if (!already) option.votes.push(uid);
            }
          }

          state.polls[pid] = { ...localPoll };
          // update messages array entry if present
          const msgIdx = state.messages.findIndex(m => m.id === pid && m.type === "poll");
          if (msgIdx !== -1) {
            state.messages[msgIdx] = { ...state.messages[msgIdx], content: state.polls[pid] };
          }
        }
      }

      try {
        socket.emit("poll:vote", { pollId: pid, userId: uid, optionId: optId });
      } catch (e) {
        console.error("socket emit poll:vote failed", e);
      }
    },

    // when server broadcasts poll changes
    receivePollUpdate: (state, action) => {
      const poll = action.payload;
      if (!poll || !poll.id) return;
      const pid = poll.id.toString();

      state.polls = { ...state.polls, [pid]: poll };

      // update messages array entry if present
      const idx = state.messages.findIndex(m => m.id === pid && m.type === "poll");
      if (idx === -1) {
        // insert as new poll message
        state.messages.push({
          id: poll.id,
          senderId: poll.creatorId,
          senderName: poll.creatorName,
          receiverId: poll.receiverId || null,
          groupId: poll.groupId || null,
          content: poll,
          type: "poll",
          timestamp: poll.timestamp || new Date().toISOString(),
        });
      } else {
        state.messages[idx] = { ...state.messages[idx], content: poll, type: "poll" };
      }
    },

    closePoll: (state, action) => {
      const payload = action.payload || {};
      if (!payload.pollId) return;
      const pid = payload.pollId.toString();
      // update local cache & message
      const p = state.polls[pid];
      if (p) {
        p.closed = true;
        state.polls[pid] = { ...p };
      }
      const idx = state.messages.findIndex(m => m.id === pid && m.type === "poll");
      if (idx !== -1) {
        state.messages[idx] = { ...state.messages[idx], content: state.polls[pid] };
      }

      try {
        socket.emit("poll:close", payload);
      } catch (e) {
        console.error("socket emit poll:close failed", e);
      }
    },

    receivePollClose: (state, action) => {
      const payload = action.payload || {};
      if (!payload.pollId) return;
      const pid = payload.pollId.toString();
      const poll = payload.poll || state.polls[pid];
      if (poll) {
        poll.closed = true;
        state.polls[pid] = poll;
      }
      const idx = state.messages.findIndex(m => m.id === pid && m.type === "poll");
      if (idx !== -1) {
        state.messages[idx] = { ...state.messages[idx], content: state.polls[pid] };
      }
    },

    // ---------- end poll reducers ----------

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

  // poll actions
  createPoll,
  receivePoll,
  votePoll,
  receivePollUpdate,
  closePoll,
  receivePollClose,
} = messagesSlice.actions;

export default messagesSlice.reducer;


// src/services/socket.js (updated)
import { io } from "socket.io-client";

import {
  receiveMessage,
  receiveImage,
  receiveGroup,
  receiveGroupUpdate,
  deleteMessageRemote,
  editMessageRemote,
  setPresenceList,
  receivePresenceUpdate,
  receiveTypingStart,
  receiveTypingStop,
  receivePinUpdate,
  receivePoll,
  receivePollUpdate,
  receivePollClose,
} from "../features/messages/messagesSlice";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://192.168.1.98:5001";
export const socket = io(SOCKET_URL, { transports: ["websocket"] });

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

  socket.on("presence:init", (list) => {
    store.dispatch(setPresenceList(list));
  });

  socket.on("presence:update", (payload) => {
    store.dispatch(receivePresenceUpdate(payload));
  });

  socket.on("chat:pin", (payload) => {
    store.dispatch(receivePinUpdate(payload));
  });
 
  socket.on("typing:start", (payload) => {
    console.log('[CLIENT] socket.on typing:start', payload);
    store.dispatch(receiveTypingStart(payload));
  });

  socket.on("typing:stop", (payload) => {
    console.log('[CLIENT] socket.on typing:stop', payload);
    store.dispatch(receiveTypingStop(payload));
  });

  // Poll events
  socket.on("poll:create", (poll) => {
    console.log("[CLIENT] poll:create", poll);
    store.dispatch(receivePoll(poll));
  });

  socket.on("poll:update", (poll) => {
    console.log("[CLIENT] poll:update", poll);
    store.dispatch(receivePollUpdate(poll));
  });

  socket.on("poll:close", (payload) => {
    console.log("[CLIENT] poll:close", payload);
    store.dispatch(receivePollClose(payload));
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




// src/components/chat/PollModal.jsx
import React, { useState } from "react";
import Swal from "sweetalert2";

/**
 * Props:
 * - show (bool)
 * - onClose()
 * - onCreate({ question, options[], multi, groupId, receiverId })
 * - currentUser (object)
 * - selectedGroup (object) optional
 * - selectedUser (object) optional
 */
const PollModal = ({ show, onClose, onCreate, currentUser, selectedGroup, selectedUser }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([{ id: "opt_0", text: "" }, { id: "opt_1", text: "" }]);
  const [multi, setMulti] = useState(false);

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, { id: `opt_${Date.now()}`, text: "" }]);
  };

  const removeOption = (idx) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const setOptionText = (idx, text) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, text } : o)));
  };

  const handleCreate = () => {
    const validOptions = options.map(o => ({ id: o.id.toString(), text: (o.text || "").trim() })).filter(o => o.text);
    if (!question.trim()) {
      Swal.fire("Missing", "Please provide a question for the poll.", "warning");
      return;
    }
    if (validOptions.length < 2) {
      Swal.fire("Options", "Please add at least two options.", "warning");
      return;
    }

    const payload = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      question: question.trim(),
      options: validOptions,
      creatorId: currentUser?.id,
      creatorName: currentUser?.name || (currentUser?.displayName || "Unknown"),
      groupId: selectedGroup?.id || null,
      receiverId: selectedUser?.id || null,
      multi: !!multi,
      timestamp: new Date().toISOString(),
    };

    onCreate && onCreate(payload);
    // reset
    setQuestion("");
    setOptions([{ id: "opt_0", text: "" }, { id: "opt_1", text: "" }]);
    setMulti(false);
    onClose && onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create Poll</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="mb-2">
              <label className="form-label">Question</label>
              <input value={question} onChange={(e) => setQuestion(e.target.value)} className="form-control" placeholder="e.g. Which day is best for meeting?" />
            </div>

            <div className="mb-2">
              <label className="form-label">Options</label>
              {options.map((opt, idx) => (
                <div key={opt.id} className="d-flex mb-1">
                  <input
                    className="form-control"
                    placeholder={`Option ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) => setOptionText(idx, e.target.value)}
                  />
                  <button className="btn btn-outline-danger ms-2" onClick={() => removeOption(idx)} disabled={options.length <= 2}>
                    &times;
                  </button>
                </div>
              ))}
              <div className="mt-2">
                <button className="btn btn-sm btn-outline-primary" onClick={addOption} disabled={options.length >= 10}>Add option</button>
                <small className="text-muted ms-2">Max 10 options</small>
              </div>
            </div>

            <div className="form-check">
              <input id="pollMulti" className="form-check-input" type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
              <label className="form-check-label" htmlFor="pollMulti">Allow multiple selections</label>
            </div>

            <div className="mt-3">
              <small className="text-muted">Poll will be posted to {selectedGroup ? `group: ${selectedGroup.name || selectedGroup.id}` : (selectedUser ? `chat with ${selectedUser.name || selectedUser.id}` : "current chat") }.</small>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Create Poll</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// export default PollModal;




// src/components/chat/PollResultsModal.jsx
import React from "react";

/**
 * Props:
 * - show (bool)
 * - onClose()
 * - poll (object)
 * - currentUserId (string)
 * - onVote(pollId, optionId)
 */
const PollResultsModal = ({ show, onClose, poll, currentUserId, onVote }) => {
  if (!show || !poll) return null;

  const totalVotes = (poll.options || []).reduce((s, o) => s + (Array.isArray(o.votes) ? o.votes.length : 0), 0);

  const userVotedFor = (option) => {
    return option.votes && option.votes.some(v => v.toString() === (currentUserId || "").toString());
  };

  return (
    <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
      <div className="modal-dialog modal-md">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Poll Results</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <h6>{poll.question}</h6>
            <div className="list-group mt-2">
              {(poll.options || []).map((opt) => {
                const count = Array.isArray(opt.votes) ? opt.votes.length : 0;
                const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                const you = userVotedFor(opt);
                return (
                  <div key={opt.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div><strong>{opt.text}</strong></div>
                      <div className="small text-muted">{count} vote{count !== 1 ? "s" : ""} • {pct}%</div>
                      {you && <div className="badge bg-success text-white mt-1">You voted</div>}
                    </div>
                    <div>
                      {!poll.closed && (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => onVote(poll.id, opt.id)}>
                          {you ? "Change" : "Vote"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-muted">
              {poll.closed ? "Poll closed" : `Total votes: ${totalVotes}`}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// export default PollResultsModal;



// src/components/chat/PollMessage.jsx
import React from "react";

/**
 * Props:
 * - message (object) { id, content: pollObj, ... }
 * - currentUser (object)
 * - onOpenResults(poll)
 * - onVote(pollId, optionId)
 */
const PollMessage = ({ message, currentUser, onOpenResults, onVote }) => {
  const poll = message?.content;
  if (!poll) {
    return <div className="text-muted">Invalid poll</div>;
  }

  const totalVotes = (poll.options || []).reduce((s, o) => s + (Array.isArray(o.votes) ? o.votes.length : 0), 0);

  const myVoteOption = (poll.options || []).find(o => Array.isArray(o.votes) && o.votes.some(v => v.toString() === (currentUser?.id || "").toString()));

  return (
    <div className="card bg-light mb-2" style={{ maxWidth: 520 }}>
      <div className="card-body p-2">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="fw-bold">{poll.question}</div>
            <div className="small text-muted">{poll.creatorName || "Unknown"} • {new Date(poll.timestamp).toLocaleString()}</div>
          </div>
          <div>
            {poll.closed ? <span className="badge bg-secondary">Closed</span> : <span className="badge bg-primary">Poll</span>}
          </div>
        </div>

        <div className="mt-2">
          {(poll.options || []).map((opt) => {
            const count = Array.isArray(opt.votes) ? opt.votes.length : 0;
            const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
            const iVoted = Array.isArray(opt.votes) && opt.votes.some(v => v.toString() === (currentUser?.id || "").toString());

            return (
              <div key={opt.id} className="d-flex justify-content-between align-items-center mb-1">
                <div style={{ flex: 1 }}>
                  <div>{opt.text}</div>
                  <div className="small text-muted">{count} vote{count !== 1 ? "s" : ""} • {pct}%</div>
                </div>
                <div>
                  {!poll.closed ? (
                    <button className={`btn btn-sm ${iVoted ? "btn-success" : "btn-outline-primary"}`} onClick={() => onVote(poll.id, opt.id)}>
                      {iVoted ? "Voted" : "Vote"}
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => onOpenResults(poll)}>View</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 d-flex justify-content-between align-items-center">
          <div className="small text-muted">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</div>
          <div>
            <button className="btn btn-sm btn-link" onClick={() => onOpenResults(poll)}>View Results</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// export default PollMessage;


// ChatInput.jsx

import React, { useRef, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { FaImage, FaPoll } from "react-icons/fa";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import MentionsDropdown from "./MentionsDropdown";

const ChatInput = ({
  input,
  setInput,
  handleSend,
  handleInputChange,
  handleEmojiSelect,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiButtonRef,
  emojiPickerRef,
  fileInputRef,
  handleImageUpload,
  selectedGroup,
  groupMembers,
  onOpenPoll, // NEW: function to open poll modal
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState(0);
  const [currentMentions, setCurrentMentions] = useState([]);
  const inputRef = useRef(null);

  const handleLocalInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInput(value);

    if (selectedGroup && groupMembers) {
      const atIndex = value.lastIndexOf('@', cursorPos - 1);

      if (atIndex !== -1) {
        const typed = value.slice(atIndex + 1, cursorPos);
        if (!typed.includes(' ') && (cursorPos === atIndex + 1 || value[atIndex + 1] !== ' ')) {
          setShowMentions(true);
          setMentionFilter(typed);
          setMentionStart(atIndex);
          return;
        }
      }
      setShowMentions(false);
    } else {
      setShowMentions(false);
    }

    if (handleInputChange) handleInputChange(e);
  }

  const handleMentionSelect = (user) => {
    const mentionText = `@${user.name}`;
    const insertPos = mentionStart;
  
    const afterStart = insertPos + 1 + mentionFilter.length;
  
    const before = input.slice(0, insertPos);
    const after = input.slice(afterStart);
  
    const newInput = before + mentionText + ' ' + after;
  
    setInput(newInput);
  
    const newMentions = [...currentMentions, { userId: user.id, name: user.name, offset: insertPos }];
    setCurrentMentions(newMentions);
  
    setShowMentions(false);
    setMentionFilter('');
  
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = insertPos + mentionText.length + 1;
        inputRef.current.focus();
      }
    }, 0);
  };

  const onSendLocal = () => {
    if (selectedGroup) {
      handleSend();
      setCurrentMentions([]);
    } else {
      handleSend();
    }
  }

  const handleLocalSend = () => {
    onSendLocal();
  };

  const dropdownStyle = {
    position: "absolute",
    bottom: "100%",
    left: 0,
    width: "200px",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    zIndex: 1000,
    maxHeight: "150px",
    overflowY: 'auto',
  };

  const safeGroupMembers = groupMembers || [];
  const filteredMembers = safeGroupMembers.filter(u =>
    !mentionFilter || u.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  return (
    <div className="chat-input position-relative d-flex align-items-center gap-2">
      <button
        ref={emojiButtonRef}
        className="btn btn-light"
        onClick={() => setShowEmojiPicker((prev) => !prev)}
        title="Emoji"
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
        className="btn btn-light"
        onClick={() => fileInputRef.current.click()}
        title="Attach image"
      >
        <FaImage />
      </button>

      {/* Poll button */}
      <button
        className="btn btn-light"
        onClick={() => onOpenPoll && onOpenPoll()}
        title="Create poll"
      >
        <FaPoll />
      </button>

      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="emoji-picker position-absolute" style={{ bottom: "3.5rem", left: "0" }}>
          <Picker data={data} onEmojiSelect={handleEmojiSelect} />
        </div>
      )}

      <input
        ref={inputRef}
        className="form-control me-2 flex-grow-1"
        value={input}
        onChange={handleLocalInputChange}
        onKeyDown={(e) => e.key === "Enter" && handleLocalSend()}
        placeholder="Type a message..."
      />

      <button
        className="btn btn-primary d-flex align-items-center justify-content-center"
        onClick={handleLocalSend}
        title="Send"
      >
        <IoMdSend size={20} />
      </button>

      {showMentions && selectedGroup && filteredMembers.length > 0 && (
        <div style={dropdownStyle}>
          <MentionsDropdown
            users={filteredMembers}
            onSelect={handleMentionSelect}
            filter={mentionFilter}
          />
        </div>
      )}
    </div>
  );
};

// export default ChatInput;


// MessageBubble.jsx

// import React, { useEffect, useRef, useState } from "react";
// import { useDispatch } from "react-redux";
// import {
//   deleteMessage,
//   setEditingMessage,
//   pinMessage,
//   unpinMessage,
// } from "../features/messages/messagesSlice";
// import { MdDelete, MdEdit, MdCheckCircle, MdReply, MdMoreVert, MdPushPin } from "react-icons/md";
// import { TiArrowForward } from "react-icons/ti";
// import { useLongPress } from "use-long-press";
// import { useSelector } from "react-redux";
// import Swal from "sweetalert2";
// import { MdBlockFlipped } from "react-icons/md";

// // import PollMessage from "./PollMessage"; // NEW: poll renderer (ensure path is correct)
// import PollMessage from "./messages/PollMessage";

// export default function MessageBubble({
//   message,
//   isOwn,
//   showSender,
//   isSelected = false,
//   onToggleSelect = () => { },
//   selectionMode = false,
//   onReply = () => { },
//   onJumpToMessage = () => { },
//   onForward = () => { },
//   onOpenPollResults = () => {}, // NEW: open results handler
//   onVotePoll = () => {},        // NEW: vote handler
//   onClosePoll = () => {},       // NEW: close poll handler (optional)
// }) {
//   const dispatch = useDispatch();
//   const lastLongPressAt = useRef(0);

//   const currentUserId = useSelector((state) => state.messages.currentUserId);

//   const [menuOpen, setMenuOpen] = useState(false);
//   const menuRef = useRef(null);

//   const handleEdit = (e) => {
//     e.stopPropagation();
//     if (isOwn) {
//       dispatch(setEditingMessage(message));
//     }
//     setMenuOpen(false);
//   };

//   const handleDelete = (e) => {
//     e.stopPropagation();

//     let messageTime = message && message.timestamp ? new Date(message.timestamp).getTime() : 0;
//     let currentTime = Date.now();
//     let timePassed = currentTime - messageTime

//     let TWO_MINUTES = 2 * 60 * 1000;
//     let canDeleteForEveryone = timePassed <= TWO_MINUTES;

//     let isSender = currentUserId && message.senderId && currentUserId.toString() === message.senderId.toString();

//     let alreadyDeleted = message.deleted || message.type === "deleted";

//     if (alreadyDeleted) {
//       Swal.fire({
//         title: "Delete message?",
//         text: "Do you want to delete this message from your chat?",
//         icon: "question",
//         showCancelButton: true,
//         confirmButtonText: "Yes, delete it",
//         cancelButtonText: "Cancel",
//       }).then((result) => {
//         if (result.isConfirmed) {
//           dispatch(deleteMessage({ id: message.id, forEveryone: false }));
//         }
//       });
//       return;
//     }

//     if (isSender && canDeleteForEveryone) {
//       Swal.fire({
//         title: "Delete message?",
//         icon: "warning",
//         showDenyButton: true,
//         showCancelButton: true,
//         confirmButtonText: "Delete for everyone",
//         denyButtonText: "Delete for me",
//         cancelButtonText: "Cancel"
//       })
//         .then((result) => {
//           if (result.isConfirmed) {
//             dispatch(deleteMessage({ id: message.id, forEveryone: true, deletedBy: currentUserId || null }));
//           } else if (result.isDenied) {
//             dispatch(deleteMessage({ id: message.id, forEveryone: false }));
//           }
//         })
//     }
//     else {
//       Swal.fire({
//         title: `Delete message?`,
//         icon: "warning",
//         showCancelButton: true,
//         confirmButtonText: "Delete for me",
//         cancelButtonText: "Cancel"
//       })
//         .then((result) => {
//           if (result.isConfirmed) {
//             dispatch(deleteMessage({ id: message.id, forEveryone: false }));
//           }
//         });
//     }
//     setMenuOpen(false);
//   };

//   const handlePinToggle = (e) => {
//     e.stopPropagation();
//     if (!message) return;

//     if (message.pinned) {
//       dispatch(unpinMessage({ id: message.id, unpinnedBy: currentUserId || null }));
//       Swal.fire("Unpinned", "Message removed from pinned messages.", "success");
//     } else {
//       dispatch(pinMessage({ id: message.id, pinnedBy: currentUserId || null }));
//       Swal.fire("Pinned", "Message added to pinned messages.", "success");
//     }
//     setMenuOpen(false);
//   }

//   const longPress = useLongPress(() => {
//     lastLongPressAt.current = Date.now();
//     onToggleSelect(message.id);
//   },
//     {
//       threshold: 500,
//       captureEvent: true,
//       detect: 'both',
//     }
//   );

//   const handleClick = (e) => {
//     const now = Date.now();
//     if (now - lastLongPressAt.current < 500) {
//       return;
//     }
//     onToggleSelect(message.id);
//   }

//   const isDeletedForEveryone = message.deleted || message.type === "deleted";

//   const renderMessageContent = (message) => {
//     if (!message.mentions || message.mentions.length === 0 || message.type !== "text") {
//       return message.content;
//     }

//     const mentions = [...message.mentions].sort((a, b) => a.offset - b.offset);
//     const parts = [];
//     let lastIndex = 0;

//     mentions.forEach((mention) => {
//       const startOfMention = mention.offset;
//       const endOfMention = startOfMention + `@${mention.name}`.length;

//       if (startOfMention > lastIndex) {
//         parts.push(message.content.slice(lastIndex, startOfMention));
//       }

//       parts.push(
//         <span
//           key={`mention-${mention.userId}-${startOfMention}`}
//           className="mention fw-bold text-primary"
//           style={{ cursor: "pointer" }}
//           onClick={(event) => {
//             event.stopPropagation();
//             console.log("Mention clicked:", mention.userId);
//           }}
//         >
//           @{mention.name}
//         </span>
//       );

//       lastIndex = endOfMention;
//     });

//     if (lastIndex < message.content.length) {
//       parts.push(message.content.slice(lastIndex));
//     }

//     return parts.length === 1 ? parts[0] : parts;
//   };

//   const renderReplySnippet = (reply) => {
//     if (!reply) return null;
//     const replySender = reply.senderName || "Unknown";
//     let snippet = "";

//     if (reply.type === "image") {
//       snippet = "Image";
//     } else if (reply.type === "text") {
//       snippet = reply.content ? (typeof reply.content === "string" ? reply.content : "") : "";
//       if (snippet.length > 80) snippet = snippet.slice(0, 77) + "...";
//     } else {
//       snippet = reply.content || "";
//     }

//     return (
//       <div
//         className="reply-snippet mb-2 p-3 rounded"
//         style={{ background: "#f1f1f1", borderLeft: "3px solid #ccc", cursor: "pointer" }}
//         title="Jump to original message"
//         onClick={(e) => {
//           e.stopPropagation();

//           if (reply && reply.id && onJumpToMessage) {
//             onJumpToMessage(reply.id);
//           } else {
//             Swal.fire({
//               icon: "info",
//               title: "Original message not available",
//               text: "cannot jump to the original message."
//             });
//           }
//         }}
//       >
//         <div className="reply-sender small fw-bold">{replySender}</div>
//         <div className="reply-content small text-truncate">{snippet || <em>Media</em>}</div>
//       </div>
//     );
//   };

//   const messageReply = message.replyTo || null;

//   useEffect(() => {
//     function handleOutside(e) {
//       if (menuRef.current && !menuRef.current.contains(e.target)) {
//         setMenuOpen(false);
//       }
//     }
//     if (menuOpen) document.addEventListener("mousedown", handleOutside);
//     return () => document.removeEventListener("mousedown", handleOutside);
//   }, [menuOpen]);

//   // If poll message -> render PollMessage component
//   if (message.type === "poll" && message.content) {
//     return (
//       <div className={`d-flex mb-3 ${isOwn ? "justify-content-end" : "justify-content-start"}`}>
//         <div className={`message-bubble ${isOwn ? "own-message" : "other-message"} ${selectionMode ? "selection-mode" : ""} ${isSelected ? "selected" : ""}`}>
//           <div
//             className={`selection-checkbox ${isSelected ? "checked" : ""}`}
//             style={{ display: selectionMode ? "flex" : "none" }}
//             onClick={(e) => {
//               e.stopPropagation();
//               onToggleSelect(message.id);
//             }}
//             title={isSelected ? "Unselect" : "Select"}
//           >
//             {isSelected ? <MdCheckCircle className="selection-icon" /> : ""}
//           </div>

//           {showSender && !isOwn && (
//             <div className="sender-name fw-bold">{message.senderName}</div>
//           )}

//           <div style={{ paddingTop: 4 }}>
//             <PollMessage
//               message={message}
//               currentUser={{ id: currentUserId }}
//               onOpenResults={(poll) => onOpenPollResults(poll)}
//               onVote={(pollId, optionId) => onVotePoll(pollId, optionId)}
//               onClose={(pollId) => onClosePoll(pollId)}
//             />
//           </div>

//           <div className="message-footer d-flex align-items-center justify-content-between mt-2">
//             <small className="text-muted message-time">
//               {new Date(message.timestamp).toLocaleTimeString([], {
//                 hour: "2-digit",
//                 minute: "2-digit",
//               })}
//             </small>

//             <div className="bubble-menu-wrapper" ref={menuRef}>
//               <button
//                 className="btn btn-sm btn-light more-btn"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setMenuOpen((s) => !s);
//                 }}
//                 title="Options"
//               >
//                 <MdMoreVert />
//               </button>

//               {menuOpen && (
//                 <div className="more-menu shadow-sm">
//                   <button
//                     className="dropdown-item"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setMenuOpen(false);
//                       onReply(message);
//                     }}
//                   >
//                     <MdReply size={16} className="me-2" /> Reply
//                   </button>

//                   <button
//                     className="dropdown-item"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setMenuOpen(false);
//                       if (onForward && typeof onForward === "function")
//                         onForward(message);
//                     }}
//                   >
//                     <TiArrowForward size={16} className="me-2" /> Forward
//                   </button>

//                   {isOwn && !isDeletedForEveryone && (
//                     <button className="dropdown-item" onClick={handleEdit}>
//                       <MdEdit size={16} className="me-2" /> Edit
//                     </button>
//                   )}

//                   <button className="dropdown-item" onClick={handlePinToggle}>
//                     <MdPushPin size={16} className="me-2" />
//                     {message.pinned ? "Unpin message" : "Pin message"}
//                   </button>

//                   <button className="dropdown-item text-danger" onClick={handleDelete}>
//                     <MdDelete size={16} className="me-2" /> Delete
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Default handling for text/image/deleted etc.
//   return (
//     <div
//       {...longPress()}
//       onClick={handleClick}
//       className={`d-flex mb-3 ${isOwn ? "justify-content-end" : "justify-content-start"}`}>
//       <div className={`message-bubble ${isOwn ? "own-message" : "other-message"} ${selectionMode ? "selection-mode" : ""} ${isSelected ? "selected" : ""}`}>
//         <div
//           className={`selection-checkbox ${isSelected ? "checked" : ""}`}
//           style={{ display: selectionMode ? "flex" : "none" }}
//           onClick={(e) => {
//             e.stopPropagation();
//             onToggleSelect(message.id);
//           }}
//           title={isSelected ? "Unselect" : "Select"}
//         >
//           {isSelected ? <MdCheckCircle className="selection-icon" /> : ""}
//         </div>

//         {showSender && !isOwn && (
//           <div className="sender-name fw-bold">{message.senderName}</div>
//         )}

//         {messageReply && (
//           <div onClick={(e) => { e.stopPropagation(); }}>
//             {renderReplySnippet(messageReply)}
//           </div>
//         )}

//         {message.forwarded && (
//           <div className="forwarded-badge small fst-italic">Forwarded</div>
//         )}

//         {message.type === "image" ? (
//           <img src={message.content} alt="sent-img" className="chat-image" />
//         ) : (
//           <div className="message-text">
//             {isDeletedForEveryone ? (
//               <span className="deleted-message d-flex align-items-center text-muted">
//                 <MdBlockFlipped style={{ marginRight: "4px" }} />
//                 This message was deleted
//               </span>
//             ) : (
//               <>
//                 {renderMessageContent(message)}{" "}
//                 {message.edited && <span className="edited-text">(edited)</span>}
//               </>
//             )}
//           </div>
//         )}

//         <div className="message-footer d-flex align-items-center justify-content-between mt-2">
//           <small className="text-muted message-time">
//             {new Date(message.timestamp).toLocaleTimeString([], {
//               hour: "2-digit",
//               minute: "2-digit",
//             })}
//           </small>

//           {message.pinned && (
//             <MdPushPin
//               title="Pinned message"
//               style={{ marginLeft: 6, fontSize: 16, opacity: 0.85 }}
//               className="text-muted pinned-indicator"
//             />
//           )}

//           <div className="bubble-menu-wrapper" ref={menuRef}>
//             <button
//               className="btn btn-sm btn-light more-btn"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setMenuOpen((s) => !s);
//               }}
//               title="Options"
//             >
//               <MdMoreVert />
//             </button>

//             {menuOpen && (
//               <div className="more-menu shadow-sm">
//                 <button
//                   className="dropdown-item"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setMenuOpen(false);
//                     onReply(message);
//                   }}
//                 >
//                   <MdReply size={16} className="me-2" /> Reply
//                 </button>

//                 <button
//                   className="dropdown-item"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setMenuOpen(false);
//                     if (onForward && typeof onForward === "function")
//                       onForward(message);
//                   }}
//                 >
//                   <TiArrowForward size={16} className="me-2" /> Forward
//                 </button>

//                 {isOwn && !isDeletedForEveryone && (
//                   <button className="dropdown-item" onClick={handleEdit}>
//                     <MdEdit size={16} className="me-2" /> Edit
//                   </button>
//                 )}

//                 {!isDeletedForEveryone && (
//                   <button className="dropdown-item" onClick={handlePinToggle}>
//                     <MdPushPin size={16} className="me-2" />
//                     {message.pinned ? "Unpin message" : "Pin message"}
//                   </button>
//                 )}

//                 <button className="dropdown-item text-danger" onClick={handleDelete}>
//                   <MdDelete size={16} className="me-2" /> Delete
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// MessageItem.jsx

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
  onOpenPollResults, // NEW
  onVotePoll,        // NEW
  onClosePoll,       // NEW
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
      onOpenPollResults={onOpenPollResults}
      onVotePoll={onVotePoll}
      onClosePoll={onClosePoll}
    />
  );
};

// export default MessageItem;


// MessageList.jsx

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
  messageRefs,
  onOpenPollResults, // NEW: handler passed from ChatWindow
  onVotePoll,        // NEW
  onClosePoll,       // NEW (optional)
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
                onOpenPollResults={onOpenPollResults}
                onVotePoll={onVotePoll}
                onClosePoll={onClosePoll}
              />
            </div>
          );
        })
      )}
    </div>
  );
};

// export default MessageList;


// ChatWindow.jsx

// src/components/chat/ChatWindow.jsx (updated imports + added poll UI)
// import React, { useRef, useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   sendMessage,
//   sendImage,
//   clearChat,
//   editMessage,
//   deleteMessage,
//   updateGroupMembers,
//   typingStart,
//   typingStop,
//   forwardMessage,
//   setEditingMessage,
//   createPoll,
//   votePoll,
//   closePoll,
// } from "../features/messages/messagesSlice";
// import MembersModal from "./modals/MembersModal";
// import ForwardModal from "./modals/ForwardModal";
// import MessageSearch from "./search/MessageSearch";
// import ChatInput from "./input/ChatInput";
// import ChatHeader from "./header/ChatHeader";
// import MessageList from "./messages/MessageList";
// import ReplyPreview from "./ReplyPreview";
// import ImagePreview from "./ImagePreview";
// import Swal from "sweetalert2";
// import moment from "moment";
// import PinnedMessages from "./messages/PinnedMessages";


// import PollModal from "./modals/PollModal";
// import PollResultsModal from "./modals/PollResultsModal";
// import PollMessage from "./messages/PollMessage";

// const ChatWindow = ({ currentUser, selectedUser, selectedGroup }) => {
//   const dispatch = useDispatch();

//   const messagesState = useSelector((state) => state.messages || {});
//   const {
//     messages = [],
//     groups = [],
//     onlineUsers = {},
//     lastSeen = {},
//     editingMessage = null,
//     typingUsers = {},
//     pinnedMessages = []
//   } = messagesState;

//   const users = useSelector((state) => (state.usersData && state.usersData.users) ? state.usersData.users : []);

//   // your existing state...
//   const [input, setInput] = useState("");
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//   const [previewFiles, setPreviewFiles] = useState([]);
//   const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
//   const [showMembersModal, setShowMembersModal] = useState(false);
//   const [memberToAdd, setMemberToAdd] = useState(null);

//   const [replyTo, setReplyTo] = useState(null);

//   const [forwardModalOpen, setForwardModalOpen] = useState(false);
//   const [messageToForward, setMessageToForward] = useState(null);

//   const [showSearch, setShowSearch] = useState(false);

//   // polls UI state
//   const [pollModalOpen, setPollModalOpen] = useState(false);
//   const [pollResultsOpen, setPollResultsOpen] = useState(false);
//   const [pollToShow, setPollToShow] = useState(null);

//   const messagesEndRef = useRef(null);
//   const emojiPickerRef = useRef(null);
//   const emojiButtonRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const messageRefs = useRef({});

//   const typingTimerRef = useRef(null);
//   const currentChatKeyRef = useRef(null);

//   useEffect(() => {
//     if (editingMessage) {
//       setInput(editingMessage.content);
//       setReplyTo(null);
//     }
//   }, [editingMessage]);

//   const chatMessages = (messages || []).filter((m) =>
//     selectedUser
//       ? (m.senderId === currentUser?.id && m.receiverId === selectedUser?.id) ||
//       (m.senderId === selectedUser?.id && m.receiverId === currentUser?.id)
//       : selectedGroup
//         ? m.groupId === selectedGroup.id
//         : false
//   );

//   const hasChatMessages = chatMessages.length > 0;
//   const selectionMode = selectedMessageIds.size > 0;

//   useEffect(() => {
//     if (!hasChatMessages) {
//       setSelectedMessageIds(new Set());
//     }
//   }, [hasChatMessages]);

//   const canSendInSelectedGroup = (() => {
//     if (!selectedGroup || !currentUser) return false;
//     const memberIds = (selectedGroup.members || []).map(String);
//     const myId = currentUser.id?.toString();

//     if (!memberIds.includes(myId)) {
//       return false;
//     }

//     if (selectedGroup.isPrivate) {
//       const adminIds = (selectedGroup.admins || []).map(String);
//       return adminIds.includes(myId);
//     }

//     return true;
//   })();

//   const isMemberOfSelectedGroup = (selectedGroup && currentUser)
//     ? (Array.isArray(selectedGroup.members) && selectedGroup.members.map(String).includes(currentUser.id.toString()))
//     : false;


//   // ... existing handleSend, handleImageUpload, emoji etc unchanged (kept as you had)
//   const handleSend = () => {
//     sendTypingStopForCurrentChat();

//     if (editingMessage) {

//       const currentMsg = (messages || []).find(m => m.id === editingMessage.id);
//       if (currentMsg && !currentMsg.deleted && currentMsg.type !== "deleted") {
//         dispatch(editMessage({ id: editingMessage.id, newContent: input }));
//       } else {
//         const msg = {
//           id: Date.now().toString(),
//           senderId: currentUser.id,
//           senderName: currentUser.name,
//           receiverId: selectedUser ? selectedUser.id : null,
//           groupId: selectedGroup ? selectedGroup.id : null,
//           content: input,
//           type: "text",
//           timestamp: new Date().toISOString(),
//           replyTo: replyTo ? {
//             id: replyTo.id,
//             senderId: replyTo.senderId,
//             senderName: replyTo.senderName,
//             content: replyTo.content,
//             type: replyTo.type,
//           } : undefined,
//         };
//         dispatch(sendMessage(msg));
//         dispatch(setEditingMessage(null));
//       }
//       setInput("");
//       return;
//     }

//     if (previewFiles.length > 0) {
//       previewFiles.forEach((fileData) => {
//         const msg = {
//           id: Date.now().toString() + Math.random(),
//           senderId: currentUser.id,
//           senderName: currentUser.name,
//           receiverId: selectedUser ? selectedUser.id : null,
//           groupId: selectedGroup ? selectedGroup.id : null,
//           content: fileData,
//           type: "image",
//           timestamp: new Date().toISOString(),
//           replyTo: replyTo ? {
//             id: replyTo.id,
//             senderId: replyTo.senderId,
//             senderName: replyTo.senderName,
//             content: replyTo.content,
//             type: replyTo.type
//           } : undefined,
//         };
//         dispatch(sendImage(msg));
//       });
//       setPreviewFiles([]);
//       setReplyTo(null);
//       return;
//     }

//     if (!input.trim()) return;
//     const msg = {
//       id: Date.now().toString(),
//       senderId: currentUser.id,
//       senderName: currentUser.name,
//       receiverId: selectedUser ? selectedUser.id : null,
//       groupId: selectedGroup ? selectedGroup.id : null,
//       content: input,
//       type: "text",
//       timestamp: new Date().toISOString(),
//       replyTo: replyTo ? {
//         id: replyTo.id,
//         senderId: replyTo.senderId,
//         senderName: replyTo.senderName,
//         content: replyTo.content,
//         type: replyTo.type
//       } : undefined,
//     };
//     dispatch(sendMessage(msg));
//     setInput("");
//     setShowEmojiPicker(false);
//     setReplyTo(null);
//   };

//   const handleImageUpload = (e) => {
//     const files = Array.from(e.target.files);
//     if (files.length === 0) return;

//     files.forEach((file) => {
//       const reader = new FileReader();
//       reader.onload = () => {
//         setPreviewFiles((prev) => [...prev, reader.result]);
//       };
//       reader.readAsDataURL(file);
//     });
//     e.target.value = "";
//   };

//   const handleEmojiSelect = (emoji) => {
//     setInput((prev) => prev + emoji.native);
//     triggerTypingStart();
//   };

//   const handleClearChat = () => {
//     if (!hasChatMessages) return;

//     Swal.fire({
//       title: "Are you sure you want clear all messages?",
//       text: "This action cannot be undone.",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, clear it!",
//       cancelButtonText: "Cancel",
//     }).then((result) => {
//       if (!result.isConfirmed) return;

//       if (selectedUser) {
//         dispatch(clearChat({ userId: selectedUser.id, currentUserId: currentUser.id }));
//       } else if (selectedGroup) {
//         dispatch(clearChat({ groupId: selectedGroup.id, currentUserId: currentUser.id }));
//       }
//       setSelectedMessageIds(new Set());
//       Swal.fire("Cleared!", "All messages have been cleared.", "success");
//     });
//   };

//   const handleDeleteSelected = () => {
//     const ids = Array.from(selectedMessageIds);
//     if (ids.length === 0) return;

//     Swal.fire({
//       title: `Are you sure you want delete ${ids.length} selected message(s)?`,
//       text: "This action cannot be undone.",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, delete them!",
//       cancelButtonText: "Cancel",
//     }).then((result) => {
//       if (result.isConfirmed) {
//         const TWO_MIN = 2 * 60 * 1000;
//         ids.forEach((id) => {
//           const msg = messages.find((m) => m.id === id);
//           if (!msg) {
//             dispatch(deleteMessage(id));
//             return;
//           }

//           const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
//           const diff = Date.now() - ts;
//           const amISender = currentUser && msg.senderId && currentUser.id.toString() === msg.senderId.toString();

//           if (amISender && ts > 0 && diff < TWO_MIN) {
//             dispatch(deleteMessage({ id: id, forEveryone: true, deletedBy: currentUser?.id || null }))
//           } else {
//             dispatch(deleteMessage({ id: id, forEveryone: false }))
//           }
//         });

//         setSelectedMessageIds(new Set());
//         Swal.fire("Deleted!", "Selected Message(s) deleted.", "success");
//       }
//     });
//   };

//   // ... rest of your existing effects (outside-click, scroll, etc.) remain unchanged
//   useEffect(() => {
//     const handleOutsideClick = (event) => {
//       if (
//         emojiPickerRef.current &&
//         !emojiPickerRef.current.contains(event.target) &&
//         emojiButtonRef.current &&
//         !emojiButtonRef.current.contains(event.target)
//       ) {
//         setShowEmojiPicker(false);
//       }
//     };

//     document.addEventListener("mousedown", handleOutsideClick);
//     return () => document.removeEventListener("mousedown", handleOutsideClick);
//   }, []);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [chatMessages]);

//   // poll helpers
//   const openCreatePoll = () => {
//     setPollModalOpen(true);
//   };

//   const closeCreatePoll = () => {
//     setPollModalOpen(false);
//   };

//   const handleCreatePoll = (pollPayload) => {
//     // dispatch createPoll action -- will emit and push into messages
//     dispatch(createPoll(pollPayload));
//   };

//   const openPollResults = (poll) => {
//     setPollToShow(poll);
//     setPollResultsOpen(true);
//   };

//   const closePollResults = () => {
//     setPollToShow(null);
//     setPollResultsOpen(false);
//   };

//   const handleVote = (pollId, optionId) => {
//     if (!pollId || !optionId || !currentUser) return;
//     dispatch(votePoll({ pollId: pollId.toString(), userId: currentUser.id?.toString(), optionId: optionId.toString() }));
//   };

//   const handleClosePoll = (pollId) => {
//     if (!pollId || !currentUser) return;
//     // only allow group creator/admin to close on UI; server will verify as well
//     dispatch(closePoll({ pollId, userId: currentUser.id }));
//   };

//   // selectedUserOnline / selectedGroupOnlineCount / formatLastSeen etc remain as-is
//   const selectedUserOnline = selectedUser
//     ? !!onlineUsers?.[selectedUser.id?.toString()]
//     : false;

//   const selectedGroupOnlineCount = selectedGroup
//     ? (selectedGroup.members || []).filter((m) => !!onlineUsers?.[m?.toString()]).length
//     : 0;

//   const formatLastSeen = (ts) => {
//     if (!ts) return null;
//     const m = moment(ts);
//     if (!m.isValid()) return null;

//     if (m.isSame(moment(), "day")) {
//       return `Last seen today at ${m.format("h:mm A")}`;
//     } else if (m.isSame(moment().subtract(1, "day"), "day")) {
//       return `Last seen yesterday at ${m.format("h:mm A")}`;
//     } else if (m.isSame(moment(), "year")) {
//       return `Last seen ${m.format("MMMM D [at] h:mm A")}`;
//     } else {
//       return `Last seen ${m.format("MMMM D, YYYY [at] h:mm A")}`;
//     }
//   };

//   const selectedUserLastSeen = selectedUser
//     ? lastSeen?.[selectedUser.id?.toString()]
//     : null;

//   const onToggleSelect = (msgId) => {
//     setSelectedMessageIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(msgId)) {
//         next.delete(msgId);
//       }
//       else {
//         next.add(msgId);
//       }
//       return next;
//     });
//   };

//   const deleteDisabled = !selectionMode && !hasChatMessages;

//   // groupMembers, availableToAdd, handleAddMember, handleRemoveMember, handleLeaveGroup,
//   // scrollToMessage, typing triggers, makeKey effect, handleInputChange, forward modal handlers remain unchanged...
//   // (I intentionally did not modify these handlers other than referencing the new poll UI where needed)

//   let groupMembers = [];
//   if (selectedGroup) {
//     groupMembers = (selectedGroup.members || []).map((memberId) => {
//       const foundUser = users.find((u) => u.id.toString() === memberId.toString());

//       if (foundUser) {
//         return foundUser;
//       }

//       return {
//         id: memberId,
//         name: `User ${memberId}`,
//         avatar: "/User.png",
//       };
//     });
//   }

//   let availableToAdd = [];
//   if (selectedGroup) {
//     availableToAdd = users
//       .filter((u) => {
//         const userId = u.id.toString();

//         const memberIds = (selectedGroup.members || []).map((m) => m.toString());

//         return !memberIds.includes(userId);
//       })
//       .filter((u) => {
//         return u.id.toString() !== currentUser.id.toString();
//       });
//   }

//   const handleAddMember = () => {
//     if (!memberToAdd || !selectedGroup) {
//       return;
//     }

//     const existingMembers = (selectedGroup.members || []).map((m) => m.toString());

//     existingMembers.push(memberToAdd.toString());

//     const newMembers = [];
//     for (let i = 0; i < existingMembers.length; i++) {
//       if (!newMembers.includes(existingMembers[i])) {
//         newMembers.push(existingMembers[i]);
//       }
//     }

//     dispatch(
//       updateGroupMembers({
//         groupId: selectedGroup.id,
//         members: newMembers,
//       })
//     );

//     setMemberToAdd(null);
//   };

//   const handleRemoveMember = (memberId) => {
//     if (!selectedGroup) {
//       return;
//     }

//     const creatorId = selectedGroup.creator ? selectedGroup.creator.toString() : null;

//     const memberIdText = memberId.toString();

//     if (creatorId && creatorId === memberIdText) {
//       Swal.fire("Cannot remove", "The group creator cannot be removed.", "warning");
//       return;
//     }

//     if (!currentUser && currentUser.id.toString() !== creatorId) {
//       Swal.fire("Not allowed", "Only the group creator can remove members.", "warning");
//       return;
//     }

//     Swal.fire({
//       title: "Are you sure?",
//       text: "Do you want to remove this member from the group?",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, remove",
//       cancelButtonText: "Cancel",
//     }).then((result) => {
//       if (!result.isConfirmed) {
//         return;
//       }

//       const members = selectedGroup.members.map((m) => m.toString());

//       const updatedMembers = members.filter((m) => m !== memberIdText);

//       dispatch(
//         updateGroupMembers({
//           groupId: selectedGroup.id,
//           members: updatedMembers,
//         })
//       );

//       Swal.fire("Removed!", "The member has been removed from the group.", "success");
//     })

//   }

//   const handleLeaveGroup = () => {
//     if (!selectedGroup || !currentUser) return;

//     const myId = currentUser.id.toString();
//     const groupCreatorId = selectedGroup.creator ? selectedGroup.creator.toString() : null;

//     if (groupCreatorId && groupCreatorId === myId) {
//       Swal.fire(
//         "Cannot leave",
//         "As the group creator, you cannot leave the group.",
//         "warning"
//       );
//       return;
//     }

//     Swal.fire({
//       title: "Are you sure?",
//       text: "Do you want to leave this group?",
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Yes, leave",
//       cancelButtonText: "Cancel"
//     })
//       .then((result) => {
//         if (!result.isConfirmed) return;

//         const allMembers = (selectedGroup.members || []).map((m) => m.toString());

//         const updatedMembers = allMembers.filter((m) => m !== myId);

//         dispatch(
//           updateGroupMembers({
//             groupId: selectedGroup.id,
//             members: updatedMembers,
//           })
//         );

//         setShowMembersModal(false);

//         Swal.fire("Left group", "You have left the group.", "success");
//       })
//   }

//   const scrollToMessage = (messageId) => {
//     const messageElement = messageRefs.current[messageId];

//     if (messageElement) {
//       messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

//       messageElement.classList.add("message-highlight");

//       setTimeout(() => {
//         messageElement.classList.remove("message-highlight");
//       }, 2000);
//     } else {
//       Swal.fire({
//         icon: "info",
//         title: "Message not available",
//         text: "Original message is not available in this chat.",
//       });
//     }
//   };

//   const triggerTypingStart = () => {
//     if (!currentUser || (!selectedUser && !selectedGroup)) return;

//     const payload = selectedUser
//       ? { type: "user", id: selectedUser.id, userId: currentUser.id, userName: currentUser.name }
//       : { type: "group", id: selectedGroup.id, userId: currentUser.id, userName: currentUser.name };

//     dispatch(typingStart(payload));

//     if (typingTimerRef.current) {
//       clearTimeout(typingTimerRef.current);
//     }
//     typingTimerRef.current = setTimeout(() => {
//       sendTypingStopForCurrentChat();
//     }, 2002);
//   };

//   const sendTypingStopForCurrentChat = () => {
//     if (!currentUser || (!selectedUser && !selectedGroup)) return;

//     const payload = selectedUser
//       ? { type: "user", id: selectedUser.id, userId: currentUser.id }
//       : { type: "group", id: selectedGroup.id, userId: currentUser.id };

//     dispatch(typingStop(payload));

//     if (typingTimerRef.current) {
//       clearTimeout(typingTimerRef.current);
//       typingTimerRef.current = null;
//     }
//   };

//   useEffect(() => {
//     const makeKey = () => {
//       if (selectedUser) return `user:${selectedUser.id?.toString()}`;
//       if (selectedGroup) return `group:${selectedGroup.id?.toString()}`;
//       return null;
//     };
  
//     const prevKey = currentChatKeyRef.current;
//     const newKey = makeKey();
  
//     if (prevKey && prevKey !== newKey && currentUser?.id) {
//       const [type, ...rest] = prevKey.split(":");
//       const id = rest.join(":");
//       if (type && id) {
//         dispatch(typingStop({ type, id, userId: currentUser.id }));
//       }
//     }
  
//     currentChatKeyRef.current = newKey;
  
//     return () => {
//       if (currentUser?.id && newKey) {
//         const [type, ...rest] = newKey.split(":");
//         const id = rest.join(":");
//         if (type && id) {
//           dispatch(typingStop({ type, id, userId: currentUser.id }));
//         }
//       }
//     };
//   }, [selectedUser?.id, selectedGroup?.id, currentUser?.id, dispatch]);
  

//   const handleInputChange = (e) => {
//     setInput(e.target.value);
//     triggerTypingStart();
//   };

//   const openForwardModal = (message) => {
//     setMessageToForward(message);
//     setForwardModalOpen(true);
//   };

//   const closeForwardModal = () => {
//     setMessageToForward(null);
//     setForwardModalOpen(false);
//   }

//   const handleForwardDispatch = ({ message, targets }) => {

//     if (!message || !Array.isArray(targets) || targets.length === 0) return;

//     dispatch(forwardMessage({ message, targets }));
//     closeForwardModal();
//   }

//   const filteredPinned = (pinnedMessages || []).filter((p) => {
//     if (selectedGroup) {
//       return p.groupId && p.groupId.toString() === selectedGroup.id?.toString();
//     } else if (selectedUser) {
//       return !p.groupId && (p.senderId === selectedUser.id || p.senderId === currentUser?.id || p.senderId === null);
//     }
//     return false;
//   });

//   return (
//     <div className="chat-window d-flex flex-column flex-grow-1" style={{ position: "relative" }}>
//       <ChatHeader
//         selectedUser={selectedUser}
//         selectedGroup={selectedGroup}
//         selectedUserOnline={selectedUserOnline}
//         selectedUserLastSeen={selectedUserLastSeen}
//         selectedGroupOnlineCount={selectedGroupOnlineCount}
//         typingUsers={typingUsers}
//         currentUser={currentUser}
//         deleteDisabled={deleteDisabled}
//         selectionMode={selectionMode}
//         selectedMessageIds={selectedMessageIds}
//         handleDeleteSelected={handleDeleteSelected}
//         handleClearChat={handleClearChat}
//         onSearchToggle={() => setShowSearch(true)}
//         onMembersToggle={() => setShowMembersModal(true)}
//         onDeleteClick={handleDeleteSelected}
//         setShowSearch={setShowSearch}
//         setShowMembersModal={setShowMembersModal}
//         formatLastSeen={formatLastSeen}
//       />

//       <MessageSearch
//         show={showSearch}
//         onClose={() => setShowSearch(false)}
//         chatMessages={chatMessages}
//         users={users}
//         onJumpToMessage={scrollToMessage}
//         currentUser={currentUser}
//       />

//       {filteredPinned.length > 0 && (
//         <PinnedMessages
//           pinnedMessages={filteredPinned}
//           onJumpToMessage={scrollToMessage}
//         />
//       )}

//       <div className="messages flex-grow-1 p-3 overflow-auto">
//         <MessageList
//           chatMessages={chatMessages}
//           currentUser={currentUser}
//           selectedMessageIds={selectedMessageIds}
//           selectionMode={selectionMode}
//           onToggleSelect={onToggleSelect}
//           onReply={(m) =>
//             setReplyTo({
//               id: m.id,
//               senderId: m.senderId,
//               senderName: m.senderName,
//               content: m.content,
//               type: m.type,
//             })
//           }
//           onJumpToMessage={scrollToMessage}
//           onForward={openForwardModal}
//           messageRefs={messageRefs}
//           // optional: pass poll handlers so MessageList or message renderer can use them
//           onOpenPollResults={(poll) => openPollResults(poll)}
//           onVotePoll={(pollId, optionId) => handleVote(pollId, optionId)}
//         />
//         <div ref={messagesEndRef} />
//       </div>

//       {selectedGroup && !isMemberOfSelectedGroup ? (
//         <div className="p-3 text-center text-muted border-top">
//           You are no longer a member of this group. You cannot send messages.
//         </div>
//       ) : selectedGroup && isMemberOfSelectedGroup && !canSendInSelectedGroup ? (
//         <div className="p-3 text-center text-muted border-top">
//           Only group admins can send messages.
//         </div>
//       ) : (
//         <>
//           <ReplyPreview replyTo={replyTo} cancelReply={() => setReplyTo(null)} />
//           <ImagePreview previewFiles={previewFiles} setPreviewFiles={setPreviewFiles} />

//           {/* Poll create button (visible when chat is active and user can send) */}
//           <div className="p-2 border-top d-flex align-items-center gap-2">
//             <div style={{ flex: 1 }}>
//               <ChatInput
//                 input={input}
//                 setInput={setInput}
//                 showEmojiPicker={showEmojiPicker}
//                 setShowEmojiPicker={setShowEmojiPicker}
//                 emojiButtonRef={emojiButtonRef}
//                 emojiPickerRef={emojiPickerRef}
//                 handleEmojiSelect={handleEmojiSelect}
//                 fileInputRef={fileInputRef}
//                 handleImageUpload={handleImageUpload}
//                 handleSend={handleSend}
//                 handleInputChange={handleInputChange}
//                 selectedGroup={selectedGroup}
//                 groupMembers={groupMembers}
//               />
//             </div>

//             {/* Create Poll button */}
//             <div>
//               <button
//                 className="btn btn-outline-primary"
//                 onClick={() => openCreatePoll()}
//                 disabled={!(selectedGroup ? canSendInSelectedGroup : true)}
//                 title="Create poll"
//               >
//                 Create Poll
//               </button>
//             </div>
//           </div>
//         </>
//       )}

//       <MembersModal
//         show={showMembersModal}
//         onClose={() => setShowMembersModal(false)}
//         selectedGroup={selectedGroup}
//         currentUser={currentUser}
//         users={users}
//         onlineUsers={onlineUsers}
//         lastSeen={lastSeen}
//         memberToAdd={memberToAdd}
//         setMemberToAdd={setMemberToAdd}
//         handleAddMember={handleAddMember}
//         handleRemoveMember={handleRemoveMember}
//         handleLeaveGroup={handleLeaveGroup}
//         formatLastSeen={formatLastSeen}
//       />

//       <ForwardModal
//         show={forwardModalOpen}
//         onClose={closeForwardModal}
//         message={messageToForward}
//         users={users}
//         groups={groups}
//         onForward={handleForwardDispatch}
//       />

//       {/* Poll modals */}
//       <PollModal
//         show={pollModalOpen}
//         onClose={closeCreatePoll}
//         onCreate={handleCreatePoll}
//         currentUser={currentUser}
//         selectedGroup={selectedGroup}
//         selectedUser={selectedUser}
//       />

//       <PollResultsModal
//         show={pollResultsOpen}
//         onClose={closePollResults}
//         poll={pollToShow}
//         currentUserId={currentUser?.id}
//         onVote={(pollId, optionId) => handleVote(pollId, optionId)}
//       />
//     </div>
//   );
// };

// export default ChatWindow;


// ChatSidebar.jsx

// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import CreateGroupModal from "./modals/CreateGroupModal";
// import moment from "moment";
// import { FiChevronDown, FiChevronRight } from "react-icons/fi";
// import { setActiveChat } from "../features/messages/messagesSlice";

// const ChatSidebar = ({ users, selectedUserId, onSelectUser, onSelectGroup, currentUser }) => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const { groups, messages, unreadCounts, onlineUsers } = useSelector(
//     (state) => state.messages
//   );
//   const [showModal, setShowModal] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");

//   const [showUsers, setShowUsers] = useState(true);
//   const [showGroups, setShowGroups] = useState(true);

//   const handleSelectUser = (u) => {
//     if (!u) return;
//     dispatch(setActiveChat({ type: "user", id: u.id }));
//     navigate(`/chat?type=user&id=${u.id}`);
//   };

//   const handleSelectGroup = (g) => {
//     if (!g) return;
//     dispatch(setActiveChat({ type: "group", id: g.id }));
//     navigate(`/chat?type=group&id=${g.id}`);
//   }

//   const getLastMessageTime = (id, isGroup = false) => {
//     if (!messages || messages.length === 0) return 0;

//     const chatMessages = messages.filter((m) =>
//       isGroup
//         ? m.groupId === id
//         : !m.groupId && 
//         (
//           (m.senderId === currentUser?.id && m.receiverId === id) ||
//           (m.senderId === id && m.receiverId === currentUser?.id)
//         )
//     );
//     if (chatMessages.length === 0) return 0;
//     return new Date(chatMessages[chatMessages.length - 1].timestamp).getTime();
//   };

//   const getLastMessage = (id, isGroup = false) => {
//     if (!messages || messages.length === 0) return null;

//     const chatMessages = messages.filter((m) =>
//       isGroup
//         ? m.groupId === id
//         : !m.groupId && 
//         (
//           (m.senderId === currentUser?.id && m.receiverId === id) ||
//           (m.senderId === id && m.receiverId === currentUser?.id)
//         )
//     );
//     if (chatMessages.length === 0) return null;
//     return chatMessages[chatMessages.length - 1];
//   };

//   // Helper: create a safe string preview for different message types (handles poll objects)
//   const getMessagePreviewText = (lastMsg) => {
//     if (!lastMsg) return null;

//     // image shorthand
//     if (lastMsg.type === "image") return "Image";

//     // poll: content may be object with question
//     if (lastMsg.type === "poll") {
//       const c = lastMsg.content;
//       if (c && typeof c === "object" && c.question) return c.question;
//       return "Poll";
//     }

//     const content = lastMsg.content;

//     // primitive (string/number)
//     if (typeof content === "string" || typeof content === "number") {
//       return String(content);
//     }

//     // object (attachment/structured content)
//     if (content && typeof content === "object") {
//       // common fallback fields
//       if (content.text && typeof content.text === "string") return content.text;
//       if (content.caption && typeof content.caption === "string") return content.caption;
//       // as last resort, show a friendly label
//       return "[Attachment]";
//     }

//     // fallback
//     return "";
//   };

//   const safeTruncate = (str, n) => {
//     if (!str) return str;
//     if (typeof str !== "string") return String(str);
//     return str.length > n ? str.slice(0, n) + "..." : str;
//   };

//   const sortedUsers = [...users].sort(
//     (a, b) => getLastMessageTime(b.id) - getLastMessageTime(a.id)
//   );
//   const sortedGroups = [...groups].sort(
//     (a, b) => getLastMessageTime(b.id, true) - getLastMessageTime(a.id, true)
//   );

//   const filteredUsers = sortedUsers.filter((u) =>
//     u.name.toLowerCase().includes(searchTerm.toLowerCase())
//   );
//   const filteredGroups = sortedGroups.filter((g) =>
//     g.name.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const formatChatTime = (timestamp) => {
//     if (!timestamp) return "";
//     const msgDate = moment(timestamp);
//     const today = moment().startOf("day");
//     const yesterday = moment().subtract(1, "day").startOf("day");

//     if (msgDate.isSame(today, "day")) {
//       return msgDate.format("HH:mm");
//     } else if (msgDate.isSame(yesterday, "day")) {
//       return "Yesterday";
//     } else {
//       return msgDate.format("MMM D YY");
//     }
//   }

//   return (
//     <div className="chat-sidebar border-end">
//       <div className="chat-group d-flex justify-content-between align-items-center p-3 border-bottom">
//         <h5>Chats</h5>
//         <button className="btn btn-sm btn-success" onClick={() => setShowModal(true)}>
//           + Group
//         </button>
//       </div>

//       <div className="p-2 border-bottom">
//         <input 
//           type="text"
//           className="form-control"
//           placeholder="search..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)} 
//         />
//       </div>

//       <h6
//         className="px-3 mt-3 text-muted d-flex justify-content-between align-items-center"
//         style={{ cursor: "pointer" }}
//         onClick={() => setShowUsers(!showUsers)}
//       >
//         <span className="d-flex align-items-center gap-1">
//           {showUsers ? <FiChevronDown /> : <FiChevronRight />} Users ({filteredUsers.length})
//         </span>
//       </h6>

//       {showUsers && (
//         <ul className="list-group list-group-flush">
//           {filteredUsers.map((u) => {
//             const lastMsg = getLastMessage(u.id);
//             const isOnline = !!onlineUsers?.[u.id?.toString()];

//             const preview = getMessagePreviewText(lastMsg);
//             const previewDisplay = preview ? safeTruncate(preview, 10) : "No messages yet";

//             return (
//               <li
//                 key={u.id}
//                 className={`list-group-item list-group-item-action ${selectedUserId === u.id ? "active" : ""
//                   }`}
//                 onClick={() => handleSelectUser(u)}
//                 style={{ cursor: "pointer" }}
//               >
//                 <div className="d-flex align-items-center justify-content-between">
//                   <div className="d-flex align-items-center">
//                     <div className="presence-avatar me-2">
//                       <img
//                         src={u.avatar || "/User.png"}
//                         alt={u.name}
//                         className="rounded-circle avatar-img"
//                         width="40"
//                         height="40"
//                         onError={(e) => {
//                           e.target.onError = null;
//                           e.target.src = "/User.png";
//                         }}
//                       />
//                       <span
//                         className={`presence-dot ${isOnline ? "online" : "offline"}`}
//                         title={isOnline ? "Online" : "Offline"}
//                       />
//                     </div>

//                     <div>
//                       <div className="fw-bold">{u.name}</div>
//                       <div className="d-flex flex-column">
//                         <small className="text-muted last-msg">
//                           {previewDisplay}
//                         </small>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="text-end">
//                     {lastMsg && (
//                       <small className="text-muted d-block">
//                         {formatChatTime(lastMsg.timestamp)}
//                       </small>
//                     )}
//                     {(unreadCounts?.[u.id] ?? 0) > 0 && (
//                       <span className="badge bg-success rounded-pill">
//                         {unreadCounts[u.id]}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </li>
//             );
//           })}
//         </ul>
//       )}

//       <h6
//         className="px-3 mt-3 text-muted d-flex justify-content-between align-items-center"
//         style={{ cursor: "pointer" }}
//         onClick={() => setShowGroups(!showGroups)}
//       >
//         <span className="d-flex align-items-center gap-1">
//           {showGroups ? <FiChevronDown /> : <FiChevronRight />} Groups ({filteredGroups.length})
//         </span>
//       </h6>

//       {showGroups && (
//         <ul className="list-group list-group-flush">
//           {filteredGroups.map((g) => {
//             const lastMsg = getLastMessage(g.id, true);
//             const onlineCount = (g.members || []).filter((m) => !!onlineUsers?.[m?.toString()]).length;

//             const preview = getMessagePreviewText(lastMsg);
//             const previewDisplay = preview ? safeTruncate(preview, 10) : "No messages yet";

//             return (
//               <li
//                 key={g.id}
//                 className="list-group-item list-group-item-action"
//                 onClick={() => handleSelectGroup(g)}
//                 style={{ cursor: "pointer" }}
//               >
//                 <div className="d-flex align-items-center justify-content-between">
//                   <div className="d-flex align-items-center">
//                     <div className="presence-avatar me-2">
//                       <img
//                         src={g.avatar || "/Group.png"}
//                         alt={g.name}
//                         className="rounded-circle avatar-img"
//                         width="40"
//                         height="40"
//                         onError={(e) => {
//                           e.target.onError = null;
//                           e.target.src = "/Group.png";
//                         }}
//                       />
//                       <span
//                         className={`presence-dot group-badge ${onlineCount > 0 ? "online" : "offline"}`}
//                         title={onlineCount > 0 ? `${onlineCount} online` : "No one online"}
//                       >
//                         {onlineCount > 0 ? onlineCount : ""}
//                       </span>
//                     </div>

//                     <div>
//                       <div className="fw-bold">{g.name}</div>
//                       <small className="text-muted">
//                         {previewDisplay}
//                       </small>
//                     </div>
//                   </div>
//                   <div className="text-end">
//                     {lastMsg && (
//                       <small className="text-muted d-block">
//                         {formatChatTime(lastMsg.timestamp)}
//                       </small>
//                     )}
//                     {(unreadCounts?.[g.id] ?? 0) > 0 && (
//                       <span className="badge bg-success rounded-pill">
//                         {unreadCounts[g.id]}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </li>
//             );
//           })}
//         </ul>
//       )}

//       <CreateGroupModal
//         show={showModal}
//         onClose={() => setShowModal(false)}
//         users={users}
//         currentUser={currentUser}
//       />
//     </div>
//   );
// };

// export default ChatSidebar;
