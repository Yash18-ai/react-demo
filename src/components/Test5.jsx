// Delete Group Functionality code

// const express = require("express");
// const http = require("http");
// const cors = require("cors");
// const { Server } = require("socket.io");

// const app = express();

// app.use(cors());

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "http://192.168.1.98:3000",
//     methods: ["GET", "POST"],
//   },
// });

// const onlineUsers = {};
// const socketUserMap = {};
// const lastSeen = {};

// io.on("connection", (socket) => {
//   console.log("Socket connected:", socket.id);

//   const allUserIds = new Set([
//     ...Object.keys(onlineUsers),
//     ...Object.keys(lastSeen),
//   ]);

//   const presenceList = Array.from(allUserIds).map((id) => ({
//     userId: id,
//     online: !!onlineUsers[id],
//     lastSeen: lastSeen[id] || null,
//   }));

//   socket.emit("presence:init", presenceList);

//   socket.on("chat:message", (msg) => {
//     io.emit("chat:message", msg);
//   });

//   socket.on("chat:image", (msg) => {
//     io.emit("chat:image", msg);
//   });

//   socket.on("group:create", (group) => {
//     io.emit("group:create", group);
//   });

//   socket.on("group:update", (group) => {
//     io.emit("group:update", group);
//   });

//   // Handle group delete and broadcast to everyone
//   socket.on("group:delete", (payload) => {
//     // payload expected: { id: groupId, deletedBy: userId }
//     console.log("group:delete received:", payload);
//     io.emit("group:delete", payload);
//   });

//   socket.on("chat:delete", (msgId) => {
//     io.emit("chat:delete", msgId);
//   });

//   socket.on("chat:edit", (payload) => {
//     io.emit("chat:edit", payload);
//   });

//   socket.on("presence:online", (userId) => {
//     if (!userId) return;
//     const uid = userId.toString();

//     socketUserMap[socket.id] = uid;
//     onlineUsers[uid] = true;
//     lastSeen[uid] = null;

//     io.emit("presence:update", { userId: uid, online: true, lastSeen: null });
//     console.log(`User ${uid} is online`);
//   });

//   socket.on("presence:offline", (userId) => {
//     if (!userId) return;
//     const uid = userId.toString();

//     const ts = new Date().toISOString();
//     lastSeen[uid] = ts;
//     if (onlineUsers[uid]) delete onlineUsers[uid];

//     for (const sid of Object.keys(socketUserMap)) {
//       if (socketUserMap[sid] === uid) {
//         delete socketUserMap[sid];
//       }
//     }

//     io.emit("presence:update", { userId: uid, online: false, lastSeen: ts });
//     console.log(`User ${uid} is offline (manual)`);
//   });

//   socket.on("disconnect", () => {
//     console.log("Socket disconnected:", socket.id);
//     const userId = socketUserMap[socket.id];
//     if (userId) {
//       delete socketUserMap[socket.id];

//       const ts = new Date().toISOString();
//       lastSeen[userId] = ts;
//       if (onlineUsers[userId]) delete onlineUsers[userId];

//       io.emit("presence:update", { userId: userId.toString(), online: false, lastSeen: ts });
//       console.log(`User ${userId} is offline (disconnect)`);
//     }
//   });
// });

// const PORT = process.env.PORT || 5001;
// server.listen(PORT, () => {
//   console.log(`Socket.IO server running on http://localhost:${PORT}`);
// });
// // features/messages/messagesSlice.js
// import { createSlice } from "@reduxjs/toolkit";
// import { io } from "socket.io-client";

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://192.168.1.98:5001";
// const socket = io(SOCKET_URL, { transports: ["websocket"] });

// function showNotification(message) {
//   if (!("Notification" in window)) return;

//   if (Notification.permission === "granted") {
//     let options = {
//       icon: "/User.png",
//       requireInteraction: true,
//     };

//     if (message.type === "image") {
//       options.body = `${message.senderName} sent an image`;
//       options.image = message.content;
//     } else {
//       options.body = message.content;
//     }

//     const notif = new Notification(message.senderName || "New Message", options);

//     notif.onclick = () => {
//       notif.close();

//       if (document.visibilityState === "hidden") {
//         window.focus();
//       }

//       if (message.groupId) {
//         window.location.href = `/chat?type=group&id=${message.groupId}`;
//       } else {
//         window.location.href = `/chat?type=user&id=${message.senderId}`;
//       }
//     };
//   }
// }

// const initialState = {
//   messages: [],
//   groups: [],
//   unreadCounts: {},
//   currentUserId: null,
//   activeChat: null,
//   onlineUsers: {},
//   lastSeen: {},
//   editingMessage: null,
// };

// const messagesSlice = createSlice({
//   name: "messages",
//   initialState,
//   reducers: {
//     sendMessage: (state, action) => {
//       socket.emit("chat:message", action.payload);
//     },

//     sendImage: (state, action) => {
//       socket.emit("chat:image", action.payload);
//     },

//     receiveMessage: (state, action) => {
//       const payload = action.payload;
//       if (!payload) return;

//       const { senderId, groupId } = payload;

//       if (groupId) {
//         const group = state.groups.find((g) => g.id === groupId);
//         const currentUid = state.currentUserId ? state.currentUserId.toString() : null;

//         if (!group || !currentUid || !(Array.isArray(group.members) && group.members.map(String).includes(currentUid))) {
//           return;
//         }

//         if (group.deletedLocally) {
//           group.deletedLocally = false;
//         }
//       }

//       state.messages.push(payload);

//       if (state.currentUserId != null) {
//         if (groupId) {
//           if (senderId !== state.currentUserId && !(state.activeChat?.type === "group" && state.activeChat.id === groupId)) {
//             state.unreadCounts[groupId] = (state.unreadCounts[groupId] || 0) + 1;
//           }
//         } else {
//           if (senderId !== state.currentUserId && !(state.activeChat?.type === "user" && state.activeChat.id === senderId)) {
//             state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
//           }
//         }
//       }

