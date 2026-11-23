import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import api, { getToken, setToken, removeToken } from './src/services/api';
import { VLibrasProvider } from './src/context/VLibrasContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import FeedScreen from './src/screens/FeedScreen';
import PublishProjectScreen from './src/screens/PublishProjectScreen';
import MyProjectsScreen from './src/screens/MyProjectsScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import UpgradeScreen from './src/screens/UpgradeScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RecruiterFavoritesScreen from './src/screens/RecruiterFavoritesScreen';
import DevProfileScreen from './src/screens/DevProfileScreen';

const CLAIM_ROLE_URI =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const CLAIM_NAMEID_URI =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;

    if (typeof atob === 'function') {
      const binary = atob(padded);
      const jsonStr = decodeURIComponent(
        binary
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      return JSON.parse(jsonStr);
    }

    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let i = 0; i < padded.length; ) {
      const enc1 = chars.indexOf(padded.charAt(i++));
      const enc2 = chars.indexOf(padded.charAt(i++));
      const enc3 = chars.indexOf(padded.charAt(i++));
      const enc4 = chars.indexOf(padded.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr1);
      if (enc3 !== 64) output += String.fromCharCode(chr2);
      if (enc4 !== 64) output += String.fromCharCode(chr3);
    }
    return JSON.parse(output);
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'
  const [userRole, setUserRole] = useState('Espectador');
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [tabHistory, setTabHistory] = useState(['feed']);
  const [selectedDevId, setSelectedDevId] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const navegarParaAba = useCallback((novaAba) => {
    setSelectedDevId(null);
    setActiveTab((abaAtual) => {
      if (abaAtual !== novaAba) {
        setTabHistory((prev) => [...prev, novaAba]);
      }
      return novaAba;
    });
  }, []);

  const sincronizarSessao = async () => {
    setCheckingAuth(true);
    try {
      const token = await getToken();
      if (!token) {
        setIsAuthenticated(false);
        setUserRole('Espectador');
        setUserId(null);
        setTabHistory(['feed']);
        return;
      }

      const payload = decodeJwtPayload(token);
      if (payload) {
        const roleRaw = payload[CLAIM_ROLE_URI] ?? payload.role ?? 'Espectador';
        const role = Array.isArray(roleRaw) ? roleRaw[0] : roleRaw;
        const idRaw = payload[CLAIM_NAMEID_URI] ?? payload.nameid ?? null;
        setUserRole(role || 'Espectador');
        setUserId(idRaw ? parseInt(idRaw, 10) : null);
      }

      setIsAuthenticated(true);
      setActiveTab('feed');
      setTabHistory(['feed']);
      setSelectedDevId(null);

      try {
        const res = await api.get('/usuarios/me');
        const novoToken = res.data?.novoToken || res.data?.NovoToken;
        if (novoToken) {
          await setToken(novoToken);
        }
        if (res.data?.tipoPerfil) {
          setUserRole(res.data.tipoPerfil);
        }
        if (res.data?.id) {
          setUserId(res.data.id);
        }
      } catch {
        // Mantém dados do token local se offline
      }
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    sincronizarSessao();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (checkingAuth) {
        return true;
      }

      if (!isAuthenticated) {
        if (authScreen === 'register') {
          setAuthScreen('login');
          return true;
        }
        return false;
      }

      if (selectedDevId !== null) {
        setSelectedDevId(null);
        return true;
      }

      if (tabHistory.length > 1) {
        const novoHistorico = tabHistory.slice(0, -1);
        const abaAnterior = novoHistorico[novoHistorico.length - 1] || 'feed';
        setTabHistory(novoHistorico);
        setActiveTab(abaAnterior);
        return true;
      }

      if (activeTab !== 'feed') {
        setActiveTab('feed');
        setTabHistory(['feed']);
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => subscription.remove();
  }, [checkingAuth, isAuthenticated, authScreen, selectedDevId, tabHistory, activeTab]);

  const handleLogout = async () => {
    await removeToken();
    setIsAuthenticated(false);
    setUserRole('Espectador');
    setUserId(null);
    setSelectedDevId(null);
    setActiveTab('feed');
    setTabHistory(['feed']);
    setAuthScreen('login');
  };

  const abrirPerfilDev = (devId) => {
    if (!devId) return;
    setSelectedDevId(devId);
  };

  const podeVerMensagens =
    userRole === 'Dev' ||
    userRole === 'Recrutador' ||
    userRole === 'Administrador';

  if (checkingAuth) {
    return (
      <SafeAreaProvider>
        <VLibrasProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor="#121214"
          />
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.splashContainer}>
              <ActivityIndicator size="large" color="#614de6" />
            </View>
          </SafeAreaView>
        </VLibrasProvider>
      </SafeAreaProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <VLibrasProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor="#121214"
          />
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            {authScreen === 'register' ? (
              <RegisterScreen
                onRegisterSuccess={sincronizarSessao}
                onNavigateLogin={() => setAuthScreen('login')}
              />
            ) : (
              <LoginScreen
                onLoginSuccess={sincronizarSessao}
                onNavigateRegister={() => setAuthScreen('register')}
              />
            )}
          </SafeAreaView>
        </VLibrasProvider>
      </SafeAreaProvider>
    );
  }

  const renderConteudoPrincipal = () => {
    if (selectedDevId !== null) {
      return (
        <DevProfileScreen
          devId={selectedDevId}
          onVoltar={() => setSelectedDevId(null)}
        />
      );
    }

    switch (activeTab) {
      case 'feed':
        return (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
      case 'publish':
        return userRole === 'Dev' ? (
          <PublishProjectScreen
            onProjectPublished={() => navegarParaAba('myProjects')}
          />
        ) : (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
      case 'myProjects':
        return userRole === 'Dev' ? (
          <MyProjectsScreen />
        ) : (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
      case 'favorites':
        return userRole === 'Recrutador' ? (
          <RecruiterFavoritesScreen onVerPerfilDev={abrirPerfilDev} />
        ) : (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
      case 'messages':
        return podeVerMensagens ? (
          <MessagesScreen userId={userId} />
        ) : (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
      case 'upgrade':
        return userRole === 'Espectador' ? (
          <UpgradeScreen onUpgradeRequested={sincronizarSessao} />
        ) : (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
      case 'admin':
        return userRole === 'Administrador' ? (
          <AdminScreen />
        ) : (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
      case 'profile':
        return <ProfileScreen />;
      default:
        return (
          <FeedScreen
            onLogout={handleLogout}
            userRole={userRole}
            userId={userId}
            onVerPerfilDev={abrirPerfilDev}
          />
        );
    }
  };

  const tabs = [
    { key: 'feed', label: 'Feed', visible: true },
    { key: 'publish', label: 'Publicar', visible: userRole === 'Dev' },
    { key: 'myProjects', label: 'Projetos', visible: userRole === 'Dev' },
    {
      key: 'favorites',
      label: 'Favoritos',
      visible: userRole === 'Recrutador',
    },
    { key: 'messages', label: 'Mensagens', visible: podeVerMensagens },
    { key: 'upgrade', label: 'Upgrade', visible: userRole === 'Espectador' },
    { key: 'admin', label: 'Admin', visible: userRole === 'Administrador' },
    { key: 'profile', label: 'Perfil', visible: true },
  ].filter((t) => t.visible);

  return (
    <SafeAreaProvider>
      <VLibrasProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#1c1c1f"
        />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.contentArea}>{renderConteudoPrincipal()}</View>

          <View style={styles.navbarBottom}>
            {tabs.map((tab, index) => {
              const ativo = activeTab === tab.key && selectedDevId === null;
              const isLast = index === tabs.length - 1;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  style={[
                    styles.navItem,
                    !isLast && styles.navItemDivider,
                    ativo && styles.navItemActive,
                  ]}
                  onPress={() => navegarParaAba(tab.key)}
                >
                  <Text
                    style={[styles.navText, ativo && styles.navTextActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </VLibrasProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121214',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#121214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentArea: {
    flex: 1,
  },
  navbarBottom: {
    flexDirection: 'row',
    width: '100%',
    height: 68,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#323238',
  },
  navItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#18181b',
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  navItemDivider: {
    borderRightWidth: 1,
    borderRightColor: '#2c2c32',
  },
  navItemActive: {
    backgroundColor: '#252336',
    borderTopWidth: 3,
    borderTopColor: '#614de6',
  },
  navText: {
    color: '#a8a8b3',
    fontSize: 13.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  navTextActive: {
    color: '#FFFFFF',
  },
});