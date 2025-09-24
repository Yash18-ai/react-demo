// import React from "react";
// import "../assets/css/VideoCard.css";

// export default function VideoCard({ item, onOpen }) {
//   const snippet = item.snippet || {};
//   const videoId = item.id.videoId;
//   const thumb =
//     snippet.thumbnails?.high?.url ||
//     snippet.thumbnails?.medium?.url ||
//     snippet.thumbnails?.default?.url;

//   return (
//     <div
//       className="card video-card h-100"
//       onClick={() => onOpen(videoId)}
//       role="button"
//     >
//       <div className="position-relative">
//         <img
//           src={thumb}
//           alt={snippet.title}
//           className="card-img-top video-thumbnail"
//         />
//         <div className="play-icon">▶</div>
//       </div>
//       <div className="card-body">
//         <h6 className="card-title video-title">{snippet.title}</h6>
//         <p className="card-text text-muted mb-0">{snippet.channelTitle}</p>
//       </div>
//     </div>
//   );
// }

import React from "react";
import "../assets/css/VideoCard.css";

export default function VideoCard({ title, thumb, onOpen }) {
  return (
    <div
      className="card video-card h-100"
      onClick={onOpen}
      role="button"
      style={{ cursor: "pointer" }}
    >
      <div className="position-relative">
        <img src={thumb} alt={title} className="card-img-top video-thumbnail" />
        <div className="play-icon">▶</div>
      </div>
      <div className="card-body">
        <h6 className="card-title video-title">{title}</h6>
      </div>
    </div>
  );
}
