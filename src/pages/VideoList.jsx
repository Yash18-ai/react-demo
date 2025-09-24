// import React, { useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import VideoCard from "../components/VideoCard";
// import VideoModal from "../components/VideoModal";
// import { fetchVideoDetails, fetchVideos } from "../features/videos/videoSlice";
// import "../assets/css/VideoList.css";

// export default function VideoList() {
//   const dispatch = useDispatch();
//   const videos = useSelector((s) => s.videos.list);
//   const status = useSelector((s) => s.videos.status);
//   const modalOpen = useSelector((s) => s.videos.modalOpen);
//   const [query, setQuery] = useState("");

//   useEffect(() => {
//     dispatch(fetchVideos({ q: "latest tech" }));
//   }, [dispatch]);

//   const onSearch = (e) => {
//     e.preventDefault();
//     if (!query.trim()) return;
//     dispatch(fetchVideos({ q: query.trim() }));
//   };

//   return (
//     <div className="container my-4">
//       <h2 className="mb-4">Videos</h2>

//       <form onSubmit={onSearch} className="d-flex mb-3">
//         <input
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           placeholder="Search videos..."
//           className="form-control"
//         />
//         <button type="submit" className="btn btn-primary ms-2">
//           Search
//         </button>
//       </form>

//       {status === "loading" && <p>Loading...</p>}
//       <div className="row g-3">
//         {videos.map((it) => (
//           <div key={it.id.videoId} className="col-sm-6 col-md-4 col-lg-3">
//             <VideoCard item={it} onOpen={(id) => dispatch(fetchVideoDetails(id))} />
//           </div>
//         ))}
//       </div>

//       {modalOpen && <VideoModal />}
//     </div>
//   );
// }


import React, { useState } from "react";
import VideoCard from "../components/VideoCard";
import VideoModal from "../components/VideoModal";

export default function VideoList() {
  const sampleVideo = {
    title: "Sample Video",
    thumb: "/assets/sample-thumbnail.png", 
    url: "/assets/sample.mp4",
  };

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="container my-4">
      <h2 className="mb-4">Video Scrubbing Example</h2>

      <div className="row g-3">
        <div className="col-sm-6 col-md-4 col-lg-3">
          <VideoCard
            title={sampleVideo.title}
            thumb={sampleVideo.thumb}
            onOpen={() => setModalOpen(true)}
          />
        </div>
      </div>

      {modalOpen && (
        <VideoModal
          videoUrl={sampleVideo.url}
          title={sampleVideo.title}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

