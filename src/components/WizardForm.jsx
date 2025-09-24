// import React, { useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import {
//     saveStep1,
//     saveStep2,
//     startEdit,
//     cancelEdit,
//     finalize,
// } from "../features/form/formSlice";
// import Step1 from "./Step1";
// import Step2 from "./Step2";
// import Step3 from "./Step3";
// import { toast } from "react-toastify";

// export default function WizardForm({ editId, onClose }) {
    
//     const dispatch = useDispatch();
//     const navigate = useNavigate();
//     const { personal, address } = useSelector((s) => s.form);
//     const currentUserId = useSelector((s) => s.auth.user?.user?.id);
//     const [step, setStep] = useState(1);

//     const initialCities = [
//         'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot',
//         'Bhavnagar', 'Jamnanagar', 'Gandhinagar',
//         'Nadiad', 'Navsari', 'Anand'
//     ].map((c) => ({ value: c, label: c }));
//     const [cityList, setCityList] = useState(initialCities);

//     useEffect(() => {
//         setStep(1);
//         if (editId) {
//             dispatch(startEdit(editId));
//         } else {
//             dispatch(cancelEdit());
//         }
//     }, [editId, dispatch]);

//     const progress = Math.round((step / 3) * 100);

//     const next1 = (vals) => {
//         const trimmedVals = {
//             firstName: vals.firstName.trim(),
//             lastName: vals.lastName.trim(),
//             email: vals.email.trim(),
//         };
//         dispatch(saveStep1(trimmedVals));
//         setStep(2);
//     };

//     const next2 = (vals) => {
//         const trimmedVals = {
//             city: vals.city.trim(),
//             zip: vals.zip.trim(),
//             images: vals.images || [],
//         };
//         dispatch(saveStep2(trimmedVals));
//         setStep(3);
//     };


//     const submit = () => {
//         dispatch(finalize(currentUserId));    
//         toast.success(editId ? "Entry updated!" : "New entry added!");
//         if (onClose) onClose();
//         else navigate("/");
//     };


//     return (
//         <>
//             <div className="progress mb-3">
//                 <div
//                     className="progress-bar"
//                     role="progressbar"
//                     style={{ width: `${progress}%` }}
//                 >
//                     Step {step} of 3
//                 </div>
//             </div>
//             {/* {step === 1 && <Step1 data={personal} next={next1} />} */}
//             {step === 1 && <Step1 data={personal} next={next1} onBack={onClose} />}
//             {/* {step === 2 && <Step2 data={address} next={next2} back={() => setStep(1)} />} */}
//             {step === 2 && (
//                 <Step2
//                     data={address}
//                     next={next2}
//                     back={() => setStep(1)}
//                     cityList={cityList}
//                     setCityList={setCityList}
//                 />
//             )}
//             {step === 3 && (
//                 <Step3
//                     personal={personal}
//                     address={address}
//                     back={() => setStep(2)}
//                     submit={submit}
//                 />
//             )}
//         </>
//     );
// }


import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    saveStep1,
    saveStep2,
    saveImages,
    startEdit,
    cancelEdit,
    finalize,
} from "../features/form/formSlice";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3"; // image upload
import Step4 from "./Step4"; // review
import { toast } from "react-toastify";

export default function WizardForm({ editId, onClose }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { personal, address, images } = useSelector((s) => s.form);
    const currentUserId = useSelector((s) => s.auth.user?.user?.id);
    const [step, setStep] = useState(1);

    const initialCities = [
        'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot',
        'Bhavnagar', 'Jamnanagar', 'Gandhinagar',
        'Nadiad', 'Navsari', 'Anand'
    ].map((c) => ({ value: c, label: c }));
    const [cityList, setCityList] = useState(initialCities);

    useEffect(() => {
        setStep(1);
        if (editId) {
            dispatch(startEdit(editId));
        } else {
            dispatch(cancelEdit());
        }
    }, [editId, dispatch]);

    const progress = Math.round((step / 4) * 100);

    const next1 = (vals) => {
        const trimmedVals = {
            firstName: vals.firstName.trim(),
            lastName: vals.lastName.trim(),
            email: vals.email.trim(),
        };
        dispatch(saveStep1(trimmedVals));
        setStep(2);
    };

    const next2 = (vals) => {
        const trimmedVals = {
            city: vals.city.trim(),
            zip: vals.zip.trim(),
        };
        dispatch(saveStep2(trimmedVals));
        setStep(3);
    };

    // vals from Step3: { images: [...] }
    const next3 = (vals) => {
        dispatch(saveImages(vals.images || []));
        setStep(4);
    };

    const submit = () => {
        dispatch(finalize(currentUserId));
        toast.success(editId ? "Entry updated!" : "New entry added!");
        if (onClose) onClose();
        else navigate("/");
    };

    return (
        <>
            <div className="progress mb-3">
                <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                >
                    Step {step} of 4
                </div>
            </div>

            {step === 1 && <Step1 data={personal} next={next1} onBack={onClose} />}
            {step === 2 && (
                <Step2
                    data={address}
                    next={next2}
                    back={() => setStep(1)}
                    cityList={cityList}
                    setCityList={setCityList}
                />
            )}
            {step === 3 && (
                <Step3
                    data={{ images }}
                    next={next3}
                    back={() => setStep(2)}
                />
            )}
            {step === 4 && (
                <Step4
                    personal={personal}
                    address={address}
                    images={images}
                    back={() => setStep(3)}
                    submit={submit}
                />
            )}
        </>
    );
}
