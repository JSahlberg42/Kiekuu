// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMbgXXwLYEZyuDouURoto13_VFqLiXgY8",
  authDomain: "kiekuu-cb601.firebaseapp.com",
  projectId: "kiekuu-cb601",
  storageBucket: "kiekuu-cb601.firebasestorage.app",
  messagingSenderId: "1004001830810",
  appId: "1:1004001830810:web:6030a038cc9681fd78fc23",
  measurementId: "G-9LT0TYFMCK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);