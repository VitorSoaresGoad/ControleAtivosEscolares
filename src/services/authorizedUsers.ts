import { collection, doc, documentId, getDocs, onSnapshot, orderBy, query, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { Perfil, UsuarioAutorizado, UsuarioAutorizadoComId } from '../types/domain';

const usersRef = collection(db, 'usuarios_autorizados');
const INSTITUTIONAL_DOMAIN = '@professor.educacao.sp.gov.br';

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
  if (!email.endsWith(INSTITUTIONAL_DOMAIN)) throw new Error(`Use uma conta institucional ${INSTITUTIONAL_DOMAIN}.`);
  const target = doc(usersRef, uid);
  const existing = await getDocs(query(usersRef, where(documentId(), '==', uid)));
  if (!existing.empty) throw new Error('Esse UID já está na lista de usuários autorizados.');
  const data: UsuarioAutorizado = { email, nome: name, perfil: input.profile };
  await setDoc(target, data);
}
