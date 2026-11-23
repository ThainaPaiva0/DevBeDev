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
  Linking,
} from 'react-native';
import api from '../services/api';
import { TextoLibras } from '../context/VLibrasContext';

export default function MyProjectsScreen() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarMeusProjetos = async () => {
    try {
      const response = await api.get('/projetos/meus-projetos');
      const lista = Array.isArray(response.data)
        ? response.data
        : response.data?.projetos || [];
      setProjetos(lista);
    } catch (error) {
      Alert.alert(
        'Erro',
        error.message || 'Não foi possível carregar os seus projetos.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarMeusProjetos();
  }, []);

  const resolverStatus = (projeto) => {
    const recusado =
      !!projeto.recusadoPeloAdmin ||
      String(projeto.status || '').toLowerCase() === 'recusado';
    const aprovado =
      !recusado &&
      (!!projeto.aprovadoPeloAdmin ||
        String(projeto.status || '').toLowerCase() === 'aprovado');

    if (recusado) {
      return {
        label: 'Recusado',
        badgeStyle: styles.badgeRecusado,
        textStyle: styles.textRecusado,
        isRecusado: true,
      };
    }

    if (aprovado) {
      return {
        label: 'Aprovado',
        badgeStyle: styles.badgeAprovado,
        textStyle: styles.textAprovado,
        isRecusado: false,
      };
    }

    return {
      label: 'Pendente',
      badgeStyle: styles.badgePendente,
      textStyle: styles.textPendente,
      isRecusado: false,
    };
  };

  const handleExcluir = (projeto) => {
    Alert.alert(
      'Excluir Projeto',
      `Deseja excluir "${projeto.titulo}" permanentemente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/projetos/${projeto.id}`);
              setProjetos((prev) => prev.filter((item) => item.id !== projeto.id));
            } catch (error) {
              Alert.alert('Erro', error.message || 'Falha ao excluir o projeto.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const statusInfo = resolverStatus(item);
    const votos = item.totalVotos ?? item.totalUpvotes ?? 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TextoLibras style={styles.titulo}>{item.titulo}</TextoLibras>
          <View style={[styles.badge, statusInfo.badgeStyle]}>
            <Text style={[styles.badgeText, statusInfo.textStyle]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <TextoLibras style={styles.descricao}>{item.descricao}</TextoLibras>

        {statusInfo.isRecusado && !!item.motivoRecusa && (
          <View style={styles.motivoBox}>
            <Text style={styles.motivoTitulo}>Motivo da recusa:</Text>
            <TextoLibras style={styles.motivoTexto}>{item.motivoRecusa}</TextoLibras>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.votos}>{`▲ ${votos} votos`}</Text>

          <View style={styles.actionsRight}>
            {!!item.linkRepositorio && (
              <TouchableOpacity
                style={styles.btnRepo}
                onPress={() =>
                  Linking.openURL(item.linkRepositorio).catch(() =>
                    Alert.alert('Erro', 'Link inválido.')
                  )
                }
              >
                <Text style={styles.btnRepoText}>🔗 Repo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.btnDelete}
              onPress={() => handleExcluir(item)}
            >
              <Text style={styles.btnDeleteText}>🗑 Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextoLibras style={styles.screenTitle}>Meus Projetos</TextoLibras>

      {loading ? (
        <ActivityIndicator size="large" color="#614de6" style={styles.loader} />
      ) : (
        <FlatList
          data={projetos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                carregarMeusProjetos();
              }}
              tintColor="#614de6"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Você ainda não enviou nenhum projeto.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', padding: 16 },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: '#e1e1e6', marginBottom: 16 },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 100 },
  emptyText: { color: '#a8a8b3', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#1c1c1f',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#323238',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  titulo: { color: '#614de6', fontSize: 17, fontWeight: 'bold', flex: 1 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeAprovado: {
    backgroundColor: 'rgba(46, 204, 113, 0.16)',
    borderColor: 'rgba(46, 204, 113, 0.45)',
  },
  textAprovado: { color: '#55e69a', fontSize: 12, fontWeight: 'bold' },
  badgePendente: {
    backgroundColor: 'rgba(241, 196, 15, 0.16)',
    borderColor: 'rgba(241, 196, 15, 0.45)',
  },
  textPendente: { color: '#f7d154', fontSize: 12, fontWeight: 'bold' },
  badgeRecusado: {
    backgroundColor: 'rgba(247, 90, 104, 0.16)',
    borderColor: 'rgba(247, 90, 104, 0.45)',
  },
  textRecusado: { color: '#f75a68', fontSize: 12, fontWeight: 'bold' },
  descricao: { color: '#e1e1e6', fontSize: 14, marginBottom: 10 },
  motivoBox: {
    backgroundColor: 'rgba(247, 90, 104, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#f75a68',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  motivoTitulo: { color: '#f75a68', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  motivoTexto: { color: '#ffd6db', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#323238',
    paddingTop: 10,
  },
  votos: { color: '#a8a8b3', fontSize: 12, fontWeight: 'bold' },
  actionsRight: { flexDirection: 'row', gap: 8 },
  btnRepo: {
    backgroundColor: '#2a2a30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#614de6',
  },
  btnRepoText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  btnDelete: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  btnDeleteText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});