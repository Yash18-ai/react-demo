// import React, { useRef, useState, useEffect } from "react";
// import * as vosk from "vosk-browser";
// import { IoClose } from "react-icons/io5";
// import "../assets/css/VideoModal.css";

// export default function VideoModal({ videoUrl, title, onClose }) {
//   const videoRef = useRef(null);
//   const progressBarRef = useRef(null);
//   const audioCtxRef = useRef(null);
//   const recognizerRef = useRef(null);

//   const [progress, setProgress] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [chapters, setChapters] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [statusMessage, setStatusMessage] = useState("");

//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video) return;

//     const metaHandler = () => setDuration(video.duration || 0);
//     const timeHandler = () => setProgress(video.currentTime);
//     video.addEventListener("loadedmetadata", metaHandler);
//     video.addEventListener("timeupdate", timeHandler);

//     return () => {
//       video.removeEventListener("loadedmetadata", metaHandler);
//       video.removeEventListener("timeupdate", timeHandler);
//     };
//   }, []);

//   useEffect(() => {
//     if (!videoUrl) return;
//     initTranscription();
//     return cleanupAudio;
//   }, [videoUrl]);

//   const cleanupAudio = () => {
//     recognizerRef.current?.free?.();
//     audioCtxRef.current?.close?.();
//   };

//   const initTranscription = async () => {
//     try {
//       setLoading(true);
//       setStatusMessage("Loading speech model...");

//       // Create AudioContext
//       const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
//       audioCtxRef.current = audioCtx;

//       // Create MediaElementSource from the <video>
//       const sourceNode = audioCtx.createMediaElementSource(videoRef.current);

//       // Create ScriptProcessorNode for capturing audio
//       const processor = audioCtx.createScriptProcessor(4096, 1, 1);
//       sourceNode.connect(processor);
//       processor.connect(audioCtx.destination);

//       // Load model
//       const model = await vosk.createModel("/vosk-model-small-en-in-0.4.zip");
//       const recognizer = new model.KaldiRecognizer(audioCtx.sampleRate);
//       recognizer.setWords(true);
//       recognizerRef.current = recognizer;

//       const words = [];
//       recognizer.on("result", (msg) => {
//         if (msg?.result?.result?.length) {
//           words.push(...msg.result.result);
//           console.log("Transcription result:", msg.result.text);
//         }
//       });
//       recognizer.on("partialresult", (msg) => {
//         if (msg?.partial) {
//           console.log("Partial:", msg.partial);
//         }
//       });

//       // Capture PCM chunks
//       processor.onaudioprocess = (event) => {
//         const input = event.inputBuffer.getChannelData(0);
//         recognizer.acceptWaveformFloat(input, audioCtx.sampleRate);
//       };

//       setStatusMessage("");
//       setLoading(false);
//     } catch (err) {
//       console.error(err);
//       setStatusMessage("Error initializing transcription.");
//       setLoading(false);
//     }
//   };

//   const togglePlay = () => {
//     const v = videoRef.current;
//     if (!v) return;
//     if (v.paused) {
//       audioCtxRef.current?.resume();
//       v.play();
//       setIsPlaying(true);
//     } else {
//       v.pause();
//       setIsPlaying(false);
//     }
//   };

//   const formatTime = (sec) => {
//     if (!sec || isNaN(sec)) return "0:00";
//     const m = Math.floor(sec / 60);
//     const s = Math.floor(sec % 60);
//     return `${m}:${s.toString().padStart(2, "0")}`;
//   };

//   const handleScrub = (e) => {
//     const rect = progressBarRef.current.getBoundingClientRect();
//     const clickX = e.clientX - rect.left;
//     const newTime = (clickX / rect.width) * duration;
//     videoRef.current.currentTime = newTime;
//     setProgress(newTime);
//   };

