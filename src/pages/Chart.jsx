import React from "react";
import PnlChart from "../components/PnlChart";

export default function Chart() {
  return (
    <div className="container py-4">
      <h1 className="mb-4 text-center">Profit & Loss Dashboard</h1>
      <PnlChart />
    </div>
  );
}
