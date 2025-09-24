import React from "react";

const MentionsDropdown = ({ users, onSelect, filter }) => {
  return (
    <div className="mentions-dropdown">
      {users.map((user) => (
        <div 
          key={user.id} 
          onClick={() => onSelect(user)} 
          className="mention-item d-flex align-items-center p-2 border-bottom cursor-pointer"
          style={{ backgroundColor: 'white' }}
        >
          <img 
            src={user.avatar || "/User.png"} 
            alt={user.name} 
            style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px' }} 
          />
          <span>{user.name}</span>
        </div>
      ))}
    </div>
  );
};

export default MentionsDropdown;