import React, { useState, useEffect } from "react";
import { MdCancel } from "react-icons/md";
import { CiCircleRemove } from "react-icons/ci";
import { FiUserPlus, FiUserX } from "react-icons/fi";
import { FaUserShield } from "react-icons/fa";
import { useDispatch } from "react-redux";
import Swal from "sweetalert2";
import { updateGroupAdmins } from "../../features/messages/messagesSlice";

const MembersModal = ({
  show,
  onClose,
  selectedGroup,
  currentUser,
  users,
  onlineUsers,
  lastSeen,
  memberToAdd,
  setMemberToAdd,
  handleAddMember,
  handleRemoveMember,
  handleLeaveGroup,
  formatLastSeen,
}) => {
  const dispatch = useDispatch();

  const [localAdmins, setLocalAdmins] = useState(new Set());

  useEffect(() => {
    if (selectedGroup && Array.isArray(selectedGroup.admins)) {
      setLocalAdmins(new Set((selectedGroup.admins || []).map((a) => a.toString())));
    } else {
      setLocalAdmins(new Set());
    }
  }, [selectedGroup]);

  if (!show || !selectedGroup) return null;

  let groupMembers = (selectedGroup.members || []).map((memberId) => {
    const foundUser = users.find((u) => u.id.toString() === memberId.toString());

    if (foundUser) {
      return foundUser;
    }

    return {
      id: memberId,
      name: `User ${memberId}`,
      avatar: "/User.png",
    };
  });

  let availableToAdd = users
    .filter((u) => {
      const userId = u.id.toString();
      const memberIds = (selectedGroup.members || []).map((m) => m.toString());
      return !memberIds.includes(userId);
    })
    .filter((u) => u.id.toString() !== currentUser.id.toString());

  const currentUserIdStr = currentUser?.id?.toString();
  const isGroupCreator = selectedGroup.creator && currentUserIdStr === selectedGroup.creator.toString();
  const isAdmin = (selectedGroup.admins || []).map(String).includes(currentUserIdStr);
  const canManageAdmins = !!currentUserIdStr && (isGroupCreator || isAdmin);

  const handleToggleAdmin = (memberId) => {
    if (!canManageAdmins) return;

    const memberIdStr = memberId.toString();

    if (selectedGroup.creator && memberIdStr === selectedGroup.creator.toString()) {
      return;
    }

    const currentlyAdmin = localAdmins.has(memberIdStr);

    const updatedSet = new Set(localAdmins);
    if (currentlyAdmin) {
      updatedSet.delete(memberIdStr);
    } else {
      updatedSet.add(memberIdStr);
    }
    setLocalAdmins(updatedSet);

    const memberIds = (selectedGroup.members || []).map((m) => m.toString());
    const adminArray = Array.from(updatedSet).filter((id) => memberIds.includes(id));

    dispatch(updateGroupAdmins({ groupId: selectedGroup.id, admins: adminArray }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content p-3">

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <img
                src={selectedGroup.avatar || "/Group.png"}
                alt={selectedGroup.name}
                className="rounded-circle me-2 modal-group-avatar"
                onError={(e) => {
                  e.target.onError = null;
                  e.target.src = "/Group.png";
                }}
                width={48}
                height={48}
              />
              <div>
                <h5 className="mb-0">{selectedGroup.name}</h5>
                <small className="text-muted">{(selectedGroup.members || []).length} members</small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {currentUser && (selectedGroup.members || []).map(String).includes(currentUser.id.toString()) && (
                <button
                  className={`btn btn-sm ${selectedGroup.creator && selectedGroup.creator.toString() === currentUser.id.toString() ? "btn-outline-secondary" : "btn-warning"}`}
                  onClick={handleLeaveGroup}
                  title="Leave group"
                >
                  Leave
                </button>
              )}
              <button className="btn btn-sm btn-secondary" onClick={onClose}>
                <MdCancel size={20} />
              </button>
            </div>
          </div>

          <div className="mb-2">
            <small className="text-muted">Created by:{" "}
              {(selectedGroup.creator && users.find(u => u.id.toString() === selectedGroup.creator))
                ? users.find(u => u.id.toString() === selectedGroup.creator).name
                : "Unknown"}
            </small>
          </div>

          <div style={{ maxHeight: 300, overflow: "auto" }} className="member-list">
            {groupMembers.map((m) => {
              const mIdStr = m.id?.toString();
              const isMemberAdmin =
                localAdmins.has(mIdStr) ||
                (selectedGroup.admins || []).map(String).includes(mIdStr) ||
                (selectedGroup.creator && mIdStr === selectedGroup.creator.toString());

              const isGroupCreator = selectedGroup.creator && mIdStr === selectedGroup.creator.toString();
              return (
                <div
                  key={m.id}
                  className="d-flex align-items-center justify-content-between p-2 border-bottom member-row"
                >
                  <div className="d-flex align-items-center">
                    <img
                      src={m.avatar || "/User.png"}
                      alt={m.name}
                      width={40}
                      height={40}
                      className="rounded-circle me-3"
                    />
                    <div>
                      <div className="fw-bold">{m.name}</div>
                      <div>
                        <small className="text-muted">
                          {onlineUsers?.[m.id?.toString()]
                            ? "Online"
                            : lastSeen?.[m.id?.toString()]
                              ? formatLastSeen(lastSeen[m.id?.toString()])
                              : "Offline"}
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center">
                    {isMemberAdmin && (
                      <div className="d-flex align-items-center gap-1 me-2 admin-badge" title="Admin">
                        <FaUserShield />
                        <small className="ms-1">Admin</small>
                      </div>
                    )}

                    {selectedGroup.creator &&
                      currentUser &&
                      currentUser.id &&
                      currentUser.id.toString() === selectedGroup.creator.toString() &&
                      mIdStr !== selectedGroup.creator.toString() && (
                        <button
                          className="btn btn-sm btn-danger ms-2"
                          onClick={() => handleRemoveMember(m.id)}
                          title="Remove member"
                        >
                          <CiCircleRemove size={18} />
                        </button>
                      )}

                    {canManageAdmins && !isGroupCreator && (
                      <>
                        {isMemberAdmin ? (
                          <button
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: `Remove admin?`,
                                text: `Remove admin from ${m.name}?`,
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonText: "Yes, remove",
                                cancelButtonText: "Cancel",
                                reverseButtons: true,
                              });
                              if (result.isConfirmed) {
                                handleToggleAdmin(m.id);
                                await Swal.fire({
                                  icon: "success",
                                  title: "Removed",
                                  text: `${m.name} is no longer an admin.`,
                                  timer: 1400,
                                  showConfirmButton: false,
                                });
                              }
                            }}
                            title="Remove admin"
                          >
                            <FiUserX size={16} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-success ms-2"
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: `Make admin?`,
                                text: `Make ${m.name} an admin?`,
                                icon: "question",
                                showCancelButton: true,
                                confirmButtonText: "Yes, make admin",
                                cancelButtonText: "Cancel",
                                reverseButtons: true,
                              });
                              if (result.isConfirmed) {
                                handleToggleAdmin(m.id);
                                await Swal.fire({
                                  icon: "success",
                                  title: "Done",
                                  text: `${m.name} is now an admin.`,
                                  timer: 1400,
                                  showConfirmButton: false,
                                });
                              }
                            }}
                            title="Make admin"
                          >
                            <FiUserPlus size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {groupMembers.length === 0 && (
              <div className="text-muted p-2">No members</div>
            )}
          </div>

          <div className="mt-3">
            <h6>Add member</h6>
            <div className="d-flex gap-2 align-items-center">
              <select className="form-select" value={memberToAdd || ""} onChange={(e) => setMemberToAdd(e.target.value)}>
                <option value="">Select user to add</option>
                {availableToAdd.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleAddMember} disabled={!memberToAdd}>
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembersModal;
