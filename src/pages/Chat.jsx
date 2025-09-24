import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow from "../components/ChatWindow";
import { fetchUsers } from "../features/users/usersSlice";
import { setCurrentUser, setActiveChat } from "../features/messages/messagesSlice";
import { setNavigator } from "../features/messages/messagesSlice";
import "../assets/css/Chat.css";

export default function Chat() {
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
}


