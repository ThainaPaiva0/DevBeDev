import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import api, { API_HOST } from '../services/api';

const resolverUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const limpa = url.trim();
  if (!limpa) return null;
  if (/^https?:\/\//i.test(limpa)) return limpa;
  const caminhoLimpo = limpa.startsWith('/') ? limpa : `/${limpa}`;
  return `${API_HOST}${caminhoLimpo}`;
};

const abrirLink = (url) => {
  if (!/^https?:\/\//i.test((url || '').trim())) {
    Alert.alert('Aviso', 'Link inválido.');
    return;
  }
  Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link.'));
};

export default function DevProfileScreen({ devId, onVoltar }) {
  const [dev, setDev] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarPerfilPublico = async () => {
      try {
        const response = await api.get(`/usuarios/${devId}/perfil-publico`);
        setDev(response.data);
      } catch (error) {
        Alert.alert('Erro', error.message || 'Não foi possível carregar o perfil do desenvolvedor.');
      } finally {
        setLoading(false);
      }
    };

    carregarPerfilPublico();
  }, [devId]);

  const botaoVoltar = (
    <TouchableOpacity style={styles.btnVoltar} onPress={onVoltar}>
      <Text style={styles.btnVoltarText}>← Voltar</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#614de6" />
      </View>
    );
  }

  if (!dev) {
    return (
      <View style={styles.container}>
        {botaoVoltar}
        <Text style={styles.emptyText}>Perfil não encontrado.</Text>
      </View>
    );
  }

  const fotoResolvida = resolverUrl(dev.fotoPerfilUrl);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {botaoVoltar}

      <View style={styles.cabecalho}>
        {fotoResolvida ? (
          <Image source={{ uri: fotoResolvida }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPadrao]}>
            <Text style={styles.avatarInicial}>{(dev.nome || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.nome}>{dev.nome}</Text>
        <Text style={styles.tipo}>{dev.tipoPerfil}</Text>
        <Text style={styles.bio}>
          {dev.bio && dev.bio.trim() !== '' ? dev.bio : 'Este desenvolvedor ainda não escreveu uma bio.'}
        </Text>
        {!!dev.linkGitHub && (
          <TouchableOpacity onPress={() => abrirLink(dev.linkGitHub)}>
            <Text style={styles.link}>{dev.linkGitHub}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitulo}>Projetos publicados</Text>

      {(!dev.projetos || dev.projetos.length === 0) ? (
        <Text style={styles.emptyText}>Nenhum projeto aprovado publicado.</Text>
      ) : (
        dev.projetos.map((p) => (
          <View key={p.id} style={styles.cardProjeto}>
            <Text style={styles.projetoTitulo}>{p.titulo}</Text>
            <Text style={styles.projetoDescricao}>{p.descricao}</Text>

            {!!p.fotoUrl && (
              <Image source={{ uri: resolverUrl(p.fotoUrl) }} style={styles.media} resizeMode="cover" />
            )}

            {p.tecnologias && p.tecnologias.length > 0 && (
              <View style={styles.techContainer}>
                {p.tecnologias.map((tec, idx) => (
                  <View key={idx} style={styles.techBadge}>
                    <Text style={styles.techText}>{tec}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.projetoRodape}>
              <Text style={styles.votos}>▲ {p.totalVotos}</Text>
              {!!p.linkRepositorio && (
                <TouchableOpacity onPress={() => abrirLink(p.linkRepositorio)}>
                  <Text style={styles.link}>Ver Repositório</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, backgroundColor: '#121214', justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, backgroundColor: '#121214', flexGrow: 1 },
  btnVoltar: { alignSelf: 'flex-start', backgroundColor: '#202024', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#323238', marginBottom: 16 },
  btnVoltarText: { color: '#e1e1e6', fontWeight: 'bold', fontSize: 13 },
  cabecalho: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#614de6', backgroundColor: '#202024' },
  avatarPadrao: { justifyContent: 'center', alignItems: 'center' },
  avatarInicial: { color: '#a8a8b3', fontSize: 40, fontWeight: 'bold' },
  nome: { color: '#e1e1e6', fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  tipo: { color: '#614de6', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  bio: { color: '#a8a8b3', fontSize: 14, textAlign: 'center', marginTop: 10 },
  link: { color: '#614de6', fontSize: 13, marginTop: 8, textDecorationLine: 'underline' },
  subtitulo: { color: '#e1e1e6', fontSize: 16, fontWeight: 'bold', marginBottom: 12, borderTopWidth: 1, borderTopColor: '#323238', paddingTop: 16 },
  emptyText: { color: '#a8a8b3', textAlign: 'center', marginTop: 20 },
  cardProjeto: { backgroundColor: '#1c1c1f', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  projetoTitulo: { color: '#614de6', fontSize: 16, fontWeight: 'bold' },
  projetoDescricao: { color: '#DDD', fontSize: 14, marginTop: 6 },
  media: { width: '100%', height: 180, borderRadius: 15, marginTop: 12, backgroundColor: '#000' },
  techContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  techBadge: { backgroundColor: '#252528', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#614de6' },
  techText: { fontSize: 10, color: '#614de6', fontWeight: 'bold' },
  projetoRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  votos: { color: '#e1e1e6', fontWeight: 'bold' }
});