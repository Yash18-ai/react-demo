import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProducts, deleteProduct } from "../features/products/productSlice";
import { fetchCategories } from "../features/categories/categorySlice";
import useDebounce from "../hooks/useDebounce";
import ClipLoader from "react-spinners/ClipLoader";
import { FaComments, FaChevronDown, FaEdit, FaTrash } from "react-icons/fa";
import CommentModal from "./CommentModal";
import AddProductModal from "./AddProductModal";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import "../assets/css/product.css";
import { Pie, Bar } from "react-chartjs-2";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import "chart.js/auto";


export default function ProductList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading, error } = useSelector((s) => s.products);
  const allCategories = useSelector((s) => s.categories.items);
  const comments = useSelector((s) => s.comments.byProduct || {});

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [openProductId, setOpenProductId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [pnlData, setPnlData] = useState([]);
  const chartRef = useRef();

  useEffect(() => {
    fetch("/pnlData.json")
      .then((res) => res.json())
      .then((data) => setPnlData(data.pnlData || []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setCategoryFilter(params.get("category") || "All");
  }, [location.search]);

  useEffect(() => {
    if (!categoriesLoaded) return;

    if (categoryFilter === "All") {
      dispatch(fetchProducts());
    } else {
      const catItem = allCategories.find((c) => c.name === categoryFilter);
      if (catItem?.id) {
        dispatch(fetchProducts(catItem.id));
      } else {
        dispatch({ type: "products/fetchProducts/fulfilled", payload: [] });
      }
    }
  }, [dispatch, categoryFilter, allCategories, categoriesLoaded]);

  useEffect(() => {
    dispatch(fetchCategories()).then(() => {
      setCategoriesLoaded(true);
    });
  }, [dispatch]);

  const categoriesList = ["All", ...allCategories.map((c) => c.name)];

  const filtered = items.filter((p) => {
    const matchTitle = p.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchTitle;
  });

  const handleCategoryChange = (c) => {
    navigate(`/product?category=${encodeURIComponent(c)}`);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You are going to delete this product!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteProduct(id))
          .unwrap()
          .then(() => {
            Swal.fire("Deleted!", "Product has been deleted.", "success");
          })
          .catch((err) => {
            console.error(err);
            Swal.fire("Error!", "Failed to delete product.", "error");
          });
      }
    });
  };

  const totalSales = pnlData.reduce((s, d) => s + (d.sales || 0), 0);
  const totalExpenses = pnlData.reduce((s, d) => s + (d.expenses || 0), 0);
  const totalProfit = pnlData.reduce((s, d) => s + (d.profit || 0), 0);
  const grandTotal = totalSales + totalExpenses + totalProfit;

  const LABELS = ["Sales", "Expenses", "Profit"];
  const COLORS = ["#36A2EB", "#FF6384", "#4BC0C0"];
  const pieData = {
    labels: LABELS,
    datasets: [
      {
        data: [totalSales, totalExpenses, totalProfit],
        backgroundColor: COLORS,
        hoverOffset: 8,
      },
    ],
  };

  const currentMonthLabel = pnlData.length > 0
    ? new Date(pnlData[0].date).toLocaleString("default", { month: "long", year: "numeric" })
    : "";

  const currentYearLabel = pnlData.length > 0
    ? new Date(pnlData[0].date).getFullYear()
    : "";

  const yearlyData = pnlData.reduce((acc, d) => {
    const year = new Date(d.date).getFullYear();
    if (!acc[year]) acc[year] = { sales: 0, expenses: 0, profit: 0 };
    acc[year].sales += d.sales;
    acc[year].expenses += d.expenses;
    acc[year].profit += d.profit;
    return acc;
  }, {});

  const yearlyLabels = Object.keys(yearlyData);
  const barData = {
    labels: yearlyLabels,
    datasets: [
      { label: "Sales", data: yearlyLabels.map(y => yearlyData[y].sales), backgroundColor: "#36A2EB" },
      { label: "Expenses", data: yearlyLabels.map(y => yearlyData[y].expenses), backgroundColor: "#FF6384" },
      { label: "Profit", data: yearlyLabels.map(y => yearlyData[y].profit), backgroundColor: "#4BC0C0" },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      }
    },
    scales: {
      x: {
        ticks: {
          font: { size: 20, weight: "bold" },
          color: "#000",
        },
        title: {
          display: true,
          text: "Year",
          font: { size: 20, weight: "bold" }
        }
      },
      y: {
        ticks: {
          font: { size: 20, weight: "bold" },
          color: "#000",
        },
        title: {
          display: true,
          text: "Amount ($)",
          font: { size: 20, weight: "bold" }
        }
      }
    }
  };

  const pieLabelPlugin = {
    id: "pieLabelPlugin",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: area } = chart;
      const dataset = chart.data.datasets[0];
      const meta = chart.getDatasetMeta(0);
      const total = dataset.data.reduce((a, b) => a + (b || 0), 0) || 0;

      if (total === 0) {
        const centerX = (area.left + area.right) / 2;
        const centerY = (area.top + area.bottom) / 2;
        ctx.save();
        ctx.fillStyle = "#555";
        ctx.textAlign = "center";
        ctx.font = "700 20px Arial";
        ctx.fillText("No data", centerX, centerY - 8);
        ctx.font = "600 18px Arial";
        ctx.fillStyle = "#777";
        ctx.fillText("There is no PNL data to display", centerX, centerY + 14);
        ctx.restore();
        return;
      }

      meta.data.forEach((arc, idx) => {
        const value = dataset.data[idx] || 0;
        if (!value) return;

        const percent = ((value / total) * 100).toFixed(1) + "%";
        const label = chart.data.labels[idx];
        const pos = arc.tooltipPosition();

        const text1 = `${label}`;
        const text2 = `$${value.toLocaleString()} • ${percent}`;

        ctx.save();
        ctx.font = "bold 20px Arial";
        const textWidth = Math.max(
          ctx.measureText(text1).width,
          ctx.measureText(text2).width
        );

        const padding = 8;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 44;
        const boxX = pos.x - boxWidth / 2;
        const boxY = pos.y - boxHeight / 2;

        // Draw card background
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text1, pos.x, pos.y - 8);
        ctx.fillText(text2, pos.x, pos.y + 10);

        ctx.restore();
      });
    },
  };

  const barLabelPlugin = {
    id: "barLabelPlugin",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;

      // calculate totals per bar
      const totals = [];
      chart.data.labels.forEach((_, index) => {
        let sum = 0;
        chart.data.datasets.forEach((ds) => {
          sum += ds.data[index] || 0;
        });
        totals[index] = sum;
      });

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);

        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (!value) return;

          const total = totals[index] || 0;
          const percent = total ? ((value / total) * 100).toFixed(1) + "%" : "0%";
          const { x, y, base } = bar.getProps(["x", "y", "base"], true);

          const centerY = y + (base - y) / 2;
          const text1 = dataset.label;
          const text2 = `$${value.toLocaleString()} • ${percent}`;

          ctx.save();
          ctx.font = "bold 20px Arial";
          const textWidth = Math.max(
            ctx.measureText(text1).width,
            ctx.measureText(text2).width
          );

          const padding = 8;
          const boxWidth = textWidth + padding * 2;
          const boxHeight = 44;
          const boxX = x - boxWidth / 2;
          const boxY = centerY - boxHeight / 2;

          // Card background
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.strokeStyle = "#ccc";
          ctx.lineWidth = 1;
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
          ctx.fill();
          ctx.stroke();

          // Text
          ctx.fillStyle = "#111";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text1, x, centerY - 8);
          ctx.fillText(text2, x, centerY + 10);

          ctx.restore();
        });
      });
    },
  };

  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.parsed || 0;
            const datasetTotal = context.dataset.data.reduce((a, b) => a + b, 0) || 0;
            const pct = datasetTotal > 0 ? ((value / datasetTotal) * 100).toFixed(1) : "0.0";
            return `${context.label}: $${value.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  const exportPDF = async () => {
    const input = chartRef.current;
    if (!input) return;

    setPdfLoading(true);

    const pdf = new jsPDF("p", "mm", "a4");
    const prevBg = input.style.background;
    input.style.background = "#ffffff";

    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL("image/png");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);

      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    } catch (err) {
      console.error(err);
    } finally {
      input.style.background = prevBg || "";
      setPdfLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <h2>Product List</h2>

      <div className="mb-3 d-flex gap-2">
        <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
          + Add Product
        </button>

        <button className="btn btn-primary" onClick={exportPDF} disabled={pdfLoading}>
          {pdfLoading ? "Processing..." : "Checked PNL Chart"}
        </button>

      </div>

      <div className="d-flex gap-3 mb-3">
        <input
          type="text"
          className="form-control w-25"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="dropdown-wrapper w-25 position-relative">
          <select
            className="form-select pe-5"
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FaChevronDown className="dropdown-icon" />
        </div>
      </div>

      {loading && (
        <div className="text-center">
          <ClipLoader size={50} />
        </div>
      )}
      {error && <p className="text-danger text-center">Error: {error}</p>}
      {!loading && filtered.length === 0 && <p className="text-muted text-center">No results found.</p>}

      <div className="row">
        {filtered.map((p) => {
          const count = (comments[p.id] || []).length;
          return (
            <div className="col-sm-6 col-md-4 col-lg-3 mb-4" key={p.id}>
              <div className="card h-100 position-relative" style={{ cursor: "pointer" }}>
                <span className="badge bg-primary position-absolute top-0 end-0 m-2">
                  {typeof p.category === "object" ? p.category.name : p.category}
                </span>
                <img
                  src={p.thumbnail || p.images?.[0] || "https://placehold.co/600x400"}
                  alt={p.title}
                  className="card-img-top"
                  style={{ height: 200, objectFit: "cover" }}
                  onClick={() => navigate(`/product/${p.id}`)}
                />
                <div className="card-body d-flex flex-column" onClick={() => navigate(`/product/${p.id}`)}>
                  <h5 className="card-title">{p.title}</h5>
                  <p>Price: ${p.price}</p>
                </div>
                <div className="card-footer d-flex justify-content-end align-items-center">
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-warning btn-sm" onClick={() => setEditProduct(p)}>
                      <FaEdit />
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(p.id)}>
                      <FaTrash />
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setOpenProductId(p.id)}>
                      <FaComments />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* <div
        ref={chartRef}
        className="my-5 p-3"
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 6px 20px rgba(21,32,43,0.06)",
        }}
      >
        <h3 style={{ marginBottom: 12 }}>Profit & Loss Overview</h3>


        {currentMonthLabel && (
          <h5 style={{ fontSize: 24, fontWeight: 700, marginTop: 20, color: "#374151" }}>
            Showing PNL Data for <strong>{currentMonthLabel}</strong>
          </h5>
        )}

        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "nowrap" }}>

          <div
            style={{
              flexBasis: "30%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 8,
              minWidth: 240,
              paddingRight: 8,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Legend & Values</div>

            {LABELS.map((label, idx) => {
              const val = pieData.datasets[0].data[idx] || 0;
              const pct = grandTotal ? ((val / grandTotal) * 100).toFixed(1) : "0.0";
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 12px",
                    borderRadius: 10,
                    marginBottom: 10,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 8px 18px rgba(17,24,39,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: COLORS[idx],
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 20, color: "#374151" }}>
                      ${Number(val).toLocaleString()} • {pct}% of total
                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          <div style={{ flexBasis: "60%", minWidth: 680, height: 520 }}>
            <Pie data={pieData} options={pieOptions} plugins={[pieLabelPlugin]} />
          </div>
        </div>


        <div style={{ marginTop: 50 }}>
          <h4 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: "#374151" }}>Yearly PNL Overview</h4>
          {currentYearLabel && (
            <h5 style={{ fontSize: 24, fontWeight: 700, marginTop: 20, color: "#374151" }}>
              Showing PNL Data for <strong>{currentYearLabel}</strong>
            </h5>
          )}
          <div style={{ minHeight: 400, marginTop: 40 }}>
            
            <Bar data={barData} options={barOptions} plugins={[barLabelPlugin]} />
          </div>
        </div>
      </div> */}

      {openProductId !== null && <CommentModal productId={openProductId} onClose={() => setOpenProductId(null)} />}
      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} />}
      {editProduct && <AddProductModal onClose={() => setEditProduct(null)} initialData={editProduct} />}
    </div>
  );
}
