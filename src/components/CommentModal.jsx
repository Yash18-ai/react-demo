import React from "react";
import { useSelector } from "react-redux";
import CommentTree from "./CommentTree";
import CommentInput from "./CommentInput";

export default function CommentModal({ productId, onClose }) {
  const comments = useSelector(
    (s) => s.comments.byProduct[productId] || []
  );

  return (
    <div className="modal show d-block" tabIndex={-1} onClick={onClose}>
      <div
        className="modal-dialog modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title">Comments ({comments.length})</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            <div className="d-flex align-items-center mb-3">
              <div
                className="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center"
                style={{ width: 40, height: 40, fontSize: 16 }}
              >
                AD
              </div>
              <div className="flex-grow-1 ms-2">
                <CommentInput productId={productId} level={0} />
              </div>
            </div>

            <hr />

            <ul className="list-unstyled">
              <CommentTree
                comments={comments.map((c) => ({ ...c, productId }))}
              />
            </ul>
          </div>

          {/* <div className="modal-footer border-0 pt-0">
            <button
              type="button"
              className="btn btn-light"
              onClick={onClose}
            >
              Close
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
