// import React, { useState } from "react";
// import { Formik, Form, Field, ErrorMessage } from "formik";
// import * as Yup from "yup";
// import CityDropdown from "./CityDropdown";
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// function Step2({ data, next, back, cityList, setCityList }) {
//     const [images, setImages] = useState(data.images || []);

//     const schema = Yup.object({
//         city: Yup.string()
//             .trim()
//             .required('City is required')
//             .min(5, 'City name is too short')
//             .max(20, 'City name is too long')
//             .matches(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces'),
//         zip: Yup.string()
//             .trim()
//             .matches(/^[A-Za-z0-9\s-]{3,10}$/, "Invalid ZIP/postal code format")
//             .min(6, "ZIP/Postal code must be at least 6 characters")
//             .max(6, "ZIP/Postal code must be at most 6 characters")
//             .required("ZIP/Postal code is required"),
//     });

//     const handleImageUpload = (e) => {
//         const files = Array.from(e.target.files);
//         const newImages = files.map((file) => ({
//             id: URL.createObjectURL(file),
//             file,
//         }));
//         setImages((prev) => [...prev, ...newImages]);
//     };

//     const handleOnDragEnd = (result) => {
//         if (!result.destination) return;
//         const reordered = Array.from(images);
//         const [moved] = reordered.splice(result.source.index, 1);
//         reordered.splice(result.destination.index, 0, moved);
//         setImages(reordered);
//     };

//     return (
//         <Formik
//             enableReinitialize
//             initialValues={data}
//             validationSchema={schema}
//             onSubmit={(values) => {
//                 const city = values.city.trim();
//                 if (!cityList.some((c) => c.value.toLowerCase() === city.toLowerCase())) {
//                     setCityList([...cityList, { value: city, label: city }]);
//                 }
//                 next({ ...values, images });
//             }}
//         >
//             {() => (
//                 <Form>
//                     <div className="mb-3">
//                         <label>City</label>
//                         <Field name="city">
//                             {({ field, form }) => (
//                                 <CityDropdown
//                                     value={field.value}
//                                     onChange={(val) => form.setFieldValue('city', val)}
//                                     placeholder="Select or type your city"
//                                 />
//                             )}
//                         </Field>
//                         <ErrorMessage name="city" component="div" className="text-danger" />
//                     </div>

//                     <div className="mb-3">
//                         <label>ZIP Code</label>
//                         <Field name="zip" className="form-control" />
//                         <ErrorMessage name="zip" component="div" className="text-danger" />
//                     </div>

//                     <div className="mb-3">
//                         <label>Upload Images</label>
//                         <input type="file" multiple onChange={handleImageUpload} className="form-control" />
//                     </div>

//                     <DragDropContext onDragEnd={handleOnDragEnd}>
//                         <Droppable droppableId="images" direction="horizontal">
//                             {(provided) => (
//                                 <div
//                                     className="d-flex gap-2 flex-wrap"
//                                     {...provided.droppableProps}
//                                     ref={provided.innerRef}
//                                     style={{ minHeight: 100, padding: 10, border: "1px dashed #ccc" }}
//                                 >
//                                     {images.map((img, index) => (
//                                         <Draggable key={img.id} draggableId={img.id} index={index}>
//                                             {(provided) => (
//                                                 <div
//                                                     ref={provided.innerRef}
//                                                     {...provided.draggableProps}
//                                                     {...provided.dragHandleProps}
//                                                     style={{
//                                                         userSelect: "none",
//                                                         ...provided.draggableProps.style
//                                                     }}
//                                                 >
//                                                     <img
//                                                         src={img.id}
//                                                         alt="upload"
//                                                         style={{
//                                                             width: 100,
//                                                             height: 100,
//                                                             objectFit: "cover",
//                                                             borderRadius: 4
//                                                         }}
//                                                     />
//                                                 </div>
//                                             )}
//                                         </Draggable>
//                                     ))}
//                                     {provided.placeholder}
//                                 </div>
//                             )}
//                         </Droppable>
//                     </DragDropContext>

//                     <div className="d-flex mt-3">
//                         <button type="button" className="btn btn-secondary me-2" onClick={back}>
//                             Back
//                         </button>
//                         <button type="submit" className="btn btn-primary">
//                             Next
//                         </button>
//                     </div>
//                 </Form>
//             )}
//         </Formik>
//     );
// }

// export default Step2;


import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import CityDropdown from "./CityDropdown";

function Step2({ data, next, back, cityList, setCityList }) {
    const schema = Yup.object({
        city: Yup.string()
            .trim()
            .required('City is required')
            .min(2, 'City name is too short')
            .max(50, 'City name is too long')
            .matches(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces'),
        zip: Yup.string()
            .trim()
            .matches(/^[A-Za-z0-9\s-]{3,10}$/, "Invalid ZIP/postal code format")
            .min(3, "ZIP/Postal code must be at least 3 characters")
            .max(10, "ZIP/Postal code must be at most 10 characters")
            .required("ZIP/Postal code is required"),
    });

    return (
        <Formik
            enableReinitialize
            initialValues={data}
            validationSchema={schema}
            onSubmit={(values) => {
                const city = values.city ? values.city.trim() : "";
                if (city && !cityList.some((c) => c.value.toLowerCase() === city.toLowerCase())) {
                    setCityList([...cityList, { value: city, label: city }]);
                }
                next(values); // pass city and zip; images handled separately
            }}
        >
            {() => (
                <Form>
                    <div className="mb-3">
                        <label>City</label>
                        <Field name="city">
                            {({ field, form }) => (
                                <CityDropdown
                                    value={field.value}
                                    onChange={(val) => form.setFieldValue('city', val)}
                                    placeholder="Select or type your city"
                                />
                            )}
                        </Field>
                        <ErrorMessage name="city" component="div" className="text-danger" />
                    </div>

                    <div className="mb-3">
                        <label>ZIP Code</label>
                        <Field name="zip" className="form-control" />
                        <ErrorMessage name="zip" component="div" className="text-danger" />
                    </div>

                    <div className="d-flex mt-3">
                        <button type="button" className="btn btn-secondary me-2" onClick={back}>
                            Back
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Next
                        </button>
                    </div>
                </Form>
            )}
        </Formik>
    );
}

export default Step2;
