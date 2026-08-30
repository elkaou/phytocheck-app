import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { ScreenContainer } from "@/components/screen-container";
import {
  isValidLegalDocumentHtml,
  type LegalDocumentConfig,
} from "@/lib/legal-documents";

type DocumentSource = "loading" | "online" | "cache" | "offline";

type LegalDocumentScreenProps = {
  document: LegalDocumentConfig;
  children: ReactNode;
};

/**
 * Affiche la version publiée des documents légaux, conserve le dernier document
 * consulté localement et bascule vers le contenu embarqué lorsqu'aucune version
 * distante n'a encore pu être téléchargée.
 */
export function LegalDocumentScreen({ document, children }: LegalDocumentScreenProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [source, setSource] = useState<DocumentSource>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDocument = useCallback(async () => {
    setIsRefreshing(true);
    setSource("loading");

    try {
      const separator = document.url.includes("?") ? "&" : "?";
      const response = await fetch(`${document.url}${separator}v=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const remoteHtml = await response.text();

      if (!response.ok || !isValidLegalDocumentHtml(remoteHtml)) {
        throw new Error("Document légal distant indisponible ou invalide.");
      }

      await AsyncStorage.setItem(document.cacheKey, remoteHtml);
      setHtml(remoteHtml);
      setSource("online");
    } catch {
      const cachedHtml = await AsyncStorage.getItem(document.cacheKey);
      if (isValidLegalDocumentHtml(cachedHtml)) {
        setHtml(cachedHtml);
        setSource("cache");
      } else {
        setHtml(null);
        setSource("offline");
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [document.cacheKey, document.url]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  const statusLabel =
    source === "online"
      ? "Version officielle actualisée"
      : source === "cache"
        ? "Dernière version consultée — hors ligne"
        : source === "offline"
          ? "Version intégrée à l’application — hors ligne"
          : "Recherche de la version officielle…";

  const showWebView = Platform.OS !== "web" && isValidLegalDocumentHtml(html);

  return (
    <ScreenContainer containerClassName="bg-primary">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{document.title}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusBar}>
          <View style={styles.statusTextContainer}>
            {source === "loading" || isRefreshing ? <ActivityIndicator color="#0A7EA5" size="small" /> : null}
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualiser le document légal"
            hitSlop={10}
            onPress={() => void loadDocument()}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </Pressable>
        </View>

        {showWebView ? (
          <WebView
            source={{ html: html!, baseUrl: document.url }}
            originWhitelist={["*"]}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures
            onError={() => {
              setHtml(null);
              setSource("offline");
            }}
            style={styles.webView}
          />
        ) : (
          <View style={styles.fallbackContent}>{children}</View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Text style={styles.closeButtonText}>Fermer</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0A7EA5",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  statusBar: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    backgroundColor: "#E6F4F8",
    borderBottomWidth: 1,
    borderBottomColor: "#C7E6EF",
  },
  statusTextContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    flex: 1,
    color: "#275463",
    fontSize: 12,
    lineHeight: 16,
  },
  refreshButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  refreshButtonText: {
    color: "#0A7EA5",
    fontSize: 13,
    fontWeight: "700",
  },
  webView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  fallbackContent: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F5F5F5",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  closeButton: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#0A7EA5",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
