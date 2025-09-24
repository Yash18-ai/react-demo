import React, { useRef, useEffect, useState } from "react";
import { Line, Pie } from "react-chartjs-2";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import "chart.js/auto";

export default function PnlChart() {
    const chartRef = useRef();
    const [pnlData, setPnlData] = useState([]);

    useEffect(() => {
        fetch("/pnlData.json")
            .then((res) => res.json())
            .then((data) => setPnlData(data.pnlData))
            .catch((err) => console.error("Error loading JSON:", err));
    }, []);

    if (pnlData.length === 0) {
        return <div className="text-center py-5">Loading chart...</div>;
    }

    const data = {
        labels: pnlData.map((d) => d.date),
        datasets: [
            {
                label: "Sales",
                data: pnlData.map((d) => d.sales),
                borderColor: "rgba(0, 200, 83, 1)",
            },
            {
                label: "Expenses",
                data: pnlData.map((d) => d.expenses),
                borderColor: "rgba(244, 67, 54, 1)",
            },
            {
                label: "Profit",
                data: pnlData.map((d) => d.profit),
                borderColor: "rgba(33, 150, 243, 1)",
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: "bottom" },
            title: {
                display: true,
                text: "Profit & Loss Chart (Last 1 Month)",
                font: { size: 18 },
            },
        },
    };

    const totalSales = pnlData.reduce((sum, d) => sum + d.sales, 0);
    const totalExpenses = pnlData.reduce((sum, d) => sum + d.expenses, 0);
    const totalProfit = pnlData.reduce((sum, d) => sum + d.profit, 0);

    const pieData = {
        labels: ["Sales", "Expenses", "Profit"],
        datasets: [
            {
                data: [totalSales, totalExpenses, totalProfit],
                backgroundColor: [
                    "rgba(0, 200, 83, 0.7)",
                    "rgba(244, 67, 54, 0.7)",
                    "rgba(33, 150, 243, 0.7)",
                ],
                borderColor: [
                    "rgba(0, 200, 83, 1)",
                    "rgba(244, 67, 54, 1)",
                    "rgba(33, 150, 243, 1)",
                ],
                borderWidth: 1,
            },
        ],
    };

    const exportPDF = async () => {
        const input = chartRef.current;
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("landscape", "mm", "a4");
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, "PNG", 0, 20, pdfWidth, pdfHeight);
        pdf.save("PNL-Report.pdf");
    };

    return (
        <div className="card shadow-lg">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">PNL Dashboard</h5>
                <button className="btn btn-sm btn-primary" onClick={exportPDF}>
                    Export PDF
                </button>
            </div>

            <div className="card-body" ref={chartRef}>
                <div className="row">
                    <div className="col-md-8">
                        <div className="chart-container" style={{ height: "400px" }}>
                            <Line data={data} options={options} />
                        </div>
                    </div>

                    <div className="col-md-3 d-flex align-items-center">
                        <Pie data={pieData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
