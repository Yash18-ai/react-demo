// Delete Group functionality Code

// messageSlice.jsx

import { createSlice } from "@reduxjs/toolkit";
import { socket } from "../../services/socket";

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
        showNotification(payload);
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

      const currentUid = state.currentUserId ? state.currentUserId.toString() : null;
      if (currentUid && !updatedMembers.includes(currentUid)) {
        state.groups.splice(gIndex, 1);
      }

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

      const currentUid = state.currentUserId ? state.currentUserId.toString() : null;
      if (currentUid && !normalized.members.includes(currentUid)) {
        const idx = state.groups.findIndex((g) => g.id === normalized.id);
        if (idx !== -1) {
          state.groups.splice(idx, 1);
        }
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
} = messagesSlice.actions;

export default messagesSlice.reducer;


// MembersModal.jss


// import React, { useState, useEffect } from "react";
// import { MdCancel } from "react-icons/md";
// import { CiCircleRemove } from "react-icons/ci";
// import { FiUserPlus, FiUserX } from "react-icons/fi";
// import { FaUserShield } from "react-icons/fa";
// import { useDispatch } from "react-redux";
// import Swal from "sweetalert2";
// import { updateGroupAdmins } from "../../features/messages/messagesSlice";

// const MembersModal = ({
//   show,
//   onClose,
//   selectedGroup,
//   currentUser,
//   users,
//   onlineUsers,
//   lastSeen,
//   memberToAdd,
//   setMemberToAdd,
//   handleAddMember,
//   handleRemoveMember,
//   handleLeaveGroup,
//   formatLastSeen,
// }) => {
//   const dispatch = useDispatch();

//   const [localAdmins, setLocalAdmins] = useState(new Set());

//   useEffect(() => {
//     if (selectedGroup && Array.isArray(selectedGroup.admins)) {
//       setLocalAdmins(new Set((selectedGroup.admins || []).map((a) => a.toString())));
//     } else {
//       setLocalAdmins(new Set());
//     }
//   }, [selectedGroup]);

//   if (!show || !selectedGroup) return null;

//   let groupMembers = (selectedGroup.members || []).map((memberId) => {
//     const foundUser = users.find((u) => u.id.toString() === memberId.toString());

//     if (foundUser) {
//       return foundUser;
//     }

//     return {
//       id: memberId,
//       name: `User ${memberId}`,
//       avatar: "/User.png",
//     };
//   });

//   let availableToAdd = users
//     .filter((u) => {
//       const userId = u.id.toString();
//       const memberIds = (selectedGroup.members || []).map((m) => m.toString());
//       return !memberIds.includes(userId);
//     })
//     .filter((u) => u.id.toString() !== currentUser.id.toString());

//     const currentUserIdStr = currentUser?.id?.toString();
//     const isGroupCreator = selectedGroup.creator && currentUserIdStr === selectedGroup.creator.toString();
//     const isAdmin = (selectedGroup.admins || []).map(String).includes(currentUserIdStr);
//     const canManageAdmins = !!currentUserIdStr && (isGroupCreator || isAdmin);

//     const handleToggleAdmin = (memberId) => {
//       if (!canManageAdmins) return;

//       const memberIdStr = memberId.toString();

//       if (selectedGroup.creator && memberIdStr === selectedGroup.creator.toString()) {
//         return;
//       }

//       const currentlyAdmin = localAdmins.has(memberIdStr);

//       const updatedSet = new Set(localAdmins);
//       if (currentlyAdmin) {
//         updatedSet.delete(memberIdStr);
//       } else {
//         updatedSet.add(memberIdStr);
//       }
//       setLocalAdmins(updatedSet);

//       const memberIds = (selectedGroup.members || []).map((m) => m.toString());
//       const adminArray = Array.from(updatedSet).filter((id) => memberIds.includes(id));

//       dispatch(updateGroupAdmins({ groupId: selectedGroup.id, admins: adminArray }));
//     }

//     return (
//       <div className="modal-backdrop" onClick={onClose}>
//         <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
//           <div className="modal-content p-3">
  
//             <div className="d-flex justify-content-between align-items-center mb-3">
//               <div className="d-flex align-items-center gap-2">
//                 <img
//                   src={selectedGroup.avatar || "/Group.png"}
//                   alt={selectedGroup.name}
//                   className="rounded-circle me-2 modal-group-avatar"
//                   onError={(e) => {
//                     e.target.onError = null;
//                     e.target.src = "/Group.png";
//                   }}
//                   width={48}
//                   height={48}
//                 />
//                 <div>
//                   <h5 className="mb-0">{selectedGroup.name}</h5>
//                   <small className="text-muted">{(selectedGroup.members || []).length} members</small>
//                 </div>
//               </div>
//               <div className="d-flex align-items-center gap-2">
//                 {currentUser && (selectedGroup.members || []).map(String).includes(currentUser.id.toString()) && (
//                   <button
//                     className={`btn btn-sm ${selectedGroup.creator && selectedGroup.creator.toString() === currentUser.id.toString() ? "btn-outline-secondary" : "btn-warning"}`}
//                     onClick={handleLeaveGroup}
//                     title="Leave group"
//                   >
//                     Leave
//                   </button>
//                 )}
//                 <button className="btn btn-sm btn-secondary" onClick={onClose}>
//                   <MdCancel size={20} />
//                 </button>
//               </div>
//             </div>
  
