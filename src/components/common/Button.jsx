import React from 'react';

export default function Button({
    children, //content inside the button
    variant = 'primary',    
    size = 'md',             
    ...props
}) {
    const base = 'btn';
    const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
    return (
        <button
            className={`${base} btn-${variant} ${sizeClass}`}
            {...props}
        >
            {children}
        </button>
    );
}
