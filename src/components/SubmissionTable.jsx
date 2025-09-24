// import React from "react";

// function SubmissionTable({ personal, address }) {
//     return (
//         <table className="table table-bordered mt-4">
//             <thead >
//                 <tr>
//                     <th>Field</th>
//                     <th>Value</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 {Object.entries({ ...personal, ...address }).map(([k, v]) => (
//                     <tr key={k}>
//                         <td>{k}</td>
//                         <td>{v}</td>
//                     </tr>
//                 ))}
//             </tbody>
//         </table>
//     );
// }

// export default SubmissionTable;


import React from "react";

function SubmissionTable({ personal = {}, address = {}, images = [] }) {
    const merged = { ...personal, ...address };

    const renderValue = (v) => {
        if (v === null || v === undefined) return "";

        if (Array.isArray(v)) {
            return v.join(", ");
        }

        if (typeof v === "object") {
            try {
                return JSON.stringify(v);
            } catch {
                return String(v);
            }
        }

        return String(v);
    };

    return (
        <table className="table table-bordered mt-4">
            <thead >
                <tr>
                    <th>Field</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                {Object.entries(merged).map(([k, v]) => (
                    <tr key={k}>
                        <td style={{ textTransform: "capitalize" }}>{k}</td>
                        <td>{renderValue(v)}</td>
                    </tr>
                ))}

                <tr>
                    <td style={{ textTransform: "capitalize" }}>images</td>
                    <td>
                        <div className="d-flex gap-2 flex-wrap">
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
                                <div>No images</div>
                            )}
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    );
}

export default SubmissionTable;
