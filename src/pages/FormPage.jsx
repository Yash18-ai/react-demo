import React from "react";
import { useParams } from "react-router-dom";
import WizardForm from "../components/WizardForm";

function FormPage() {
    const { id } = useParams();
    return (
        <div className="container py-4">
            <h2>{id ? "Edit Submission" : "Add New Submission"}</h2>
            <WizardForm editId={id} />
        </div>
    );
}

export default FormPage;