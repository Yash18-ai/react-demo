// import React from 'react';
// import { useParams } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import { useNavigate } from 'react-router-dom';

// function CourseDetails() {
//     const navigate = useNavigate();
//     const { id } = useParams();
//     const { courses } = useSelector((state) => state.courses);

//     const course = courses.find(c => c.id.toString() === id);

//     if (!course) return <p>Course not found</p>;

//     return (
//         <div className="container py-4">
//             <div className='d-flex justify-content-end'>
//             <button
//                 onClick={() => navigate("/dashboard")}
//                 className="btn btn-outline-primary mb-3"
//             >
//                 &larr; Back to Course List
//             </button>
//             </div>
//             <h2>{course.title}</h2>
//             <img src={course.image || 'https://via.placeholder.com/300'} alt="Course" className='img-fluid mb-3' />
//             <p>{course.headline}</p>
//             <p>{course.description}</p>
//             <p><strong>Instructor:</strong> {course.instructor}</p>
//             <p><strong>Duration:</strong> {course.course_length}</p>
//             <p><strong>Price:</strong> {course.price}</p>
//             <p><strong>Rating:</strong> {course.rating} ⭐</p>
//             <p><strong>Reviews:</strong> {course.num_reviews}</p>
//             <p><strong>Lectures:</strong> {course.num_lectures}</p>
//             <p><strong>Certificate:</strong> {course.has_certificate ? "Yes" : "No"}</p>
//             <p><strong>Lifetime Access:</strong> {course.has_lifetime_access ? "Yes" : "No"}</p>
//             <button className='btn btn-success'>Enroll</button>

//         </div>
//     );
// }

// export default CourseDetails;


