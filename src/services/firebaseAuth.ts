import { browserPopupRedirectResolver, browserSessionPersistence, initializeAuth } from 'firebase/auth';
import { app } from './firebaseApp';

// Keep web sessions scoped to the current browser tab/session.
export const auth = initializeAuth(app, {
  persistence: browserSessionPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
