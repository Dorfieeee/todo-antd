// Import the functions you need from the SDKs you need
import { getFirestore } from "firebase/firestore";
import { app } from "./app";

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
