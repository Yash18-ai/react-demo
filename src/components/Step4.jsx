import React from "react";

function Step4({ personal, address, images = [], back, submit }) {
    return (
        <div>
            <h5>Review Your Data</h5>

            <ul className="list-group mb-3">
                {Object.entries({ ...personal, ...address }).map(([key, value]) => (
                    <li key={key} className="list-group-item">
                        <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {String(value)}
                    </li>
                ))}

                <li className="list-group-item">
                    <strong>Images:</strong>
                    <div className="d-flex gap-2 flex-wrap mt-2">
                        {Array.isArray(images) && images.length > 0 ? (
                            images.map((img) => (
                                <img
                                    key={img.id}
                                    src={img.dataUrl}
                                    alt={img.name}
                                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }}
                                />
                            ))
                        ) : (
                            <div>No images uploaded</div>
                        )}
                    </div>
                </li>
            </ul>

            <div className="d-flex">
                <button type="button" className="btn btn-secondary me-2" onClick={back}>
                    Back
                </button>
                <button type="button" className="btn btn-success" onClick={submit}>
                    Submit
                </button>
            </div>
        </div>
    );
}

export default Step4;
