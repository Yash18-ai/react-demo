// import React, { useMemo, useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { deleteSubmission } from "../features/form/formSlice";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";
// import {
//     useReactTable,
//     getCoreRowModel,
//     getPaginationRowModel,
//     getSortedRowModel,
//     flexRender,
// } from "@tanstack/react-table";
// import CityDropdown from "./CityDropdown";
// import FormModal from "./FormModal";
// import '../assets/css/submission.css';

// function SubmissionList() {
//     // const allSubs = useSelector((s) => s.form?.submissions ?? []);
//     const allSubs = useSelector((s) => s.form?.submissions ?? []);
//     const currentUserId = useSelector((s) => s.auth.user?.user?.id);
//     const dispatch = useDispatch();
//     const nav = useNavigate();
//     const [cityFilter, setCityFilter] = useState("");
//     const [sorting, setSorting] = useState([]);
//     const [modalOpen, setModalOpen] = useState(false);
//     const [editId, setEditId] = useState(null);

//     const subs = useMemo(() => {
//         return allSubs
//             .filter((s) => s.userId === currentUserId)      // ← only your own
//             .filter((s) => !cityFilter || s.address.city === cityFilter);
//     }, [cityFilter, allSubs, currentUserId]);

//     const filterOptions = useMemo(() => {
//         const defaultCities = [
//             "Ahmedabad", "Surat", "Vadodara", "Rajkot",
//             "Bhavnagar", "Jamnanagar", "Gandhinagar",
//             "Nadiad", "Navsari", "Anand"
//         ]
        
//         const submitted = allSubs.map((s) => s.address.city);
        
//         const merged = Array.from(
//             new Set([...defaultCities, ...submitted])
//         ).map((c) => ({ value: c, label: c }));
//         return merged;
//     }, [allSubs]);

//     const openModal = (id = null) => {
//         setEditId(id);
//         setModalOpen(true);
//     };

//     const closeModal = () => {
//         setModalOpen(false);
//         setEditId(null);
//     };

//     const columns = useMemo(
//         () => [
//             {
//                 header: "Name",
//                 accessorFn: (row) =>
//                     `${row.personal.firstName} ${row.personal.lastName}`,
//                 id: "name",
//             },
//             {
//                 header: "Email",
//                 accessorKey: "personal.email",
//             },
//             {
//                 header: "City",
//                 accessorKey: "address.city",
//             },
//             {
//                 header: "ZIP",
//                 accessorKey: "address.zip",
//             },
//             {
//                 header: "Actions",
//                 id: "actions",
//                 cell: ({ row }) => (
//                     <div className="btn-actions">
//                         <button
//                             className="btn btn-sm btn-primary"
//                             onClick={() => openModal(row.original.id)}
//                         >
//                             Edit
//                         </button>
//                         <button
//                             className="btn btn-sm btn-danger"
//                             onClick={() => handleDelete(row.original.id)}
//                         >
//                             Delete
//                         </button>
//                     </div>
//                 ),

//             },
//         ],
//         []
//     );

//     const table = useReactTable({
//         data: subs,
//         columns,
//         state: {
//             sorting,
//         },
//         onSortingChange: setSorting,
//         getCoreRowModel: getCoreRowModel(),
//         getSortedRowModel: getSortedRowModel(),
//         getPaginationRowModel: getPaginationRowModel(),
//         initialState: {
//             pagination: {
//                 pageSize: 5,
//             },
//         },
//     });

//     const handleDelete = (id) => {
//         Swal.fire({
//             title: "Are you sure?",
//             text: "Do you want to delete this entry?",
//             icon: "warning",
//             showCancelButton: true,
//             confirmButtonColor: "#d33",
//             cancelButtonColor: "#3085d6",
//             confirmButtonText: "Yes, delete it!",
//         }).then((result) => {
//             if (result.isConfirmed) {
//                 dispatch(deleteSubmission(id));
//                 Swal.fire("Deleted!", "Your entry has been deleted.", "success");
//             }
//         });
//     };

//     return (
//         <>
//             <button className="btn btn-success mb-3" onClick={() => openModal()}>
//                 + Add New
//             </button>

//             {/* <div className="mb-3" style={{ maxWidth: 300 }}>
//                 <CityDropdown
//                     value={cityFilter}
//                     onChange={(val) => setCityFilter(val)}
//                     placeholder="Filter by city"
//                 />
//             </div> */}

//             <div className="mb-3" style={{ maxWidth: 300 }}>
//                 <CityDropdown
//                     value={cityFilter}
//                     onChange={(val) => setCityFilter(val)}
//                     placeholder="Filter by city"
//                     options={filterOptions}
//                 />
//             </div>

