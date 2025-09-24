// import React from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useSelector, useDispatch } from "react-redux";
// import { deleteSubmission } from "../features/form/formSlice";
// import Swal from "sweetalert2";
// import SubmissionTable from "../components/SubmissionTable";
// import FormModal from "../components/FormModal";
// import { useState } from "react";

// export default function SubmissionView() {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const dispatch = useDispatch();
//     const [editModal, setEditModal] = useState(false);

//     const currentUserId = useSelector((s) => s.auth.user?.user?.id);
//      const submission = useSelector((s) =>
//            s.form.submissions.find(
//              (x) => x.id === id && x.userId === currentUserId
//            )
//          );

//     if (!submission) return <p>Submission not found.</p>;

//     const handleDelete = () => {
//         Swal.fire({
//             title: "Delete this submission?",
//             icon: "warning",
//             showCancelButton: true,
//             confirmButtonText: "Yes, delete it!",
//         }).then((res) => {
//             if (res.isConfirmed) {
//                 dispatch(deleteSubmission(id));
//                 Swal.fire("Deleted", "Submission removed", "success");
//                 navigate("/");
//             }
//         });
//     };

//     return (
//         <div className="container py-4">
//             <h2>Submission Details</h2>
//             <SubmissionTable personal={submission.personal} address={submission.address} />
            
//             <button className="btn btn-primary me-2" onClick={() => setEditModal(true)}>
//                 Edit
//             </button>
//             <button className="btn btn-danger me-2" onClick={handleDelete}>
//                 Delete
//             </button>
//             <button className="btn btn-secondary" onClick={() => navigate("/")}>
//                 Back to list
//             </button>


//             {editModal && (
//                 <FormModal onClose={() => setEditModal(false)} editId={id} />
//             )}
//         </div>
//     );
// }


import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { deleteSubmission } from "../features/form/formSlice";
import Swal from "sweetalert2";
import SubmissionTable from "../components/SubmissionTable";
import FormModal from "../components/FormModal";

export default function SubmissionView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [editModal, setEditModal] = useState(false);

    const currentUserId = useSelector((s) => s.auth.user?.user?.id);
    const submission = useSelector((s) =>
        s.form.submissions.find(
            (x) => x.id === id && x.userId === currentUserId
        )
    );

    if (!submission) return <p>Submission not found.</p>;

    const handleDelete = () => {
        Swal.fire({
            title: "Delete this submission?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
        }).then((res) => {
            if (res.isConfirmed) {
                dispatch(deleteSubmission(id));
                Swal.fire("Deleted", "Submission removed", "success");
                navigate("/");
            }
        });
    };

    const avatarSrc = submission.images?.[0]?.dataUrl || "";

    return (
        <div className="container py-4">
            <h2>Submission Details</h2>

            {avatarSrc ? (
                <div className="mb-3">
                    <img
                        src={avatarSrc}
                        alt="avatar"
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #ccc"
                        }}
                    />
                </div>
            ) : null}

            <SubmissionTable personal={submission.personal} address={submission.address} images={submission.images} />

            <button className="btn btn-primary me-2" onClick={() => setEditModal(true)}>
                Edit
            </button>
            <button className="btn btn-danger me-2" onClick={handleDelete}>
                Delete
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("/")}>
                Back to list
            </button>

            {editModal && (
                <FormModal onClose={() => setEditModal(false)} editId={id} />
            )}
        </div>
    );
}
