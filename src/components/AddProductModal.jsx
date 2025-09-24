import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";               // ← import toast
import { fetchCategories } from "../features/categories/categorySlice";
import {
  createProduct,
  updateProduct,
} from "../features/products/productSlice";

export default function AddProductModal({ onClose, initialData = null }) {
  const dispatch = useDispatch();
  const { items: categories } = useSelector((s) => s.categories);
  const { loading } = useSelector((s) => s.products);

  useEffect(() => {
    if (!categories.length) {
      dispatch(fetchCategories());
    }
  }, [categories.length, dispatch]);

  const validationSchema = Yup.object({
    title: Yup.string()
      .trim()
      .min(5, "Title must be at least 5 characters.")
      .max(50, "Title must be at most 50 characters.")
      .required("Title is required."),
    price: Yup.number()
      // .min(1, "Must be at least ₹1")
      // .max(100000, "Too expensive")
      .required("Price is required."),
    description: Yup.string()
      .trim()
      .min(10, "Description must be at least 10 characters.")
      // .max(100, "Description must be at most 300 characters long.")
      .required(" Description is required."),
    categoryId: Yup.number()
      .required("Category is required.")
      .typeError("Select a category."),
    images: Yup.array()
      .of(Yup.string().url("Must be a valid url."))
      .min(1, "At least one image url."),
  });

  const initialValues = {
    title: initialData?.title || "",
    price: initialData?.price || "",
    description: initialData?.description || "",
    categoryId: initialData?.category?.id || initialData?.categoryId || "",
    images: initialData?.images || [""],
    id: initialData?.id || undefined,
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values, { setSubmitting }) => {
        const payload = {
          title: values.title.trim(),
          price: +values.price,
          description: values.description.trim(),
          categoryId: +values.categoryId,
          images: values.images.filter((u) => u),
        };

        const action = values.id
          ? updateProduct({ ...payload, id: values.id })
          : createProduct(payload);

        dispatch(action)
          .unwrap()
          .then((res) => {
            if (values.id) {
              toast.success("Product updated successfully!");
            } else {
              toast.success("Product created successfully!");
            }
            onClose();
          })
          .catch((err) => {
            console.error(err);
            toast.error(values.id ? "Update failed." : "Creation failed.");
          })
          .finally(() => setSubmitting(false));
      }}
    >
      {({ isSubmitting }) => (
        <Form
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {initialData ? "Edit Product" : "Add New Product"}
                </h5>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <Field name="title" className="form-control" />
                  <div className="text-danger">
                    <ErrorMessage name="title" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Price</label>
                  <Field
                    name="price"
                    type="number"
                    className="form-control"
                  />
                  <div className="text-danger">
                    <ErrorMessage name="price" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <Field
                    name="description"
                    as="textarea"
                    className="form-control"
                  />
                  <div className="text-danger">
                    <ErrorMessage name="description" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <Field name="categoryId" as="select" className="form-select">
                    <option value="">Select…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Field>
                  <div className="text-danger">
                    <ErrorMessage name="categoryId" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Image URLs</label>
                  <FieldArray name="images">
                    {({ remove, push, form }) => (
                      <>
                        {form.values.images.map((_, i) => (
                          <div key={i} className="d-flex mb-2">
                            <Field
                              name={`images.${i}`}
                              placeholder="https://..."
                              className="form-control"
                            />
                            <button
                              type="button"
                              onClick={() => remove(i)}
                              className="btn btn-danger btn-sm ms-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => push("")}
                        >
                          + Add another image
                        </button>
                        <div className="text-danger">
                          <ErrorMessage name="images" />
                        </div>
                      </>
                    )}
                  </FieldArray>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}

 