//       if (
//         state.currentUserId != null &&
//         payload.senderId !== state.currentUserId &&
//         !(
//           (state.activeChat?.type === "user" && state.activeChat.id === senderId) ||
//           (state.activeChat?.type === "group" && state.activeChat.id === groupId)
//         )
//       ) {
//         showNotification(payload);
//       }
//     },

//     receiveImage: (state, action) => {
//       const payload = action.payload;
//       if (!payload) return;

//       const { senderId, groupId } = payload;

//       if (groupId) {
//         const group = state.groups.find((g) => g.id === groupId);
//         const currentUid = state.currentUserId ? state.currentUserId.toString() : null;

//         if (!group || !currentUid || !(Array.isArray(group.members) && group.members.map(String).includes(currentUid))) {
//           return;
//         }

//         if (group.deletedLocally) {
//           group.deletedLocally = false;
//         }
//       }

//       state.messages.push(payload);

//       if (state.currentUserId != null) {
//         if (groupId) {
//           if (senderId !== state.currentUserId &&
//             !(state.activeChat?.type === "group" &&
//               state.activeChat.id === groupId)) {
//             state.unreadCounts[groupId] = (state.unreadCounts[groupId] || 0) + 1;
//           }
//         } else {
//           if (senderId !== state.currentUserId &&
//             !(state.activeChat?.type === "user" &&
//               state.activeChat.id === senderId)) {
//             state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
//           }
//         }
//       }

//       if (
//         state.currentUserId != null &&
//         payload.senderId !== state.currentUserId &&
//         !(
//           (state.activeChat?.type === "user" && state.activeChat.id === senderId) ||
//           (state.activeChat?.type === "group" && state.activeChat.id === groupId)
//         )
//       ) {
//         showNotification(payload);
//       }
//     },

//     editMessage: (state, action) => {
//       const { id, newContent } = action.payload;
//       const msg = state.messages.find((m) => m.id === id);
//       if (msg) {
//         msg.content = newContent;
//         msg.edited = true;

//         socket.emit("chat:edit", {
//           ...msg,
//           content: newContent,
//           edited: true,
//         });
//       }
//       state.editingMessage = null;
//     },

//     editMessageRemote: (state, action) => {
//       const updatedMsg = action.payload;
//       const msg = state.messages.find((m) => m.id === updatedMsg.id);
//       if (msg) {
//         msg.content = updatedMsg.content;
//         msg.edited = updatedMsg.edited;
//       }
//     },

//     setEditingMessage: (state, action) => {
//       state.editingMessage = action.payload;
//     },

//     markAsRead: (state, action) => {
//       const chatId = action.payload;
//       state.unreadCounts[chatId] = 0;
//     },

//     setActiveChat: (state, action) => {
//       state.activeChat = action.payload;
//       if (action.payload) {
//         state.unreadCounts[action.payload.id] = 0;
//       }
//     },

//     createGroup: (state, action) => {
//       const newGroup = action.payload;
//       if (!state.groups.some((g) => g.id === newGroup.id)) {
//         state.groups.push({ ...newGroup, deletedLocally: false });
//       }
//       socket.emit("group:create", newGroup);
//     },

//     receiveGroup: (state, action) => {
//       const exists = state.groups?.some((g) => g.id === action.payload.id);
//       if (!exists) {
//         state.groups.push({ ...action.payload, deletedLocally: false });
//       }
//     },

//     updateGroupMembers: (state, action) => {
//       const { groupId, members, creator } = action.payload;
//       if(!groupId) return;

//       const gIndex = state.groups.findIndex((g) => g.id === groupId)
//       if(gIndex === -1) return;

//       const updatedGroup = {
//         ...state.groups[gIndex],
//         members: Array.from(new Set(members.map((m) => m.toString()))),
//       };

//       if (creator !== undefined) {
//         updatedGroup.creator = creator;
//       }

//       state.groups[gIndex] = updatedGroup;
//       socket.emit("group:update", updatedGroup);
//     },

//     receiveGroupUpdate: (state, action) => {
//       const updatedGroup = action.payload;
//       if (!updatedGroup || !updatedGroup.id) return;

//       const index = state.groups.findIndex((g) => g.id === updatedGroup.id);

//       if (index === -1) {
//         state.groups.push({ ...updatedGroup, deletedLocally: false });
//       } else {
//         state.groups[index] = { ...state.groups[index], ...updatedGroup };

//         const updatedG = state.groups[index];

//         if (updatedG.members.length === 0) {
//           state.groups.splice(index, 1);
//           state.messages = state.messages.filter((m) => m.groupId !== updatedG.id);

//           if (state.activeChat?.type === "group" && state.activeChat.id === updatedG.id) {
//             state.activeChat = null;
//           }

//           if (state.unreadCounts[updatedG.id]) {
//             delete state.unreadCounts[updatedG.id];
//           }
//           return;
//         }

//         const currentUid = state.currentUserId ? state.currentUserId.toString() : null;
//         if (currentUid && !updatedG.members.map(String).includes(currentUid) &&
//           state.activeChat?.type === "group" && state.activeChat.id === updatedG.id) {
//           state.activeChat = null;
//         }
//       }
//     },

//     // Delete group (forEveryone true => emit; false => local delete)
//     deleteGroup: (state, action) => {
//       const payload = action.payload || {};
//       const groupId = payload.groupId || payload.id;
//       const forEveryone = !!payload.forEveryone;
//       const deletedBy = payload.deletedBy || null;

//       if (!groupId) return;

//       if (forEveryone) {
//         state.groups = state.groups.filter((g) => g.id !== groupId);
//         state.messages = state.messages.filter((m) => m.groupId !== groupId);

//         if (state.activeChat?.type === "group" && state.activeChat.id === groupId) {
//           state.activeChat = null;
//         }

//         // Remove unread count
//         if (state.unreadCounts[groupId]) {
//           delete state.unreadCounts[groupId];
//         }

//         socket.emit("group:delete", { id: groupId, deletedBy });
//       } else {
//         // delete locally only
//         const index = state.groups.findIndex((g) => g.id === groupId);
//         if (index === -1) return;

