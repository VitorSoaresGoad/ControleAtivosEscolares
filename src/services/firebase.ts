import { OAuthProvider } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { app } from './firebaseApp';
import { auth } from './firebaseAuth';
const microsoftProvider = new OAuthProvider('microsoft.com');

microsoftProvider.setCustomParameters({
  prompt: 'select_account' 
});
const db = getFirestore(app);

export { app, auth, microsoftProvider, db };
