import React from 'react';

export default function Input({
    label,
    type = 'text',
    value,
    onChange,
    name,
    error,
    ...props
}) {
    return (
        <div className="mb-1">
            {label && <label className="form-label">{label}</label>}
            <input
                type={type}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                name={name}
                value={value}
                onChange={onChange}
                {...props}
            />
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
}
