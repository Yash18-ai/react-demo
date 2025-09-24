import React, { useState } from "react";
import CommentInput from "./CommentInput";
import { FiCornerUpLeft, FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function CommentTree({
  comments,
  parentId = null,
  level = 0,
}) {
  return comments
    .filter((c) => c.parentId === parentId)
    .map((c) => (
      <CommentNode
        key={c.id}
        comment={c}
        comments={comments}
        level={level}
      />
    ));
}

function CommentNode({ comment: c, comments, level }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const childComments = comments.filter((x) => x.parentId === c.id);
  const hasReplies = childComments.length > 0;

  return (
    <li className="d-flex mb-3" style={{ marginLeft: level * 2 + "rem" }}>
      <div
        className="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center"
        style={{ width: 36, height: 36, fontSize: 14 }}
      >
        {c.authorInitials || "AD"}
      </div>

      <div className="ms-2 flex-grow-1">
        <div className="d-flex justify-content-between">
          <strong>{c.authorName || "Author"}</strong>
          <small className="text-muted">
            {new Date(c.createdAt).toLocaleTimeString()}
          </small>
        </div>
        <p className="mb-1">{c.text}</p>

        <button
          className="btn btn-link btn-sm p-0 d-flex align-items-center gap-1"
          onClick={() => setReplyOpen((o) => !o)}
        >
          {/* <FiCornerUpLeft /> */}
          Reply
        </button>

        {replyOpen && (
          <div className="mt-2">
            <CommentInput
              productId={c.productId}
              parentId={c.id}
              level={level + 1}
              onCancel={() => setReplyOpen(false)}
            />
          </div>
        )}

        {hasReplies && (
          <div className="mt-2">
            <button
              className="btn btn-sm btn-outline-light text-primary p-0 d-flex align-items-center gap-1"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? <FiChevronUp /> : <FiChevronDown />}
              {showReplies ? "Hide replies" : `View replies (${childComments.length})`}
            </button>
          </div>
        )}

        {showReplies && (
          <CommentTree
            comments={comments}
            parentId={c.id}
            level={level + 1}
          />
        )}
      </div>
    </li>
  );
}
