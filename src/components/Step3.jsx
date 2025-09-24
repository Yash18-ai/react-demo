// import React from "react";

// function Step3({ personal, address, back, submit }) {
//     return (
//         <div>
//             <h5>Review Your Data</h5>
//             <ul className="list-group mb-3">
//                 {Object.entries({ ...personal, ...address }).map(([key, value]) => (
//                     <li key={key} className="list-group-item">
//                         <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
//                     </li>
//                 ))}
//             </ul>
//             <div className="d-flex">
//                 <button type="button" className="btn btn-secondary me-2" onClick={back}>
//                     Back
//                 </button>
//                 <button type="button" className="btn btn-success" onClick={submit}>
//                     Submit
//                 </button>
//             </div>
//         </div >
//     );
// }

// export default Step3;

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { nanoid } from "nanoid";

function fileToDataUrl(file) {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
    });
}

function Step3({ data, next, back }) {
    const [images, setImages] = useState(data.images || []);

    useEffect(() => {
        setImages(data.images || []);
    }, [data.images]);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;
        const converted = await Promise.all(
            acceptedFiles.map(async (file) => {
                const dataUrl = await fileToDataUrl(file);
                return {
                    id: nanoid(),
                    name: file.name,
                    dataUrl,
                };
            })
        );
        setImages((prev) => [...prev, ...converted]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/*": [] },
        multiple: true,
    });

    const removeImage = (id) => {
        setImages((prev) => prev.filter((img) => img.id !== id));
    };

    const handleNext = () => {
        next({ images });
    };

    return (
        <div>
            <label className="form-label">Upload Images</label>
            <div
                {...getRootProps()}
                style={{
                    border: "2px dashed #ccc",
                    padding: 12,
                    borderRadius: 6,
                    textAlign: "center",
                }}
            >
                <input {...getInputProps()} />
                {isDragActive ? (
                    <p>Drop images here...</p>
                ) : (
                    <p>Drag & drop images here, or click to select files</p>
                )}
            </div>

            <div className="d-flex gap-2 flex-wrap mt-3">
                {images.map((img) => (
                    <div key={img.id} style={{ position: "relative" }}>
                        <img
                            src={img.dataUrl}
                            alt={img.name}
                            style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 4 }}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            style={{ position: "absolute", top: 6, right: 6 }}
                            onClick={() => removeImage(img.id)}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>

            <div className="d-flex mt-3">
                <button type="button" className="btn btn-secondary me-2" onClick={back}>
                    Back
                </button>
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Next
                </button>
            </div>
        </div>
    );
}

export default Step3;
