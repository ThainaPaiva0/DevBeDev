import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import api, { API_HOST } from '../services/api';
import { TextoLibras } from '../context/VLibrasContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_WIDTH = SCREEN_WIDTH - 64;

const resolverUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const caminhoLimpo = url.startsWith('/') ? url : `/${url}`;
  return `${API_HOST}${caminhoLimpo}`;
};

function FavoriteVideoPlayer({ uri }) {
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

function FavoriteProjectCard({ projeto, onRemover, onVerPerfilDev }) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);

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

  const nomeDev = projeto.autor || projeto.autorNome || 'Anônimo';
  const avatarUrl = resolverUrl(projeto.autorFotoPerfilUrl);

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
          style={styles.devBadge}
          onPress={() => onVerPerfilDev && projeto.devId && onVerPerfilDev(projeto.devId)}
          disabled={!onVerPerfilDev || !projeto.devId}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.devAvatar} />
          ) : (
            <View style={styles.devAvatarPadrao}>
              <Text style={styles.devAvatarInicial}>
                {nomeDev.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.devNome}>{`@${nomeDev}`}</Text>
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
            keyExtractor={(item, idx) => `${projeto.id}-fav-midia-${idx}`}
            onMomentumScrollEnd={onScrollCarrossel}
            renderItem={({ item }) => {
              if (item.tipo === 'video') {
                return (
                  <View style={styles.slideContainer}>
                    <FavoriteVideoPlayer uri={item.url} />
                  </View>
                );
              }
              return (
                <View style={styles.slideContainer}>
                  <Image
                    source={{ uri: item.url }}
                    style={styles.mediaItem}
                    resizeMode="cover"
                  />
                </View>
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
        {!!projeto.devId && (
          <TouchableOpacity
            style={styles.btnPerfilDev}
            onPress={() => onVerPerfilDev && onVerPerfilDev(projeto.devId)}
          >
            <Text style={styles.btnPerfilDevText}>👤 Ver Perfil do Dev</Text>
          </TouchableOpacity>
        )}

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

        <TouchableOpacity
          style={styles.botaoRemoverFav}
          onPress={() => onRemover(projeto.id)}
        >
          <Text style={styles.textoBotao}>★ Remover</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RecruiterFavoritesScreen({ onVerPerfilDev }) {
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarFavoritos = async () => {
    try {
      const response = await api.get('/recrutadores/favoritos');
      setFavoritos(response.data || []);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os favoritos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarFavoritos();
  }, []);

  const handleRemoverFavorito = async (projetoId) => {
    try {
      await api.delete(`/recrutadores/projetos/${projetoId}/favoritar`);
      setFavoritos((prev) => prev.filter((f) => f.projeto?.id !== projetoId));
    } catch (error) {
      Alert.alert('Erro', 'Erro ao remover dos favoritos.');
    }
  };

  return (
    <View style={styles.container}>
      <TextoLibras style={styles.title}>Favoritos (Talent Pool)</TextoLibras>

      {loading ? (
        <ActivityIndicator size="large" color="#614de6" style={styles.loader} />
      ) : (
        <FlatList
          data={favoritos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <FavoriteProjectCard
              projeto={item.projeto}
              onRemover={handleRemoverFavorito}
              onVerPerfilDev={onVerPerfilDev}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                carregarFavoritos();
              }}
              tintColor="#614de6"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum projeto salvo nos favoritos.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e1e1e6', marginBottom: 16 },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 100 },
  emptyText: { color: '#a8a8b3', textAlign: 'center', marginTop: 40 },
  cardBubble: {
    backgroundColor: '#1c1c1f',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  titulo: { color: '#614de6', fontSize: 18, fontWeight: 'bold', flex: 1 },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252529',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#323238',
    gap: 6,
  },
  devAvatar: { width: 22, height: 22, borderRadius: 11 },
  devAvatarPadrao: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#614de6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devAvatarInicial: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  devNome: { color: '#e1e1e6', fontSize: 12, fontWeight: '600' },
  descricao: { color: '#e1e1e6', fontSize: 14, marginBottom: 12 },
  carouselWrapper: { marginBottom: 14, alignItems: 'center' },
  slideContainer: {
    width: MEDIA_WIDTH,
    height: 210,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#121214',
  },
  mediaItem: { width: MEDIA_WIDTH, height: 210 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#323238' },
  dotActive: { backgroundColor: '#614de6', width: 16 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  btnPerfilDev: {
    backgroundColor: '#614de6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  btnPerfilDevText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  btnRepo: {
    backgroundColor: '#2a2a30',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#614de6',
  },
  btnRepoText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  botaoRemoverFav: {
    backgroundColor: '#f75a68',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});