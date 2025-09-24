import React from "react";
import { MdCancel } from "react-icons/md";

const ImagePreview = ({ previewFiles, setPreviewFiles }) => {
  if (previewFiles.length === 0) return null;

  return (
    <div className="p-2 border-top d-flex flex-wrap">
      {previewFiles.map((file, idx) => (
        <div
          key={idx}
          className="d-flex align-items-center border rounded p-1 me-2 mb-2"
          style={{ maxWidth: "150px" }}
        >
          <img
            src={file}
            alt="preview"
            style={{ maxHeight: "60px", borderRadius: "6px" }}
            className="me-2"
          />
          <button
            className="btn btn-sm btn-danger"
            onClick={() =>
              setPreviewFiles((prev) => prev.filter((_, index) => index !== idx))
            }
          >
            <MdCancel />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ImagePreview;