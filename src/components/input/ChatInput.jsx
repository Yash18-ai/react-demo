import React, { useRef, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { FaImage } from "react-icons/fa";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import MentionsDropdown from "./MentionsDropdown";

const ChatInput = ({
  input,
  setInput,
  handleSend,
  handleInputChange,
  handleEmojiSelect,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiButtonRef,
  emojiPickerRef,
  fileInputRef,
  handleImageUpload,
  selectedGroup,
  groupMembers,
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState(0);
  const [currentMentions, setCurrentMentions] = useState([]);
  const inputRef = useRef(null);

  const handleLocalInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInput(value);

    if (selectedGroup && groupMembers) {
      const atIndex = value.lastIndexOf('@', cursorPos - 1);

      if (atIndex !== -1) {
        const typed = value.slice(atIndex + 1, cursorPos);
        if (!typed.includes(' ') && (cursorPos === atIndex + 1 || value[atIndex + 1] !== ' ')) {
          setShowMentions(true);
          setMentionFilter(typed);
          setMentionStart(atIndex);
          return;
        }
      }
      setShowMentions(false);
    } else {
      setShowMentions(false);
    }

    if (handleInputChange) handleInputChange(e);
  }

  const handleMentionSelect = (user) => {
    const mentionText = `@${user.name}`;
    const insertPos = mentionStart;
  
    const afterStart = insertPos + 1 + mentionFilter.length;
  
    const before = input.slice(0, insertPos);
    const after = input.slice(afterStart);
  
    const newInput = before + mentionText + ' ' + after;
  
    setInput(newInput);
  
    const newMentions = [...currentMentions, { userId: user.id, name: user.name, offset: insertPos }];
    setCurrentMentions(newMentions);
  
    setShowMentions(false);
    setMentionFilter('');
  
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = insertPos + mentionText.length + 1;
        inputRef.current.focus();
      }
    }, 0);
  };

  const onSendLocal = () => {
    if (selectedGroup) {
      handleSend();
      setCurrentMentions([]);
    } else {
      handleSend();
    }
  }

  const handleLocalSend = () => {
    onSendLocal();
  };

  const dropdownStyle = {
    position: "absolute",
    bottom: "100%",
    left: 0,
    width: "200px",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    zIndex: 1000,
    maxHeight: "150px",
    overflowY: 'auto',
  };

  const safeGroupMembers = groupMembers || [];
  const filteredMembers = safeGroupMembers.filter(u =>
    !mentionFilter || u.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  return (
    <div className="chat-input position-relative">
      <button
        ref={emojiButtonRef}
        className="btn btn-light me-2"
        onClick={() => setShowEmojiPicker((prev) => !prev)}
      >
        <MdOutlineEmojiEmotions size={20} />
      </button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        multiple
        onChange={handleImageUpload}
      />

      <button
        className="btn btn-light me-2"
        onClick={() => fileInputRef.current.click()}
      >
        <FaImage />
      </button>

      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="emoji-picker">
          <Picker data={data} onEmojiSelect={handleEmojiSelect} />
        </div>
      )}

      <input
      ref={inputRef}
        className="form-control me-2 flex-grow-1"
        value={input}
        onChange={handleLocalInputChange}
        onKeyDown={(e) => e.key === "Enter" && handleLocalSend()}
        placeholder="Type a message..."
      />

      <button
        className="btn btn-primary d-flex align-items-center justify-content-center"
        onClick={handleLocalSend}
      >
        <IoMdSend size={20} />
      </button>

      {showMentions && selectedGroup && filteredMembers.length > 0 && (
        <div style={dropdownStyle}>
          <MentionsDropdown
            users={filteredMembers}
            onSelect={handleMentionSelect}
            filter={mentionFilter}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInput;
