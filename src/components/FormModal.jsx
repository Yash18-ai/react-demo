import React from 'react'
import Modal from "react-bootstrap/Modal";
import WizardForm from "./WizardForm";

function FormModal({ onClose, editId }) {

        return (
        <Modal show={true} onHide={onClose} size="lg" backdrop="static" keyboard={false}>
            <Modal.Header closeButton>
                <Modal.Title>{editId ? "Edit Submission" : "Add New Submission"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <WizardForm editId={editId} onClose={onClose} />
            </Modal.Body>
        </Modal>
    );
  
}

export default FormModal
