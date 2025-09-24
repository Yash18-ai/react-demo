import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyCEZZBH7f6TjpdvtMMIvDiwGb-qUcLlNeY",
  authDomain: "authentication-b865c.firebaseapp.com",
  projectId: "authentication-b865c",
  storageBucket: "authentication-b865c.appspot.com",
  messagingSenderId: "448853024284",
  appId: "1:448853024284:web:820faa7de5f055dfeb49d9",
  measurementId: "G-503CBQT8JT"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);   
export const analytics = getAnalytics(app);

export default app;