//         state.groups[index].deletedLocally = true;
//         state.messages = state.messages.filter((m) => m.groupId !== groupId);

//         if (state.activeChat?.type === "group" && state.activeChat.id === groupId) {
//           state.activeChat = null;
//         }

//         if (state.unreadCounts[groupId]) {
//           delete state.unreadCounts[groupId];
//         }
//       }
//     },

//     // When someone else (or the creator) deletes a group, all clients receive this and remove group+messages
//     receiveGroupDelete: (state, action) => {
//       const payload = action.payload || {};
//       const groupId = payload.id || payload.groupId;
//       if (!groupId) return;

//       state.groups = state.groups.filter((g) => g.id !== groupId);
//       state.messages = state.messages.filter((m) => m.groupId !== groupId);

//       if (state.activeChat?.type === "group" && state.activeChat.id === groupId) {
//         state.activeChat = null;
//       }

//       if (state.unreadCounts[groupId]) {
//         delete state.unreadCounts[groupId];
//       }
//     },

//     setCurrentUser: (state, action) => {
//       state.currentUserId = action.payload;
//       if (action.payload) {
//         socket.emit("presence:online", action.payload);
//       }
//     },

//     setUserOffline: (state, action) => {
//       const userId = action.payload || state.currentUserId;

//       if (userId) {
//         socket.emit("presence:offline", userId);
//       }
//       state.currentUserId = null;

//       if (userId && state.onlineUsers[userId]) {
//         delete state.onlineUsers[userId];
//       }

//       if (userId) {
//         state.lastSeen = {
//           ...state.lastSeen,
//           [userId.toString()]: new Date().toISOString()
//         };
//       }
//     },

//     deleteMessage: (state, action) => {
//       const data = action.payload;
//       let messageId = null;
//       let deleteForEveryone = false;
//       let deletedBy = null;

//       if (typeof data === "string") {
//         messageId = data;
//       } else if (typeof data === "object" && data !== null) {
//         messageId = data.id;
//         deleteForEveryone = !!data.forEveryone;
//         deletedBy = data.deletedBy || null;
//       } else {
//         return;
//       }

//       if (!messageId) return;

//       if (deleteForEveryone) {
//         const msg = state.messages.find((m) => m.id === messageId);

//         if (msg) {
//           msg.type = "deleted";
//           msg.deleted = true;
//           msg.deletedBy = deletedBy;
//         }

//         socket.emit("chat:delete", {
//           id: messageId,
//           forEveryone: true,
//           deletedBy: deletedBy,
//         });
//       } else {
//         state.messages = state.messages.filter((m) => m.id !== messageId);
//       }
//     },

//     deleteMessageRemote: (state, action) => {
//       const data = action.payload;
//       if (!data) return;

//       if (typeof data === "string") {
//         const messageId = data;

//         const msg = state.messages.find((m) => m.id === messageId);

//         if (msg) {
//           msg.type = "deleted";
//           msg.deleted = true;
//           msg.deletedBy = null;
//         }
//         return;
//       }

//       const messageId = data.id;
//       const deleteForEveryone = data.forEveryone;
//       const deletedBy = data.deletedBy || null;

//       if (!messageId) return;

//       if (deleteForEveryone) {
//         const msg = state.messages.find((m) => m.id === messageId);

//         if (msg) {
//           msg.type = "deleted";
//           msg.deleted = true;
//           msg.deletedBy = deletedBy;
//         }
//       }
//     },

//     clearChat: (state, action) => {
//       const { userId, groupId, currentUserId } = action.payload;
//       const filteredMessages = state.messages.filter((m) => {
//         if (groupId) {
//           return m.groupId !== groupId;
//         } else if (userId) {
//           return (
//             !(m.senderId === userId && m.receiverId === currentUserId) &&
//             !(m.senderId === currentUserId && m.receiverId === userId)
//           );
//         }
//         return true;
//       });
//       state.messages = filteredMessages;
//     },

//     setPresenceList: (state, action) => {
//       const list = action.payload || [];
//       state.onlineUsers = {};
//       state.lastSeen = {};

//       if (Array.isArray(list) && list.length > 0 && typeof list[0] === "object") {
//         list.forEach((p) => {
//           const uid = p.userId?.toString();
//           if (!uid) return;

//           if (p.online) {
//             state.onlineUsers[uid] = true;
//             state.lastSeen[uid] = null;
//           } else if (p.lastSeen) {
//             state.lastSeen[uid] = p.lastSeen;
//           } else {
//             state.lastSeen[uid] = null;
//           }
//         });
//       } else {
//         list.forEach((id) => {
//           state.onlineUsers[id.toString()] = true;
//         });
//       }
//     },

//     receivePresenceUpdate: (state, action) => {
//       const { userId, online, lastSeen: ls } = action.payload || {};
//       if (!userId) return;
//       const uid = userId.toString();
//       if (online) {
//         state.onlineUsers[uid] = true;
//         state.lastSeen[uid] = null;
//       } else {
//         if (state.onlineUsers[uid]) {
//           delete state.onlineUsers[uid];
//         }
//         if (ls) {
//           state.lastSeen[uid] = ls;
//         } else {
//           state.lastSeen[uid] = new Date().toISOString();
//         }
//       }
//     },
//   }
// });

// export const {
//   sendMessage,
//   sendImage,
//   receiveMessage,
//   receiveImage,
//   editMessage,
//   editMessageRemote,
//   setEditingMessage,
//   markAsRead,
//   createGroup,
//   receiveGroup,
//   updateGroupMembers,
//   receiveGroupUpdate,
//   setCurrentUser,
//   setUserOffline,
//   deleteMessage,
//   deleteMessageRemote,
//   setActiveChat,
//   clearChat,
//   setPresenceList,
//   receivePresenceUpdate,
//   // newly exported
//   deleteGroup,
//   receiveGroupDelete
// } = messagesSlice.actions;

// export default messagesSlice.reducer;

