// Disapper message functionality

// server.js

// server.js (modified)
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
const groups = {}; // in-memory store for groups, keyed by group.id

// new: store disappearing settings keyed by "user:<id>" or "group:<id>"
const disappearingSettings = {}; // e.g. { "user:123": { enabled: true, durationSeconds: 86400 }, ... }

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

  // also send current disappearing settings so clients can sync
  socket.emit("disappearing:init", disappearingSettings);

  // Helper: safely normalize group admins/members to string arrays
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
            // refuse: inform the sender
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

      // Broadcast normally
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
      // merge/update existing
      const prev = groups[g.id] || {};
      const merged = {
        ...prev,
        ...g,
        members: Array.isArray(g.members) ? g.members.map(String) : (prev.members || []).map(String),
        admins: Array.isArray(g.admins) ? g.admins.map(String) : (prev.admins || []).map(String),
        isPrivate: !!g.isPrivate,
      };
      // ensure admins are subset of members
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

  // presence handlers
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

  // typing handlers (unchanged)
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

  // new: handle clients setting disappearing messages for a chat
  // payload: { type: "user"|"group", id: "<id>", durationSeconds: number|null }
  socket.on("chat:setDisappearing", (payload) => {
    try {
      if (!payload || !payload.type || payload.id == null) return;
      const key = `${payload.type}:${payload.id.toString()}`;
      if (!payload.durationSeconds || payload.durationSeconds <= 0) {
        delete disappearingSettings[key];
      } else {
        disappearingSettings[key] = {
          enabled: true,
          durationSeconds: Number(payload.durationSeconds),
          updatedAt: new Date().toISOString(),
        };
      }
      // broadcast to all clients so they can update UI/state
      io.emit("chat:disappearing:update", { key, setting: disappearingSettings[key] || null });
      console.log(`[SERVER] disappearing setting updated for ${key}`, disappearingSettings[key] || null);
    } catch (err) {
      console.error("chat:setDisappearing error", err);
    }
  });

  // when a client disconnects
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
