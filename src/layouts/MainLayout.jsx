import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../assets/css/MainLayout.css';
import Sidebar from '../components/Sidebar';
import useAuthSync from '../hooks/useAuthSync'; 

function MainLayout() {
    useAuthSync(); 

    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const stored = localStorage.getItem("sidebarOpen");
        return stored === null ? false : stored === "true";
    });

    const toggleSidebar = () => {
        localStorage.setItem("sidebarOpen", !sidebarOpen);
        setSidebarOpen((prev) => !prev);
    };

    return (
        <div className="main-layout">
            <Sidebar isOpen={sidebarOpen} />

            <div className={`main-content ${!sidebarOpen ? 'collapsed' : ''}`}>
                <div className="header-fixed">
                    <Header onToggleSidebar={toggleSidebar} />
                </div>

                <ToastContainer
                    position="top-right"
                    autoClose={2000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    pauseOnHover
                />

                <div className="outlet-container">
                    <Outlet />
                </div>

                <Footer />
            </div>
        </div>
    );
}

export default MainLayout;
