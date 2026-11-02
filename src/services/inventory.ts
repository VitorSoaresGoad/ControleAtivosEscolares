import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp,
  setDoc, updateDoc, where, writeBatch, type DocumentReference, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Carrinho, CarrinhoResumo, Equipamento, EquipamentoComId, RegistroHistorico, StatusEquipamento } from '../types/domain';

const cartsRef = collection(db, 'carrinhos');
const equipmentRef = collection(db, 'equipamentos');
const historyRef = collection(db, 'historico');

export function subscribeToCarts(onData: (items: CarrinhoResumo[]) => void, onError: (error: Error) => void): Unsubscribe {
  let stopCounts: Unsubscribe | undefined;
  const stopCarts = onSnapshot(query(cartsRef, orderBy('nome_sala')), snapshot => {
    const carts = snapshot.docs.map(d => ({ ...d.data(), documentId: d.id } as CarrinhoResumo));
    stopCounts?.();
    stopCounts = onSnapshot(equipmentRef, equipmentSnapshot => {
      const counts = new Map<string, { total: number; disponiveis: number; emUso: number; emManutencao: number }>();
      for (const item of equipmentSnapshot.docs) {
        const data = item.data() as Equipamento;
        const cartId = (data.id_carrinho as DocumentReference | undefined)?.id;
        if (!cartId) continue;
        const count = counts.get(cartId) ?? { total: 0, disponiveis: 0, emUso: 0, emManutencao: 0 };
        count.total += 1;
        if (data.status === 'disponível') count.disponiveis += 1;
        if (data.status === 'em_uso') count.emUso += 1;
        if (data.status === 'em_manutencao') count.emManutencao += 1;
        counts.set(cartId, count);
      }
      onData(carts.map(cart => ({ ...cart, ...(counts.get(cart.documentId) ?? { total: 0, disponiveis: 0, emUso: 0, emManutencao: 0 }) })));
    }, onError);
  }, onError);
  return () => { stopCarts(); stopCounts?.(); };
}

export function subscribeToCartEquipment(cartId: string, onData: (items: EquipamentoComId[]) => void, onError: (error: Error) => void): Unsubscribe {
  const ref = doc(db, 'carrinhos', cartId);
  return onSnapshot(query(equipmentRef, where('id_carrinho', '==', ref)), snapshot => {
    const items = snapshot.docs.map(d => ({ ...d.data(), documentId: d.id } as EquipamentoComId));
    items.sort((a, b) => {
      const aName = a.nome?.trim() || `Notebook ${a.numero_patrimonio}`;
      const bName = b.nome?.trim() || `Notebook ${b.numero_patrimonio}`;
      return aName.localeCompare(bName, 'pt-BR', { numeric: true, sensitivity: 'base' })
        || a.numero_patrimonio.localeCompare(b.numero_patrimonio, 'pt-BR', { numeric: true });
    });
    onData(items);
  }, onError);
}

export async function checkoutEquipment(input: { equipment: EquipamentoComId; student: string; email: string; teacherName: string; roomName?: string }) {
  const equipmentDocument = doc(equipmentRef, input.equipment.documentId);
  const historyDocument = doc(historyRef);
  await runTransaction(db, async transaction => {
    const current = await transaction.get(equipmentDocument);
    if (!current.exists()) throw new Error('Este equipamento não foi encontrado.');
    const data = current.data() as Equipamento;
    if (data.status !== 'disponível') throw new Error('Este equipamento não está disponível. Atualize a lista.');
    transaction.update(equipmentDocument, {
      status: 'em_uso', aluno_atual: input.student.trim(), hora_retirada: serverTimestamp(),
      id_historico_atual: historyDocument.id, email_professor_atual: input.email,
      nome_professor_atual: input.teacherName, atualizado_em: serverTimestamp(),
    });
    transaction.set(historyDocument, {
      id_registro: historyDocument.id, id_equipamento: equipmentDocument, email_professor: input.email,
      nome_professor: input.teacherName, nome_aluno: input.student.trim(), data_hora_retirada: serverTimestamp(),
      data_hora_devolucao: null, ocorrencia: '', nome_equipamento: input.equipment.nome ?? `Notebook ${input.equipment.numero_patrimonio}`,
      nome_sala: input.roomName ?? '', numero_patrimonio: input.equipment.numero_patrimonio,
    } satisfies Omit<RegistroHistorico, 'data_hora_retirada'> & { data_hora_retirada: unknown });
  });
}

