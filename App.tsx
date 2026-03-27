import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {fetchClashConfigText, parseClashProxies} from './src/clash';
import {runLimitedTcpPings} from './src/tcpPing';
import type {ClashProxy, TcpPingResult} from './src/types';

const DEFAULT_URL = 'https://example.com/clash.yaml';
const DEFAULT_PING_TIMEOUT_MS = 8000;
const DEFAULT_PING_CONCURRENCY = 2;

function App(): React.JSX.Element {
  const [configUrl, setConfigUrl] = useState(DEFAULT_URL);
  const [rawConfig, setRawConfig] = useState('');
  const [proxies, setProxies] = useState<ClashProxy[]>([]);
  const [results, setResults] = useState<TcpPingResult[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [testing, setTesting] = useState(false);

  const summary = useMemo(() => {
    const successCount = results.filter(item => item.success).length;
    return `${proxies.length} proxies | ${successCount} reachable`;
  }, [proxies.length, results]);

  const loadConfig = async () => {
    if (!configUrl.trim()) {
      Alert.alert('Please enter a subscription URL');
      return;
    }

    setLoadingConfig(true);
    setResults([]);

    try {
      const text = await fetchClashConfigText(configUrl.trim());
      const parsedProxies = parseClashProxies(text);

      setRawConfig(text);
      setProxies(parsedProxies);

      if (parsedProxies.length === 0) {
        Alert.alert('No proxies found', 'Make sure the YAML contains a proxies field.');
      }
    } catch (error) {
      Alert.alert('Load failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingConfig(false);
    }
  };

  const startTcpPing = async () => {
    if (proxies.length === 0) {
      Alert.alert('Load a Clash config first');
      return;
    }

    setTesting(true);
    setResults([]);

    try {
      const pingResults = await runLimitedTcpPings(
        proxies,
        DEFAULT_PING_CONCURRENCY,
        DEFAULT_PING_TIMEOUT_MS,
      );
      setResults(pingResults);
    } catch (error) {
      Alert.alert('TCP test failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Clash TCP Ping</Text>
        <Text style={styles.subtitle}>
          Download a Clash config and test TCP connect latency for each proxy.
        </Text>

        <TextInput
          style={styles.input}
          value={configUrl}
          onChangeText={setConfigUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter Clash subscription YAML URL"
          placeholderTextColor="#7f8c9f"
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, loadingConfig && styles.buttonDisabled]}
            disabled={loadingConfig}
            onPress={loadConfig}>
            <Text style={styles.buttonText}>{loadingConfig ? 'Loading...' : 'Fetch Config'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, testing && styles.buttonDisabled]}
            disabled={testing}
            onPress={startTcpPing}>
            <Text style={styles.buttonText}>{testing ? 'Testing...' : 'Start TCP Ping'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryText}>{summary}</Text>
          <Text style={styles.summaryHint}>
            This measures TCP connect latency, not ICMP ping. Mobile defaults use {DEFAULT_PING_CONCURRENCY}
            parallel probes, {DEFAULT_PING_TIMEOUT_MS}ms timeout, and one retry for timeouts.
          </Text>
        </View>

        {loadingConfig || testing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6ae3ff" />
          </View>
        ) : null}

        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No results yet</Text>
              <Text style={styles.emptyText}>
                Fetch the config first, then start the TCP test. Parsed config size: {rawConfig.length}{' '}
                chars.
              </Text>
            </View>
          }
          renderItem={({item}) => (
            <View style={styles.resultCard}>
              <View style={styles.resultHead}>
                <Text style={styles.resultName}>{item.name}</Text>
                <View
                  style={[
                    styles.badge,
                    item.success ? styles.badgeSuccess : styles.badgeFail,
                  ]}>
                  <Text style={styles.badgeText}>{item.success ? 'SUCCESS' : 'FAIL'}</Text>
                </View>
              </View>
              <Text style={styles.resultMeta}>
                {item.server}:{item.port} {item.type ? `| ${item.type}` : ''}
              </Text>
              <Text style={styles.resultLatency}>
                {item.success
                  ? `${item.latencyMs} ms${item.attempts && item.attempts > 1 ? ` (${item.attempts} tries)` : ''}`
                  : item.error ?? 'Connection failed'}
              </Text>
              {item.remoteFamily ? (
                <Text style={styles.resultMeta}>family: {item.remoteFamily}</Text>
              ) : null}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    backgroundColor: '#08111f',
  },
  title: {
    color: '#f4f7fb',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9db0c7',
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#23344b',
    backgroundColor: '#0d1728',
    color: '#f4f7fb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#1b6ef3',
    alignItems: 'center',
  },
  buttonSecondary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#0f8f6b',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  summaryCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#0d1728',
    borderWidth: 1,
    borderColor: '#23344b',
  },
  summaryTitle: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryText: {
    color: '#6ae3ff',
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  summaryHint: {
    color: '#91a4bb',
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  loadingWrap: {
    paddingVertical: 18,
  },
  listContent: {
    paddingVertical: 16,
    gap: 12,
  },
  emptyCard: {
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#0d1728',
    borderWidth: 1,
    borderColor: '#23344b',
  },
  emptyTitle: {
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: '#97a7bb',
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#0d1728',
    borderWidth: 1,
    borderColor: '#23344b',
  },
  resultHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  resultName: {
    flex: 1,
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeSuccess: {
    backgroundColor: '#153b32',
  },
  badgeFail: {
    backgroundColor: '#44202a',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  resultMeta: {
    color: '#8ea0b6',
    marginTop: 10,
    fontSize: 13,
  },
  resultLatency: {
    color: '#6ae3ff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;
