import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  Dimensions,
  Modal,
  Linking,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import api, { API_HOST } from '../services/api';
import { TextoLibras } from '../context/VLibrasContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_WIDTH = SCREEN_WIDTH - 74;

function VideoPlayerBox({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      style={styles.mediaItem}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      contentFit="contain"
    />
  );
}

export default function ProjectCard({
  projeto,
  userRole,
  userId,
  onFavoritoRemovido,
  onRefresh,
  onAutorPress,
}) {
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [favoritado, setFavoritado] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [votos, setVotos] = useState(projeto?.totalVotos ?? projeto?.totalUpvotes ?? 0);
  const [upvoted, setUpvoted] = useState(false);

  useEffect(() => {
    setVotos(projeto?.totalVotos ?? projeto?.totalUpvotes ?? 0);
  }, [projeto?.id, projeto?.totalVotos, projeto?.totalUpvotes]);

  const carregarComentarios = async () => {
    if (!projeto?.id) return;
    try {
      const response = await api.get(`/projetos/${projeto.id}/comentarios`);
      setComentarios(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    }
  };

  useEffect(() => {
    if (projeto?.id) {
      carregarComentarios();
    }
  }, [projeto.id]);

  const handleUpvote = async () => {
    try {
      await api.post(`/projetos/${projeto.id}/upvote`);
      setVotos((prev) => prev + 1);
      setUpvoted(true);
    } catch (error) {
      Alert.alert('Aviso', error.message || 'Não foi possível registrar o upvote.');
    }
  };

  const enviarComentario = async () => {
    const textoLimpo = novoComentario.trim();
    if (!textoLimpo || enviandoComentario) return;

    setEnviandoComentario(true);
    try {
      await api.post(`/projetos/${projeto.id}/comentarios`, {
        textoComentario: textoLimpo,
      });
      setNovoComentario('');
      await carregarComentarios();
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar o comentário.');
    } finally {
      setEnviandoComentario(false);
    }
  };

  const handleDeletarComentario = (comentarioId) => {
    if (!comentarioId) return;
    Alert.alert('Excluir Comentário', 'Deseja excluir este comentário?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/projetos/${projeto.id}/comentarios/${comentarioId}`);
            await carregarComentarios();
          } catch (error) {
            Alert.alert('Erro', error.message || 'Não foi possível excluir o comentário.');
          }
        },
      },
    ]);
  };

  const handleFavoritar = async () => {
    try {
      await api.post(`/recrutadores/projetos/${projeto.id}/favoritar`);
      setFavoritado(true);
      Alert.alert('Salvo', 'Projeto adicionado aos favoritos!');
    } catch (error) {
      const msg = error.response?.data?.mensagem || error.message || 'Erro ao favoritar projeto.';
      Alert.alert('Aviso', msg);
    }
  };

  const handleDesfavoritar = async () => {
    try {
      await api.delete(`/recrutadores/projetos/${projeto.id}/favoritar`);
      if (onFavoritoRemovido) {
        onFavoritoRemovido(projeto.id);
      } else {
        setFavoritado(false);
        Alert.alert('Removido', 'Projeto removido dos favoritos!');
      }
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao remover dos favoritos.');
    }
  };

  const handleDeletar = () => {
    Alert.alert(
      'Excluir Publicação',
      'Tem certeza que deseja excluir esta publicação permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/projetos/${projeto.id}`);
              if (onRefresh) onRefresh();
            } catch (error) {
              Alert.alert('Erro', error.message || 'Falha ao excluir o projeto.');
            }
          },
        },
      ]
    );
  };

  const resolverUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const caminhoLimpo = url.startsWith('/') ? url : `/${url}`;
    return `${API_HOST}${caminhoLimpo}`;
  };

  const midias = [];
  if (projeto.fotos && Array.isArray(projeto.fotos)) {
    projeto.fotos.forEach((foto) => {
      const url = resolverUrl(foto);
      if (url) midias.push({ tipo: 'foto', url });
    });
  } else if (projeto.fotoUrl) {
    const url = resolverUrl(projeto.fotoUrl);
    if (url) midias.push({ tipo: 'foto', url });
  }

  if (projeto.videoUrl) {
    const url = resolverUrl(projeto.videoUrl);
    if (url) midias.push({ tipo: 'video', url });
  }

  const showDelete =
    userRole === 'Administrador' || String(projeto.devId) === String(userId);

  const nomeAutor = projeto.autor || projeto.autorNome || 'Anônimo';

  const onScrollCarrossel = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / MEDIA_WIDTH);
    setIndiceAtivo(index);
  };

  return (
    <View style={styles.cardBubble}>
      <View style={styles.cardHeader}>
        <TextoLibras style={styles.titulo}>{projeto.titulo}</TextoLibras>
        <TouchableOpacity
          onPress={() => onAutorPress && projeto.devId && onAutorPress(projeto.devId)}
          disabled={!onAutorPress || !projeto.devId}
        >
          <Text style={styles.autor}>{`@${nomeAutor}`}</Text>
        </TouchableOpacity>
      </View>

      <TextoLibras style={styles.descricao}>{projeto.descricao}</TextoLibras>

      {midias.length > 0 && (
        <View style={styles.carouselWrapper}>
          <FlatList
            data={midias}
            horizontal
            pagingEnabled
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, idx) => `${projeto.id}-midia-${idx}`}
            onMomentumScrollEnd={onScrollCarrossel}
            renderItem={({ item }) => {
              if (item.tipo === 'video') {
                return (
                  <View style={styles.slideContainer}>
                    <VideoPlayerBox uri={item.url} />
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.slideContainer}
                  onPress={() => setImagemAmpliada(item.url)}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.mediaItem}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            }}
          />

          {midias.length > 1 && (
            <View style={styles.dotsContainer}>
              {midias.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, indiceAtivo === idx && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btnUpvote, upvoted && styles.btnUpvoteAtivo]}
          onPress={handleUpvote}
        >
          <Text style={styles.btnUpvoteText}>{`▲ ${votos}`}</Text>
        </TouchableOpacity>

        {!!projeto.linkRepositorio && (
          <TouchableOpacity
            style={styles.btnRepo}
            onPress={() =>
              Linking.openURL(projeto.linkRepositorio).catch(() =>
                Alert.alert('Erro', 'Link inválido.')
              )
            }
          >
            <Text style={styles.btnRepoText}>🔗 Repositório</Text>
          </TouchableOpacity>
        )}

        {userRole === 'Recrutador' && (
          onFavoritoRemovido ? (
            <TouchableOpacity style={styles.botaoRemoverFav} onPress={handleDesfavoritar}>
              <Text style={styles.textoBotao}>★ Remover</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.botaoFavoritar, favoritado && styles.botaoFavoritado]}
              onPress={favoritado ? handleDesfavoritar : handleFavoritar}
            >
              <Text style={styles.textoBotao}>
                {favoritado ? '★ Remover' : '☆ Favoritar'}
              </Text>
            </TouchableOpacity>
          )
        )}

        {showDelete && (
          <TouchableOpacity style={styles.btnDeletar} onPress={handleDeletar}>
            <Text style={styles.textoBotao}>🗑 Excluir</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.secaoTitulo}>Comentários</Text>
      {comentarios.map((item, index) => {
        const comentarioId = item.id || item.Id;
        const autorComentarioId = item.autorId || item.AutorId;
        const podeExcluirComentario =
          !!comentarioId &&
          (userRole === 'Administrador' ||
            (userId !== null &&
              userId !== undefined &&
              String(autorComentarioId) === String(userId)));

        return (
          <View key={comentarioId || index} style={styles.comentarioItem}>
            <View style={styles.comentarioHeaderRow}>
              <Text style={styles.comentarioAutor}>
                {`${item.usuarioNome || 'Usuário'} (${item.perfilTipo || 'Espectador'})`}
              </Text>
              {podeExcluirComentario && (
                <TouchableOpacity
                  style={styles.btnExcluirComentario}
                  onPress={() => handleDeletarComentario(comentarioId)}
                >
                  <Text style={styles.btnExcluirComentarioText}>Excluir</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextoLibras style={styles.comentarioTexto}>{item.textoComentario}</TextoLibras>
          </View>
        );
      })}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.inputComentario}
          placeholder="Escreva um comentário..."
          placeholderTextColor="#888"
          value={novoComentario}
          onChangeText={setNovoComentario}
          onSubmitEditing={enviarComentario}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={styles.botaoEnviar}
          onPress={enviarComentario}
          disabled={enviandoComentario}
        >
          <Text style={styles.textoBotao}>{enviandoComentario ? '...' : 'Enviar'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!imagemAmpliada}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagemAmpliada(null)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setImagemAmpliada(null)}
          >
            <Text style={styles.lightboxCloseText}>✕ Fechar</Text>
          </TouchableOpacity>
          {imagemAmpliada && (
            <Image
              source={{ uri: imagemAmpliada }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBubble: {
    backgroundColor: '#1c1c1f',
    borderRadius: 26,
    padding: 19,
    marginBottom: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  titulo: { color: '#614de6', fontSize: 20, fontWeight: 'bold', flex: 1 },
  autor: { color: '#a8a8b3', fontSize: 14, marginLeft: 10 },
  descricao: { color: '#e1e1e6', fontSize: 16, lineHeight: 22, marginBottom: 16 },
  carouselWrapper: { marginBottom: 16, alignItems: 'center' },
  slideContainer: {
    width: MEDIA_WIDTH,
    height: 250,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#121214',
  },
  mediaItem: { width: MEDIA_WIDTH, height: 250 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#323238' },
  dotActive: { backgroundColor: '#614de6', width: 18 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  btnUpvote: {
    backgroundColor: '#2a2a30',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#323238',
  },
  btnUpvoteAtivo: { backgroundColor: '#614de6', borderColor: '#614de6' },
  btnUpvoteText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  btnRepo: {
    backgroundColor: '#2a2a30',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#614de6',
  },
  btnRepoText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  botaoFavoritar: {
    backgroundColor: '#2a2a30',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  botaoFavoritado: { backgroundColor: '#614de6' },
  botaoRemoverFav: {
    backgroundColor: '#f75a68',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  btnDeletar: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  secaoTitulo: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  comentarioItem: {
    backgroundColor: '#252529',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  comentarioAutor: { color: '#614de6', fontSize: 14, fontWeight: 'bold' },
  comentarioTexto: { color: '#e1e1e6', fontSize: 15, marginTop: 3 },
  inputContainer: { flexDirection: 'row', marginTop: 10 },
  inputComentario: {
    flex: 1,
    backgroundColor: '#252529',
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 26,
    fontSize: 15,
  },
  botaoEnviar: {
    backgroundColor: '#614de6',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 26,
    marginLeft: 10,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 22,
    backgroundColor: '#252529',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    zIndex: 10,
  },
  lightboxCloseText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  lightboxImage: { width: '95%', height: '80%' },
  comentarioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnExcluirComentario: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  btnExcluirComentarioText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});