import { getAuth, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { useEffect, useState } from "react";
import { app } from "./app";
import { db } from "./db";
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const useAuth = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (!!auth.currentUser) {
            setUser(auth.currentUser);
        }
    })

    const authenticateUser = async () => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            const result = await signInWithPopup(auth, provider)
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            // IdP data available using getAdditionalUserInfo(result)
            // ...
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = { name: user.displayName, photoURL: user.photoURL };
            if (userDoc.exists()) {
                await updateDoc(doc(db, "users", user.uid), userData);
            } else {
                await setDoc(doc(db, "users", user.uid), userData)
            } 
            setUser(user);
        } catch (error) {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode, errorMessage)
        }
    }

    return [user, authenticateUser];
}
