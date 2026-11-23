import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { API_HOST, API_BASE_URL, getToken, setToken } from '../services/api';
import { TextoLibras } from '../context/VLibrasContext';

export default function ProfileScreen() {
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [linkGitHub, setLinkGitHub] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [linkLinkedIn, setLinkLinkedIn] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const carregarPerfil = async () => {
    try {
      const response = await api.get('/usuarios/me');
      const data = response.data;
      setPerfil(data);
      setNome(data.nome || '');
      setBio(data.bio || '');
      setLinkGitHub(data.linkGitHub || '');
      setCnpjEmpresa(data.cnpjEmpresa || '');
      setLinkLinkedIn(data.linkLinkedIn || '');
      setFotoPerfilUrl(data.fotoPerfilUrl || null);

      if (data.novoToken) {
        await setToken(data.novoToken);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
  }, []);

  const resolverUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_HOST}${url}`;
  };

  const handleEscolherFoto = async () => {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert('Permissão Necessária', 'Permita o acesso à galeria para escolher uma foto.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (resultado.canceled || !resultado.assets || resultado.assets.length === 0) return;

      const asset = resultado.assets[0];
      setUploadingFoto(true);

      const token = await getToken();
      const formData = new FormData();
      formData.append('foto', {
        uri: asset.uri,
        name: asset.fileName || `perfil-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });

      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/usuarios/foto-perfil`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.mensagem || 'Não foi possível enviar a foto de perfil.');
      }

      setFotoPerfilUrl(data.fotoPerfilUrl);
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar a foto de perfil.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const payload = {
        nome,
        bio: perfil?.tipoPerfil === 'Dev' ? bio : null,
        linkGitHub: perfil?.tipoPerfil === 'Dev' ? linkGitHub : null,
        cnpjEmpresa: perfil?.tipoPerfil === 'Recrutador' ? cnpjEmpresa : null,
        linkLinkedIn: perfil?.tipoPerfil === 'Recrutador' ? linkLinkedIn : null,
      };

      await api.put('/usuarios/me', payload);
      await carregarPerfil();
      Alert.alert('Sucesso', 'Perfil e token JWT atualizados com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#614de6" />
      </View>
    );
  }

  const fotoResolvida = resolverUrl(fotoPerfilUrl);
  const projetosRecusados = (perfil?.projetos || []).filter(
    (p) => p.recusadoPeloAdmin && p.motivoRecusa
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextoLibras style={styles.title}>Meu Perfil</TextoLibras>

      {perfil?.upgradeRecusado && !!perfil?.motivoRecusa && (
        <View style={styles.alertaRecusa}>
          <Text style={styles.alertaTitulo}>
            {`⚠ Solicitação de Upgrade (${perfil?.tipoSolicitado || 'Perfil'}) Recusada`}
          </Text>
          <Text style={styles.alertaMotivo}>
            {`Motivo do Administrador: ${perfil.motivoRecusa}`}
          </Text>
        </View>
      )}

      {projetosRecusados.map((proj) => (
        <View key={proj.id} style={styles.alertaRecusa}>
          <Text style={styles.alertaTitulo}>
            {`⚠ Projeto "${proj.titulo}" Recusado`}
          </Text>
          <Text style={styles.alertaMotivo}>
            {`Motivo do Administrador: ${proj.motivoRecusa}`}
          </Text>
        </View>
      ))}

      <View style={styles.avatarBox}>
        {fotoResolvida ? (
          <Image source={{ uri: fotoResolvida }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPadrao]}>
            <Text style={styles.avatarInicial}>
              {(perfil?.nome || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.botaoFoto}
          onPress={handleEscolherFoto}
          disabled={uploadingFoto}
        >
          {uploadingFoto ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.botaoFotoText}>✂ Cortar e Alterar Foto</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBadge}>
        <Text style={styles.infoBadgeText}>{`Tipo de Perfil: ${perfil?.tipoPerfil}`}</Text>
        <Text style={styles.infoEmailText}>{perfil?.email}</Text>
      </View>

      <Text style={styles.label}>Nome Completo</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholderTextColor="#a8a8b3"
      />

      {perfil?.tipoPerfil === 'Dev' && (
        <>
          <Text style={styles.label}>Biografia (Bio)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            value={bio}
            onChangeText={setBio}
            placeholder="Sua bio de dev..."
            placeholderTextColor="#a8a8b3"
          />

          <Text style={styles.label}>Link do GitHub</Text>
          <TextInput
            style={styles.input}
            value={linkGitHub}
            onChangeText={setLinkGitHub}
            placeholder="https://github.com/..."
            placeholderTextColor="#a8a8b3"
            autoCapitalize="none"
          />
        </>
      )}

      {perfil?.tipoPerfil === 'Recrutador' && (
        <>
          <Text style={styles.label}>CNPJ da Empresa</Text>
          <TextInput
            style={styles.input}
            value={cnpjEmpresa}
            onChangeText={setCnpjEmpresa}
            placeholder="00.000.000/0001-00"
            placeholderTextColor="#a8a8b3"
          />

          <Text style={styles.label}>Link do LinkedIn</Text>
          <TextInput
            style={styles.input}
            value={linkLinkedIn}
            onChangeText={setLinkLinkedIn}
            placeholder="https://linkedin.com/in/..."
            placeholderTextColor="#a8a8b3"
            autoCapitalize="none"
          />
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSalvar} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Atualizar Perfil & Token</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, backgroundColor: '#121214', justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 110, backgroundColor: '#121214', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e1e1e6', marginBottom: 16 },
  alertaRecusa: {
    backgroundColor: 'rgba(247, 90, 104, 0.14)',
    borderWidth: 1,
    borderColor: '#f75a68',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  alertaTitulo: { color: '#f75a68', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  alertaMotivo: { color: '#ffd6db', fontSize: 13 },
  avatarBox: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#614de6', backgroundColor: '#202024' },
  avatarPadrao: { justifyContent: 'center', alignItems: 'center' },
  avatarInicial: { color: '#a8a8b3', fontSize: 40, fontWeight: 'bold' },
  botaoFoto: {
    backgroundColor: '#2a2a30',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#614de6',
  },
  botaoFotoText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  infoBadge: {
    backgroundColor: '#202024',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#323238',
    marginBottom: 20,
  },
  infoBadgeText: { color: '#614de6', fontWeight: 'bold', fontSize: 16 },
  infoEmailText: { color: '#a8a8b3', fontSize: 14, marginTop: 4 },
  label: { color: '#a8a8b3', marginBottom: 6, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#202024',
    color: '#e1e1e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#323238',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#614de6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});