import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Screen, Header, Card, Button, Field, SheetModal, StatusPill } from '../../components/UI';
import { db } from '../../services/firebase';
import { changeEquipmentStatus, checkoutEquipment, correctActiveLoanStudent, deleteEquipment, forceReturn, returnEquipmentBatch, returnSingleEquipment, saveEquipment, statusTone, subscribeToCartEquipment } from '../../services/inventory';
import type { Carrinho, EquipamentoComId, StatusEquipamento } from '../../types/domain';
import { STATUS_LABEL } from '../../types/domain';
import { colors } from '../../theme';

type Filter = 'todos' | 'disponível' | 'em_uso' | 'em_manutencao';

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export default function CartRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading } = useAuth();
  const [cart, setCart] = useState<Carrinho | null>(null);
  const [equipment, setEquipment] = useState<EquipamentoComId[]>([]);
  const [busy, setBusy] = useState(true);
  const [equipmentError, setEquipmentError] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState('');
  const [correctTarget, setCorrectTarget] = useState<EquipamentoComId | null>(null);
  const [correctedStudent, setCorrectedStudent] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [singleReturnTarget, setSingleReturnTarget] = useState<EquipamentoComId | null>(null);
  const [singleReturnOccurrence, setSingleReturnOccurrence] = useState('');
  const [singleReturnDamaged, setSingleReturnDamaged] = useState(false);
  const [savingSingleReturn, setSavingSingleReturn] = useState(false);
  const [returnVisible, setReturnVisible] = useState(false);
  const [occurrences, setOccurrences] = useState<Record<string, string>>({});
  const [savingReturn, setSavingReturn] = useState(false);
  const [editTarget, setEditTarget] = useState<EquipamentoComId | null | undefined>(undefined);
  const [manageTarget, setManageTarget] = useState<EquipamentoComId | null>(null);
  const [managerNote, setManagerNote] = useState('');
  const [managerError, setManagerError] = useState('');
  const [managerBusy, setManagerBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EquipamentoComId | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!id || !session) return;
    let stop: (() => void) | undefined;
    void getDoc(doc(db, 'carrinhos', id)).then(snapshot => setCart(snapshot.exists() ? snapshot.data() as Carrinho : null));
    stop = subscribeToCartEquipment(id, items => { setEquipment(items); setBusy(false); setEquipmentError(''); }, err => { setBusy(false); setEquipmentError(err.message); });
    return () => stop?.();
  }, [id, session]);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const first = setTimeout(refresh, 0);
    const interval = setInterval(refresh, 60_000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  const isAdmin = session?.profile.perfil === 'admin';
  const inUse = equipment.filter(item => item.status === 'em_uso');
  const returnable = isAdmin ? inUse : inUse.filter(item => item.email_professor_atual === session?.profile.email);
  const counts = useMemo(() => ({ total: equipment.length, available: equipment.filter(item => item.status === 'disponível').length, use: inUse.length, maintenance: equipment.filter(item => item.status === 'em_manutencao').length }), [equipment, inUse.length]);
  const normalizedSearch = normalizeSearchText(search);
  const visible = useMemo(() => equipment.filter(item => (filter === 'todos' || item.status === filter) && (!normalizedSearch || normalizeSearchText(`${item.nome ?? ''} ${item.aluno_atual ?? ''}`).includes(normalizedSearch))), [equipment, filter, normalizedSearch]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  if (!session) return <Redirect href="/" />;
  if (!cart && !busy) return <Screen><Header title="Sala não encontrada" onBack={() => router.back()} /><Card><Text>Este carrinho foi removido ou não está disponível.</Text></Card></Screen>;

  async function borrow(item: EquipamentoComId) {
    const student = (students[item.documentId] ?? '').trim();
    if (!student) { Alert.alert('Informe o aluno', 'Digite o nome do aluno antes de salvar o empréstimo.'); return; }
    setSavingId(item.documentId);
    try {
      await checkoutEquipment({ equipment: item, student, email: session!.profile.email, teacherName: session!.profile.nome, roomName: cart?.nome_sala });
      setStudents(current => ({ ...current, [item.documentId]: '' }));
    } catch (error) { Alert.alert('Empréstimo não realizado', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setSavingId(''); }
  }

  async function saveStudentCorrection() {
    if (!correctTarget) return;
    setSavingCorrection(true);
    try {
      await correctActiveLoanStudent({
        equipment: correctTarget,
        student: correctedStudent,
        actorEmail: session!.profile.email,
        actorName: session!.profile.nome,
        isAdmin,
      });
      setCorrectTarget(null);
      setCorrectedStudent('');
    } catch (error) {
      Alert.alert('Não foi possível corrigir', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSavingCorrection(false);
    }
  }

  async function confirmSingleReturn() {
    if (!singleReturnTarget) return;
    setSavingSingleReturn(true);
    try {
      await returnSingleEquipment({
        equipment: singleReturnTarget,
        actorEmail: session!.profile.email,
        actorName: session!.profile.nome,
        isAdmin,
        occurrence: singleReturnOccurrence,
        sendToMaintenance: singleReturnDamaged,
      });
      setSingleReturnTarget(null);
      setSingleReturnOccurrence('');
      setSingleReturnDamaged(false);
    } catch (error) {
      Alert.alert('Devolução não concluída', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSavingSingleReturn(false);
    }
  }

  function closeSingleReturn() {
    if (savingSingleReturn) return;
    setSingleReturnTarget(null);
    setSingleReturnOccurrence('');
    setSingleReturnDamaged(false);
  }

  async function returnAll() {
    setSavingReturn(true);
    try {
      await returnEquipmentBatch(returnable, { occurrenceById: occurrences, email: session!.profile.email });
      setReturnVisible(false); setOccurrences({});
    } catch (error) { Alert.alert('Devolução não concluída', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setSavingReturn(false); }
  }

  async function adminStatus(item: EquipamentoComId, status: StatusEquipamento) {
    setManagerBusy(true); setManagerError('');
    try { await changeEquipmentStatus(item, status); setManageTarget(null); }
    catch (error) { setManagerError(error instanceof Error ? error.message : 'Não foi possível atualizar o equipamento.'); }
    finally { setManagerBusy(false); }
  }

  async function confirmRemove() {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError('');
    try { await deleteEquipment(deleteTarget); setDeleteTarget(null); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : 'Não foi possível remover o equipamento.'); }
    finally { setDeleting(false); }
  }

  async function forceManagedEquipment() {
    if (!manageTarget) return;
    setManagerBusy(true); setManagerError('');
    try {
      await forceReturn(manageTarget, session!.profile.email, session!.profile.nome, managerNote.trim());
      setManagerNote(''); setManageTarget(null);
    } catch (error) { setManagerError(error instanceof Error ? error.message : 'Não foi possível concluir a devolução.'); }
    finally { setManagerBusy(false); }
  }

  return <Screen>
    <Header title={cart?.nome_sala ?? 'Carregando sala…'} subtitle={`${counts.total} notebooks · ${counts.available} disponíveis`} onBack={() => router.back()} right={isAdmin ? <Pressable onPress={() => setEditTarget(null)} style={styles.addButton} accessibilityLabel="Adicionar notebook"><Ionicons name="add" size={25} color={colors.white} /></Pressable> : null} />
    {returnable.length > 0 ? <Button title={`${isAdmin ? 'Devolver todos' : 'Devolver meus'} · ${returnable.length}`} icon="return-down-back-outline" onPress={() => setReturnVisible(true)} /> : null}
    <View style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar notebook ou aluno…" placeholderTextColor="#98A2B3" style={styles.searchInput} /></View>
    <View style={styles.filters}>{(['todos', 'disponível', 'em_uso', 'em_manutencao'] as Filter[]).map(value => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterSelected]}><Text style={[styles.filterText, filter === value && styles.filterTextSelected]}>{value === 'todos' ? `Todos ${counts.total}` : value === 'disponível' ? `Disponíveis ${counts.available}` : value === 'em_uso' ? `Em uso ${counts.use}` : `Manutenção ${counts.maintenance}`}</Text></Pressable>)}</View>
    {busy ? <View style={styles.centerInline}><ActivityIndicator color={colors.blue} /></View> : equipmentError ? <Card><Text style={styles.formError}>Não foi possível carregar os equipamentos: {equipmentError}</Text></Card> : visible.length === 0 ? <Card style={styles.empty}><Ionicons name="laptop-outline" size={34} color={colors.muted} /><Text style={styles.emptyText}>{search ? 'Nenhum equipamento encontrado.' : 'Nenhum notebook nesta categoria.'}</Text></Card> : visible.map(item => <EquipmentCard key={item.documentId} item={item} now={now} isAdmin={isAdmin} canCorrectStudent={isAdmin || item.email_professor_atual === session.profile.email} student={students[item.documentId] ?? ''} setStudent={value => setStudents(current => ({ ...current, [item.documentId]: value }))} saving={savingId === item.documentId} onBorrow={() => void borrow(item)} onCorrectStudent={() => { setCorrectedStudent(item.aluno_atual); setCorrectTarget(item); }} onReturnSingle={() => { setSingleReturnTarget(item); setSingleReturnOccurrence(''); setSingleReturnDamaged(false); }} onEdit={() => setEditTarget(item)} onManage={() => { setManagerError(''); setManagerNote(''); setManageTarget(item); }} onDelete={() => { setDeleteError(''); setDeleteTarget(item); }} />)}

    <SheetModal visible={correctTarget !== null} title="Corrigir aluno do empréstimo" onClose={() => { if (!savingCorrection) { setCorrectTarget(null); setCorrectedStudent(''); } }}>
      <Text style={styles.sheetHint}>{correctTarget?.nome ?? `Notebook ${correctTarget?.numero_patrimonio ?? ''}`} continua emprestado; somente o nome vinculado será corrigido.</Text>
      <Field label="Nome correto do aluno" placeholder="Digite o nome do aluno" value={correctedStudent} onChangeText={setCorrectedStudent} autoCapitalize="words" />
      <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" onPress={() => { setCorrectTarget(null); setCorrectedStudent(''); }} /><Button title="Salvar correção" icon="checkmark" loading={savingCorrection} onPress={() => void saveStudentCorrection()} /></View>
    </SheetModal>

    <SheetModal visible={singleReturnTarget !== null} title="Devolver este notebook" onClose={closeSingleReturn}>
      <Text style={styles.sheetHint}>{singleReturnTarget?.nome ?? `Notebook ${singleReturnTarget?.numero_patrimonio ?? ''}`} · aluno: {singleReturnTarget?.aluno_atual}. Esta ação encerra somente este empréstimo.</Text>
      <Field label="Ocorrência (opcional)" placeholder="Ex.: aluno preferiu outro notebook" value={singleReturnOccurrence} onChangeText={setSingleReturnOccurrence} multiline />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: singleReturnDamaged }} onPress={() => setSingleReturnDamaged(value => !value)} style={styles.damageToggle}>
        <Ionicons name={singleReturnDamaged ? 'checkbox' : 'square-outline'} size={20} color={singleReturnDamaged ? colors.orange : colors.muted} />
        <View style={{ flex: 1 }}><Text style={styles.damageTitle}>Notebook com problema</Text><Text style={styles.damageHint}>Devolver e deixar indisponível para manutenção.</Text></View>
      </Pressable>
      <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" disabled={savingSingleReturn} onPress={closeSingleReturn} /><Button title={singleReturnDamaged ? 'Enviar à manutenção' : 'Devolver notebook'} icon={singleReturnDamaged ? 'build-outline' : 'return-down-back-outline'} loading={savingSingleReturn} onPress={() => void confirmSingleReturn()} /></View>
    </SheetModal>

    <SheetModal visible={returnVisible} title="Confirmar devolução" onClose={() => setReturnVisible(false)}>
      <Text style={styles.sheetHint}>{isAdmin ? `Devolver todos os ${returnable.length} notebooks em uso nesta sala.` : `Devolver os ${returnable.length} notebooks emprestados por você.`} Você pode registrar uma ocorrência por equipamento.</Text>
      {returnable.map(item => <View key={item.documentId} style={styles.returnItem}><View style={styles.returnHeader}><Text style={styles.returnName}>{item.nome ?? `Notebook ${item.numero_patrimonio}`}</Text><Text style={styles.returnStudent}>{item.aluno_atual}</Text></View><Field label="Ocorrência (opcional)" placeholder="Ex.: tela piscando" value={occurrences[item.documentId] ?? ''} onChangeText={value => setOccurrences(current => ({ ...current, [item.documentId]: value }))} /></View>)}
      <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" onPress={() => setReturnVisible(false)} /><Button title="Confirmar devolução" icon="checkmark" loading={savingReturn} onPress={() => void returnAll()} /></View>
    </SheetModal>

    <SheetModal visible={manageTarget !== null} title={manageTarget ? `Gerenciar ${manageTarget.nome ?? `Notebook ${manageTarget.numero_patrimonio}`}` : 'Gerenciar notebook'} onClose={() => setManageTarget(null)}>
      {manageTarget ? <>
        <Text style={styles.sheetHint}>Patrimônio {manageTarget.numero_patrimonio} · {STATUS_LABEL[manageTarget.status]}</Text>
        {manageTarget.status === 'em_uso' ? <>
          <Text style={styles.sheetHint}>Este equipamento está com {manageTarget.aluno_atual || 'um aluno'}. A devolução forçada encerra o empréstimo e registra a ação da T.I. no histórico.</Text>
          <Field label="Comentário da devolução (opcional)" placeholder="Ex.: equipamento retornou com avaria" value={managerNote} onChangeText={setManagerNote} multiline />
          <Button title="Forçar devolução (encerrar uso)" icon="return-down-back-outline" variant="danger" loading={managerBusy} onPress={() => void forceManagedEquipment()} />
        </> : manageTarget.status === 'em_manutencao' ? <>
          <Text style={styles.sheetHint}>Enquanto estiver em manutenção, o notebook fica bloqueado para empréstimos. Ao concluir o reparo, libere-o para voltar à lista de disponíveis.</Text>
          <Button title="Concluir manutenção e disponibilizar" icon="checkmark-circle-outline" loading={managerBusy} onPress={() => void adminStatus(manageTarget, 'disponível')} />
        </> : <>
          <Text style={styles.sheetHint}>Ao enviar para manutenção, o notebook continua no inventário, mas deixa de poder ser emprestado.</Text>
          <Button title="Mover para manutenção" icon="build-outline" variant="secondary" loading={managerBusy} onPress={() => void adminStatus(manageTarget, 'em_manutencao')} />
        </>}
        {managerError ? <Text style={styles.formError}>{managerError}</Text> : null}
      </> : null}
    </SheetModal>

    <SheetModal visible={deleteTarget !== null} title="Remover notebook?" onClose={() => setDeleteTarget(null)}>
      <Text style={styles.sheetHint}>O patrimônio {deleteTarget?.numero_patrimonio ?? ''} será removido do inventário. Equipamentos em uso precisam ser devolvidos antes da remoção.</Text>
      {deleteError ? <Text style={styles.formError}>{deleteError}</Text> : null}
      <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" onPress={() => setDeleteTarget(null)} /><Button title="Remover" variant="danger" loading={deleting} disabled={deleteTarget?.status === 'em_uso'} onPress={() => void confirmRemove()} /></View>
    </SheetModal>

    {editTarget !== undefined ? <EquipmentForm key={editTarget?.documentId ?? 'new'} cartId={id} item={editTarget ?? null} onClose={() => setEditTarget(undefined)} /> : null}
  </Screen>;
}

