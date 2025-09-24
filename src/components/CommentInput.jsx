import { useState } from "react";
import { useDispatch } from "react-redux";
import { addComment } from "../features/comments/commentSlice";

export default function CommentInput({
  productId,
  parentId = null,
  level = 0,
  onCancel,
}) {
  const [text, setText] = useState("");
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch(addComment({ productId, parentId, text }));
    setText("");
    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="d-flex align-items-center"
      style={{ gap: "0.5rem" }}
    >
      <input
        type="text"
        className="form-control form-control-sm rounded-pill"
        placeholder={parentId ? "Type your reply…" : "Type your comment…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="btn btn-sm btn-primary rounded-pill px-3">
        Post
      </button>
      {onCancel && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </form>
  );
}
