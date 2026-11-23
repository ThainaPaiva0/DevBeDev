import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../services/api';
import { TextoLibras } from '../context/VLibrasContext';

export default function MessagesScreen({ userId }) {
  const [conversas, setConversas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [busca, setBusca] = useState('');
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [loadingContatos, setLoadingContatos] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregarContatosEConversas = async () => {
    try {
      const [resConversas, resContatos] = await Promise.all([
        api.get('/mensagens/conversas').catch(() => ({ data: [] })),
        api.get('/mensagens/contatos').catch(() => ({ data: [] })),
      ]);
      setConversas(Array.isArray(resConversas.data) ? resConversas.data : []);
      setContatos(Array.isArray(resContatos.data) ? resContatos.data : []);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar os contatos de mensagens.');
    } finally {
      setLoadingContatos(false);
    }
  };

  useEffect(() => {
    carregarContatosEConversas();
  }, []);

  const abrirConversa = async (contato) => {
    const idContato = contato.usuarioId ?? contato.UsuarioId ?? contato.id ?? contato.Id;
    if (!idContato) return;

    const selecionado = {
      id: idContato,
      nome: contato.nome ?? contato.Nome ?? 'Usuário',
      tipoPerfil: contato.tipoPerfil ?? contato.TipoPerfil ?? '',
    };
    setContatoAtivo(selecionado);
    setLoadingMensagens(true);

    try {
      const response = await api.get(`/mensagens/${idContato}`);
      setMensagens(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Falha ao carregar histórico.');
    } finally {
      setLoadingMensagens(false);
    }
  };

  const enviarMensagem = async () => {
    const conteudoLimpo = novoTexto.trim();
    if (!contatoAtivo || !conteudoLimpo || enviando) return;

    setEnviando(true);
    try {
      await api.post('/mensagens', {
        DestinatarioId: contatoAtivo.id,
        Conteudo: conteudoLimpo,
      });
      setNovoTexto('');
      await abrirConversa(contatoAtivo);
      await carregarContatosEConversas();
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  const termo = busca.trim().toLowerCase();
  const contatosFiltrados = contatos.filter((c) => {
    if (!termo) return true;
    const nome = (c.nome || c.Nome || '').toLowerCase();
    const perfil = (c.tipoPerfil || c.TipoPerfil || '').toLowerCase();
    return nome.includes(termo) || perfil.includes(termo);
  });

  if (contatoAtivo) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.btnVoltar}
            onPress={() => {
              setContatoAtivo(null);
              setMensagens([]);
            }}
          >
            <Text style={styles.btnVoltarText}>← Contatos</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatNome}>{contatoAtivo.nome}</Text>
            <Text style={styles.chatPerfil}>{contatoAtivo.tipoPerfil || 'Usuário'}</Text>
          </View>
        </View>

        {loadingMensagens ? (
          <ActivityIndicator size="large" color="#614de6" style={styles.loader} />
        ) : (
          <FlatList
            data={mensagens}
            keyExtractor={(item, idx) => String(item.id || item.Id || idx)}
            contentContainerStyle={styles.mensagensLista}
            renderItem={({ item }) => {
              const remetenteId = item.remetenteId ?? item.RemetenteId;
              const conteudoMsg = item.conteudo ?? item.Conteudo ?? '';
              const minha =
                userId !== null &&
                userId !== undefined &&
                String(remetenteId) === String(userId);
              return (
                <View
                  style={[
                    styles.bolha,
                    minha ? styles.bolhaMinha : styles.bolhaOutra,
                  ]}
                >
                  <TextoLibras style={styles.bolhaTexto}>{conteudoMsg}</TextoLibras>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Nenhuma mensagem ainda. Inicie a conversa!
              </Text>
            }
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.inputMsg}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#a8a8b3"
            value={novoTexto}
            onChangeText={setNovoTexto}
            onSubmitEditing={enviarMensagem}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={styles.btnEnviar}
            onPress={enviarMensagem}
            disabled={enviando}
          >
            <Text style={styles.btnEnviarText}>{enviando ? '...' : 'Enviar'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <TextoLibras style={styles.screenTitle}>Mensagens Diretas</TextoLibras>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar Dev, Recrutador ou Admin..."
        placeholderTextColor="#a8a8b3"
        value={busca}
        onChangeText={setBusca}
      />

      {loadingContatos ? (
        <ActivityIndicator size="large" color="#614de6" style={styles.loader} />
      ) : (
        <FlatList
          data={contatosFiltrados}
          keyExtractor={(item) => String(item.id ?? item.Id ?? item.usuarioId ?? item.UsuarioId)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const idItem = item.id ?? item.Id ?? item.usuarioId ?? item.UsuarioId;
            const nomeItem = item.nome ?? item.Nome ?? 'Usuário';
            const perfilItem = item.tipoPerfil ?? item.TipoPerfil ?? '';
            const conversaRecente = conversas.find(
              (c) => String(c.usuarioId ?? c.UsuarioId ?? c.id ?? c.Id) === String(idItem)
            );
            const ultimaMsg = conversaRecente?.ultimaMensagem ?? conversaRecente?.UltimaMensagem;

            return (
              <TouchableOpacity
                style={styles.contatoCard}
                onPress={() => abrirConversa({ id: idItem, nome: nomeItem, tipoPerfil: perfilItem })}
              >
                <View style={styles.contatoTop}>
                  <Text style={styles.contatoNome}>{nomeItem}</Text>
                  <Text style={styles.contatoPerfil}>{perfilItem}</Text>
                </View>
                {!!ultimaMsg && (
                  <Text style={styles.contatoPreview} numberOfLines={1}>
                    {ultimaMsg}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum contato disponível.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', padding: 16 },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: '#e1e1e6', marginBottom: 12 },
  searchInput: {
    backgroundColor: '#202024',
    color: '#e1e1e6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#323238',
    marginBottom: 14,
  },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 100 },
  contatoCard: {
    backgroundColor: '#1c1c1f',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#323238',
  },
  contatoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contatoNome: { color: '#e1e1e6', fontSize: 15, fontWeight: 'bold' },
  contatoPerfil: { color: '#614de6', fontSize: 12, fontWeight: 'bold' },
  contatoPreview: { color: '#a8a8b3', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#a8a8b3', textAlign: 'center', marginTop: 32 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#323238',
    marginBottom: 10,
  },
  btnVoltar: {
    backgroundColor: '#202024',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#323238',
  },
  btnVoltarText: { color: '#e1e1e6', fontWeight: 'bold', fontSize: 12 },
  chatHeaderInfo: { flex: 1 },
  chatNome: { color: '#e1e1e6', fontSize: 16, fontWeight: 'bold' },
  chatPerfil: { color: '#614de6', fontSize: 12, fontWeight: '600' },
  mensagensLista: { paddingBottom: 16, gap: 8 },
  bolha: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  bolhaMinha: { alignSelf: 'flex-end', backgroundColor: '#614de6' },
  bolhaOutra: {
    alignSelf: 'flex-start',
    backgroundColor: '#1c1c1f',
    borderWidth: 1,
    borderColor: '#323238',
  },
  bolhaTexto: { color: '#FFF', fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 80,
    borderTopWidth: 1,
    borderTopColor: '#323238',
  },
  inputMsg: {
    flex: 1,
    backgroundColor: '#202024',
    color: '#e1e1e6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#323238',
  },
  btnEnviar: {
    backgroundColor: '#614de6',
    borderRadius: 20,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  btnEnviarText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});