function EquipmentCard({ item, isAdmin, canCorrectStudent, student, setStudent, saving, now, onBorrow, onCorrectStudent, onReturnSingle, onEdit, onManage, onDelete }: {
  item: EquipamentoComId; isAdmin: boolean; canCorrectStudent: boolean; student: string; setStudent: (value: string) => void; saving: boolean; now: number; onBorrow: () => void;
  onCorrectStudent: () => void; onReturnSingle: () => void; onEdit: () => void; onManage: () => void; onDelete: () => void;
}) {
  const borrowedAt = item.hora_retirada?.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const overdue = now > 0 && item.status === 'em_uso' && item.hora_retirada && now - item.hora_retirada.toMillis() >= 90 * 60 * 1000;
  return <Card style={styles.equipmentCard}>
    <View style={styles.equipmentTop}><View style={{ flex: 1 }}><View style={styles.equipmentHeading}><Text style={styles.equipmentName}>{item.nome ?? `Notebook ${item.numero_patrimonio}`}</Text><StatusPill label={STATUS_LABEL[item.status]} tone={statusTone(item.status)} /></View><Text style={styles.patrimony}>Patrimônio: {item.numero_patrimonio}{item.numero_serie ? `  ·  Série: ${item.numero_serie}` : ''}</Text></View>
      {isAdmin ? <View style={styles.iconActions}><Pressable accessibilityLabel="Editar notebook" onPress={onEdit}><Ionicons name="create-outline" size={19} color={colors.blue} /></Pressable><Pressable accessibilityLabel="Gerenciar notebook" onPress={onManage}><Ionicons name="build-outline" size={18} color={colors.orange} /></Pressable><Pressable accessibilityLabel="Remover notebook" onPress={onDelete}><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable></View> : null}
    </View>
    {item.status === 'disponível' ? <View style={styles.borrowRow}><TextInput value={student} onChangeText={setStudent} placeholder="Digite o nome do aluno…" placeholderTextColor="#98A2B3" style={styles.studentInput} returnKeyType="done" onSubmitEditing={onBorrow} /><Pressable onPress={onBorrow} disabled={saving} style={[styles.borrowButton, saving && { opacity: 0.6 }]}><Text style={styles.borrowButtonText}>{saving ? 'Salvando…' : 'Emprestar'}</Text></Pressable></View> : null}
    {item.status === 'em_uso' ? <View style={styles.activeLoan}>
      <View style={styles.activeLoanInfo}><View style={{ flex: 1 }}><Text style={styles.activeName}>{item.aluno_atual || 'Aluno não informado'}</Text><Text style={styles.activeMeta}>Retirado às {borrowedAt ?? '—'}{item.nome_professor_atual ? ` · Prof. ${item.nome_professor_atual}` : ''}</Text></View>{overdue ? <StatusPill label="Mais de 1h30" tone="red" /> : null}{isAdmin ? <Pressable onPress={onManage} accessibilityLabel="Gerenciar empréstimo" style={styles.forceButton}><Ionicons name="return-down-back-outline" size={17} color={colors.blue} /></Pressable> : null}</View>
      {canCorrectStudent ? <View style={styles.loanActions}><Pressable onPress={onCorrectStudent} accessibilityRole="button" accessibilityLabel="Corrigir nome do aluno" style={styles.correctionButton}><Ionicons name="create-outline" size={15} color={colors.blue} /><Text style={styles.correctionButtonText}>Corrigir aluno</Text></Pressable><Pressable onPress={onReturnSingle} accessibilityRole="button" accessibilityLabel="Devolver somente este notebook" style={styles.correctionButton}><Ionicons name="return-down-back-outline" size={15} color={colors.blue} /><Text style={styles.correctionButtonText}>Devolver notebook</Text></Pressable></View> : null}
    </View> : null}
    {item.status === 'em_manutencao' ? <View style={styles.blocked}><Ionicons name="alert-circle-outline" size={16} color={colors.red} /><Text style={styles.blockedText}>Equipamento bloqueado para empréstimo</Text></View> : null}
    {item.ultima_ocorrencia ? <View style={styles.occurrence}><Ionicons name="alert-circle-outline" size={15} color={colors.red} /><Text style={styles.occurrenceText}>Ocorrência: {item.ultima_ocorrencia}</Text></View> : null}
  </Card>;
}