//             <div className="table-responsive">
//                 <table className="table table-bordered table-hover">
//                     <thead>
//                         {table.getHeaderGroups().map((headerGroup) => (
//                             <tr key={headerGroup.id}>
//                                 {headerGroup.headers.map((header) => (
//                                     <th
//                                         key={header.id}
//                                         onClick={header.column.getToggleSortingHandler()}
//                                         style={{ cursor: "pointer" }}
//                                     >
//                                         {flexRender(
//                                             header.column.columnDef.header,
//                                             header.getContext()
//                                         )}
//                                         {header.column.getIsSorted() === "asc" && " 🔼"}
//                                         {header.column.getIsSorted() === "desc" && " 🔽"}
//                                     </th>
//                                 ))}
//                             </tr>
//                         ))}
//                     </thead>
//                     <tbody>
//                         {table.getRowModel().rows.length === 0 ? (
//                             <tr>
//                                 <td colSpan={columns.length} className="text-center">
//                                     <span className="text-base">No data available</span>
//                                 </td>
//                             </tr>
//                         ) : (
//                             table.getRowModel().rows.map((row) => (
//                                 <tr
//                                     key={row.id}
//                                     onClick={(e) =>
//                                         e.target.tagName !== "BUTTON" &&
//                                         nav(`/submission/${row.original.id}`)
//                                     }
//                                     style={{ cursor: "pointer" }}
//                                 >
//                                     {row.getVisibleCells().map((cell) => (
//                                         <td key={cell.id}>
//                                             {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                                         </td>
//                                     ))}
//                                 </tr>
//                             ))
//                         )}
//                     </tbody>
//                 </table>
//             </div>

//             <div className="d-flex justify-content-between align-items-center mt-3">
//                 <button
//                     className="btn btn-outline-secondary"
//                     onClick={() => table.previousPage()}
//                     disabled={!table.getCanPreviousPage()}
//                 >
//                     Previous
//                 </button>
//                 <span>
//                     Page {table.getState().pagination.pageIndex + 1} of{" "}
//                     {table.getPageCount()}
//                 </span>
//                 <button
//                     className="btn btn-outline-secondary"
//                     onClick={() => table.nextPage()}
//                     disabled={!table.getCanNextPage()}
//                 >
//                     Next
//                 </button>
//             </div>

//             {modalOpen && <FormModal onClose={closeModal} editId={editId} />}
//         </>
//     );
// }

// export default SubmissionList;


import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { deleteSubmission } from "../features/form/formSlice";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
} from "@tanstack/react-table";
import CityDropdown from "./CityDropdown";
import FormModal from "./FormModal";
import '../assets/css/submission.css';

function SubmissionList() {
    const allSubs = useSelector((s) => s.form?.submissions ?? []);
    const currentUserId = useSelector((s) => s.auth.user?.user?.id);
    const dispatch = useDispatch();
    const nav = useNavigate();
    const [cityFilter, setCityFilter] = useState("");
    const [sorting, setSorting] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);

    const subs = useMemo(() => {
        return allSubs
            .filter((s) => s.userId === currentUserId)
            .filter((s) => !cityFilter || s.address.city === cityFilter);
    }, [cityFilter, allSubs, currentUserId]);

    const filterOptions = useMemo(() => {
        const defaultCities = [
            "Ahmedabad", "Surat", "Vadodara", "Rajkot",
            "Bhavnagar", "Jamnanagar", "Gandhinagar",
            "Nadiad", "Navsari", "Anand"
        ];
        const submitted = allSubs.map((s) => s.address.city);
        const merged = Array.from(
            new Set([...defaultCities, ...submitted])
        ).map((c) => ({ value: c, label: c }));
        return merged;
    }, [allSubs]);

    const openModal = (id = null) => {
        setEditId(id);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditId(null);
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete this entry?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(deleteSubmission(id));
                Swal.fire("Deleted!", "Your entry has been deleted.", "success");
            }
        });
    };

    const columns = useMemo(
        () => [
            {
                header: "Avatar",
                accessorKey: "images",
                cell: ({ row }) => {
                    const firstImg = row.original.images?.[0];
                    const src = firstImg?.dataUrl || "/avatar-placeholder.png";
                    return (
                        <img
                            src={src}
                            alt="avatar"
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                objectFit: "cover"
                            }}
                        />
                    );
                }
            },
            {
                header: "Name",
                accessorFn: (row) =>
                    `${row.personal.firstName} ${row.personal.lastName}`,
                id: "name",
            },
            {
                header: "Email",
                accessorKey: "personal.email",
            },
            {
                header: "City",
                accessorKey: "address.city",
            },
            {
                header: "ZIP",
                accessorKey: "address.zip",
            },
            {
                header: "Actions",
                id: "actions",
                cell: ({ row }) => (
                    <div className="btn-actions">
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => openModal(row.original.id)}
                        >
                            Edit
                        </button>
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(row.original.id)}
                        >
                            Delete
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    const table = useReactTable({
        data: subs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 5 } },
    });

    return (
        <>
            <button className="btn btn-success mb-3" onClick={() => openModal()}>
                + Add New
            </button>

            <div className="mb-3" style={{ maxWidth: 300 }}>
                <CityDropdown
                    value={cityFilter}
                    onChange={(val) => setCityFilter(val)}
                    placeholder="Filter by city"
                    options={filterOptions}
                />
            </div>

            <div className="table-responsive">
                <table className="table table-bordered table-hover">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                        {header.column.getIsSorted() === "asc" && " 🔼"}
                                        {header.column.getIsSorted() === "desc" && " 🔽"}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center">
                                    <span className="text-base">No data available</span>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={(e) =>
                                        e.target.tagName !== "BUTTON" &&
                                        nav(`/submission/${row.original.id}`)
                                    }
                                    style={{ cursor: "pointer" }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </button>
                <span>
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                </span>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </button>
            </div>

            {modalOpen && <FormModal onClose={closeModal} editId={editId} />}
        </>
    );
}

export default SubmissionList;