//   return (
//     <div className="video-modal-backdrop" onClick={onClose}>
//       <div
//         className="modal-dialog modal-lg modal-dialog-centered"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <div className="modal-content video-modal-content p-3">
//           <div className="modal-header d-flex justify-content-between align-items-center">
//             <h5 className="modal-title">{title}</h5>
//             <button
//               type="button"
//               className="btn-close"
//               aria-label="Close"
//               onClick={onClose}
//               style={{
//                 fontSize: "1.5rem",
//                 border: "none",
//                 background: "none",
//                 cursor: "pointer",
//               }}
//             >
//               <IoClose /> 
//             </button>
//           </div>

//           <div className="modal-body">
//             <video
//               ref={videoRef}
//               src={videoUrl}
//               width="100%"
//               controls={false}
//               onClick={togglePlay}
//               style={{ cursor: "pointer", backgroundColor: "black" }}
//             />

//             {loading && (
//               <div style={{ marginTop: "1rem", fontWeight: "bold" }}>
//                 {statusMessage || "Initializing..."}
//               </div>
//             )}

//             <div
//               className="custom-scrubber-container mt-3"
//               style={{ position: "relative" }}
//             >
//               <div
//                 className="progress-bar"
//                 ref={progressBarRef}
//                 onClick={handleScrub}
//                 style={{
//                   position: "relative",
//                   height: "10px",
//                   backgroundColor: "#ccc",
//                   cursor: "pointer",
//                   borderRadius: "5px",
//                 }}
//               >
//                 <div
//                   className="progress-filled"
//                   style={{
//                     width: `${(progress / duration) * 100}%`,
//                     height: "100%",
//                     backgroundColor: "#4caf50",
//                   }}
//                 />
//               </div>

//               <div
//                 className="time-display"
//                 style={{
//                   marginTop: "0.5rem",
//                   fontFamily: "monospace",
//                 }}
//               >
//                 <span>{formatTime(progress)}</span> /{" "}
//                 <span>{formatTime(duration)}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useRef, useState, useEffect } from "react";
import * as vosk from "vosk-browser";
import { IoClose } from "react-icons/io5";
import "../assets/css/VideoModal.css";

