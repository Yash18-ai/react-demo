import React, { useEffect, useState, useRef } from 'react'
import ClipLoader from 'react-spinners/ClipLoader';
import "bootstrap/dist/css/bootstrap.min.css";
import { useSelector, useDispatch } from 'react-redux';
import { fetchTeam } from '../features/team/teamSlice';
import { FaChevronDown, FaFilePdf } from "react-icons/fa";
import '../assets/css/team.css';

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function TeamList() {
    const dispatch = useDispatch();
    const { members, loading, error } = useSelector((state) => state.team);

    const [departmentFilter, setDepartmentFilter] = useState("All");
    const [sortBy, setSortBy] = useState("firstNameAsc");
    const [exporting, setExporting] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
        dispatch(fetchTeam());
    }, [dispatch])

    const departments = [...new Set(members.map((m) => m.company?.department))];

    const filtered = departmentFilter === "All"
        ? members
        : members.filter((m) => m.company?.department === departmentFilter);

    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === "firstNameAsc") {
            return a.firstName.localeCompare(b.firstName);
        }
        if (sortBy === "firstNameDesc") {
            return b.firstName.localeCompare(a.firstName);
        }
        if (sortBy === "lastNameAsc") {
            return a.lastName.localeCompare(b.lastName);
        }
        if (sortBy === "lastNameDesc") {
            return b.lastName.localeCompare(a.lastName);
        }
        return 0;
    });

    const total = sorted.reduce((acc, curr) => acc + 1, 0);

    const handleExportPdf = async () => {
        const input = containerRef.current;
        if (!input) return;

        try {
            setExporting(true);

            const canvas = await html2canvas(input, {
                scale: 4,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); 
            const pdfHeight = pdf.internal.pageSize.getHeight(); 

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const scale = pdfWidth / canvasWidth; 

            const pageCanvasHeight = Math.floor(pdfHeight / scale);

            if (canvasHeight <= pageCanvasHeight) {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (canvasHeight * scale));
                pdf.save('team-list.pdf');
            } else {
                let yOffset = 0;
                const tmpCanvas = document.createElement('canvas');
                const tmpCtx = tmpCanvas.getContext('2d');

                tmpCanvas.width = canvasWidth;
                tmpCanvas.height = pageCanvasHeight;

                while (yOffset < canvasHeight) {
                    tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
                    tmpCtx.drawImage(
                        canvas,
                        0,
                        yOffset,
                        canvasWidth,
                        Math.min(pageCanvasHeight, canvasHeight - yOffset),
                        0,
                        0,
                        canvasWidth,
                        Math.min(pageCanvasHeight, canvasHeight - yOffset)
                    );

                    const pageData = tmpCanvas.toDataURL('image/png');
                    const pageImgHeight = (Math.min(pageCanvasHeight, canvasHeight - yOffset)) * scale;

                    if (yOffset === 0) {
                        pdf.addImage(pageData, 'PNG', 0, 0, pdfWidth, pageImgHeight);
                    } else {
                        pdf.addPage();
                        pdf.addImage(pageData, 'PNG', 0, 0, pdfWidth, pageImgHeight);
                    }

                    yOffset += pageCanvasHeight;
                }

                pdf.save('team-list.pdf');
            }
        } catch (err) {
            console.error("Export PDF failed:", err);
            alert("Failed to export PDF. See console for details.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className='container py-4'>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h2 className="mb-0"> Team Members</h2>

                <div className="d-flex gap-2 align-items-center">
                    <div className='border rounded p-2 px-3 shadow-sm bg-light text-dark'>
                        <strong>Total:</strong> {total}
                    </div>

                    <button
                        className="btn btn-danger d-flex align-items-center"
                        onClick={handleExportPdf}
                        disabled={exporting || loading || sorted.length === 0}
                        title="Export as PDF"
                    >
                        {exporting ? (
                            <>
                                <ClipLoader size={14} color="#fff" /> <span className="ms-2">Exporting...</span>
                            </>
                        ) : (
                            <>
                                <FaFilePdf /> <span className="ms-2">Export PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="dropdown-wrapper position-relative">
                        <select
                            className="form-select pe-5"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                        >
                            <option value="All">All Departments</option>
                            {departments.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <FaChevronDown className="dropdown-icon" />
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="dropdown-wrapper position-relative">
                        <select
                            className="form-select pe-5"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="firstNameAsc"> First Name (A-Z)</option>
                            <option value="firstNameDesc"> First Name (Z-A)</option>
                            <option value="lastNameAsc"> Last Name (A-Z)</option>
                            <option value="lastNameDesc"> Last Name (Z-A)</option>
                        </select>
                        <FaChevronDown className="dropdown-icon" />
                    </div>
                </div>
            </div>

            {loading && (
                <div className='text-center'>
                    <ClipLoader color="#36d7b7" size={50} />
                </div>
            )}

            {error && <p className="text-danger text-center">Error: {error}</p>}

            {!loading && sorted.length === 0 && (
                <p className="text-muted text-center">No team members found.</p>
            )}

            <div ref={containerRef} id="team-list">
                <div className="row">
                    {sorted.map((member) => (
                        <div className="col-sm-6 col-md-4 col-lg-3 mb-4" key={member.id}>
                            <div className="card h-100 shadow-sm border-0 team-card">
                                <img
                                    src={member.image}
                                    alt={member.firstName}
                                    className="card-img-top"
                                    style={{ height: "200px", objectFit: "cover" }}
                                />
                                <div className="card-body text-center">
                                    <h5 className="card-title">
                                        {member.firstName} {member.lastName}
                                    </h5>
                                    <p className="mb-1">{member.company?.title}</p>
                                    <p className="mb-1"> {member.email}</p>
                                    <p className="mb-0">{member.company?.department}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}

export default TeamList