function EquipmentForm({ cartId, item, onClose }: { cartId: string; item: EquipamentoComId | null; onClose: () => void }) {
  const [name, setName] = useState(item?.nome ?? ''); const [patrimony, setPatrimony] = useState(item?.numero_patrimonio ?? ''); const [serial, setSerial] = useState(item?.numero_serie ?? ''); const [saving, setSaving] = useState(false);
  async function save() {
    if (!patrimony.trim()) { Alert.alert('Patrimônio obrigatório', 'Informe o número de patrimônio do notebook.'); return; }
    setSaving(true);
    try { await saveEquipment({ documentId: item?.documentId, cartId, name, patrimony, serial }); onClose(); }
    catch (error) { Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setSaving(false); }
  }
  return <SheetModal visible title={item ? 'Editar notebook' : 'Cadastrar notebook'} onClose={onClose}>
    <Field label="Nome (opcional)" placeholder="Ex.: Notebook 05" value={name} onChangeText={setName} />
    <Field label="Patrimônio" placeholder="Ex.: 123456" value={patrimony} onChangeText={setPatrimony} />
    <Field label="Número de série" placeholder="Ex.: 4PX23123" value={serial} onChangeText={setSerial} />
    <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" onPress={onClose} /><Button title="Salvar notebook" loading={saving} onPress={() => void save()} /></View>
  </SheetModal>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas }, centerInline: { padding: 36, alignItems: 'center' }, addButton: { height: 38, width: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderRadius: 19 },
  search: { minHeight: 47, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#E9EDF2' }, searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, filter: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8 }, filterSelected: { backgroundColor: colors.blue, borderColor: colors.blue }, filterText: { color: colors.muted, fontWeight: '700', fontSize: 10 }, filterTextSelected: { color: colors.white },
  equipmentCard: { padding: 13, gap: 12 }, equipmentTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, equipmentHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, equipmentName: { fontSize: 14, fontWeight: '800', color: colors.ink }, patrimony: { marginTop: 6, color: colors.muted, fontSize: 11 }, iconActions: { flexDirection: 'row', gap: 13, paddingTop: 2 },
  borrowRow: { flexDirection: 'row', gap: 8, alignItems: 'center' }, studentInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 11, minHeight: 42, fontSize: 12, color: colors.ink }, borrowButton: { backgroundColor: colors.blue, paddingHorizontal: 13, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, borrowButtonText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  activeLoan: { gap: 8, borderRadius: 10, backgroundColor: '#F5F6F8', padding: 10 }, activeLoanInfo: { flexDirection: 'row', alignItems: 'center', gap: 7 }, activeName: { fontSize: 13, color: colors.ink, fontWeight: '800' }, activeMeta: { marginTop: 3, color: colors.muted, fontSize: 10 }, forceButton: { padding: 5 }, loanActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, correctionButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }, correctionButtonText: { color: colors.blue, fontWeight: '700', fontSize: 11 }, damageToggle: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 10, backgroundColor: '#FFF7ED' }, damageTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, damageHint: { color: colors.muted, fontSize: 11, marginTop: 3 }, blocked: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 9, borderRadius: 9, backgroundColor: colors.redSoft }, blockedText: { fontSize: 11, color: colors.red, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 28 }, emptyText: { color: colors.muted, fontSize: 13 }, formError: { color: colors.red, fontSize: 12, lineHeight: 18 }, occurrence: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: colors.redSoft, padding: 8, borderRadius: 8 }, occurrenceText: { flex: 1, color: colors.red, fontSize: 11 }, sheetHint: { color: colors.muted, fontSize: 13, lineHeight: 19 }, returnItem: { backgroundColor: colors.white, borderRadius: 13, padding: 12, gap: 12 }, returnHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, returnName: { color: colors.ink, fontWeight: '800', fontSize: 13, flex: 1 }, returnStudent: { color: colors.orange, fontWeight: '700', fontSize: 12 }, modalActions: { flexDirection: 'row', gap: 9 },
});