export default function VideoModal({ videoUrl, title, onClose }) {
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const audioCtxRef = useRef(null);
  const recognizerRef = useRef(null);
  const chaptersRef = useRef([]);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [hoverTime, setHoverTime] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const metaHandler = () => setDuration(video.duration || 0);
    const timeHandler = () => setProgress(video.currentTime);
    video.addEventListener("loadedmetadata", metaHandler);
    video.addEventListener("timeupdate", timeHandler);

    return () => {
      video.removeEventListener("loadedmetadata", metaHandler);
      video.removeEventListener("timeupdate", timeHandler);
    };
  }, []);

  useEffect(() => {
    if (!videoUrl) return;
    initTranscription();
    return cleanupAudio;
  }, [videoUrl]);

  const cleanupAudio = () => {
    recognizerRef.current?.free?.();
    audioCtxRef.current?.close?.();
  };

  const initTranscription = async () => {
    try {
      setLoading(true);
      setStatusMessage("Loading speech model...");

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaElementSource(videoRef.current);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      sourceNode.connect(processor);
      processor.connect(audioCtx.destination);

      const model = await vosk.createModel("/vosk-model-small-en-in-0.4.zip");
      const recognizer = new model.KaldiRecognizer(audioCtx.sampleRate);
      recognizer.setWords(true);
      recognizerRef.current = recognizer;

      // recognizer.on("result", (msg) => {
      //   if (msg?.result?.result?.length) {
      //     const markers = msg.result.result.map(w => ({
      //       start: w.start,
      //       end: w.end,
      //       word: w.word
      //     }));
      //     setChapters(prev => [...prev, ...markers]);
      //     console.log("Transcription result:", msg.result.text);
      //   }
      // });

      recognizer.on("result", (msg) => {
        if (msg?.result?.result?.length) {
          
          const firstWord = msg.result.result[0];
          const text = msg.result.text.trim();
      
         
          if (text && (!chaptersRef.current.length || 
              firstWord.start - chaptersRef.current[chaptersRef.current.length - 1].start > 10)) {
            
            const chapter = {
              start: firstWord.start,
              label: text 
            };
            setChapters(prev => [...prev, chapter]);
            chaptersRef.current.push(chapter);
            console.log("Chapter added:", chapter);
          }
        }
      });
      

      recognizer.on("partialresult", (msg) => {
        if (msg?.partial) {
          console.log("Partial:", msg.partial);
        }
      });

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        recognizer.acceptWaveformFloat(input, audioCtx.sampleRate);
      };

      setStatusMessage("");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatusMessage("Error initializing transcription.");
      setLoading(false);
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      audioCtxRef.current?.resume();
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  
  const handleScrub = (e) => {
    if (!progressBarRef.current || chapters.length === 0) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration;

    // if (chapters.length > 0) {
    //   let nearestChapter = chapters.reduce((prev, curr) =>
    //     Math.abs(curr.start - clickTime) < Math.abs(prev.start - clickTime) ? curr : prev
    //   );
    //   videoRef.current.currentTime = nearestChapter.start;
    //   setProgress(nearestChapter.start);
    // } else {
    //   videoRef.current.currentTime = clickTime;
    //   setProgress(clickTime);
    // }
    let nearestChapter =chapters.reduce((prev, curr) => 
       Math.abs(curr.start - clickTime) < Math.abs(prev.start - clickTime) ? curr : prev
    );
    videoRef.current.currentTime = nearestChapter.start;
    setProgress(nearestChapter.start);
  };

  const handleMouseMove = (e) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverTimeRaw = (hoverX / rect.width) * duration;

    if (chapters.length > 0) {
      let nearestChapter = chapters.reduce((prev, curr) =>
        Math.abs(curr.start - hoverTimeRaw) < Math.abs(prev.start - hoverTimeRaw) ? curr : prev
      );
      setHoverTime(nearestChapter.start);
    } else {
      setHoverTime(hoverTimeRaw);
    }
  };

  const handleMouseLeave = () => setHoverTime(null);

  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content video-modal-content p-3">
          <div className="modal-header d-flex justify-content-between align-items-center">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              style={{
                fontSize: "1.5rem",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              <IoClose /> 
            </button>
          </div>

          <div className="modal-body">
            <video
              ref={videoRef}
              src={videoUrl}
              width="100%"
              controls={false}
              onClick={togglePlay}
              style={{ cursor: "pointer", backgroundColor: "black" }}
            />

            {loading && (
              <div style={{ marginTop: "1rem", fontWeight: "bold" }}>
                {statusMessage || "Initializing..."}
              </div>
            )}

            <div
              className="custom-scrubber-container mt-3"
              style={{ position: "relative" }}
            >
              <div
                className="progress-bar"
                ref={progressBarRef}
                onClick={handleScrub}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  position: "relative",
                  height: "6px",
                  backgroundColor: "#ccc",
                  cursor: "pointer",
                  borderRadius: "3px",
                  overflow: "hidden"
                }}
              >
                {chapters.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${(c.start / duration) * 100}%`,
                      width: "2px",
                      height: "100%",
                      backgroundColor: "green"
                    }}
                    title={c.word}
                  />
                ))}

                <div
                  className="progress-filled"
                  style={{
                    width: `${(progress / duration) * 100}%`,
                    height: "100%",
                    backgroundColor: "#ff0000",
                    transition: "width 0.1s linear"
                  }}
                />

                {hoverTime !== null && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(hoverTime / duration) * 100}%`,
                      bottom: "100%",
                      transform: "translateX(-50%)",
                      padding: "2px 4px",
                      background: "rgba(0,0,0,0.8)",
                      color: "#fff",
                      fontSize: "0.75rem",
                      borderRadius: "3px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>

              <div
                className="time-display"
                style={{
                  marginTop: "0.5rem",
                  fontFamily: "monospace",
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
