import React, { useState } from 'react';
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
import { API_BASE_URL, getToken } from '../services/api';
import { TextoLibras } from '../context/VLibrasContext';

export default function PublishProjectScreen({ onProjectPublished }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [linkRepositorio, setLinkRepositorio] = useState('');
  const [fotosAssets, setFotosAssets] = useState([]);
  const [videoAsset, setVideoAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const escolherFotoEditavel = async () => {
    if (fotosAssets.length >= 5) {
      Alert.alert('Limite Atingido', 'Você pode anexar no máximo 5 fotos por projeto.');
      return;
    }

    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert('Permissão Necessária', 'Permita o acesso à galeria para escolher fotos.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const asset = resultado.assets[0];
        const nomePadrao = `foto-${Date.now()}.jpg`;
        const novaFoto = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          uri: asset.uri,
          fileName: asset.fileName || nomePadrao,
          mimeType: asset.mimeType || 'image/jpeg',
        };
        setFotosAssets((prev) => [...prev, novaFoto].slice(0, 5));
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível selecionar ou editar a foto.');
    }
  };

  const escolherVideo = async () => {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert('Permissão Necessária', 'Permita o acesso à galeria para escolher um vídeo.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const asset = resultado.assets[0];
        setVideoAsset({
          uri: asset.uri,
          fileName: asset.fileName || `demo-${Date.now()}.mp4`,
          mimeType: asset.mimeType || 'video/mp4',
        });
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível selecionar o vídeo.');
    }
  };

  const removerFoto = (idParaRemover) => {
    setFotosAssets((prev) => prev.filter((item) => item.id !== idParaRemover));
  };

  const removerVideo = () => {
    setVideoAsset(null);
  };

  const handlePublish = async () => {
    if (!titulo.trim() || !descricao.trim() || !linkRepositorio.trim()) {
      Alert.alert(
        'Campos Obrigatórios',
        'Preencha Título, Descrição e Link do Repositório.'
      );
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();

      formData.append('Titulo', titulo.trim());
      formData.append('Descricao', descricao.trim());
      formData.append('LinkRepositorio', linkRepositorio.trim());

      fotosAssets.slice(0, 5).forEach((foto, index) => {
        const ext = foto.mimeType === 'image/png' ? 'png' : 'jpg';
        const nomeFinal = foto.fileName || `projeto-foto-${index + 1}.${ext}`;
        formData.append('Fotos', {
          uri: foto.uri,
          name: nomeFinal,
          type: foto.mimeType || 'image/jpeg',
        });
      });

      if (videoAsset) {
        formData.append('Video', {
          uri: videoAsset.uri,
          name: videoAsset.fileName || 'projeto-video.mp4',
          type: videoAsset.mimeType || 'video/mp4',
        });
      }

      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/projetos/upload-projeto`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msgErro =
          data?.mensagem ||
          data?.Message ||
          'Falha ao publicar projeto. Verifique os campos e tente novamente.';
        Alert.alert('Erro', msgErro);
        return;
      }

      Alert.alert(
        'Sucesso',
        'Projeto enviado para moderação! Acompanhe o status em Meus Projetos.'
      );
      setTitulo('');
      setDescricao('');
      setLinkRepositorio('');
      setFotosAssets([]);
      setVideoAsset(null);

      if (onProjectPublished) {
        onProjectPublished();
      }
    } catch (error) {
      Alert.alert(
        'Erro de Conexão',
        error?.message || 'Não foi possível enviar o projeto ao servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextoLibras style={styles.title}>Publicar Novo Projeto</TextoLibras>

      <View style={styles.inputBubble}>
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: DevBeDev Platform"
          placeholderTextColor="#a8a8b3"
          value={titulo}
          onChangeText={setTitulo}
        />
      </View>

      <View style={styles.inputBubble}>
        <Text style={styles.label}>Descrição *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Detalhe o funcionamento, arquitetura e tecnologias..."
          placeholderTextColor="#a8a8b3"
          multiline
          numberOfLines={4}
          value={descricao}
          onChangeText={setDescricao}
        />
      </View>

      <View style={styles.inputBubble}>
        <Text style={styles.label}>Link do Repositório *</Text>
        <TextInput
          style={styles.input}
          placeholder="https://github.com/..."
          placeholderTextColor="#a8a8b3"
          autoCapitalize="none"
          keyboardType="url"
          value={linkRepositorio}
          onChangeText={setLinkRepositorio}
        />
      </View>

      <Text style={styles.labelTitleSection}>Mídia do Projeto (Cortar & Pré-visualizar)</Text>

      <View style={styles.mediaRow}>
        <TouchableOpacity
          style={styles.btnMediaUpload}
          onPress={escolherFotoEditavel}
          disabled={loading}
        >
          <Text style={styles.btnMediaText}>
            {`✂ Adicionar Foto (${fotosAssets.length}/5)`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnMediaUpload}
          onPress={escolherVideo}
          disabled={loading}
        >
          <Text style={styles.btnMediaText}>
            {videoAsset ? '🎥 Vídeo Selecionado ✓' : '🎥 Escolher Vídeo'}
          </Text>
        </TouchableOpacity>
      </View>

      {fotosAssets.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Fotos selecionadas:</Text>
          <View style={styles.previewGrid}>
            {fotosAssets.map((foto, idx) => (
              <View key={foto.id} style={styles.previewCard}>
                <Image
                  source={{ uri: foto.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.btnRemoveBadge}
                  onPress={() => removerFoto(foto.id)}
                  accessibilityLabel={`Remover foto ${idx + 1}`}
                >
                  <Text style={styles.btnRemoveText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.previewCaption} numberOfLines={1}>
                  {`Foto ${idx + 1}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {videoAsset && (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Vídeo selecionado:</Text>
          <View style={styles.videoPreviewBox}>
            <Text style={styles.videoPreviewName} numberOfLines={1}>
              {`🎥 ${videoAsset.fileName}`}
            </Text>
            <TouchableOpacity
              style={styles.btnRemoveVideo}
              onPress={removerVideo}
              accessibilityLabel="Remover vídeo"
            >
              <Text style={styles.btnRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.buttonMain}
        onPress={handlePublish}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonMainText}>Enviar para Moderação</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 110, backgroundColor: '#121214', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#614de6', marginBottom: 20, textAlign: 'center' },
  inputBubble: {
    backgroundColor: '#1c1c1f',
    borderRadius: 20,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#323238',
  },
  label: { color: '#a8a8b3', marginBottom: 6, fontSize: 13, fontWeight: '600', marginLeft: 4 },
  labelTitleSection: { color: '#e1e1e6', fontSize: 15, fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
  input: { color: '#e1e1e6', fontSize: 15 },
  textArea: { height: 90, textAlignVertical: 'top' },
  mediaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  btnMediaUpload: {
    flex: 1,
    backgroundColor: '#2a2a30',
    padding: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#323238',
  },
  btnMediaText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  previewSection: {
    backgroundColor: '#1c1c1f',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#323238',
  },
  previewLabel: { color: '#a8a8b3', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  previewCard: {
    width: 96,
    position: 'relative',
    backgroundColor: '#121214',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#323238',
  },
  previewImage: { width: '100%', height: 76, borderRadius: 8 },
  previewCaption: { color: '#a8a8b3', fontSize: 11, textAlign: 'center', marginTop: 4 },
  btnRemoveBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e64d4d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  btnRemoveText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  videoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121214',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#323238',
  },
  videoPreviewName: { color: '#e1e1e6', fontSize: 13, flex: 1, marginRight: 10 },
  btnRemoveVideo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e64d4d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonMain: {
    backgroundColor: '#614de6',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonMainText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});