//             <div className="mb-2">
//               <small className="text-muted">Created by:{" "}
//                 {(selectedGroup.creator && users.find(u => u.id.toString() === selectedGroup.creator))
//                   ? users.find(u => u.id.toString() === selectedGroup.creator).name
//                   : "Unknown"}
//               </small>
//             </div>
  
//             <div style={{ maxHeight: 300, overflow: "auto" }} className="member-list">
//               {groupMembers.map((m) => {
//                 const mIdStr = m.id?.toString();
//                 const isMemberAdmin = localAdmins.has(mIdStr) || (selectedGroup.admins || []).map(String).includes(mIdStr);
//                 const isGroupCreator = selectedGroup.creator && mIdStr === selectedGroup.creator.toString();
//                 return (
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
//                       {isMemberAdmin && (
//                         <div className="d-flex align-items-center gap-1 me-2 admin-badge" title="Admin">
//                           <FaUserShield />
//                           <small className="ms-1">Admin</small>
//                         </div>
//                       )}
  
//                       {selectedGroup.creator &&
//                         currentUser &&
//                         currentUser.id &&
//                         currentUser.id.toString() === selectedGroup.creator.toString() &&
//                         mIdStr !== selectedGroup.creator.toString() && (
//                           <button
//                             className="btn btn-sm btn-danger ms-2"
//                             onClick={() => handleRemoveMember(m.id)}
//                             title="Remove member"
//                           >
//                             <CiCircleRemove size={18} />
//                           </button>
//                         )}
  
//                       {canManageAdmins && !isGroupCreator && (
//                         <>
//                           {isMemberAdmin ? (
//                             <button
//                               className="btn btn-sm btn-outline-danger ms-2"
//                               onClick={async () => {
//                                 const result = await Swal.fire({
//                                   title: `Remove admin?`,
//                                   text: `Remove admin from ${m.name}?`,
//                                   icon: "warning",
//                                   showCancelButton: true,
//                                   confirmButtonText: "Yes, remove",
//                                   cancelButtonText: "Cancel",
//                                   reverseButtons: true,
//                                 });
//                                 if (result.isConfirmed) {
//                                   handleToggleAdmin(m.id);
//                                   await Swal.fire({
//                                     icon: "success",
//                                     title: "Removed",
//                                     text: `${m.name} is no longer an admin.`,
//                                     timer: 1400,
//                                     showConfirmButton: false,
//                                   });
//                                 }
//                               }}
//                               title="Remove admin"
//                             >
//                               <FiUserX size={16} />
//                             </button>
//                           ) : (
//                             <button
//                               className="btn btn-sm btn-outline-success ms-2"
//                               onClick={async () => {
//                                 const result = await Swal.fire({
//                                   title: `Make admin?`,
//                                   text: `Make ${m.name} an admin?`,
//                                   icon: "question",
//                                   showCancelButton: true,
//                                   confirmButtonText: "Yes, make admin",
//                                   cancelButtonText: "Cancel",
//                                   reverseButtons: true,
//                                 });
//                                 if (result.isConfirmed) {
//                                   handleToggleAdmin(m.id);
//                                   await Swal.fire({
//                                     icon: "success",
//                                     title: "Done",
//                                     text: `${m.name} is now an admin.`,
//                                     timer: 1400,
//                                     showConfirmButton: false,
//                                   });
//                                 }
//                               }}
//                               title="Make admin"
//                             >
//                               <FiUserPlus size={16} />
//                             </button>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 );
//               })}
  
//               {groupMembers.length === 0 && (
//                 <div className="text-muted p-2">No members</div>
//               )}
//             </div>
  
//             <div className="mt-3">
//               <h6>Add member</h6>
//               <div className="d-flex gap-2 align-items-center">
//                 <select className="form-select" value={memberToAdd || ""} onChange={(e) => setMemberToAdd(e.target.value)}>
//                   <option value="">Select user to add</option>
//                   {availableToAdd.map(u => (
//                     <option key={u.id} value={u.id}>{u.name}</option>
//                   ))}
//                 </select>
//                 <button className="btn btn-primary" onClick={handleAddMember} disabled={!memberToAdd}>
//                   Add
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
// };