export async function returnEquipmentBatch(items: EquipamentoComId[], input: { occurrenceById: Record<string, string>; email: string }) {
  const active = items.filter(equipment => equipment.status === 'em_uso');
  for (let offset = 0; offset < active.length; offset += 200) {
    const batch = writeBatch(db);
    for (const equipment of active.slice(offset, offset + 200)) {
      const equipmentDocument = doc(equipmentRef, equipment.documentId);
      const currentHistoryId = equipment.id_historico_atual;
      if (currentHistoryId) {
        batch.update(doc(historyRef, currentHistoryId), {
          data_hora_devolucao: serverTimestamp(), ocorrencia: input.occurrenceById[equipment.documentId]?.trim() ?? '',
        });
      }
      batch.update(equipmentDocument, {
        status: 'disponível', aluno_atual: '', hora_retirada: null, id_historico_atual: null,
        email_professor_atual: null, nome_professor_atual: null, atualizado_em: serverTimestamp(),
        ultima_ocorrencia: input.occurrenceById[equipment.documentId]?.trim() ?? '',
        ultima_ocorrencia_em: serverTimestamp(), ultima_ocorrencia_email: input.email,
      });
    }
    await batch.commit();
  }
}

export async function saveCart(input: { documentId?: string; name: string; capacity: number }) {
  const target = input.documentId ? doc(cartsRef, input.documentId) : doc(cartsRef);
  const data: Partial<Carrinho> = { id_carrinho: target.id, nome_sala: input.name.trim(), capacidade_total: input.capacity, ativo: true };
  if (input.documentId) await updateDoc(target, data);
  else await setDoc(target, { ...data, criado_em: serverTimestamp() });
}

export async function deleteCart(cartId: string) {
  const target = doc(cartsRef, cartId);
  const { getDocs } = await import('firebase/firestore');
  const related = await getDocs(query(equipmentRef, where('id_carrinho', '==', target)));
  if (!related.empty) throw new Error('Remova ou transfira os equipamentos desta sala antes de excluí-la.');
  await deleteDoc(target);
}

export async function saveEquipment(input: { documentId?: string; cartId: string; patrimony: string; serial: string; name: string }) {
  const target = input.documentId ? doc(equipmentRef, input.documentId) : doc(equipmentRef);
  const payload: Partial<Equipamento> = {
    id_equipamento: target.id, id_carrinho: doc(db, 'carrinhos', input.cartId), numero_patrimonio: input.patrimony.trim(),
    numero_serie: input.serial.trim(), nome: input.name.trim() || `Notebook ${input.patrimony.trim()}`,
  };
  if (input.documentId) await updateDoc(target, payload);
  else await setDoc(target, {
    ...payload, status: 'disponível' as StatusEquipamento, aluno_atual: '', hora_retirada: null,
    id_historico_atual: null, email_professor_atual: null, nome_professor_atual: null, criado_em: serverTimestamp(),
  });
}

export async function deleteEquipment(equipment: EquipamentoComId) {
  if (equipment.status === 'em_uso') throw new Error('Devolva o equipamento antes de removê-lo do inventário.');
  await deleteDoc(doc(equipmentRef, equipment.documentId));
}

export async function changeEquipmentStatus(equipment: EquipamentoComId, status: StatusEquipamento) {
  const target = doc(equipmentRef, equipment.documentId);
  await runTransaction(db, async transaction => {
    const current = await transaction.get(target);
    if (!current.exists()) throw new Error('Equipamento não encontrado.');
    if (current.data().status === 'em_uso' && status === 'em_manutencao') throw new Error('Finalize o uso com a devolução forçada antes de enviar para manutenção.');
    transaction.update(target, { status, atualizado_em: serverTimestamp() });
  });
}

export async function forceReturn(equipment: EquipamentoComId, adminEmail: string, adminName: string, occurrence = '') {
  const currentHistoryId = equipment.id_historico_atual;
  if (!currentHistoryId) throw new Error('Não foi encontrado o registro de empréstimo aberto deste equipamento.');
  const finalOccurrence = `Devolução forçada pela T.I. (${adminName}, ${adminEmail})${occurrence ? `: ${occurrence}` : ''}`;
  const batch = writeBatch(db);
  batch.update(doc(historyRef, currentHistoryId), {
    data_hora_devolucao: serverTimestamp(),
    ocorrencia: finalOccurrence,
  });
  batch.update(doc(equipmentRef, equipment.documentId), {
    status: 'disponível', aluno_atual: '', hora_retirada: null, id_historico_atual: null,
    email_professor_atual: null, nome_professor_atual: null, atualizado_em: serverTimestamp(),
    ultima_ocorrencia: finalOccurrence, ultima_ocorrencia_em: serverTimestamp(), ultima_ocorrencia_email: adminEmail,
  });
  await batch.commit();
}

export function statusTone(status: StatusEquipamento): 'green' | 'orange' | 'red' {
  return status === 'disponível' ? 'green' : status === 'em_uso' ? 'orange' : 'red';
}
