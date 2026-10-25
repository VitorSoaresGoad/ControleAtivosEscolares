import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, microsoftProvider, db } from '../services/firebase';

export function Login() {
  const handleMicrosoftLogin = () => {
    signInWithPopup(auth, microsoftProvider)
      .then(async (result) => { 
        const user = result.user;
        console.log("Login na Microsoft aprovado. Verificando permissões para UID:", user.uid);
        
        const docRef = doc(db, "usuarios_autorizados", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dadosUsuario = docSnap.data();
          console.log("Bem-vindo!", dadosUsuario.nome);
          console.log("Perfil identificado:", dadosUsuario.perfil);
          
          Alert.alert("Sucesso", `Bem-vindo(a), ${dadosUsuario.nome}!\nPerfil: ${dadosUsuario.perfil}`);
          
          // O próximo passo do projeto será trocar este Alert pela navegação para o Dashboard
        } else {
          console.log("Acesso negado. Utilizador não cadastrado.");
          Alert.alert("Acesso Negado", "O seu e-mail não tem permissão para aceder a este sistema.");
          auth.signOut(); 
        }
      })
      .catch((error) => {
        console.error("Erro na autenticação:", error.message);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/SGEE-removebg-preview.webp')} 
            style={styles.mainLogo} 
            contentFit="contain" 
          />
        </View>
        <Text style={styles.appName}>SGEE Mobile</Text>
        
        <Text style={styles.title}>Olá, novamente!</Text>
        <Text style={styles.subtitle}>Já estávamos sentindo sua falta</Text>
      </View>

      <View style={styles.middle}>
        <TouchableOpacity style={styles.loginCard} onPress={handleMicrosoftLogin}>
          <View style={styles.loginCardTextContainer}>
            <Text style={styles.loginCardTitle}>Acesso Microsoft</Text>
            <Text style={styles.loginCardSubtitle}>Conta @professor.educacao.sp.gov.br</Text>
          </View>
          <Ionicons name="arrow-forward-circle-outline" size={36} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.infoButton}>
          <Text style={styles.infoButtonText}>Como funciona o empréstimo?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpButton}>
          <Text style={styles.helpButtonText}>Preciso de ajuda</Text>
        </TouchableOpacity>

        <Image 
          source={require('../../assets/brasao-sp.svg')} 
          style={styles.spLogo} 
          contentFit="contain" 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 60 },
  logoContainer: { marginBottom: 4 },
  mainLogo: { width: 70, height: 70 },
  appName: { fontSize: 14, fontWeight: 'bold', color: '#1A56C8', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666666' },
  middle: { flex: 1, justifyContent: 'center' },
  loginCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20 },
  loginCardTextContainer: { flex: 1 },
  loginCardTitle: { fontSize: 16, color: '#495057', marginBottom: 4 },
  loginCardSubtitle: { fontSize: 12, color: '#1A56C8' },
  footer: { alignItems: 'center', marginBottom: 40 },
  infoButton: { backgroundColor: '#275EBE', width: '100%', height: 52, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  infoButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  helpButton: { marginBottom: 24 },
  helpButtonText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  spLogo: { width: 120, height: 60 }
});