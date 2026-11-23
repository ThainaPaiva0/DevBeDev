import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api, { setToken } from '../services/api';

export default function LoginScreen({ onLoginSuccess, onNavigateRegister }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert('Erro', 'Preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/usuarios/login', {
        Email: email.trim(),
        Senha: senha,
      });
      const { token } = response.data;

      if (token) {
        await setToken(token);
        onLoginSuccess();
      }
    } catch (error) {
      const mensagem =
        error.response?.data?.mensagem || error.message || 'Falha ao efetuar login.';
      Alert.alert('Erro no Login', mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DevBeDev</Text>
      <Text style={styles.subtitle}>Acesso Mobile</Text>

      <TextInput
        style={styles.input}
        placeholder="Seu e-mail"
        placeholderTextColor="#a8a8b3"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Sua senha"
          placeholderTextColor="#a8a8b3"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setMostrarSenha((prev) => !prev)}
          accessibilityLabel="Mostrar ou ocultar senha"
        >
          <Text style={styles.eyeIcon}>{mostrarSenha ? '🙈' : '👁'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.registerLink} onPress={onNavigateRegister}>
        <Text style={styles.registerLinkText}>Não tem uma conta? Crie uma agora</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#614de6', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#a8a8b3', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#202024',
    color: '#e1e1e6',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#323238',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202024',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#323238',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    color: '#e1e1e6',
    padding: 14,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  eyeIcon: {
    fontSize: 18,
  },
  button: { backgroundColor: '#614de6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerLinkText: { color: '#614de6', fontSize: 14, fontWeight: '600' },
});