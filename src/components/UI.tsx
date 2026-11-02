import React, { type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function Screen({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView></SafeAreaView>;
}

export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  return <View style={styles.header}>
    {onBack ? <Pressable onPress={onBack} style={styles.iconButton} accessibilityLabel="Voltar"><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable> : null}
    <View style={styles.headerCopy}><Text style={styles.headerTitle}>{title}</Text>{subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}</View>
    {right}
  </View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, icon }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.button, styles[`button_${variant}`], (disabled || loading) && styles.buttonDisabled, pressed && styles.buttonPressed]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.blue} /> : <>{icon ? <Ionicons name={icon} size={18} color={variant === 'primary' || variant === 'danger' ? colors.white : colors.blue} /> : null}<Text style={[styles.buttonText, (variant === 'secondary' || variant === 'ghost') && styles.buttonTextSecondary]}>{title}</Text></>}
  </Pressable>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.fieldWrap}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor="#9AA4B2" {...props} style={[styles.field, props.multiline && styles.fieldMultiline, props.style]} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function StatusPill({ label, tone }: { label: string; tone: 'green' | 'orange' | 'red' | 'blue' | 'gray' }) {
  const palette = tone === 'green' ? [colors.greenSoft, colors.green] : tone === 'orange' ? [colors.orangeSoft, colors.orange] : tone === 'red' ? [colors.redSoft, colors.red] : tone === 'blue' ? [colors.blueSoft, colors.blue] : ['#EDF0F4', colors.muted];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><View style={[styles.dot, { backgroundColor: palette[1] }]} /><Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text></View>;
}

export function SheetModal({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><Pressable onPress={onClose} accessibilityLabel="Fechar"><Ionicons name="close" size={24} color={colors.muted} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView></View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 50, gap: 10 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', color: colors.ink },
  headerSubtitle: { marginTop: 3, color: colors.muted, fontSize: 13 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  card: { borderRadius: radius.card, backgroundColor: colors.white, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 12 },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  button_primary: { backgroundColor: colors.blue }, button_secondary: { backgroundColor: colors.blueSoft }, button_danger: { backgroundColor: colors.red }, button_ghost: { backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.5 }, buttonPressed: { opacity: 0.82 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 }, buttonTextSecondary: { color: colors.blue },
  fieldWrap: { gap: 7 }, fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  field: { minHeight: 48, borderRadius: radius.input, paddingHorizontal: 14, color: colors.ink, backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, fontSize: 15 },
  fieldMultiline: { minHeight: 94, paddingTop: 12, textAlignVertical: 'top' }, error: { color: colors.red, fontSize: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { height: 7, width: 7, borderRadius: 4 }, pillText: { fontSize: 11, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,24,40,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, gap: 16 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 9, backgroundColor: '#CBD2DB' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sheetTitle: { fontWeight: '800', color: colors.ink, fontSize: 19 },
  sheetContent: { gap: 16, paddingBottom: 6, flexShrink: 1 },
});
