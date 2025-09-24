import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";

function Step1({ data, next, onBack }) {
    const navigate = useNavigate();

    const schema = Yup.object({
        firstName: Yup.string()
            .trim()
            .matches(/^[A-Za-z]+$/, "Only alphabets allowed, no spaces or special characters")
            .min(4, "At least 4 characters")
            .max(20, "Max 20 characters")
            .required("First name is required"),

        lastName: Yup.string()
            .trim()
            .matches(/^[A-Za-z]+$/, "Only alphabets allowed, no spaces or special characters")
            .min(4, "At least 4 characters")
            .max(20, "Max 20 characters")
            .required("Last name is required"),

        email: Yup.string()
            .trim()
            .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format or contains spaces")
            .min(5, "At least 5 characters")
            .max(50, "Max 50 characters")
            .required("Email is required"),
    });

    return (
        <Formik
            enableReinitialize
            initialValues={data}
            validationSchema={schema}
            onSubmit={(values) => next(values)}
        >
            {() => (
                <Form>
                    <div className="mb-3">
                        <label>First Name</label>
                        <Field name="firstName" className="form-control" />
                        <ErrorMessage name="firstName" component="div" className="text-danger" />
                    </div>
                    <div className="mb-3">
                        <label>Last Name</label>
                        <Field name="lastName" className="form-control" />
                        <ErrorMessage name="lastName" component="div" className="text-danger" />
                    </div>
                    <div className="mb-3">
                        <label>Email</label>
                        <Field name="email" type="email" className="form-control" />
                        <ErrorMessage name="email" component="div" className="text-danger" />
                    </div>
                    <button type="button" className="btn btn-secondary me-2" onClick={() => (onBack ? onBack() : navigate('/'))}>
                        Back
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Next
                    </button>
                </Form>
            )}
        </Formik>
    );
}

export default Step1;
