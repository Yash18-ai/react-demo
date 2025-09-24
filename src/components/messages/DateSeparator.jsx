import React from "react";
import moment from "moment";

const DateSeparator = ({ timestamp }) => (
  <div
    className="text-center my-2"
    style={{ fontSize: "0.8rem", color: "#666" }}
  >
    {moment(timestamp).calendar(null, {
      sameDay: "[Today]",
      lastDay: "[Yesterday]",
      lastWeek: "dddd",
      sameElse: "MMMM D, YYYY",
    })}
  </div>
);

export default DateSeparator;
