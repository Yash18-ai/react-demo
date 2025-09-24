import React from 'react'
import { useTheme } from '../context/ThemeContext'

function Footer() {
    const { theme } = useTheme();
    const footerTheme = theme === 'light' ? 'bg-light text-dark border-top shadow-sm' : 'bg-dark text-light border-top border-secondary';

    return (
        // <footer className={`text-center mt-auto py-3 fixed-bottom z-0  ${footerTheme}`}>
        <footer className={`text-center mt-auto py-3  ${footerTheme}`}>
            <div className="container">
                <p className="mb-0">&copy; 2025 MyReactApp. All rights reserved.</p>
            </div>
        </footer>
    )
}

export default Footer