// export const initSocket = (store) => {
//   socket.on("connect", () => {
//     console.log("Connected to socket server:", socket.id);
//     if (Notification.permission === "default") {
//       Notification.requestPermission();
//     }

//     const state = store.getState();
//     const currentUserId = state.messages.currentUserId;
//     if (currentUserId) {
//       socket.emit("presence:online", currentUserId);
//     }
//   });

//   socket.on("chat:message", (msg) => {
//     store.dispatch(receiveMessage(msg));
//   });

//   socket.on("chat:image", (msg) => {
//     store.dispatch(receiveImage(msg));
//   });

//   socket.on("group:create", (group) => {
//     store.dispatch(receiveGroup(group));
//   });

//   socket.on("group:update", (group) =>{
//     store.dispatch(receiveGroupUpdate(group));
//   });

//   // IMPORTANT: listen to group:delete and dispatch receiveGroupDelete
//   socket.on("group:delete", (payload) => {
//     console.log("socket received group:delete ->", payload);
//     store.dispatch(receiveGroupDelete(payload));
//   });

//   socket.on("chat:delete", (msgId) => {
//     store.dispatch(deleteMessageRemote(msgId));
//   });

//   socket.on("chat:edit", (payload) => {
//     store.dispatch(editMessageRemote(payload));
//   });

//   socket.on("presence:init", (list) => {
//     store.dispatch(setPresenceList(list));
//   });

//   socket.on("presence:update", (payload) => {
//     store.dispatch(receivePresenceUpdate(payload));
//   });

//   socket.on("disconnect", () => {
//     console.log("Socket disconnected");
//   });

//   window.addEventListener("beforeunload", () => {
//     const state = store.getState();
//     const currentUserId = state.messages.currentUserId;

//     if (currentUserId) {
//       socket.emit("presence:offline", currentUserId);
//     }
//   });
// };
// // components/ChatWindow.jsx (updated)
// import React, { useRef, useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   sendMessage,
//   sendImage,
//   clearChat,
//   editMessage,
//   deleteMessage,
//   updateGroupMembers,
//   deleteGroup // NEW: imported
// } from "../features/messages/messagesSlice";
// import MessageBubble from "./MessageBubble";
// import { IoMdSend } from "react-icons/io";
// import data from "@emoji-mart/data";
// import Picker from "@emoji-mart/react";
// import { MdOutlineEmojiEmotions, MdCancel, MdGroup } from "react-icons/md";
// import { FaImage } from "react-icons/fa";
// import moment from "moment";
// import Swal from "sweetalert2";
// import { MdDelete } from "react-icons/md";
// import { CiCircleRemove } from "react-icons/ci";

// const ChatWindow = ({ currentUser, selectedUser, selectedGroup }) => {
//   const dispatch = useDispatch();

//   const { messages, onlineUsers, lastSeen, editingMessage } = useSelector((state) => state.messages);
//   const users = useSelector((state) => state.usersData.users || []);

//   const [input, setInput] = useState("");
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//   const [previewFiles, setPreviewFiles] = useState([]);
//   const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
//   const [showMembersModal, setShowMembersModal] = useState(false);
//   const [memberToAdd, setMemberToAdd] = useState(null);

//   const messagesEndRef = useRef(null);
//   const emojiPickerRef = useRef(null);
//   const emojiButtonRef = useRef(null);
//   const fileInputRef = useRef(null);

//   useEffect(() => {
//     if (editingMessage) {
//       setInput(editingMessage.content);
//     }
//   }, [editingMessage]);

//   const chatMessages = messages.filter((m) =>
//     selectedUser
//       ? (m.senderId === currentUser?.id && m.receiverId === selectedUser?.id) ||
//       (m.senderId === selectedUser?.id && m.receiverId === currentUser?.id)
//       : selectedGroup
//         ? m.groupId === selectedGroup.id
//         : []
//   );

//   const hasChatMessages = chatMessages.length > 0;
//   const selectionMode = selectedMessageIds.size > 0;

//   useEffect(() => {
//     if (!hasChatMessages) {
//       setSelectedMessageIds(new Set());
//     }
//   }, [hasChatMessages]);

//   const isMemberOfSelectedGroup = (selectedGroup && currentUser)
//     ? (Array.isArray(selectedGroup.members) && selectedGroup.members.map(String).includes(currentUser.id.toString()))
//     : false;


//   const handleSend = () => {

//     if (editingMessage) {
//       dispatch(editMessage({ id: editingMessage.id, newContent: input }));
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
//         };
//         dispatch(sendImage(msg));
//       });
//       setPreviewFiles([]);
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
//     };
//     dispatch(sendMessage(msg));
//     setInput("");
//     setShowEmojiPicker(false);
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

//         let newCreator = selectedGroup.creator;
//         const isCreatorLeaving = groupCreatorId === myId;

//         if (isCreatorLeaving && updatedMembers.length > 0) {
//           const sortedMembers = updatedMembers.sort((a, b) => Number(a) - Number(b));
//           newCreator = sortedMembers[0];
//         }

//         if (updatedMembers.length === 0) {
//           dispatch(deleteGroup({ groupId: selectedGroup.id, forEveryone: true, deletedBy: currentUser.id }));
//         } else {
//           dispatch(
//             updateGroupMembers({
//               groupId: selectedGroup.id,
//               members: updatedMembers,
//               creator: isCreatorLeaving ? newCreator : undefined
//             })
//           );
//         }

//         setShowMembersModal(false);

//         // navigate away from deleted group
//         window.location.href = "/chat";

//         Swal.fire("Left group", "You have left the group.", "success");
//       })
//   }

//   // NEW: Delete group only from current user's view (Delete for me)
//   const handleDeleteForMe = () => {
//     if (!selectedGroup || !currentUser) return;

//     Swal.fire({
//       title: "Remove group from your chats?",
//       text: "This will remove the group from your chats only. Other members will still have the group.",
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Yes, remove",
//       cancelButtonText: "Cancel",
//     }).then((result) => {
//       if (!result.isConfirmed) return;

//       dispatch(deleteGroup({ groupId: selectedGroup.id, forEveryone: false }));
//       setShowMembersModal(false);