// export default MembersModal;


// ChatWindow.jsx


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

// const ChatWindow = ({ currentUser, selectedUser, selectedGroup }) => {
//   const dispatch = useDispatch();

//   const { messages, groups, onlineUsers, lastSeen, editingMessage, typingUsers } = useSelector((state) => state.messages);
//   const users = useSelector((state) => state.usersData.users || []);

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


//   const handleSend = () => {

//     sendTypingStopForCurrentChat();

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

//   const getCurrentChatKey = () => {
//     if (selectedUser) return `user:${selectedUser.id?.toString()}`;
//     if (selectedGroup) return `group:${selectedGroup.id?.toString()}`;
//     return null;
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
//     }, 2000);
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
//     const prevKey = currentChatKeyRef.current;
//     const newKey = getCurrentChatKey();
//     if (prevKey && prevKey !== newKey) {
//       if (currentUser) {
//         const parts = prevKey.split(":");
//         const type = parts[0];
//         const id = parts.slice(1).join(":");
//         if (type && id) {
//           dispatch(typingStop({ type, id, userId: currentUser.id }));
//         }
//       }
//     }
//     currentChatKeyRef.current = newKey;

//     return () => {
//       if (currentUser) {
//         const key = getCurrentChatKey();
//         if (key) {
//           const parts = key.split(":");
//           const type = parts[0];
//           const id = parts.slice(1).join(":");
//           if (type && id) {
//             dispatch(typingStop({ type, id, userId: currentUser.id }));
//           }
//         }
//       }
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedUser?.id, selectedGroup?.id, currentUser?.id]);

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

//           <ChatInput
//             input={input}
//             setInput={setInput}
//             showEmojiPicker={showEmojiPicker}
//             setShowEmojiPicker={setShowEmojiPicker}
//             emojiButtonRef={emojiButtonRef}
//             emojiPickerRef={emojiPickerRef}
//             handleEmojiSelect={handleEmojiSelect}
//             fileInputRef={fileInputRef}
//             handleImageUpload={handleImageUpload}
//             handleSend={handleSend}
//             handleInputChange={handleInputChange}
//           />
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
//     </div>
//   );
// };

// export default ChatWindow;



// socket.jsx


// import { io } from "socket.io-client";

// import {
//   receiveMessage,
//   receiveImage,
//   receiveGroup,
//   receiveGroupUpdate,
//   deleteMessageRemote,
//   editMessageRemote,
//   setPresenceList,
//   receivePresenceUpdate,
//   receiveTypingStart,
//   receiveTypingStop,
// } from "../features/messages/messagesSlice";

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://192.168.1.98:5001";
// export const socket = io(SOCKET_URL, { transports: ["websocket"] });

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

 
//   socket.on("typing:start", (payload) => {
//     console.log('[CLIENT] socket.on typing:start', payload);
//     store.dispatch(receiveTypingStart(payload));
//   });

//   socket.on("typing:stop", (payload) => {
//     console.log('[CLIENT] socket.on typing:stop', payload);
//     store.dispatch(receiveTypingStop(payload));
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


// ChatSidebar.jsx


// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import CreateGroupModal from "./modals/CreateGroupModal";
// import moment from "moment";
// import { FiChevronDown, FiChevronRight } from "react-icons/fi"; 

// const ChatSidebar = ({ users, selectedUserId, onSelectUser, onSelectGroup, currentUser }) => {
//   const dispatch = useDispatch();

//   const { groups, messages, unreadCounts, onlineUsers } = useSelector(
//     (state) => state.messages
//   );
//   const [showModal, setShowModal] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");

//   const [showUsers, setShowUsers] = useState(true);
//   const [showGroups, setShowGroups] = useState(true);

//   const handleSelectUser = (u) => {
//     onSelectUser(u);
//   };

//   const handleSelectGroup = (g) => {
//     onSelectGroup(g);
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
//                           {lastMsg
//                             ? lastMsg.type === "image"
//                               ? "Image"
//                               : lastMsg.content.length > 10
//                                 ? lastMsg.content.slice(0, 10) + "..."
//                                 : lastMsg.content
//                             : "No messages yet"}
//                         </small>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="text-end">
//                     {lastMsg && (
//                       <small className="text-muted d-block">
//                         {/* {moment(lastMsg.timestamp).format("HH:mm")} */}
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
//                   <div className="text-end">
//                     {lastMsg && (
//                       <small className="text-muted d-block">
//                         {/* {moment(lastMsg.timestamp).format("HH:mm")} */}
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


// Chat.jsx

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
//                 setSelectedGroup(null);
//                 dispatch(setActiveChat(null));
//             }
//         }
//     }, [type, id, users, groups, dispatch]);

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