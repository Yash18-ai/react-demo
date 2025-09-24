import React from "react";
import { useDispatch } from "react-redux";
import { createGroup } from "../../features/messages/messagesSlice";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";

const CreateGroupModal = ({ show, onClose, users = [], currentUser }) => {
  const dispatch = useDispatch();
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const formik = useFormik({
    initialValues: {
      groupName: "",
    },
    validationSchema: Yup.object({
      groupName: Yup.string()
        .trim()
        .required("Group name is required.")
        .max(20, "Group name must be at most 20 characters"),
    }),
    onSubmit: (values) => {
      if (selectedMembers.length === 0) {
        toast.error("At least 1 member is required to create a group.");
        return;
      }

      const creatorId = currentUser?.id?.toString();
      const membersSet = new Set(selectedMembers.map(String));
      if (creatorId) membersSet.add(creatorId);

      const admins = isPrivate
        ? creatorId
          ? [creatorId]
          : []
        : [];

      const newGroup = {
        id: Date.now().toString(),
        name: values.groupName,
        members: Array.from(membersSet),
        creator: creatorId || null,
        avatar: null,
        isPrivate: !!isPrivate,
        admins: admins,
      };
      dispatch(createGroup(newGroup));

      toast.success("Group created successfully!");

      onClose();
      formik.resetForm();
      setSelectedMembers([]);
      setIsPrivate(false);
      setSearchTerm("");
    }
  });

  if (!show) return null;

  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = searchTerm
    ? safeUsers.filter((u) =>
        (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : safeUsers;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content p-3">
          <h5>Create Group</h5>

          <form onSubmit={formik.handleSubmit}>
            <input className="form-control mb-2"
              placeholder="Group Name"
              name="groupName"
              value={formik.values.groupName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.groupName && formik.errors.groupName && (
              <div className="text-danger mb-2">{formik.errors.groupName}</div>
            )}


            <div className="mb-2">
              <div className="form-check form-switch">
                <input 
                  className="form-check-input"
                  type="checkbox"
                  id="privateSwitch"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)} 
                />
                <label className="form-check-label" htmlFor="privateSwitch">
                  Private group (only admins can send messages)
                </label>
              </div>
            </div>

            <div className="mb-2">
              <input 
                type="text"
                className="form-control"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="mb-4" style={{ maxHeight: 260, overflow: "auto" }}>
              {filteredUsers.length === 0 ? (
                <div className="text-muted small">No users found</div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      value={u.id}
                      checked={selectedMembers.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedMembers([...selectedMembers, u.id]);
                        else
                          setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                      }}
                      id={`chk-${u.id}`}
                    />
                    <label className="form-check-label" htmlFor={`chk-${u.id}`}>
                      {u.name}
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="submit" className="btn btn-primary me-2">
                Create
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
