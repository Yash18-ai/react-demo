import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FaHome,
  FaUsers,
  FaBoxOpen,
  FaUser,
  FaReact,
  FaChevronDown,
  FaChevronRight,
  FaSpa,
  FaPumpSoap,
  FaCouch,
  FaAppleAlt,
} from "react-icons/fa";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import "../assets/css/sidebar.css";
import { fetchProducts } from "../features/products/productSlice";
import { fetchCategories } from "../features/categories/categorySlice";
import { BiSolidDashboard } from "react-icons/bi";
import { FaYoutube } from "react-icons/fa6";
import { MdOutlineMarkUnreadChatAlt } from "react-icons/md";
import { FaChartLine } from "react-icons/fa";

// function NavItem({ to, icon: Icon, label, tooltipId, tooltipContent, active, onClick, chevron }) {
//   return (
//     <div className={`sidebar-item ${active ? "active" : ""}`} data-tooltip-id={tooltipId} data-tooltip-content={tooltipContent}>
//       <Link to={to} className="d-flex align-items-center text-white text-decoration-none w-100" onClick={onClick}>
//         <Icon className="icon" />
//         {label && <span className="label ms-2">{label}</span>}
//         {chevron && <span className="chevron ms-auto">{chevron}</span>}
//       </Link>
//     </div>
//   );
// }

function NavItem({ to, icon: Icon, label, tooltipId, tooltipContent, active, onClick, chevron }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-item d-flex align-items-center text-white text-decoration-none w-100 ${active ? "active" : ""}`}
      data-tooltip-id={tooltipId}
      data-tooltip-content={tooltipContent}
    >
      <Icon className="icon" />
      {label && <span className="label ms-2">{label}</span>}
      {chevron && <span className="chevron ms-auto">{chevron}</span>}
    </Link>
  );
}


export default function Sidebar({ isOpen }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const products = useSelector((s) => s.products.items);

  const categories = useSelector((s) => s.categories.items);
  const [showProductSubmenu, setShowProductSubmenu] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!Array.isArray(products) || products.length === 0) {
      dispatch(fetchProducts());
    }
  }, [dispatch, products]);

  const getCategoryIcon = (name) => {
    switch (name?.toLowerCase()) {
      case "beauty": return FaSpa;
      case "fragrances": return FaPumpSoap;
      case "furniture": return FaCouch;
      case "groceries": return FaAppleAlt;
      default: return FaBoxOpen;
    }
  };


  return (
    <>
      <div className={`sidebar bg-dark text-white ${isOpen ? "open" : "closed"}`}>
        <NavItem
          to="/"
          icon={FaReact}
          label={isOpen ? "MyReactApp" : null}
          tooltipId="tooltip-brand"
          tooltipContent="MyReactApp"
          active={location.pathname === "/"}
        />
        <NavItem
          to="/"
          icon={FaHome}
          label={isOpen ? "Home" : null}
          tooltipId="tooltip-home"
          tooltipContent="Home"
          active={location.pathname === "/"}
        />
        <NavItem
          to="/team-member"
          icon={FaUsers}
          label={isOpen ? "Teams" : null}
          tooltipId="tooltip-teams"
          tooltipContent="Teams"
          active={location.pathname === "/team-member"}
        />
        <NavItem
          to="/product"
          icon={FaBoxOpen}
          label={isOpen ? "Product" : null}
          tooltipId="tooltip-product"
          tooltipContent="Product"
          active={location.pathname === "/product"}
          chevron={
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowProductSubmenu((s) => !s);
              }}
            >
              {showProductSubmenu ? <FaChevronDown /> : <FaChevronRight />}
            </span>
          }
        />
        {showProductSubmenu && (
          <div className="submenu">
            {categories.map((catObj) => {
              const Icon = getCategoryIcon(catObj.name); // use name string only
              const target = `/product?category=${encodeURIComponent(catObj.name)}`; // encode name
              return (
                <NavItem
                  key={catObj.id}
                  to={target}
                  icon={Icon}
                  label={isOpen ? catObj.name : null}
                  tooltipId={`tooltip-${catObj.name}`}
                  tooltipContent={catObj.name}
                  active={location.search.includes(catObj.name)}
                />
              );
            })}
          </div>
        )}
        <NavItem
          to="/user"
          icon={FaUser}
          label={isOpen ? "User" : null}
          tooltipId="tooltip-user"
          tooltipContent="User"
          active={location.pathname === "/user"}
        />
        <NavItem
          to="/dashboard"
          icon={BiSolidDashboard}
          label={isOpen ? "Dashboard" : null}
          tooltipId="tooltip-dashboard"
          tooltipContent="Dashboard"
          active={location.pathname === "/dashboard"}
        />
        <NavItem
          to="/videos"
          icon={FaYoutube}
          label={isOpen ? "Videos" : null}
          tooltipId="tooltip-videos"
          tooltipContent="Videos"
          active={location.pathname === "/videos"}
        />
        {/* <NavItem
          to="/chart"
          icon={FaChartLine}
          label={isOpen ? "Chart" : null}
          tooltipId="tooltip-chart"
          tooltipContent="Chart"
          active={location.pathname === "/chart"}
        /> */}
        <NavItem
          to="/chat"
          icon={MdOutlineMarkUnreadChatAlt}
          label={isOpen ? "Chat" : null}
          tooltipId="tooltip-chat"
          tooltipContent="Chat"
          active={location.pathname === "/chat"}
        />
      </div>

      {!isOpen && (
        <div style={{ position: "absolute", zIndex: 2000 }}>
          <Tooltip id="tooltip-brand" place="right" />
          <Tooltip id="tooltip-home" place="right" />
          <Tooltip id="tooltip-teams" place="right" />
          <Tooltip id="tooltip-product" place="right" />
          <Tooltip id="tooltip-user" place="right" />
          <Tooltip id="tooltip-dashboard" place="right" />
          <Tooltip id="tooltip-videos" place="right" />
          <Tooltip id="tooltip-chart" place="right" />
        </div>
      )}
    </>
  );
}
