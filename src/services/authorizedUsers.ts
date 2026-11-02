import { collection, doc, documentId, getDocs, onSnapshot, orderBy, query, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { Perfil, UsuarioAutorizado, UsuarioAutorizadoComId } from '../types/domain';

const usersRef = collection(db, 'usuarios_autorizados');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function subscribeToAuthorizedUsers(onData: (users: UsuarioAutorizadoComId[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(usersRef, orderBy('nome')), snapshot => {
    onData(snapshot.docs.map(item => ({ ...item.data(), documentId: item.id } as UsuarioAutorizadoComId)));
  }, onError);
}

export async function addAuthorizedUser(input: { uid: string; email: string; name: string; profile: Perfil }) {
  const uid = input.uid.trim();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!uid || !name || !email) throw new Error('Preencha UID, e-mail e nome.');
  if (!EMAIL_PATTERN.test(email)) throw new Error('Informe um endereço de e-mail válido.');
  const target = doc(usersRef, uid);
  const existing = await getDocs(query(usersRef, where(documentId(), '==', uid)));
  if (!existing.empty) throw new Error('Esse UID já está na lista de usuários autorizados.');
  const data: UsuarioAutorizado = { email, nome: name, perfil: input.profile };
  await setDoc(target, data);
}
