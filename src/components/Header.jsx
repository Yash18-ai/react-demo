import React from 'react'
import { FaBarsStaggered } from 'react-icons/fa6'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../features/auth/authSlice'
import { setUserOffline } from '../features/messages/messagesSlice'
import { useNavigate, useLocation } from 'react-router-dom'
import { getDecryptedToken } from '../features/auth/authSlice'
// import { persistor } from "../app/store";

function Header({ onToggleSidebar }) {
    const { theme } = useTheme();
    const navTheme = theme === 'light' ? 'navbar-light bg-light' : 'navbar-dark bg-dark';
    const borderOrShadow = theme === 'light' ? 'border-bottom shadow-sm' : 'border-bottom border-secondary';

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const token = getDecryptedToken();

    const currentUser = useSelector((state) => state.auth.user?.user);

    const handleLogout = () => {
        const uid = currentUser?.id;
        if (uid) {
            dispatch(setUserOffline(uid));
        }

        dispatch(logout());
        // persistor.purge();
        navigate('/login', { replace: true });
    };

    const isAuthPage = ['/login'].includes(location.pathname);

    return (
        <nav className={`navbar ${navTheme} px-4 d-flex justify-content-between align-items-center ${borderOrShadow}`}>
            <button className="btn btn-outline-secondary me-2" onClick={onToggleSidebar}>
                <FaBarsStaggered />
            </button>

            <div className="d-flex align-items-center ms-auto">
                <ThemeToggle />
                <div className="mx-3"></div>
                {!isAuthPage && (
                    token ? (
                        <button className="btn btn-outline-danger me-2" onClick={handleLogout}>
                            Logout
                        </button>
                    ) : (
                        <button className="btn btn-outline-primary me-2" onClick={() => navigate('/login')}>
                            Login
                        </button>
                    )
                )}
            </div>

        </nav>
    )
}

export default Header