//       // navigate away from deleted group
//       window.location.href = "/chat";

//       Swal.fire("Removed", "Group removed from your chats.", "success");
//     });
//   };

//   return (
//     <div className="chat-window d-flex flex-column flex-grow-1">
//       <div className="chat-header p-2 border-bottom d-flex align-items-center justify-content-between">
//         <div className="d-flex align-items-center">
//           {selectedUser ? (
//             <>
//               <img
//                 src={selectedUser.avatar || "/User.png"}
//                 alt={selectedUser.name}
//                 className="rounded-circle me-2 header-avatar"
//                 onError={(e) => {
//                   e.target.onError = null;
//                   e.target.src = "/User.png";
//                 }}
//               />
//               <div>
//                 <strong>{selectedUser.name}</strong>
//                 <div className="user-status-text">
//                   {selectedUserOnline ? (
//                     <span className="online-text">Online</span>
//                   ) : selectedUserLastSeen ? (
//                     <span>{formatLastSeen(selectedUserLastSeen)}</span>
//                   ) : (
//                     <span>Offline</span>
//                   )}
//                 </div>
//               </div>
//             </>
//           ) : (
//             <>
//               <img
//                 src={selectedGroup?.avatar || "/Group.png"}
//                 alt={selectedGroup?.name}
//                 className="rounded-circle me-2 header-avatar"
//                 onError={(e) => {
//                   e.target.onError = null;
//                   e.target.src = "/Group.png";
//                 }}
//               />
//               <div>
//                 <div className="d-flex align-items-center">
//                   <strong>{selectedGroup?.name}</strong>
//                 </div>
//                 <div className="user-status-text">
//                   {selectedGroupOnlineCount > 0 ? (
//                     <span className="online-text">
//                       {selectedGroupOnlineCount} Online
//                     </span>
//                   ) : (
//                     <span>No one online</span>
//                   )}
//                 </div>
//               </div>
//             </>
//           )}
//         </div>

//         <div className="d-flex align-items-center">
//           {selectedGroup && (
//             <button
//               title="Group members"
//               className="btn btn-sm btn-outline-secondary group-icon-btn"
//               onClick={() => setShowMembersModal(true)}
//             >
//               <MdGroup size={18} />
//               <small>{(selectedGroup.members || []).length}</small>
//             </button>
//           )}

//           <div
//             className={`delete-btn-wrapper ${deleteDisabled ? "disabled" : ""}`}
//             onClick={() => {
//               if (deleteDisabled) return;
//               if (selectionMode) handleDeleteSelected();
//               else handleClearChat();
//             }}
//             role="button"
//             aria-disabled={deleteDisabled}
//           >
//             <MdDelete size={20} />
//             {selectionMode && (
//               <span className="delete-count">
//                 {selectedMessageIds.size}
//               </span>
//             )}
//           </div>
//         </div>
//       </div>

//       <div
//         className="messages flex-grow-1 p-3 overflow-auto"
//         onClick={(e) => {
//           if (!e.target.closest(".message-bubble")) {
//             setSelectedMessageIds(new Set());
//           }
//         }}
//       >
//         {chatMessages.length === 0 ? (
//           <div className="text-center text-muted">No messages yet</div>
//         ) : (
//           chatMessages.map((msg, index) => {
//             const prevMsg = chatMessages[index - 1];
//             const showDateSeparator =
//               !prevMsg || !moment(msg.timestamp).isSame(prevMsg.timestamp, "day");

//             return (
//               <div key={msg.id}>
//                 {showDateSeparator && (
//                   <div
//                     className="text-center my-2"
//                     style={{ fontSize: "0.8rem", color: "#666" }}
//                   >
//                     {moment(msg.timestamp).calendar(null, {
//                       sameDay: "[Today]",
//                       lastDay: "[Yesterday]",
//                       lastWeek: "dddd",
//                       sameElse: "MMMM D, YYYY",
//                     })}
//                   </div>
//                 )}
//                 <MessageBubble
//                   message={msg}
//                   isOwn={msg.senderId === currentUser.id}
//                   showSender={!!selectedGroup}
//                   isSelected={selectedMessageIds.has(msg.id)}
//                   onToggleSelect={onToggleSelect}
//                   selectionMode={selectionMode}
//                 />
//               </div>
//             );
//           })
//         )}

//         <div ref={messagesEndRef} />
//       </div>

//       {previewFiles.length > 0 && (
//         <div className="p-2 border-top d-flex flex-wrap">
//           {previewFiles.map((file, idx) => (
//             <div
//               key={idx}
//               className="d-flex align-items-center border rounded p-1 me-2 mb-2"
//               style={{ maxWidth: "150px" }}
//             >
//               <img
//                 src={file}
//                 alt="preview"
//                 style={{ maxHeight: "60px", borderRadius: "6px" }}
//                 className="me-2"
//               />
//               <button
//                 className="btn btn-sm btn-danger"
//                 onClick={() =>
//                   setPreviewFiles((prev) => prev.filter((_, index) => index !== idx))
//                 }
//               >
//                 <MdCancel />
//               </button>
//             </div>
//           ))}
//         </div>
//       )}

//       {selectedGroup && !isMemberOfSelectedGroup ? (
//         <div className="p-3 text-center text-muted border-top">
//           You are no longer a member of this group. You cannot send messages.
//         </div>
//       ) : (
//         <div className="chat-input">
//           <button
//             ref={emojiButtonRef}
//             className="btn btn-light me-2"
//             onClick={() => setShowEmojiPicker((prev) => !prev)}
//           >
//             <MdOutlineEmojiEmotions size={20} />
//           </button>

//           <input
//             type="file"
//             accept="image/*"
//             ref={fileInputRef}
//             style={{ display: "none" }}
//             multiple
//             onChange={handleImageUpload}
//           />

//           <button
//             className="btn btn-light me-2"
//             onClick={() => fileInputRef.current.click()}
//           >
//             <FaImage />
//           </button>

