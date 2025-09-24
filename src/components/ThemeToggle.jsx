import React from 'react'
import { useTheme } from '../context/ThemeContext'

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const textColor = theme === 'light' ? 'text-dark' : 'text-light';

    return (
        <div className={`d-flex align-items-center ms-3 ${textColor}`}>
            <span className="small me-1">Light</span>
            <div className="form-check form-switch m-0">
                <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    onChange={toggleTheme}
                    checked={theme === 'dark'}
                />
            </div>
            <span className="small ms-1">Dark</span>
        </div>
    );
}

export default ThemeToggle;
