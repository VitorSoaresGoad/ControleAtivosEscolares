import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Alert } from 'react-native';
import { doc, getDoc } from '../services/firestore';
import { onAuthStateChanged, signOut, type AuthUser } from '../services/authSession';
import { auth, db } from '../services/firebase';
import type { Perfil, UsuarioAutorizado } from '../types/domain';

type AuthState = { user: AuthUser; profile: UsuarioAutorizado } | null;
type AuthContextValue = { session: AuthState; loading: boolean; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthState>(null);
  const [loading, setLoading] = useState(true);
  const validationSequence = useRef(0);

  useEffect(() => onAuthStateChanged(auth, user => {
    const sequence = ++validationSequence.current;
    if (!user) { setSession(null); setLoading(false); return; }
    setLoading(true);

    const reject = async (title: string, message: string) => {
      if (validationSequence.current === sequence) {
        setSession(null);
        Alert.alert(title, message);
      }
      if (auth.currentUser?.uid === user.uid) await signOut(auth);
    };

    void (async () => {
      try {
        const authorized = await getDoc(doc(db, 'usuarios_autorizados', user.uid));
        if (!authorized.exists()) {
          await reject('Acesso não autorizado', 'Sua conta ainda não está cadastrada na lista de usuários autorizados.');
          return;
        }

        const data = authorized.data();
        const email = user.email?.trim().toLowerCase() ?? '';
        const authorizedEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
        const usesMicrosoft = user.providerData.some(provider => provider.providerId === 'microsoft.com');
        if (!usesMicrosoft || !email || email !== authorizedEmail) {
          await reject('Conta não autorizada', 'Entre com a conta Microsoft cadastrada pela equipe de T.I.');
          return;
        }

        if (data.perfil !== 'admin' && data.perfil !== 'professor') {
          await reject('Perfil inválido', 'Peça à equipe de T.I. para revisar seu cadastro.');
          return;
        }

        if (validationSequence.current === sequence && auth.currentUser?.uid === user.uid) {
          setSession({ user, profile: { email, nome: String(data.nome ?? user.displayName ?? 'Usuário'), perfil: data.perfil as Perfil } });
        }
      } catch (error) {
        console.error('Falha ao validar whitelist:', error);
        await reject('Não foi possível validar o acesso', 'Verifique sua conexão e tente entrar novamente.');
      } finally {
        if (validationSequence.current === sequence) setLoading(false);
      }
    })();
  }), []);

  const logout = useCallback(() => signOut(auth), []);
  const value = useMemo(() => ({ session, loading, logout }), [session, loading, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa ser usado dentro de AuthProvider');
  return value;
}