//           {showEmojiPicker && (
//             <div ref={emojiPickerRef} className="emoji-picker">
//               <Picker data={data} onEmojiSelect={handleEmojiSelect} />
//             </div>
//           )}

//           <input
//             className="form-control me-2 flex-grow-1"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && handleSend()}
//             placeholder="Type a message..."
//           />

//           <button
//             className="btn btn-primary d-flex align-items-center justify-content-center"
//             onClick={handleSend}
//           >
//             <IoMdSend size={20} />
//           </button>
//         </div>
//       )}

//       {showMembersModal && selectedGroup && (
//         <div className="modal-backdrop">
//           <div className="modal-dialog modal-md">
//             <div className="modal-content p-3">

//               <div className="d-flex justify-content-between align-items-center mb-3">
//                 <div className="d-flex align-items-center gap-2">
//                   <img
//                     src={selectedGroup.avatar || "/Group.png"}
//                     alt={selectedGroup.name}
//                     className="rounded-circle me-2 modal-group-avatar"
//                     onError={(e) => {
//                       e.target.onError = null;
//                       e.target.src = "/Group.png";
//                     }}
//                   />
//                   <div>
//                     <h5 className="mb-0">{selectedGroup.name}</h5>
//                     <small className="text-muted">{(selectedGroup.members || []).length} members</small>
//                   </div>
//                 </div>
//                 <div className="d-flex align-items-center gap-2">
//                   {currentUser && (selectedGroup.members || []).map(String).includes(currentUser.id.toString()) && (
//                     <button
//                       className={`btn btn-sm ${selectedGroup.creator && selectedGroup.creator.toString() === currentUser.id.toString() ? "btn-outline-secondary" : "btn-warning"}`}
//                       onClick={handleLeaveGroup}
//                       title="Leave group"
//                     >
//                       Leave
//                     </button>
//                   )}
//                   {currentUser && (selectedGroup.members || []).map(String).includes(currentUser.id.toString()) && (
//                     <button
//                       className="btn btn-sm btn-danger"
//                       onClick={handleDeleteForMe}
//                       title="Remove group from my chats"
//                       style={{ marginLeft: 8 }}
//                     >
//                       Delete for me
//                     </button>
//                   )}

//                   <button className="btn btn-sm btn-secondary" onClick={() => setShowMembersModal(false)}>
//                     <MdCancel size={20} />
//                   </button>
//                 </div>
//               </div>

//               <div className="mb-2">
//                 <small className="text-muted">Created by:{" "}
//                   {(selectedGroup.creator && users.find(u => u.id.toString() === selectedGroup.creator.toString()))
//                     ? users.find(u => u.id.toString() === selectedGroup.creator.toString()).name
//                     : "Unknown"}
//                 </small>
//               </div>

//               <div style={{ maxHeight: 300, overflow: "auto" }} className="member-list">
//                 {groupMembers.map((m) => (
//                   <div
//                     key={m.id}
//                     className="d-flex align-items-center justify-content-between p-2 border-bottom member-row"
//                   >
//                     <div className="d-flex align-items-center">
//                       <img
//                         src={m.avatar || "/User.png"}
//                         alt={m.name}
//                         width={40}
//                         height={40}
//                         className="rounded-circle me-3"
//                       />
//                       <div>
//                         <div className="fw-bold">{m.name}</div>
//                         <div>
//                           <small className="text-muted">
//                             {onlineUsers?.[m.id?.toString()]
//                               ? "Online"
//                               : lastSeen?.[m.id?.toString()]
//                                 ? formatLastSeen(lastSeen[m.id?.toString()])
//                                 : "Offline"}
//                           </small>
//                         </div>
//                       </div>
//                     </div>

//                     <div className="d-flex align-items-center">
//                       {selectedGroup.creator &&
//                         m.id.toString() === selectedGroup.creator.toString() && (
//                           <span className="admin-badge">Admin</span>
//                         )}

//                       {selectedGroup.creator &&
//                         currentUser &&
//                         currentUser.id &&
//                         currentUser.id.toString() === selectedGroup.creator.toString() &&
//                         m.id.toString() !== selectedGroup.creator.toString() && (
//                           <button
//                             className="btn btn-sm btn-danger ms-2"
//                             onClick={() => handleRemoveMember(m.id)}
//                             title="Remove member"
//                           >
//                             <CiCircleRemove size={18} />
//                           </button>
//                         )}
//                     </div>
//                   </div>
//                 ))}

//                 {groupMembers.length === 0 && (
//                   <div className="text-muted p-2">No members</div>
//                 )}
//               </div>

//               <div className="mt-3">
//                 <h6>Add member</h6>
//                 <div className="d-flex gap-2 align-items-center">
//                   <select className="form-select" value={memberToAdd || ""} onChange={(e) => setMemberToAdd(e.target.value)}>
//                     <option value="">Select user to add</option>
//                     {availableToAdd.map(u => (
//                       <option key={u.id} value={u.id}>{u.name}</option>
//                     ))}
//                   </select>
//                   <button className="btn btn-primary" onClick={handleAddMember} disabled={!memberToAdd}>
//                     Add
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ChatWindow;
// // ChatSidebar.jsx
// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { createGroup } from "../features/messages/messagesSlice";
// import moment from "moment";
// import { useFormik } from "formik";
// import * as Yup from "yup";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const ChatSidebar = ({ users, selectedUserId, onSelectUser, onSelectGroup, currentUser }) => {
//   const dispatch = useDispatch();

//   const { groups, messages, unreadCounts, onlineUsers } = useSelector(
//     (state) => state.messages
//   );
//   const [showModal, setShowModal] = useState(false);
//   const [selectedMembers, setSelectedMembers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");

//   const formik = useFormik({
//     initialValues: {
//       groupName: "",
//     },
//     validationSchema: Yup.object({
//       groupName: Yup.string()
//         .trim()
//         .required("Group name is required.")
//         .max(20, "Group name must be at most 20 characters"),
//     }),
//     onSubmit: (values) => {
//       if (selectedMembers.length === 0) {
//         toast.error("At least 1 member is required to create a group.");
//         return;
//       }

