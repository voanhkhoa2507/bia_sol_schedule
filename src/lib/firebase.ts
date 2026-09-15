// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDy1Jg3sxrrYZcwWNjiVGK2Cewrr7OJOyQ",
  authDomain: "biasolschedule.firebaseapp.com",
  projectId: "biasolschedule",
  storageBucket: "biasolschedule.firebasestorage.app",
  messagingSenderId: "526789771916",
  appId: "1:526789771916:web:b5c446c608c7a279c6f1a9",
  measurementId: "G-DNPTRKZZMR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
