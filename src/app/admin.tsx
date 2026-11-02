import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Field, Header, Screen, SheetModal } from '../components/UI';
import { addAuthorizedUser, subscribeToAuthorizedUsers } from '../services/authorizedUsers';
import { deleteCart, saveCart, subscribeToCarts } from '../services/inventory';
import type { CarrinhoResumo, Perfil, UsuarioAutorizadoComId } from '../types/domain';
import { colors } from '../theme';

export default function AdminRoute() {
  const { session, loading } = useAuth();
  const [carts, setCarts] = useState<CarrinhoResumo[]>([]);
  const [users, setUsers] = useState<UsuarioAutorizadoComId[]>([]);
  const [cartModal, setCartModal] = useState(false);
  const [userModal, setUserModal] = useState(false);
  const [deleteCartTarget, setDeleteCartTarget] = useState<CarrinhoResumo | null>(null);
  const [deleteCartError, setDeleteCartError] = useState('');
  const [deleteCartBusy, setDeleteCartBusy] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [cartName, setCartName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const [userUid, setUserUid] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userProfile, setUserProfile] = useState<Perfil>('professor');
  const [userError, setUserError] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    if (!session || session.profile.perfil !== 'admin') return;
    const stopCarts = subscribeToCarts(setCarts, error => Alert.alert('Erro ao carregar inventário', error.message));
    const stopUsers = subscribeToAuthorizedUsers(setUsers, error => console.error('Falha ao carregar whitelist:', error));
    return () => { stopCarts(); stopUsers(); };
  }, [session]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  if (!session) return <Redirect href="/" />;
  if (session.profile.perfil !== 'admin') return <Redirect href="/dashboard" />;
  const totals = carts.reduce((acc, item) => ({ all: acc.all + item.total, available: acc.available + item.disponiveis, use: acc.use + item.emUso, maintenance: acc.maintenance + item.emManutencao }), { all: 0, available: 0, use: 0, maintenance: 0 });

  function openCreate() { setEditId(undefined); setCartName(''); setCapacity(''); setCartModal(true); }
  function openEdit(cart: CarrinhoResumo) { setEditId(cart.documentId); setCartName(cart.nome_sala); setCapacity(String(cart.capacidade_total)); setCartModal(true); }
  async function save() {
    const number = Number(capacity);
    if (!cartName.trim() || !Number.isFinite(number) || number < 0) { Alert.alert('Confira os dados', 'Informe o nome da sala e uma capacidade válida.'); return; }
    setSaving(true);
    try { await saveCart({ documentId: editId, name: cartName, capacity: number }); setCartModal(false); }
    catch (error) { Alert.alert('Não foi possível salvar a sala', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setSaving(false); }
  }
  function openUserForm() {
    setUserUid(''); setUserEmail(''); setUserName(''); setUserProfile('professor'); setUserError(''); setUserModal(true);
  }
  async function saveUser() {
    setSavingUser(true); setUserError('');
    try {
      await addAuthorizedUser({ uid: userUid, email: userEmail, name: userName, profile: userProfile });
      setUserModal(false);
    } catch (error) { setUserError(error instanceof Error ? error.message : 'Não foi possível cadastrar este usuário.'); }
    finally { setSavingUser(false); }
  }
  async function confirmDeleteCart() {
    if (!deleteCartTarget) return;
    setDeleteCartBusy(true); setDeleteCartError('');
    try { await deleteCart(deleteCartTarget.documentId); setDeleteCartTarget(null); }
    catch (error) { setDeleteCartError(error instanceof Error ? error.message : 'Não foi possível excluir esta sala.'); }
    finally { setDeleteCartBusy(false); }
  }
  return <Screen>
    <Header title="Painel de gestão" subtitle="Inventário e manutenção" onBack={() => router.back()} />
    <View style={styles.stats}>
      <Metric label="Total de máquinas" value={totals.all} tone="blue" /><Metric label="Em uso" value={totals.use} tone="orange" />
      <Metric label="Disponíveis" value={totals.available} tone="green" /><Metric label="Com defeito" value={totals.maintenance} tone="red" />
    </View>
    <View style={styles.actions}><Button title="Exportar relatórios" icon="download-outline" onPress={() => router.push('/reports')} /><Button title="Histórico de uso" icon="time-outline" variant="secondary" onPress={() => router.push('/history')} /></View>
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Carrinhos e salas</Text><Pressable onPress={openCreate} style={styles.addButton} accessibilityLabel="Adicionar carrinho"><Ionicons name="add" size={23} color={colors.white} /></Pressable></View>
    {carts.length === 0 ? <Card><Text style={styles.muted}>Nenhuma sala cadastrada.</Text></Card> : carts.map(cart => <Card key={cart.documentId} style={styles.cartCard}>
      <View style={styles.cartTop}><Pressable onPress={() => router.push({ pathname: '/cart/[id]', params: { id: cart.documentId } })} accessibilityRole="button" accessibilityLabel={`Abrir ${cart.nome_sala}`} style={{ flex: 1 }}><Text style={styles.cartName}>{cart.nome_sala}</Text><Text style={styles.cartMeta}>Total: {cart.total}  ·  Disponíveis: {cart.disponiveis}  ·  Manutenção: {cart.emManutencao}</Text>{cart.emUso ? <Text style={styles.cartMeta}>Em uso: {cart.emUso} equipamento(s)</Text> : null}</Pressable><Pressable onPress={() => router.push({ pathname: '/cart/[id]', params: { id: cart.documentId } })} accessibilityLabel="Ver sala" style={styles.actionIcon}><Ionicons name="eye-outline" size={20} color={colors.blue} /></Pressable><Pressable onPress={() => openEdit(cart)} accessibilityLabel="Editar sala" style={styles.actionIcon}><Ionicons name="create-outline" size={19} color={colors.muted} /></Pressable><Pressable onPress={() => { setDeleteCartError(''); setDeleteCartTarget(cart); }} accessibilityLabel="Excluir sala" style={styles.actionIcon}><Ionicons name="trash-outline" size={19} color={colors.red} /></Pressable></View>
    </Card>)}
    <Button title="Adicionar sala ou carrinho" icon="add" variant="secondary" onPress={openCreate} />
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Usuários autorizados</Text><Pressable onPress={openUserForm} style={styles.addButton} accessibilityLabel="Adicionar usuário"><Ionicons name="person-add-outline" size={20} color={colors.white} /></Pressable></View>
    {users.map(user => <Card key={user.documentId} style={styles.userCard}><View style={styles.userCopy}><Text style={styles.cartName}>{user.nome}</Text><Text style={styles.cartMeta}>{user.email}</Text><Text style={styles.cartMeta}>Perfil: {user.perfil}</Text></View></Card>)}
    <Button title="Cadastrar usuário autorizado" icon="person-add-outline" variant="secondary" onPress={openUserForm} />
    <SheetModal visible={cartModal} title={editId ? 'Editar sala' : 'Novo carrinho / sala'} onClose={() => setCartModal(false)}>
      <Text style={styles.modalHint}>Cadastre o nome do espaço e a capacidade cadastrada de notebooks.</Text>
      <Field label="Nome do local" placeholder="Ex.: Sala de Informática 01" value={cartName} onChangeText={setCartName} />
      <Field label="Capacidade total" placeholder="Ex.: 30" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} />
      <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" onPress={() => setCartModal(false)} /><Button title="Confirmar" loading={saving} onPress={() => void save()} /></View>
    </SheetModal>
    <SheetModal visible={userModal} title="Novo usuário autorizado" onClose={() => setUserModal(false)}>
      <Text style={styles.modalHint}>A pessoa precisa entrar uma vez com Microsoft. Copie o UID dela em Firebase Authentication → Usuários e informe abaixo.</Text>
      <Field label="UID do Firebase Authentication" placeholder="Cole o UID da conta Microsoft" autoCapitalize="none" value={userUid} onChangeText={setUserUid} />
      <Field label="E-mail da conta Microsoft" placeholder="nome@dominio.com" autoCapitalize="none" keyboardType="email-address" value={userEmail} onChangeText={setUserEmail} />
      <Field label="Nome" placeholder="Nome do professor ou administrador" value={userName} onChangeText={setUserName} />
      <Text style={styles.roleLabel}>Perfil</Text>
      <View style={styles.roleOptions}>{(['professor', 'admin'] as Perfil[]).map(profile => <Pressable key={profile} onPress={() => setUserProfile(profile)} style={[styles.roleOption, userProfile === profile && styles.roleOptionSelected]}><Text style={[styles.roleOptionText, userProfile === profile && styles.roleOptionTextSelected]}>{profile === 'admin' ? 'Admin (T.I.)' : 'Professor'}</Text></Pressable>)}</View>
      {userError ? <Text style={styles.formError}>{userError}</Text> : null}
      <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" onPress={() => setUserModal(false)} /><Button title="Cadastrar" loading={savingUser} onPress={() => void saveUser()} /></View>
    </SheetModal>
    <SheetModal visible={deleteCartTarget !== null} title="Excluir carrinho?" onClose={() => setDeleteCartTarget(null)}>
      <Text style={styles.modalHint}>Deseja remover {deleteCartTarget?.nome_sala ?? 'esta sala'}? Só é possível excluir salas sem equipamentos vinculados.</Text>
      {deleteCartError ? <Text style={styles.formError}>{deleteCartError}</Text> : null}
      <View style={styles.modalActions}><Button title="Cancelar" variant="secondary" onPress={() => setDeleteCartTarget(null)} /><Button title="Excluir" variant="danger" loading={deleteCartBusy} onPress={() => void confirmDeleteCart()} /></View>
    </SheetModal>
  </Screen>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'orange' | 'red' }) {
  const tint = tone === 'blue' ? colors.blue : tone === 'green' ? colors.green : tone === 'orange' ? colors.orange : colors.red;
  const bg = tone === 'blue' ? colors.blueSoft : tone === 'green' ? colors.greenSoft : tone === 'orange' ? colors.orangeSoft : colors.redSoft;
  return <Card style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color: tint }]}>{value}</Text><View style={[styles.metricBar, { backgroundColor: bg }]} /></Card>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, metric: { width: '47%', flexGrow: 1, minHeight: 90, padding: 12, justifyContent: 'space-between', gap: 6 }, metricLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' }, metricValue: { fontSize: 25, fontWeight: '900' }, metricBar: { height: 4, width: '100%', borderRadius: 9 },
  actions: { gap: 9 }, sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }, sectionTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 }, addButton: { height: 40, width: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  cartCard: { padding: 13 }, cartTop: { flexDirection: 'row', alignItems: 'center', gap: 6 }, cartName: { color: colors.ink, fontWeight: '800', fontSize: 14 }, cartMeta: { color: colors.muted, fontSize: 10, marginTop: 4 }, actionIcon: { padding: 5 }, userCard: { padding: 13 }, userCopy: { flex: 1 }, muted: { color: colors.muted }, modalHint: { color: colors.muted, fontSize: 13, lineHeight: 19 }, modalActions: { flexDirection: 'row', gap: 9 }, roleLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' }, roleOptions: { flexDirection: 'row', gap: 8 }, roleOption: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 }, roleOptionSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft }, roleOptionText: { color: colors.muted, fontWeight: '700' }, roleOptionTextSelected: { color: colors.blue }, formError: { color: colors.red, fontSize: 12 },
});
