import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import TeamMember from "./pages/TeamMember";
import Product from "./pages/Product";
import User from "./pages/User";
import FormPage from "./pages/FormPage";
import ProductDetail from "./components/ProductDetail";
import NotFound from "./pages/NotFound";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import SubmissionView from "./components/SubmissionView";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Dashboard from "./pages/Dashboard";
import CourseDetails from "./components/CourseDetails";
import VideoList from "./pages/VideoList";
import Chart from "./pages/Chart";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="team-member" element={<TeamMember />} />
            <Route path="product" element={<Product />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="user" element={<User />} />
            <Route path="form">
              <Route index element={<FormPage />} />
              <Route path=":id" element={<FormPage />} />
            </Route>
            <Route path="submission/:id" element={<SubmissionView />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="/course/:id" element={<CourseDetails />} />
            <Route path="videos" element={<VideoList />}/>
            <Route path="chart" element= {<Chart />} />
            <Route path="chat" element={<Chat />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      <ToastContainer position='top-right' autoClose={3000} />
    </BrowserRouter>
  );
}
