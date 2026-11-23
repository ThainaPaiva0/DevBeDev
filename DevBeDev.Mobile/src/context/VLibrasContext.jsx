import React, { createContext, useState, useContext, useRef } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { API_HOST } from '../services/api';

const VLibrasContext = createContext();

export const useVLibras = () => useContext(VLibrasContext);

export function TextoLibras({ children, style, ...props }) {
  const { ativo, traduzir } = useVLibras();

  const extrairTexto = (no) => {
    if (typeof no === 'string' || typeof no === 'number') return String(no);
    if (Array.isArray(no)) return no.map(extrairTexto).join(' ');
    return '';
  };

  if (!ativo) {
    return (
      <Text style={style} {...props}>
        {children}
      </Text>
    );
  }

  return (
    <Text
      style={[style, styles.textoDestacado]}
      onPress={() => traduzir(extrairTexto(children))}
      {...props}
    >
      {children}
    </Text>
  );
}

export function VLibrasProvider({ children }) {
  const [ativo, setAtivo] = useState(false);
  const [textoManual, setTextoManual] = useState('');
  const webviewRef = useRef(null);

  const traduzir = (texto) => {
    if (!ativo || !texto) return;
    const textoLimpo = String(texto).trim();
    if (!textoLimpo) return;

    if (webviewRef.current) {
      const script = `
        (function() {
          const el = document.getElementById('texto-alvo');
          if (el) {
            el.innerText = ${JSON.stringify(textoLimpo)};
            el.click();
          }
        })();
        true;
      `;
      webviewRef.current.injectJavaScript(script);
    }
  };

  return (
    <VLibrasContext.Provider value={{ ativo, setAtivo, traduzir }}>
      <View style={styles.root}>
        {children}

        <View style={styles.overlayContainer} pointerEvents="box-none">
          {ativo && (
            <View style={styles.janelaAvatar}>
              <View style={styles.janelaHeader}>
                <Text style={styles.janelaTitulo}>Intérprete VLibras</Text>
                <TouchableOpacity onPress={() => setAtivo(false)}>
                  <Text style={styles.btnFechar}>✕</Text>
                </TouchableOpacity>
              </View>

              <WebView
                ref={webviewRef}
                source={{ uri: `${API_HOST}/vlibras.html` }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mixedContentMode="always"
                androidLayerType="hardware"
              />

              <View style={styles.barraInput}>
                <TextInput
                  style={styles.inputRapido}
                  placeholder="Digitar texto..."
                  placeholderTextColor="#888"
                  value={textoManual}
                  onChangeText={setTextoManual}
                />
                <TouchableOpacity
                  style={styles.btnTraduzirManual}
                  onPress={() => {
                    traduzir(textoManual);
                    setTextoManual('');
                  }}
                >
                  <Text style={styles.btnTraduzirTexto}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.botaoFlutuante, ativo && styles.botaoFlutuanteAtivo]}
            onPress={() => setAtivo(!ativo)}
            activeOpacity={0.8}
          >
            <Text style={styles.iconeTexto}>🤟</Text>
          </TouchableOpacity>
        </View>
      </View>
    </VLibrasContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  textoDestacado: {
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    borderStyle: 'dashed',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 75,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 16,
    zIndex: 999,
  },
  janelaAvatar: {
    width: 260,
    height: 350,
    backgroundColor: '#1c1c1f',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#614de6',
    marginBottom: 12,
    elevation: 10,
  },
  janelaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#614de6',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  janelaTitulo: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  btnFechar: { color: '#FFF', fontWeight: 'bold', fontSize: 14, paddingHorizontal: 4 },
  webview: { flex: 1, backgroundColor: '#1c1c1f' },
  barraInput: { flexDirection: 'row', backgroundColor: '#252529', padding: 4 },
  inputRapido: { flex: 1, color: '#FFF', fontSize: 11, paddingHorizontal: 8, height: 32 },
  btnTraduzirManual: { backgroundColor: '#614de6', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  btnTraduzirTexto: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  botaoFlutuante: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  botaoFlutuanteAtivo: { backgroundColor: '#614de6', borderWidth: 2, borderColor: '#FFF' },
  iconeTexto: { fontSize: 24 },
});