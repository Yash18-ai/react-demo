import React from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function ProductDetail() {
    const { id } = useParams();
    const product = useSelector((s) =>
        s.products.items.find((p) => p.id === parseInt(id))
    );
    const navigate = useNavigate();

    if (!product) return <p className="text-center mt-4">Product not found.</p>;

    const tags = product.tags || [];
    const reviews = product.reviews || [];

    const averageRating =
        reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

    const filledStars = Math.floor(averageRating);
    const hasHalfStar = averageRating - filledStars >= 0.5;
    const emptyStars = 5 - filledStars - (hasHalfStar ? 1 : 0);

    return (
        <div className="container py-4">
            <h2>Product Detail</h2>

            <div className="row">
                <div className="col-md-6">
                <img
                        src={product.thumbnail || product.images?.[0] || 'https://placehold.co/600x400'}
                        alt={product.title}
                        className="card-img-top"
                        style={{ maxHeight: 300, objectFit: "contain" }}
                    />
                    <h4>{product.title}</h4>
                    <p>${product.price}</p>
                    {/* <p>
                        Discount: {product.discountPercentage}%
                    </p> */}
                </div>

                <div className="col-md-6">
                    <h5>Description</h5>
                    <p>{product.description}</p>

                    <h6 className="mt-3">Tags</h6>
                    {tags.length > 0 ? (
                        tags.map((t, i) => (
                            <span key={i} className="badge bg-secondary me-1">
                                {t}
                            </span>
                        ))
                    ) : (
                        <p className="text-muted">No tags.</p>
                    )}
                </div>
            </div>

            <div className="mt-5 d-flex align-items-center">
                <h5 className="me-3">Reviews</h5>
                <div className="d-flex align-items-center gap-2 mb-1">
                    {[...Array(filledStars)].map((_, i) => (
                        <FaStar key={`filled-${i}`} color="gold" />
                    ))}
                    {hasHalfStar && <FaStarHalfAlt color="gold" />}
                    {[...Array(emptyStars)].map((_, i) => (
                        <FaRegStar key={`empty-${i}`} color="gold" />
                    ))}
                    <span className="ms-2 text-muted">({averageRating.toFixed(1)} / 5)</span>
                </div>
            </div>

            {reviews.length > 0 ? (
                <div className="mt-3">
                    {reviews.map((r, i) => (
                        <div
                            key={i}
                            className="border rounded p-3 mb-3 shadow-sm "
                        >
                            <div className="fw-bold">{r.reviewerName}</div>
                            <div style={{ fontSize: "0.9em" }}>
                                {r.reviewerEmail}
                            </div>
                            <div className="d-flex align-items-center mb-2">
                                {[...Array(Math.floor(r.rating))].map((_, i) => (
                                    <FaStar key={i} color="gold" size={14} />
                                ))}
                                {[...Array(5 - Math.floor(r.rating))].map((_, i) => (
                                    <FaRegStar key={`e-${i}`} color="gold" size={14} />
                                ))}
                            </div>
                            <div>{r.comment}</div>
                            <div className="text-end " style={{ fontSize: "0.9em" }}>
                                {new Date(r.date).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-muted">No reviews yet.</p>
            )}

            <button
                onClick={() => navigate("/product")}
                className="btn btn-outline-primary mb-3"
            >
                &larr; Back to Products
            </button>

        </div>
    );
}

export default ProductDetail;
