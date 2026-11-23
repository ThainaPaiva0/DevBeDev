import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api, { setToken } from '../services/api';

export default function RegisterScreen({ onRegisterSuccess, onNavigateLogin }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [tipoSolicitado, setTipoSolicitado] = useState('Espectador');
  const [bio, setBio] = useState('');
  const [linkGitHub, setLinkGitHub] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [linkLinkedIn, setLinkLinkedIn] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || !senha) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios (Nome, E-mail e Senha).');
      return;
    }

    setLoading(true);
    try {
      await api.post('/usuarios/registrar', {
        Nome: nome.trim(),
        Email: email.trim(),
        Senha: senha,
        TipoPerfil: 'Espectador',
      });

      const loginResponse = await api.post('/usuarios/login', {
        Email: email.trim(),
        Senha: senha,
      });
      const { token } = loginResponse.data;

      if (token) {
        await setToken(token);
      }

      if (tipoSolicitado !== 'Espectador') {
        await api.post('/usuarios/solicitar-upgrade', {
          TipoDesejado: tipoSolicitado,
          Bio: tipoSolicitado === 'Dev' ? bio.trim() : null,
          LinkGitHub: tipoSolicitado === 'Dev' ? linkGitHub.trim() : null,
          CnpjEmpresa: tipoSolicitado === 'Recrutador' ? cnpjEmpresa.trim() : null,
          LinkLinkedIn: tipoSolicitado === 'Recrutador' ? linkLinkedIn.trim() : null,
        });
      }

      Alert.alert(
        'Conta Criada',
        tipoSolicitado !== 'Espectador'
          ? 'Cadastro realizado e solicitação de upgrade enviada para análise!'
          : 'Cadastro realizado com sucesso!'
      );

      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
    } catch (error) {
      const mensagem =
        error.response?.data?.mensagem || error.message || 'Falha ao criar conta.';
      Alert.alert('Erro no Cadastro', mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>
      <Text style={styles.subtitle}>Entre na comunidade DevBeDev</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome Completo *"
        placeholderTextColor="#a8a8b3"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail *"
        placeholderTextColor="#a8a8b3"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Senha (mínimo 6 caracteres) *"
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

      <Text style={styles.sectionLabel}>Perfil inicial / Solicitação de Upgrade:</Text>
      <View style={styles.roleRow}>
        {['Espectador', 'Dev', 'Recrutador'].map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.roleChip, tipoSolicitado === role && styles.roleChipActive]}
            onPress={() => setTipoSolicitado(role)}
          >
            <Text
              style={[
                styles.roleChipText,
                tipoSolicitado === role && styles.roleChipTextActive,
              ]}
            >
              {role}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tipoSolicitado === 'Dev' && (
        <>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Sua Bio de Desenvolvedor"
            placeholderTextColor="#a8a8b3"
            multiline
            value={bio}
            onChangeText={setBio}
          />
          <TextInput
            style={styles.input}
            placeholder="Link do GitHub (https://github.com/...)"
            placeholderTextColor="#a8a8b3"
            autoCapitalize="none"
            value={linkGitHub}
            onChangeText={setLinkGitHub}
          />
        </>
      )}

      {tipoSolicitado === 'Recrutador' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="CNPJ da Empresa"
            placeholderTextColor="#a8a8b3"
            value={cnpjEmpresa}
            onChangeText={setCnpjEmpresa}
          />
          <TextInput
            style={styles.input}
            placeholder="Link do LinkedIn (https://linkedin.com/in/...)"
            placeholderTextColor="#a8a8b3"
            autoCapitalize="none"
            value={linkLinkedIn}
            onChangeText={setLinkLinkedIn}
          />
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Cadastrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginLink} onPress={onNavigateLogin}>
        <Text style={styles.loginLinkText}>Já possui conta? Faça login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#121214', justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#614de6', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#a8a8b3', textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#202024',
    color: '#e1e1e6',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
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
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    color: '#e1e1e6',
    padding: 14,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  eyeIcon: {
    fontSize: 18,
  },
  sectionLabel: { color: '#a8a8b3', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleChip: {
    flex: 1,
    backgroundColor: '#202024',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#323238',
    alignItems: 'center',
  },
  roleChipActive: { backgroundColor: '#614de6', borderColor: '#614de6' },
  roleChipText: { color: '#a8a8b3', fontWeight: 'bold', fontSize: 12 },
  roleChipTextActive: { color: '#FFF' },
  textArea: { height: 75, textAlignVertical: 'top' },
  button: { backgroundColor: '#614de6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginLinkText: { color: '#614de6', fontSize: 14, fontWeight: '600' },
});