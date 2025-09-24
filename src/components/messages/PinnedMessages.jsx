import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { unpinMessage } from "../../features/messages/messagesSlice";
import { MdClose, MdPushPin } from "react-icons/md";
import Swal from "sweetalert2";

const PinnedMessages = ({ pinnedMessages = [], onJumpToMessage }) => {
    const dispatch = useDispatch();
    const currentUserId = useSelector((s) => s.messages.currentUserId);

    const [showModal, setShowModal] = useState(false);

    if (!pinnedMessages && pinnedMessages.length === 0) return null;

    const openModal = (e) => {
        if (e) e.stopPropagation();
        setShowModal(true);
    }

    const closeModal = (e) => {
        if (e) e.stopPropagation();
        setShowModal(false);
    }

    const handleUnpin = (e, id) => {
        e.stopPropagation();

        Swal.fire({
            title: "Unpin message?",
            text: "Remove this message from pinned messages?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, unpin",
            cancelButtonText: "Cancel",
        }).then((res) => {
            if (res.isConfirmed) {
                dispatch(unpinMessage({ id, unpinnedBy: currentUserId || null }));
                setShowModal(false);
                Swal.fire("Unpinned", "Message removed from pinned messages.", "success");
            }
        });
    };

    const handleSelectAndClose = (e, id) => {
        e.stopPropagation();
        if (onJumpToMessage) onJumpToMessage(id);
        setShowModal(false);
    };

    return (
        <>
            <div
                className="pinned-bar p-2 border-bottom d-flex align-items-center"
                style={{ background: "#fff", cursor: "pointer" }}
                onClick={openModal}
                title="Open pinned messages"
            >
                <div className="d-flex align-items-center">
                    <MdPushPin className="me-2" />
                    <strong className="me-2">Pinned</strong>
                    <small className="text-muted">({pinnedMessages.length})</small>
                </div>

                <div className="ms-auto small text-muted" style={{ fontSize: 12 }}>
                    Click to view
                </div>
            </div>

            {showModal && (
                <div
                    className="pinned-modal-backdrop"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        zIndex: 1050,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 12,
                    }}
                    onClick={closeModal}
                >
                    <div
                        className="pinned-modal shadow-sm"
                        style={{
                            width: "min(720px, 96%)",
                            maxHeight: "80vh",
                            overflow: "auto",
                            background: "#fff",
                            borderRadius: 8,
                            padding: 12,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="d-flex align-items-center mb-2">
                            <MdPushPin className="me-2" />
                            <h5 className="mb-0 me-auto">Pinned messages ({pinnedMessages.length})</h5>
                            <button className="btn btn-sm btn-light" onClick={closeModal} title="Close">
                                <MdClose />
                            </button>
                        </div>

                        <div className="pinned-list d-flex flex-column gap-2">
                            {pinnedMessages.map((p) => (
                                <div
                                    key={p.id}
                                    className="pinned-item d-flex align-items-start p-2 rounded shadow-sm"
                                    style={{ cursor: "pointer", background: "#f8f9fa" }}
                                >
                                    <div
                                        style={{ flex: 1 }}
                                        onClick={(e) => handleSelectAndClose(e, p.id)}
                                        title={p.content ? (typeof p.content === "string" ? p.content : "Open message") : "Open message"}
                                    >
                                        <div className="small fw-bold">{p.senderName || "Unknown"}</div>
                                        <div className="small text-truncate" style={{ maxWidth: "100%" }}>
                                            {p.type === "image" ? <em>Image</em> : (typeof p.content === "string" ? p.content : "")}
                                        </div>
                                        <div className="small text-muted" style={{ fontSize: 11 }}>
                                            {new Date(p.timestamp).toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ marginLeft: 8 }}>
                                        <button
                                            className="btn btn-sm btn-light"
                                            onClick={(e) => handleUnpin(e, p.id)}
                                            title="Unpin"
                                        >
                                            <MdClose />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {pinnedMessages.length === 0 && (
                                <div className="text-center text-muted p-3">No pinned messages</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default PinnedMessages;