import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, signup } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { toast } from 'react-toastify';
import PasswordInput from './components/PasswordInput';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const users = useSelector(state => state.auth.users) || [];
  const error = useSelector(state => state.auth.error);

  useEffect(() => {
    if (error) {
      const msg = Array.isArray(error?.message)
        ? error.message.join(', ')
        : error.message || String(error);

      toast.error(msg || 'Something went wrong');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .required('Name is required.')
        .min(4, 'Name must be at least 4 characters.')
        .max(20, 'Name must be at most 20 characters.'),
      email: Yup.string()
        .required('Email is required.')
        .matches(
          /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i,
          'Enter a valid email address.'
        ),
      password: Yup.string()
        .trim('Password cannot include leading or trailing spaces.')
        .required('Password is required.')
        .min(6, 'Password must be at least 6 characters.')
        .max(20, 'Password must be at most 20 characters.')
        .matches(/^\S*$/, 'Password cannot contain spaces.'),
    }),
    onSubmit: async values => {
      const trimmedValues = {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password.trim(),
      };

      const emailExists = users.some(u => u.email === trimmedValues.email);

      if (emailExists) {
        toast.error('Email already registered!');
      } else {
        try {
          const response = await dispatch(signup(trimmedValues)).unwrap();
          console.log(response);
          toast.success('Registered successfully!');
          navigate('/login');
        } catch (err) {
          const msg =
            typeof err === 'string'
              ? err
              : err?.message || JSON.stringify(err) || 'Registration failed';
          toast.error(msg);
        }
      }
    },
  });

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow" style={{ width: '100%', maxWidth: '400px' }} >
        <h3 className="text-center mb-3">Register</h3>
        <form onSubmit={formik.handleSubmit} noValidate>
          <div className="mb-3">
            <Input
              label="Name"
              name="name"
              type="text"
              value={formik.values.name}
              onChange={formik.handleChange}
              placeholder="Enter your name"
            />
            {formik.errors.name && (
              <div className="text-danger">{formik.errors.name}</div>
            )}
          </div>

          <div className="mb-3">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              placeholder="Enter your email"
            />
            {formik.errors.email && (
              <div className="text-danger">{formik.errors.email}</div>
            )}
          </div>

          <div className="mb-3">
            <label>Password</label>
            <PasswordInput
              value={formik.values.password}
              onChange={formik.handleChange}
              name="password"
            />
            {formik.errors.password && (
              <div className="text-danger">{formik.errors.password}</div>
            )}
          </div>

          <Button
            type="submit"
            variant="success"
            size="md"
            className="btn btn-success w-100"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Processing...
              </>
            ) : (
              'Register'
            )}
          </Button>

          <div className="text-center mt-3">
            <p>
              Already have an account?{' '}
              <Button variant="link" onClick={() => navigate('/login')}>
                Login
              </Button>
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}


// import React, { useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { clearError, signup } from '../../features/auth/authSlice';
// import { useNavigate } from 'react-router-dom';
// import { useFormik } from 'formik';
// import * as Yup from 'yup';

// import Input from '../../components/common/Input';
// import Button from '../../components/common/Button';
// import { toast } from 'react-toastify';
// import PasswordInput from './components/PasswordInput';

// export default function Register() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const error = useSelector(state => state.auth.error);

//   useEffect(() => {
//     if (error) {
//       toast.error(typeof error === "string" ? error : error?.message || "Something went wrong");
//       dispatch(clearError());
//     }
//   }, [error, dispatch]);

//   const formik = useFormik({
//     initialValues: {
//       name: '',
//       email: '',
//       password: '',
//     },
//     validationSchema: Yup.object({
//       name: Yup.string()
//         .required('Name is required.')
//         .min(4, 'Name must be at least 4 characters.')
//         .max(20, 'Name must be at most 20 characters.'),
//       email: Yup.string()
//         .required('Email is required.')
//         .matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i, 'Enter a valid email address.'),
//       password: Yup.string()
//         .required('Password is required.')
//         .min(6, 'Password must be at least 6 characters.')
//         .max(20, 'Password must be at most 20 characters.')
//         .matches(/^\S*$/, 'Password cannot contain spaces.'),
//     }),
//     onSubmit: async values => {
//       try {
//         const response = await dispatch(signup(values)).unwrap();
//         console.log(response);
//         toast.success('Registered successfully! Please verify your email.');
//         navigate('/login');
//       } 
//       catch (err) {
//         toast.error(typeof err === 'string' ? err : err?.message || 'Registration failed');
//       }
//     },
//   });

//   return (
//     <div className="container d-flex justify-content-center align-items-center vh-100">
//       <div className="card p-4 shadow" style={{ width: '100%', maxWidth: '400px' }} >
//         <h3 className="text-center mb-3">Register</h3>
//         <form onSubmit={formik.handleSubmit} noValidate>
//           <div className="mb-3">
//             <Input
//               label="Name"
//               name="name"
//               type="text"
//               value={formik.values.name}
//               onChange={formik.handleChange}
//               placeholder="Enter your name"
//             />
//             {formik.errors.name && <div className="text-danger">{formik.errors.name}</div>}
//           </div>

//           <div className="mb-3">
//             <Input
//               label="Email"
//               name="email"
//               type="email"
//               value={formik.values.email}
//               onChange={formik.handleChange}
//               placeholder="Enter your email"
//             />
//             {formik.errors.email && <div className="text-danger">{formik.errors.email}</div>}
//           </div>

//           <div className="mb-3">
//             <label>Password</label>
//             <PasswordInput
//               value={formik.values.password}
//               onChange={formik.handleChange}
//               name="password"
//             />
//             {formik.errors.password && <div className="text-danger">{formik.errors.password}</div>}
//           </div>

//           <Button
//             type="submit"
//             variant="success"
//             className="btn btn-success w-100"
//             disabled={formik.isSubmitting}
//           >
//             {formik.isSubmitting ? (
//               <>
//                 <span className="spinner-border spinner-border-sm me-2" role="status" />
//                 Processing...
//               </>
//             ) : 'Register'}
//           </Button>

//           <div className="text-center mt-3">
//             <p>
//               Already have an account?{' '}
//               <Button variant="link" onClick={() => navigate('/login')}>
//                 Login
//               </Button>
//             </p>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
