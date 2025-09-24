import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

function PasswordInput({ value, onChange, name, onBlur }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <input
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                name={name}
                className="form-control"
                placeholder="Enter your password"
                style={{ paddingRight: '40px' }}
                required
            />
            <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                    position: 'absolute',
                    top: '5px',
                    right: '10px',
                    cursor: 'pointer',
                    color: '#333',
                }}
            >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </span>
        </div>
    );
}

export default PasswordInput;