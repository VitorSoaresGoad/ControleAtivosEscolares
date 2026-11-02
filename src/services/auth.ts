import { signInWithCredential } from 'firebase/auth';
import { auth, microsoftProvider } from './firebase';

export async function signInWithMicrosoftAccessToken(accessToken: string) {
  const credential = microsoftProvider.credential({ accessToken });
  return signInWithCredential(auth, credential);
}

export { microsoftProvider };
