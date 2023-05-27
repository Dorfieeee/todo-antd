// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIRESTORE_API,
    authDomain: "ant-todo.firebaseapp.com",
    projectId: "ant-todo",
    storageBucket: "ant-todo.appspot.com",
    messagingSenderId: "851769128775",
    appId: "1:851769128775:web:309796758c309ae9aa3e62",
    measurementId: "G-MJKD4WENNE"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
