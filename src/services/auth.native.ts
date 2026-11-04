import { OAuthProvider, signInWithRedirect, type AuthProvider } from '@react-native-firebase/auth';
import { auth } from './firebase.native';

const microsoftProvider = new OAuthProvider('microsoft.com');

microsoftProvider.setCustomParameters({
  prompt: 'select_account',
  tenant: process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common',
});

export function signInWithMicrosoft() {
  // RNFirebase 27.1's OAuthProvider exposes PROVIDER_ID as a getter but its
  // private providerId field conflicts with the public AuthProvider type.
  return signInWithRedirect(auth, microsoftProvider as unknown as AuthProvider);
}
