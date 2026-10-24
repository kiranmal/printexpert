import React from "react";

export default function StatCard({
  icon,
  title,
  value,
  change,
  accent = "#eb2585",
}) {

  return (
    <div
      className="stat-card"
      style={{ "--accent": accent }}
    >

      {/* ICON */}

      <div className="stat-icon">
        {icon}
      </div>


      {/* CONTENT */}

      <div className="stat-content">

        <p className="stat-title">
          {title}
        </p>

        <h3 className="stat-value">
          {value}
        </h3>

        {change && (
          <>
            <span className="stat-change">
              {change}
            </span>

            <span className="stat-period">
              {" "}from last month
            </span>
          </>
        )}

      </div>

    </div>
  );
}
