import { getAuth, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { useEffect, useState } from "react";
import { app } from "./app";
import { db } from "./db";
import { addDoc, doc, getDoc, updateDoc } from "firebase/firestore";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const useAuth = () => {
    const [user, setUser] = useState(null);

    const authenticateUser = () => {
        signInWithPopup(auth, provider)
        .then(async (result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        // The signed-in user info.
        const user = result.user;
        // IdP data available using getAdditionalUserInfo(result)
        // ...
        
        const ref = doc(db, "users", user.uid);
        const userDoc = await getDoc(ref);
        const userData = { name: user.displayName, photoURL: user.photoURL };
        if (userDoc.exists()) {
            updateDoc(ref, userData);
        } else {
            addDoc(ref, userData)
        } 
        setUser(user);
        })
        .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.customData.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        // ...
        });
    }

    return [user, authenticateUser];
}
