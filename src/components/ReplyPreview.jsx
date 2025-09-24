import React from "react";
import { MdCancel } from "react-icons/md";

const ReplyPreview = ({ replyTo, cancelReply }) => {
  if (!replyTo) return null;

  return (
    <div className="reply-preview p-2 border-top d-flex align-items-start">
      <div style={{ flex: 1 }}>
        <div className="small fw-bold">{replyTo.senderName}</div>
        <div className="small text-truncate" style={{ maxWidth: "100%" }}>
          {replyTo.type === "image" ? <em>Image</em> : replyTo.content}
        </div>
      </div>
      <button
        className="btn btn-sm btn-light ms-2"
        onClick={cancelReply}
        title="Cancel reply"
      >
        <MdCancel />
      </button>
    </div>
  );
};

export default ReplyPreview;