import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import "../assets/css/CourseDetails.css"; // make sure path is correct

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // basic course list from redux (your existing fetchCourses)
  const { courses } = useSelector((state) => state.courses);

  // local state for details JSON fetch
  const [detailsMap, setDetailsMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // find base course from redux
  const baseCourse = courses?.find((c) => c.id.toString() === id);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    // Assumes courseDetails.json is available in public folder as /courseDetails.json
    axios
      .get("/courseDetails.json")
      .then((res) => {
        if (!isMounted) return;
        const payload = res.data;

        // payload structure is:
        // { "courseDetails": [ { "2776760": {...}, "1234567": {...}, ... }, { ... } ] }
        // Build a flattened map id -> details
        const map = {};
        if (payload && Array.isArray(payload.courseDetails)) {
          payload.courseDetails.forEach((obj) => {
            if (obj && typeof obj === "object") {
              Object.keys(obj).forEach((k) => {
                map[k] = obj[k];
              });
            }
          });
        }
        setDetailsMap(map);
      })
      .catch((err) => {
        console.error("Failed to load courseDetails.json", err);
        if (isMounted) setError("Failed to load course details.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="container py-4"><p>Loading course details...</p></div>;
  if (error) return <div className="container py-4"><p>Error: {error}</p></div>;

  // details for this id (may be undefined)
  const details = detailsMap ? detailsMap[id] : null;

  if (!baseCourse && !details) {
    return <div className="container py-4"><p>Course not found</p></div>;
  }

  // Merge data: prefer baseCourse for title/image/price/rating etc, details for deep structured lists.
  const course = {
    title: baseCourse?.title || details?.title || "Untitled Course",
    headline: baseCourse?.headline || details?.headline || "",
    image: baseCourse?.image || details?.image || "https://via.placeholder.com/480x270",
    instructor: baseCourse?.instructor || details?.instructor || "Unknown Instructor",
    rating: baseCourse?.rating ?? details?.rating ?? null,
    num_reviews: baseCourse?.num_reviews ?? details?.num_reviews ?? null,
    num_lectures: baseCourse?.num_lectures ?? details?.course_content?.reduce((acc, s) => acc + (s.content?.length || 0), 0) ?? null,
    course_length: baseCourse?.course_length ?? (details?.this_course_includes?.find(i => /hours/i.test(i)) || null),
    price: baseCourse?.price ?? details?.price ?? "Free",
    has_certificate: baseCourse?.has_certificate ?? false,
    has_lifetime_access: baseCourse?.has_lifetime_access ?? false,
    // From details JSON
    what_youll_learn: details?.what_youll_learn || [],
    explore_related_topics: details?.explore_related_topics || [],
    this_course_includes: details?.this_course_includes || [],
    course_content: details?.course_content || [],
  };

  return (
    <div className="course-details-page container py-4">
      <div className="d-flex justify-content-end mb-3">
        <button onClick={() => navigate(-1)} className="btn btn-outline-secondary">
          &larr; Back
        </button>
      </div>

      <div className="course-top row">
        <div className="col-lg-8 course-main">
          <div className="breadcrumbs small text-muted mb-2">
            Development &nbsp;/&nbsp; Web Development &nbsp;/&nbsp; JavaScript
          </div>
          <h1 className="course-title">{course.title}</h1>
          {course.headline && <p className="course-subtitle text-muted">{course.headline}</p>}

          <div className="course-meta d-flex align-items-center gap-3 my-3">
            {course.rating !== null && (
              <div className="rating">
                <strong>{course.rating}</strong>
                <span className="text-muted"> ({course.num_reviews?.toLocaleString() || 0} ratings)</span>
              </div>
            )}
            <div className="instructor small text-muted">Created by <strong>{course.instructor}</strong></div>
            {course.course_length && <div className="small text-muted">• {course.course_length}</div>}
            {course.num_lectures && <div className="small text-muted">• {course.num_lectures} lectures</div>}
          </div>

          {/* Info boxes (What you'll learn + Explore + Includes + Course content) */}
          <div className="card mb-3 course-info-card">
            <div className="card-body">
              <h5>What you'll learn</h5>
              <div className="row">
                <div className="col-md-6">
                  <ul className="checklist">
                    {course.what_youll_learn.slice(0, Math.ceil(course.what_youll_learn.length / 2)).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="col-md-6">
                  <ul className="checklist">
                    {course.what_youll_learn.slice(Math.ceil(course.what_youll_learn.length / 2)).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Explore related topics */}
          {course.explore_related_topics.length > 0 && (
            <div className="mb-3">
              <h6>Explore related topics</h6>
              <div className="topic-tags">
                {course.explore_related_topics.map((t, idx) => (
                  <span key={idx} className="badge bg-light border text-dark me-2">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* This course includes */}
          {course.this_course_includes.length > 0 && (
            <div className="mb-3">
              <h6>This course includes:</h6>
              <ul className="includes-list">
                {course.this_course_includes.map((inc, i) => (
                  <li key={i}>{inc}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Course content (from details.course_content) */}
          {course.course_content.length > 0 && (
            <div className="mb-4">
              <h5>Course content</h5>
              <div className="accordion-list">
                {course.course_content.map((section, sidx) => (
                  <div key={sidx} className="content-section">
                    <div className="section-label">{section.label} <span className="text-muted">({section.content?.length || 0} lectures)</span></div>
                    <ul className="section-items">
                      {section.content?.map((lesson, lidx) => (
                        <li key={lidx}>{lesson.title}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right side purchase card */}
        <aside className="col-lg-4">
          <div className="purchase-card card">
            <img src={course.image} alt={course.title} className="card-img-top purchase-img" />
            <div className="card-body">
              <div className="price-row d-flex align-items-center justify-content-between mb-2">
                <div className="price">{course.price}</div>
                <div className="discount text-success small">84% off</div>
              </div>

              <button className="btn btn-primary w-100 mb-2">Add to cart</button>
              <button className="btn btn-outline-primary w-100 mb-3">Buy now</button>

              <div className="small text-muted mb-2">30-Day Money-Back Guarantee • Full Lifetime Access</div>

              <hr />

              <div className="small text-muted">
                <strong>Includes:</strong>
                <ul className="mb-0">
                  {course.this_course_includes.slice(0, 3).map((inc, i) => <li key={i}>{inc}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

