// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBg1m3mFfV2wgTY1d1ZLimBmR__Ivd-PKs",
  authDomain: "wyecare-436fc.firebaseapp.com",
  projectId: "wyecare-436fc",
  storageBucket: "wyecare-436fc.appspot.com",
  messagingSenderId: "373583104921",
  appId: "1:373583104921:web:3ddf5e3bf390daaf38a108",
  measurementId: "G-HBSWJ57N01",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
