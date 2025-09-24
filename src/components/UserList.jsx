import React, { useEffect, useState, useRef } from 'react';
import { ClipLoader } from 'react-spinners';
import "bootstrap/dist/css/bootstrap.min.css";
import { useSelector, useDispatch } from 'react-redux';
import {
    fetchUsers,
    deleteUser,
    toggleFavorite,
    setFilter,
    updateUser           
} from '../features/user/userSlice';
import { FiEdit } from 'react-icons/fi';
import { MdDelete } from 'react-icons/md';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import EditUserModal from './EditUserModal';  
import Swal from 'sweetalert2';

function UserList() {
    const dispatch = useDispatch();
    const { users, loading, Error, filter } = useSelector((state) => state.users);

    const [editingUser, setEditingUser] = useState(null);
    const [showFavorites, setShowFavorites] = useState(filter === "favorites");

    // useEffect(() => {
    //     if (users.length === 0) {
    //         dispatch(fetchUsers());
    //     }
    // }, [dispatch, users.length]);

    const didFetchUsers = useRef(false);

    useEffect(() => {
        if(!didFetchUsers.current) {
            dispatch(fetchUsers());
            didFetchUsers.current = true;
        }
    })

    useEffect(() => {
        dispatch(setFilter(showFavorites ? "favorites" : "all"));
    }, [showFavorites, dispatch]);

    const handleDelete = (userId) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to delete this user?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(deleteUser(userId));
                Swal.fire(
                    'Deleted!',
                    'Your user has been deleted.',
                    'success'
                );
            }
        })
    };

    const handleToggleFavorite = (userId) => {
        dispatch(toggleFavorite(userId));
    };

    const filteredUsers = filter === "favorites"
        ? users.filter((u) => u.isFavorite)
        : users;

    const summary = {
        total: users.length,
        favorites: users.filter((u) => u.isFavorite).length
    };

    return (
        <div className='container mt-5'>
            <div className='d-flex flex-column flex-md-row justify-content-between align-items-center mb-4'>
                <h2 className='mb-3 mb-md-0'>User Directory</h2>
                <div className='d-flex align-items-center gap-3 flex-wrap'>
                    {Object.entries(summary).map(([key, value]) => (
                        <div
                            key={key}
                            className={`border rounded p-2 px-3 shadow-sm ${document.body.classList.contains('bg-dark') ? 'bg-secondary text-light' : 'bg-light text-dark'
                                }`}
                        >
                            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
                        </div>
                    ))}
                    <div className='form-check form-switch mb-0 d-flex align-items-center'>
                        <input
                            className='form-check-input'
                            type='checkbox'
                            id='favoriteToggle'
                            checked={showFavorites}
                            onChange={() => setShowFavorites(!showFavorites)}
                        />
                        <label className='form-check-label ms-2' htmlFor='favoriteToggle'>
                            {showFavorites ? "Show All Users" : "Show Favorites Only"}
                        </label>
                    </div>
                </div>
            </div>

            
            {loading && (
                <div className='text-center'>
                    <ClipLoader color='#36d7b7' />
                </div>
            )}

            {Error && <div className='text-danger text-center'>{Error}</div>}

            {!loading && filteredUsers.length === 0 && (
            <div className={`text-center my-5 ${document.body.classList.contains('dark') ? 'text-light' : 'text-muted'}`}>
                {showFavorites
                    ? 'You have no favorite users.'
                    : 'No users to display.'}
            </div>

            )}

            <div className='row'>
                {filteredUsers.map((user, index) => (
                    <div className='col-md-6 col-lg-4 mb-4' key={index}>
                        <div className='card h-100 shadow-sm border-0 position-relative'>
                            <img
                                src={user.picture.large}
                                className='card-img-top rounded-top'
                                alt={`${user.name.first} ${user.name.last}`}
                                style={{ objectFit: "cover", height: "250px" }}
                            />
                            <div className='card-body d-flex flex-column justify-content-between'>
                                <div>
                                    <h5 className='card-title mb-1'>
                                        {user.name.first} {user.name.last}
                                    </h5>
                                    <p className='mb-1'>{user.email}</p>
                                </div>
            
                                <div className='d-flex justify-content-end gap-2 mt-auto pt-3 border-top'>
                                    
                                    <button
                                        className='btn btn-sm btn-light border'
                                        onClick={() => setEditingUser(user)}
                                        title='Edit User'
                                    >
                                        <FiEdit size={18} />
                                    </button>

                                    
                                    <button
                                        className='btn btn-sm btn-light border'
                                        onClick={() => handleDelete(user.id.value)}
                                        title='Delete User'
                                    >
                                        <MdDelete size={18} color="#dc3545" />
                                    </button>

                                    
                                    <button
                                        className='btn btn-sm btn-light border'
                                        onClick={() => handleToggleFavorite(user.id.value)}
                                        title={user.isFavorite ? 'Unfavorite' : 'Favorite'}
                                    >
                                        {user.isFavorite
                                            ? <AiFillStar size={18} color="#f0c419" />
                                            : <AiOutlineStar size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <EditUserModal
                user={editingUser}
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                onSave={(updatedUser) => {
                    dispatch(updateUser(updatedUser));
                    setEditingUser(null);
                }}
            />
        </div>
    );
}

export default UserList;


