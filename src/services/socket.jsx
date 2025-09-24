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
} from "../features/messages/messagesSlice";

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://192.168.1.98:5001";
// export const socket = io(SOCKET_URL, { transports: ["websocket"] });
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || window.location.origin.replace(/^http/, "ws");

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
