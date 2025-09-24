import React from "react";
import SubmissionList from "../components/SubmissionList";

function Home() {
    return (
        <div className="container py-4">
            <h1>All Submissions</h1>
            <SubmissionList />
        </div>
    );
}

export default Home;