//       const creatorId = currentUser?.id?.toString();
//       const membersSet = new Set(selectedMembers.map(String));
//       if (creatorId) membersSet.add(creatorId);

//       const newGroup = {
//         id: Date.now().toString(),
//         name: values.groupName,
//         members: Array.from(membersSet),
//         creator: creatorId || null,
//         avatar: null,
//       };
//       dispatch(createGroup(newGroup));

//       toast.success("Group created successfully!");

//       setShowModal(false);
//       formik.resetForm();
//       setSelectedMembers([]);
//     }
//   })

//   const handleSelectUser = (u) => {
//     onSelectUser(u);
//   };

//   const handleSelectGroup = (g) => {
//     onSelectGroup(g);
//   };

//   const getLastMessageTime = (id, isGroup = false) => {
//     const chatMessages = messages.filter((m) =>
//       isGroup
//         ? m.groupId === id
//         : !m.groupId && (m.senderId === id || m.receiverId === id)
//     );
//     if (chatMessages.length === 0) return 0;
//     return new Date(chatMessages[chatMessages.length - 1].timestamp).getTime();
//   };

//   const getLastMessage = (id, isGroup = false) => {
//     const chatMessages = messages.filter((m) =>
//       isGroup
//         ? m.groupId === id
//         : !m.groupId && (m.senderId === id || m.receiverId === id)
//     );
//     if (chatMessages.length === 0) return null;
//     return chatMessages[chatMessages.length - 1];
//   };

//   const sortedUsers = [...users].sort(
//     (a, b) => getLastMessageTime(b.id) - getLastMessageTime(a.id)
//   );

//   // sort groups by last message time
//   const sortedGroups = [...groups].sort(
//     (a, b) => getLastMessageTime(b.id, true) - getLastMessageTime(a.id, true)
//   );

//   const filteredUsers = sortedUsers.filter((u) =>
//     u.name.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // NEW: filter groups so the sidebar shows only groups where currentUser is a member
//   const filteredGroups = sortedGroups
//     .filter(g => {
//       if (!currentUser) return false;
//       const myId = currentUser.id?.toString();
//       const memberIds = (g.members || []).map(String);
//       return !g.deletedLocally && memberIds.includes(myId);
//     })
//     .filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

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

//       <h6 className="px-3 mt-3 text-muted">Users</h6>
//       <ul className="list-group list-group-flush">
//         {filteredUsers.map((u) => {
//           const lastMsg = getLastMessage(u.id);
//           const isOnline = !!onlineUsers?.[u.id?.toString()];

//           return (
//             <li
//               key={u.id}
//               className={`list-group-item list-group-item-action ${selectedUserId === u.id ? "active" : ""
//                 }`}
//               onClick={() => handleSelectUser(u)}
//               style={{ cursor: "pointer" }}
//             >
//               <div className="d-flex align-items-center justify-content-between">
//                 <div className="d-flex align-items-center">
//                   <div className="presence-avatar me-2">
//                     <img
//                       src={u.avatar || "/User.png"}
//                       alt={u.name}
//                       className="rounded-circle avatar-img"
//                       width="40"
//                       height="40"
//                       onError={(e) => {
//                         e.target.onError = null;
//                         e.target.src = "/User.png";
//                       }}
//                     />
//                     <span
//                       className={`presence-dot ${isOnline ? "online" : "offline"}`}
//                       title={isOnline ? "Online" : "Offline"}
//                     />
//                   </div>

//                   <div>
//                     <div className="fw-bold">{u.name}</div>
//                     <div className="d-flex flex-column">
//                       <small className="text-muted last-msg">
//                         {lastMsg
//                           ? lastMsg.type === "image"
//                             ? "Image"
//                             : lastMsg.content.length > 10
//                               ? lastMsg.content.slice(0, 10) + "..."
//                               : lastMsg.content
//                           : "No messages yet"}
//                       </small>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="text-end">
//                   {lastMsg && (
//                     <small className="text-muted d-block">
//                       {moment(lastMsg.timestamp).format("HH:mm")}
//                     </small>
//                   )}
//                   {unreadCounts[u.id] > 0 && (
//                     <span className="badge bg-success rounded-pill">
//                       {unreadCounts[u.id]}
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </li>
//           );
//         })}
//       </ul>

//       <h6 className="px-3 mt-3 text-muted">Groups</h6>
//       <ul className="list-group list-group-flush">
//         {filteredGroups.map((g) => {
//           const lastMsg = getLastMessage(g.id, true);
//           const onlineCount = (g.members || []).filter((m) => !!onlineUsers?.[m?.toString()]).length;

//           return (
//             <li
//               key={g.id}
//               className="list-group-item list-group-item-action"
//               onClick={() => handleSelectGroup(g)}
//               style={{ cursor: "pointer" }}
//             >
//               <div className="d-flex align-items-center justify-content-between">
//                 <div className="d-flex align-items-center">
//                   <div className="presence-avatar me-2">
//                     <img
//                       src={g.avatar || "/Group.png"}
//                       alt={g.name}
//                       className="rounded-circle avatar-img"
//                       width="40"
//                       height="40"
//                       onError={(e) => {
//                         e.target.onError = null;
//                         e.target.src = "/Group.png";
//                       }}
//                     />
//                     <span
//                       className={`presence-dot group-badge ${onlineCount > 0 ? "online" : "offline"}`}
//                       title={onlineCount > 0 ? `${onlineCount} online` : "No one online"}
//                     >
//                       {onlineCount > 0 ? onlineCount : ""}
//                     </span>
//                   </div>

//                   <div>
//                     <div className="fw-bold">{g.name}</div>
//                     <small className="text-muted">
//                       {lastMsg
//                         ? lastMsg.type === "image"
//                           ? "Image"
//                           : lastMsg.content.length > 10
//                             ? lastMsg.content.slice(0, 10) + "..."
//                             : lastMsg.content
//                         : "No messages yet"}
//                     </small>
//                   </div>
//                 </div>
//                 <div className="text-end">
//                   {lastMsg && (
//                     <small className="text-muted d-block">
//                       {moment(lastMsg.timestamp).format("HH:mm")}
//                     </small>
//                   )}
//                   {unreadCounts[g.id] > 0 && (
//                     <span className="badge bg-success rounded-pill">
//                       {unreadCounts[g.id]}
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </li>
//           );
//         })}
//       </ul>

