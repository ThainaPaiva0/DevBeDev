import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import api from '../services/api';

export default function UpgradeScreen({ onUpgradeRequested }) {
  const [tipoDesejado, setTipoDesejado] = useState('Dev');
  const [bio, setBio] = useState('');
  const [linkGitHub, setLinkGitHub] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [linkLinkedIn, setLinkLinkedIn] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSolicitar = async () => {
    setLoading(true);
    try {
      await api.post('/usuarios/solicitar-upgrade', {
        TipoDesejado: tipoDesejado,
        Bio: tipoDesejado === 'Dev' ? bio : null,
        LinkGitHub: tipoDesejado === 'Dev' ? linkGitHub.trim() : null,
        CnpjEmpresa: tipoDesejado === 'Recrutador' ? cnpjEmpresa.trim() : null,
        LinkLinkedIn: tipoDesejado === 'Recrutador' ? linkLinkedIn.trim() : null
      });

      Alert.alert('Solicitação Registrada', `Sua solicitação de upgrade para '${tipoDesejado}' foi enviada com sucesso ao Administrador.`);
      if (onUpgradeRequested) onUpgradeRequested();
    } catch (error) {
      const msg = error.response?.data?.mensagem || 'Erro ao solicitar upgrade.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Solicitar Upgrade de Perfil</Text>
      <Text style={styles.subtitle}>Evolua de Espectador para Desenvolvedor ou Recrutador.</Text>

      <Text style={styles.label}>Escolha o Perfil Desejado</Text>
      <View style={styles.row}>
        {['Dev', 'Recrutador'].map((tipo) => (
          <TouchableOpacity
            key={tipo}
            style={[styles.chip, tipoDesejado === tipo && styles.chipActive]}
            onPress={() => setTipoDesejado(tipo)}
          >
            <Text style={[styles.chipText, tipoDesejado === tipo && styles.chipTextActive]}>{tipo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tipoDesejado === 'Dev' ? (
        <View style={styles.box}>
          <Text style={styles.label}>Biografia / Experiência</Text>
          <TextInput style={styles.input} placeholder="Fale um pouco sobre suas tecnologias..." placeholderTextColor="#a8a8b3" value={bio} onChangeText={setBio} />

          <Text style={styles.label}>Link do GitHub</Text>
          <TextInput style={styles.input} placeholder="https://github.com..." placeholderTextColor="#a8a8b3" autoCapitalize="none" value={linkGitHub} onChangeText={setLinkGitHub} />
        </View>
      ) : (
        <View style={styles.box}>
          <Text style={styles.label}>CNPJ da Empresa</Text>
          <TextInput style={styles.input} placeholder="00.000.000/0001-00" placeholderTextColor="#a8a8b3" value={cnpjEmpresa} onChangeText={setCnpjEmpresa} />

          <Text style={styles.label}>Link do LinkedIn</Text>
          <TextInput style={styles.input} placeholder="https://linkedin.com..." placeholderTextColor="#a8a8b3" autoCapitalize="none" value={linkLinkedIn} onChangeText={setLinkLinkedIn} />
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSolicitar} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Enviar Solicitação</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#121214', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e1e1e6', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#a8a8b3', marginBottom: 20 },
  label: { color: '#a8a8b3', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  chip: { flex: 1, padding: 12, backgroundColor: '#202024', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#323238' },
  chipActive: { backgroundColor: '#614de6', borderColor: '#614de6' },
  chipText: { color: '#a8a8b3', fontWeight: 'bold' },
  chipTextActive: { color: '#FFF' },
  box: { backgroundColor: '#18181B', padding: 14, borderRadius: 8, marginBottom: 20 },
  input: { backgroundColor: '#202024', color: '#e1e1e6', borderRadius: 8, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#323238' },
  button: { backgroundColor: '#614de6', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
