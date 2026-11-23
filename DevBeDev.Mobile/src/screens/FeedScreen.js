import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import ProjectCard from '../components/ProjectCard';
import api, { removeToken } from '../services/api';

export default function FeedScreen({ onLogout, userRole, userId, onVerPerfilDev }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');

  const carregarFeed = async (termoBusca = '') => {
    try {
      const endpoint = termoBusca.trim()
        ? `/projetos/feed?busca=${encodeURIComponent(termoBusca.trim())}`
        : '/projetos/feed';

      const response = await api.get(endpoint);
      setProjetos(response.data.projetos || []);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o feed de projetos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarFeed();
  }, []);

  const handleLogoPress = () => {
    setBusca('');
    setLoading(true);
    carregarFeed('');
  };

  const handleBuscar = () => {
    setLoading(true);
    carregarFeed(busca);
  };

  const handleLogout = async () => {
    await removeToken();
    onLogout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.8}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../imagemlogo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar projetos, techs ou devs..."
          placeholderTextColor="#a8a8b3"
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={handleBuscar}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleBuscar}>
          <Text style={styles.searchButtonText}>Pesquisar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#614de6" style={styles.loader} />
      ) : (
        <FlatList
          data={projetos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProjectCard
              projeto={item}
              userRole={userRole}
              userId={userId}
              onRefresh={() => carregarFeed(busca)}
              onAutorPress={onVerPerfilDev}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                carregarFeed(busca);
              }}
              tintColor="#614de6"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum projeto encontrado.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214' },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#323238',
    backgroundColor: '#1c1c1f',
  },
  logoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoImage: {
    height: 42,
    width: 160,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#202024',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#323238',
  },
  logoutText: {
    color: '#f75a68',
    fontWeight: 'bold',
    fontSize: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 18,
    backgroundColor: '#18181b',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#323238',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#202024',
    color: '#e1e1e6',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#323238',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#614de6',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    elevation: 4,
  },
  searchButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { padding: 18, paddingBottom: 110 },
  emptyText: {
    color: '#a8a8b3',
    textAlign: 'center',
    marginTop: 44,
    fontSize: 16,
  },
});