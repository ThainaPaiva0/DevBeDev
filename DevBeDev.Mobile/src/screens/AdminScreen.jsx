import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import api, { API_HOST } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - 64;

const resolverUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const limpa = url.trim();
  if (!limpa) return null;
  if (/^https?:\/\//i.test(limpa)) return limpa;
  const caminhoLimpo = limpa.startsWith('/') ? limpa : `/${limpa}`;
  return `${API_HOST}${caminhoLimpo}`;
};

function VideoPlayerAdmin({ uri, style }) {
  const player = useVideoPlayer(uri);
  return <VideoView style={style} player={player} allowsFullscreen />;
}

function PendingProjectCarousel({ fotos, titulo }) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const urlsValidas = (fotos || []).map(resolverUrl).filter(Boolean);

  if (urlsValidas.length === 0) return null;

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CAROUSEL_WIDTH);
    setIndiceAtivo(index);
  };

  return (
    <View style={styles.carouselWrapper}>
      <FlatList
        data={urlsValidas}
        horizontal
        pagingEnabled
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, index) => `${titulo || 'proj'}-foto-${index}`}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.carouselSlide}
            resizeMode="cover"
          />
        )}
      />
      {urlsValidas.length > 1 && (
        <View style={styles.dotsContainer}>
          {urlsValidas.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, indiceAtivo === idx && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function AdminScreen() {
  const [pendentesUpgrades, setPendentesUpgrades] = useState([]);
  const [pendentesProjetos, setPendentesProjetos] = useState([]);
  const [pendentesUsuarios, setPendentesUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upgrades');

  // Estado do Modal de Recusa com Motivo
  const [recusaModalVisivel, setRecusaModalVisivel] = useState(false);
  const [recusaTitulo, setRecusaTitulo] = useState('');
  const [recusaSubtitulo, setRecusaSubtitulo] = useState('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [alvoRecusa, setAlvoRecusa] = useState(null); // { tipo: 'upgrade' | 'projeto', id: number }
  const [enviandoRecusa, setEnviandoRecusa] = useState(false);

  const carregarDados = async () => {
    try {
      const resUp = await api.get('/usuarios/pendentes-upgrade');
      setPendentesUpgrades(resUp.data || []);
      const resProj = await api.get('/projetos/pendentes-aprovacao');
      setPendentesProjetos(resProj.data || []);
      const resUsers = await api.get('/usuarios/todos');
      setPendentesUsuarios(resUsers.data || []);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar a moderação.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const aprovarUpgrade = async (id) => {
    try {
      await api.post(`/usuarios/${id}/aprovar-upgrade`);
      carregarDados();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao aprovar upgrade.');
    }
  };

  const aprovarProjeto = async (id) => {
    try {
      await api.post(`/projetos/${id}/aprovar-projeto`);
      carregarDados();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao aprovar projeto.');
    }
  };

  const abrirModalRecusaUpgrade = (usuario) => {
    setAlvoRecusa({ tipo: 'upgrade', id: usuario.id });
    setRecusaTitulo('Recusar Upgrade');
    setRecusaSubtitulo(`${usuario.nome} (${usuario.email}) — Para: ${usuario.tipoDesejado || usuario.tipoSolicitado || 'Dev'}`);
    setMotivoRecusa('');
    setRecusaModalVisivel(true);
  };

  const abrirModalRecusaProjeto = (projeto) => {
    setAlvoRecusa({ tipo: 'projeto', id: projeto.id });
    setRecusaTitulo('Recusar Projeto');
    setRecusaSubtitulo(`"${projeto.titulo}" — Autor: ${projeto.autor}`);
    setMotivoRecusa('');
    setRecusaModalVisivel(true);
  };

  const confirmarRecusa = async () => {
    if (!motivoRecusa.trim()) {
      Alert.alert('Atenção', 'Digite o motivo da recusa antes de confirmar.');
      return;
    }
    if (!alvoRecusa) return;

    setEnviandoRecusa(true);
    try {
      if (alvoRecusa.tipo === 'upgrade') {
        await api.post(`/usuarios/${alvoRecusa.id}/rejeitar-upgrade`, {
          Motivo: motivoRecusa.trim(),
        });
      } else if (alvoRecusa.tipo === 'projeto') {
        await api.post(`/projetos/${alvoRecusa.id}/rejeitar-projeto`, {
          Motivo: motivoRecusa.trim(),
        });
      }
      setRecusaModalVisivel(false);
      setAlvoRecusa(null);
      setMotivoRecusa('');
      await carregarDados();
      Alert.alert('Sucesso', 'Recusa registrada com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Falha ao enviar motivo da recusa.');
    } finally {
      setEnviandoRecusa(false);
    }
  };

  const abrirRepositorio = (url) => {
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link do repositório.'));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moderação do Sistema</Text>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'upgrades' && styles.tabActive]} onPress={() => setActiveTab('upgrades')}>
          <Text style={[styles.tabText, activeTab === 'upgrades' && styles.tabTextActive]}>Upgrades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'projetos' && styles.tabActive]} onPress={() => setActiveTab('projetos')}>
          <Text style={[styles.tabText, activeTab === 'projetos' && styles.tabTextActive]}>Projetos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'usuarios' && styles.tabActive]} onPress={() => setActiveTab('usuarios')}>
          <Text style={[styles.tabText, activeTab === 'usuarios' && styles.tabTextActive]}>Usuários</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#614de6" style={styles.loader} />
      ) : activeTab === 'upgrades' ? (
        <FlatList
          data={pendentesUpgrades}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#614de6" />}
          renderItem={({ item }) => (
            <View style={styles.cardProjeto}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardSubtitle}>Para: {item.tipoDesejado || item.tipoSolicitado}</Text>
              </View>

              <View style={styles.upgradeDetalhesBox}>
                <Text style={styles.detalheLinha}><Text style={styles.detalheLabel}>Nome: </Text>{item.nome || '-'}</Text>
                <Text style={styles.detalheLinha}><Text style={styles.detalheLabel}>E-mail: </Text>{item.email || '-'}</Text>
                <Text style={styles.detalheLinha}><Text style={styles.detalheLabel}>Tipo Desejado: </Text>{item.tipoDesejado || item.tipoSolicitado || '-'}</Text>
                <Text style={styles.detalheLinha}><Text style={styles.detalheLabel}>Bio: </Text>{item.bio || 'Não informada'}</Text>
                <Text style={styles.detalheLinha}><Text style={styles.detalheLabel}>GitHub: </Text>{item.linkGitHub || 'Não informado'}</Text>
                <Text style={styles.detalheLinha}><Text style={styles.detalheLabel}>CNPJ: </Text>{item.cnpjEmpresa || 'Não informado'}</Text>
                <Text style={styles.detalheLinha}><Text style={styles.detalheLabel}>LinkedIn: </Text>{item.linkLinkedIn || 'Não informado'}</Text>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity style={[styles.btnAprovar, styles.btnFlex]} onPress={() => aprovarUpgrade(item.id)}>
                  <Text style={styles.btnText}>Aprovar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnRecusar, styles.btnFlex]} onPress={() => abrirModalRecusaUpgrade(item)}>
                  <Text style={styles.btnText}>Recusar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Sem solicitações de upgrade.</Text>}
        />
      ) : activeTab === 'projetos' ? (
        <FlatList
          data={pendentesProjetos}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#614de6" />}
          renderItem={({ item }) => (
            <View style={styles.cardProjeto}>
              <Text style={styles.cardTitle}>{item.titulo}</Text>
              <Text style={styles.cardSubtitle}>Autor: {item.autor}</Text>

              <Text style={styles.cardDescricao}>{item.descricao}</Text>

              {!!item.linkRepositorio && (
                <TouchableOpacity onPress={() => abrirRepositorio(item.linkRepositorio)}>
                  <Text style={styles.cardLink}>{item.linkRepositorio}</Text>
                </TouchableOpacity>
              )}

              {item.fotos && item.fotos.length > 0 ? (
                <PendingProjectCarousel fotos={item.fotos} titulo={item.titulo} />
              ) : !!item.fotoUrl && (
                <Image
                  source={{ uri: resolverUrl(item.fotoUrl) }}
                  style={styles.media}
                  resizeMode="cover"
                />
              )}

              {!!item.videoUrl && (
                <VideoPlayerAdmin uri={resolverUrl(item.videoUrl)} style={styles.media} />
              )}

              <View style={styles.cardActionsRow}>
                <TouchableOpacity style={[styles.btnAprovar, styles.btnFlex]} onPress={() => aprovarProjeto(item.id)}>
                  <Text style={styles.btnText}>Aprovar Projeto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnRecusar, styles.btnFlex]} onPress={() => abrirModalRecusaProjeto(item)}>
                  <Text style={styles.btnText}>Recusar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Sem projetos pendentes.</Text>}
        />
      ) : (
        <FlatList
          data={pendentesUsuarios}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#614de6" />}
          renderItem={({ item }) => (
            <View style={styles.cardBubble}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardSubtitle}>E-mail: {item.email} | Tipo: {item.tipoPerfil || 'Espectador'}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum usuário cadastrado.</Text>}
        />
      )}

      {/* Modal de Motivo da Recusa */}
      <Modal
        visible={recusaModalVisivel}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRecusaModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{recusaTitulo}</Text>
            <Text style={styles.modalSubtitle}>{recusaSubtitulo}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Escreva o motivo da recusa..."
              placeholderTextColor="#a8a8b3"
              multiline
              numberOfLines={4}
              value={motivoRecusa}
              onChangeText={setMotivoRecusa}
            />

            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={[styles.btnCancelar, styles.btnFlex]}
                onPress={() => setRecusaModalVisivel(false)}
                disabled={enviandoRecusa}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnRecusar, styles.btnFlex]}
                onPress={confirmarRecusa}
                disabled={enviandoRecusa}
              >
                {enviandoRecusa ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>Confirmar Recusa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#614de6', marginBottom: 16, textAlign: 'center' },
  tabsContainer: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  tab: { flex: 1, backgroundColor: '#202024', padding: 12, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: '#323238' },
  tabActive: { backgroundColor: '#614de6', borderColor: '#4a3bba' },
  tabText: { color: '#a8a8b3', fontWeight: 'bold', fontSize: 12 },
  tabTextActive: { color: '#FFF' },
  loader: { flex: 1, justifyContent: 'center' },
  emptyText: { color: '#a8a8b3', textAlign: 'center', marginTop: 30 },
  cardBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1f',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  cardProjeto: {
    backgroundColor: '#1c1c1f',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  cardHeader: { flex: 1 },
  cardTitle: { color: '#e1e1e6', fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: '#a8a8b3', fontSize: 12, marginTop: 2 },
  cardDescricao: { color: '#DDD', fontSize: 14, marginTop: 10 },
  cardLink: { color: '#614de6', fontSize: 13, marginTop: 8, textDecorationLine: 'underline' },
  upgradeDetalhesBox: {
    backgroundColor: '#252529',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#323238',
    gap: 4,
  },
  detalheLinha: { color: '#e1e1e6', fontSize: 12 },
  detalheLabel: { color: '#a8a8b3', fontWeight: 'bold' },
  carouselWrapper: { marginTop: 12, alignItems: 'center' },
  carouselSlide: { width: CAROUSEL_WIDTH, height: 200, borderRadius: 15, backgroundColor: '#000' },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#323238' },
  dotActive: { backgroundColor: '#614de6', width: 16 },
  media: { width: '100%', height: 200, borderRadius: 15, marginTop: 12, backgroundColor: '#000' },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnFlex: { flex: 1, alignItems: 'center' },
  btnAprovar: {
    backgroundColor: '#614de6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 5
  },
  btnRecusar: {
    backgroundColor: '#e64d4d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 5
  },
  btnCancelar: {
    backgroundColor: '#2a2a30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#323238',
  },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1c1c1f',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#323238',
  },
  modalTitle: { color: '#e1e1e6', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  modalSubtitle: { color: '#a8a8b3', fontSize: 13, marginBottom: 14 },
  modalInput: {
    backgroundColor: '#121214',
    color: '#e1e1e6',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#323238',
    height: 100,
    textAlignVertical: 'top',
  },
});