import { signInWithPopup } from 'firebase/auth';
import { auth, microsoftProvider } from './firebase';

export function signInWithMicrosoft() {
  return signInWithPopup(auth, microsoftProvider);
}