//       {showModal && (
//         <div className="modal-backdrop">
//           <div className="modal-dialog">
//             <div className="modal-content p-3">
//               <h5>Create Group</h5>

//               <form onSubmit={formik.handleSubmit}>
//                 <input className="form-control mb-2"
//                   placeholder="Group Name"
//                   name="groupName"
//                   value={formik.values.groupName}
//                   onChange={formik.handleChange}
//                 />
//                 {formik.errors.groupName && (
//                   <div className="text-danger mb-2">{formik.errors.groupName}</div>
//                 )}

//                 <div className="mb-4 user-list-scroll" style={{ maxHeight: 260, overflow: "auto" }}>
//                   {users.map((u) => (
//                     <div key={u.id} className="form-check">
//                       <input
//                         type="checkbox"
//                         className="form-check-input"
//                         value={u.id}
//                         checked={selectedMembers.includes(u.id)}
//                         onChange={(e) => {
//                           if (e.target.checked)
//                             setSelectedMembers([...selectedMembers, u.id]);
//                           else
//                             setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
//                         }}
//                         id={`chk-${u.id}`}
//                       />
//                       <label className="form-check-label" htmlFor={`chk-${u.id}`}>
//                         {u.name}
//                       </label>
//                     </div>
//                   ))}
//                 </div>

//                 <div className="d-flex justify-content-end gap-2">
//                   <button type="submit" className="btn btn-primary me-2">
//                     Create
//                   </button>
//                   <button
//                     type="button"
//                     className="btn btn-secondary"
//                     onClick={() => setShowModal(false)}
//                   >
//                     Cancel
//                   </button>
//                 </div>

//               </form>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ChatSidebar;
// // pages/Chat.jsx
// import React, { useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useLocation } from "react-router-dom";
// import ChatSidebar from "../components/ChatSidebar";
// import ChatWindow from "../components/ChatWindow";
// import { fetchUsers } from "../features/users/usersSlice";
// import { setCurrentUser, setActiveChat } from "../features/messages/messagesSlice";
// import "../assets/css/Chat.css";

// export default function Chat() {
//     const location = useLocation();
//     const queryParams = new URLSearchParams(location.search);
//     const type = queryParams.get("type");
//     const id = queryParams.get("id");
    
//     const dispatch = useDispatch();
//     const { users } = useSelector((state) => state.usersData);
//     const { groups } = useSelector((state) => state.messages);
//     const currentUser = useSelector((state) => state.auth.user?.user);
//     const [selectedUser, setSelectedUser] = useState(null);
//     const [selectedGroup, setSelectedGroup] = useState(null);

//     useEffect(() => {
//         dispatch(fetchUsers());
//     }, [dispatch]);

//     useEffect(() => {
//         if (currentUser?.id) {
//             dispatch(setCurrentUser(currentUser.id));
//         }
//     }, [currentUser, dispatch]);

//     useEffect(() => {
//         if (type === "user" && id) {
//             const user = users.find((u) => u.id.toString() === id);
//             if (user) {
//                 setSelectedUser(user);
//                 setSelectedGroup(null);
//                 dispatch(setActiveChat({ type: "user", id: user.id }));
//             }
//         } else if (type === "group" && id) {
//             const group = groups.find((g) => g.id.toString() === id);
//             if (group) {
//                 setSelectedGroup(group);
//                 setSelectedUser(null);
//                 dispatch(setActiveChat({ type: "group", id: group.id }));
//             } else {
//                 // group id present in URL but not found in state: clear selection
//                 setSelectedGroup(null);
//                 setSelectedUser(null);
//                 dispatch(setActiveChat(null));
//                 // optionally redirect to /chat root
//                 window.history.replaceState({}, "", "/chat");
//             }
//         }
//     }, [type, id, users, groups, dispatch]);

//     // Watch for remote group deletions: if selectedGroup was removed from state, clear it & redirect
//     useEffect(() => {
//       if (selectedGroup) {
//         const stillExists = groups.find(g => g.id === selectedGroup.id);
//         if (!stillExists) {
//           setSelectedGroup(null);
//           dispatch(setActiveChat(null));
//           // ensure URL no longer points to deleted group
//           window.history.replaceState({}, "", "/chat");
//         }
//       }
//     }, [groups, selectedGroup, dispatch]);

//     return (
//         <div className="chat-container d-flex">
//             <ChatSidebar
//                 users={users.filter((u) => u.id !== currentUser?.id)}
//                 selectedUserId={selectedUser?.id}
//                 onSelectUser={(u) => {
//                     setSelectedUser(u);
//                     setSelectedGroup(null);
//                     dispatch(setActiveChat({ type: "user", id: u.id }));
//                     window.location.href = `/chat?type=user&id=${u.id}`;
//                 }}
//                 onSelectGroup={(g) => {
//                     setSelectedGroup(g);
//                     setSelectedUser(null);
//                     dispatch(setActiveChat({ type: "group", id: g.id }));
//                     window.location.href = `/chat?type=group&id=${g.id}`;
//                 }}
//                 currentUser={currentUser}
//             />

//             {selectedUser || selectedGroup ? (
//                 <ChatWindow
//                     currentUser={currentUser}
//                     selectedUser={selectedUser}
//                     selectedGroup={selectedGroup}
//                 />
//             ) : (
//                 <div className="chat-placeholder">
//                     <div className="placeholder-content">
//                         <img src="/assets/chat.png" alt="logo" className="placeholder-logo" />
//                         <h2>Chat Web</h2>
//                         <p>Send and receive messages without keeping your phone online.</p>
//                         <small>
//                             Use Chat Web on up to 4 linked devices and 1 phone at the same time.
//                         </small>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }