
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";


const BASE = "https://www.googleapis.com/youtube/v3";
const KEY = "AIzaSyDR6h8IfZPfaxnLnApgg9lDurwVvLCb8LU"; 

export const fetchVideos = createAsyncThunk(
  "videos/fetch",
  async ({ q = "all", pageToken = "" } = {}) => {
    try {
      const url = `${BASE}/search`;
      const params = {
        key: KEY,
        q,
        part: "snippet",
        type: "video",
        maxResults: 100,
        pageToken,
      };
      const res = await axios.get(url, { params });
      return res.data; 
    } catch (error) {
      console.error("Error fetching videos:", error);
      throw error;
    }
  }
);

export const fetchVideoDetails = createAsyncThunk(
  "videos/fetchDetails",
  async (videoId) => {
    try {
      const url = `${BASE}/videos`;
      const params = {
        key: KEY,
        id: videoId,
        part: "snippet,contentDetails,statistics",
      };
      const res = await axios.get(url, { params });
      return res.data; // items array
    } catch (error) {
      console.error("Error fetching video details:", error);
      throw error;
    }
  }
);

const videosSlice = createSlice({
  name: "videos",
  initialState: {
    list: [],
    nextPageToken: null,
    loading: false,
    error: null,
    selected: null,
    modalOpen: false,
  },
  reducers: {
    closeModal: (state) => {
      state.modalOpen = false;
      state.selected = null;
    },
    openModal: (state) => {
      state.modalOpen = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVideos.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload.items || [];
        state.nextPageToken = payload.nextPageToken || null;
      })
      .addCase(fetchVideos.rejected, (state, { error }) => {
        state.loading = false;
        state.error = error.message;
      })

    
      .addCase(fetchVideoDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVideoDetails.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.selected = (payload.items && payload.items[0]) || null;
        state.modalOpen = !!state.selected;
      })
      .addCase(fetchVideoDetails.rejected, (state, { error }) => {
        state.loading = false;
        state.error = error.message;
      });
  },
});

export const { closeModal, openModal } = videosSlice.actions;
export default videosSlice.reducer;
