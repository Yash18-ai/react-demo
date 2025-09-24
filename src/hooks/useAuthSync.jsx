// import { useEffect } from 'react';
// import Cookies from 'js-cookie';
// import { useDispatch } from 'react-redux';
// import { logout } from '../features/auth/authSlice';

// const useAuthSync = () => {
//     const dispatch = useDispatch();

//     useEffect(() => {
//         const interval = setInterval(() => {
//             if (!Cookies.get('auth_token')) {
//                 dispatch(logout());
//             }
//         }, 1000);

//         return () => clearInterval(interval);
//     }, [dispatch]);
// };

// export default useAuthSync;


import { useEffect } from "react";
import Cookies from "js-cookie";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { setUserOffline } from "../features/messages/messagesSlice";

const useAuthSync = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user?.user);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!Cookies.get("auth_token") && currentUser?.id) {
        dispatch(setUserOffline(currentUser.id));
        dispatch(logout());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatch, currentUser]);
};

export default useAuthSync;
