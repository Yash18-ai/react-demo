import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, login } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PasswordInput from './components/PasswordInput';
import { toast } from 'react-toastify';
import { setCurrentUser } from '../../features/messages/messagesSlice';
import { getDecryptedToken } from '../../features/auth/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authState = useSelector(s => s.auth.user);
  const error = useSelector(s => s.auth.error);

  useEffect(() => {
    if (authState) {
      const userId = authState?.user?.id ?? authState?.id ?? null;
      if (userId) dispatch(setCurrentUser(userId));
    }
  }, [authState, dispatch]);

  useEffect(() => {
    const token = getDecryptedToken();
    if (authState && token) {
      navigate("/", { replace: true });
    }
  }, [authState, navigate]);

  useEffect(() => {
    if (error) {
      const msg = Array.isArray(error?.message)
        ? error.message.join(", ")
        : error.message || String(error);

      toast.error(msg || "Something went wrong");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: Yup.object({
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
        .max(14, 'Password must be at most 14 characters.')
        .matches(/^\S*$/, 'Password cannot contain spaces.'),
    }),
    onSubmit: vals => dispatch(login(vals)),
  });

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100" >
      <div className="card p-4 shadow" style={{ width: '100%', maxWidth: '400px' }}>
        <h3 className="text-center mb-2">Login</h3>
        <p className="text-center text-muted">Welcome back! Log in with your credentials.</p>

        <form onSubmit={formik.handleSubmit} noValidate>
          <div className='mb-3'>
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
            variant="primary"
            size="md"
            className="btn btn-primary w-100"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting
              ? <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Processing...
              </>
              : "Login"}
          </Button>

          <div className="text-center mt-3">
            <p>
              Don't have an account?{' '}
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/register')}
              >
                Register
              </Button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
