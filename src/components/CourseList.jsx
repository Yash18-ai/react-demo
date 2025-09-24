import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchCourses } from "../features/courses/courseSlice";
import { Link } from "react-router-dom";
import "../assets/css/courselist.css";

function CourseList() {
    const dispatch = useDispatch();
    const { courses, loading, error } = useSelector((state) => state.courses);

    useEffect(() => {
        dispatch(fetchCourses());
    }, [dispatch]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="container py-4">
            <h2 className="mb-4 fw-bold">Course List</h2>
            <div className="row">
                {courses.map((course) => {
                    return (
                        <div key={course.id} className="col-md-4 mb-4">
                            <div className="course-card card h-100">
                                <img
                                    src={course.image || "https://via.placeholder.com/150"}
                                    className="card-img-top course-card-img"
                                    alt="Thumbnail"
                                />
                                <div className="card-body">
                                    <h5 className="card-title course-title">{course.title}</h5>
                                    <p className="card-text course-headline">{course.headline}</p>
                                    <p className="course-rating">
                                        <strong>⭐ {course.rating}</strong>
                                        <span className="text-muted"> ({course.num_reviews.toLocaleString()} ratings)</span>
                                    </p>
                                    <p className="text-muted course-meta">
                                        {course.course_length} • {course.num_lectures} lectures
                                    </p>
                                    <h6 className="course-price">{course.price}</h6>
                                    <Link
                                        to={`/course/${course.id}`}
                                        className="btn btn-sm btn-primary w-100 course-btn"
                                    >
                                        View Course
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default CourseList;
