import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Modal from './Modal';

function EditUserModal({ user, isOpen, onClose, onSave }) {
    const initialValues = {
        first: user?.name.first || '',
        last: user?.name.last || '',
        email: user?.email || ''
    };

    const validationSchema = Yup.object().shape({
        first: Yup.string()
            .trim()
            .required('First name is required')
            .min(5, 'First name must be at least 5 characters')
            .max(10, 'First name must be at most 10 characters'),
        last: Yup.string()
            .trim()
            .required('Last name is required')
            .min(5, 'Last name must be at least 5 characters')
            .max(10, 'Last name must be at most 10 characters'),
        email: Yup.string()
            .trim()
            .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format or contains spaces")
            .min(5, "At least 5 characters")
            .max(50, "Max 50 characters")
            .required("Email is required"),
    });

    const handleSubmit = (values) => {
        onSave({
            id: user.id.value,
            name: { first: values.first, last: values.last },
            email: values.email,
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} title="Edit User" onClose={onClose}>
            <Formik
                enableReinitialize
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                <Form noValidate>
                    <div className="mb-3">
                        <label className="form-label">First Name</label>
                        <Field name="first" className="form-control" />
                        <div className="text-danger">
                            <ErrorMessage name="first" />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Last Name</label>
                        <Field name="last" className="form-control" />
                        <div className="text-danger">
                            <ErrorMessage name="last" />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <Field name="email" type="text" className="form-control" />
                        <div className="text-danger">
                            <ErrorMessage name="email" />
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </Form>
            </Formik>
        </Modal>
    );
}

export default EditUserModal;
