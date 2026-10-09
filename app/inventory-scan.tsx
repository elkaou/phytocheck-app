import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { QuantityModal } from "@/components/quantity-modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/data-context";
import {
  resolveInventoryDetections,
  ResolvedInventoryDetection,
} from "@/lib/inventory-stock-resolution";
import { trpc } from "@/lib/trpc";

export default function InventoryScanScreen() {
  const router = useRouter();
  const { performSearch, addProductToStock } = useApp();
  const {
    products,
    riskPhrases,
    emergencyAuthorizations,
  } = useData();
  const [permission, requestPermission] = useCameraPermissions();
  const analyzeMutation = trpc.analyzeInventoryPhoto.useMutation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Préparation de la photo...");
  const [detections, setDetections] = useState<ResolvedInventoryDetection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<ResolvedInventoryDetection | null>(null);
  const [addedContainers, setAddedContainers] = useState<number[]>([]);

  const resolvedCount = useMemo(
    () => detections.filter((detection) => detection.product).length,
    [detections],
  );

  const processImage = useCallback(
    async (uri: string) => {
      const canDo = await performSearch();
      if (!canDo) {
        Alert.alert(
          "Limite atteinte",
          "Cette analyse compte comme une recherche. Passez à Premium pour des recherches illimitées.",
          [
            { text: "Annuler" },
            { text: "Voir Premium", onPress: () => router.replace("/premium" as never) },
          ],
        );
        return;
      }

      setIsProcessing(true);
      setStatusText("Optimisation de la photo du local...");
      try {
        // Une définition supérieure au scan d'une étiquette seule permet de lire
        // plusieurs bidons, tout en limitant la taille transférée au serveur.
        const compressed = await manipulateAsync(
          uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.75, format: SaveFormat.JPEG },
        );
        const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setStatusText("Identification des bidons visibles...");
        const result = await analyzeMutation.mutateAsync({
          imageUrl: `data:image/jpeg;base64,${base64}`,
        });

        if (!result.success || result.data.containers.length === 0) {
          Alert.alert(
            "Aucun bidon identifié",
            "Aucun nom commercial ou numéro AMM suffisamment lisible n’a été trouvé. Rapprochez-vous des étagères et prenez une photo plus nette.",
          );
          return;
        }

        setStatusText("Rapprochement avec la base réglementaire...");
        const resolved = resolveInventoryDetections(
          result.data.containers,
          products,
          riskPhrases,
          emergencyAuthorizations,
        );
        setDetections(resolved);
        setAddedContainers([]);
      } catch (error: any) {
        const message = String(error?.message || error || "").toLowerCase();
        Alert.alert(
          message.includes("network") || message.includes("fetch")
            ? "Connexion requise"
            : "Erreur d’analyse",
          message.includes("network") || message.includes("fetch")
            ? "L’ajout multiple par photo nécessite une connexion internet. Vérifiez votre réseau puis réessayez."
            : "La photo n’a pas pu être analysée. Réessayez avec une image nette et bien éclairée.",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [analyzeMutation, emergencyAuthorizations, performSearch, products, riskPhrases, router],
  );

  const takePicture = useCallback(async () => {
    if (!permission?.granted) {
      const requested = await requestPermission();
      if (!requested.granted) return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      exif: false,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  }, [permission?.granted, processImage, requestPermission]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      exif: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  }, [processImage]);

  const addSelectedProduct = useCallback(
    async (quantity: number, unit: "L" | "Kg") => {
      if (!selectedDetection?.product) return;

      const result = await addProductToStock(
        selectedDetection.product,
        quantity,
        unit,
        selectedDetection.stockDisplayName,
      );

      if (result === "limit") {
        Alert.alert(
          "Limite de stock atteinte",
          "La version gratuite est limitée à 20 produits en stock. Passez à Premium pour un stock illimité.",
          [
            { text: "Annuler" },
            { text: "Voir Premium", onPress: () => router.push("/premium" as never) },
          ],
        );
        return;
      }
      if (result === "error") {
        Alert.alert("Erreur", "Le produit n’a pas pu être ajouté au stock.");
        return;
      }

      setAddedContainers((current) => [...current, selectedDetection.containerIndex]);
      setSelectedDetection(null);
    },
    [addProductToStock, router, selectedDetection],
  );

  const renderDetection = useCallback(
    ({ item }: { item: ResolvedInventoryDetection }) => {
      const isAdded = addedContainers.includes(item.containerIndex);
      if (!item.product) {
        return (
          <View style={[styles.card, styles.unresolvedCard]}>
            <View style={styles.cardHeading}>
              <IconSymbol name="exclamationmark.triangle.fill" size={22} color="#B45309" />
              <Text style={styles.cardTitle}>Bidon {item.containerIndex} non identifié</Text>
            </View>
            <Text style={styles.unresolvedText}>
              {item.detectedName || item.detectedAmm || "Étiquette insuffisamment lisible"}
            </Text>
            <Text style={styles.cardHint}>
              Aucun produit n’est proposé automatiquement. Prenez une photo plus rapprochée ou utilisez la recherche manuelle.
            </Text>
          </View>
        );
      }

      const displayedName = item.stockDisplayName || item.product.nom;
      return (
        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <IconSymbol name="checkmark.circle.fill" size={22} color="#15803D" />
            <Text style={styles.cardTitle}>Bidon {item.containerIndex}</Text>
          </View>
          <Text style={styles.productName}>{displayedName}</Text>
          <Text style={styles.productMeta}>AMM {item.product.amm}</Text>
          {item.detectedName && item.detectedName !== displayedName ? (
            <Text style={styles.cardHint}>Étiquette lue : {item.detectedName}</Text>
          ) : null}
          <Text style={styles.cardHint}>
            Une seule fiche réglementaire a été retenue automatiquement pour ce bidon.
          </Text>
          <Pressable
            disabled={isAdded}
            onPress={() => setSelectedDetection(item)}
            style={({ pressed }) => [
              styles.addButton,
              isAdded && styles.addButtonDone,
              pressed && !isAdded && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <IconSymbol
              name={isAdded ? "checkmark.circle.fill" : "plus.circle.fill"}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.addButtonText}>{isAdded ? "Ajouté au stock" : "Saisir la quantité"}</Text>
          </Pressable>
        </View>
      );
    },
    [addedContainers],
  );

  const hasResults = detections.length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Ajout multiple</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#0A7EA5" />
            <Text style={styles.processingTitle}>Analyse du local en cours…</Text>
            <Text style={styles.processingText}>{statusText}</Text>
            <Text style={styles.processingHint}>
              L’application identifie au plus un produit par bidon visible.
            </Text>
          </View>
        ) : hasResults ? (
          <FlatList
            data={detections}
            keyExtractor={(item) => String(item.containerIndex)}
            renderItem={renderDetection}
            contentContainerStyle={styles.resultsContent}
            ListHeaderComponent={
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Produits détectés</Text>
                <Text style={styles.resultsSubtitle}>
                  {resolvedCount} fiche{resolvedCount > 1 ? "s" : ""} réglementaire{resolvedCount > 1 ? "s" : ""} retenue{resolvedCount > 1 ? "s" : ""} pour {detections.length} bidon{detections.length > 1 ? "s" : ""}.
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footerAction}>
                <Pressable
                  onPress={() => setDetections([])}
                  style={({ pressed }) => [styles.newPhotoButton, pressed && { opacity: 0.8 }]}
                >
                  <IconSymbol name="camera.fill" size={20} color="#0A7EA5" />
                  <Text style={styles.newPhotoText}>Analyser une autre zone</Text>
                </Pressable>
              </View>
            }
          />
        ) : (
          <View style={styles.emptyContent}>
            <IconSymbol name="camera.fill" size={76} color="#0A7EA5" />
            <Text style={styles.emptyTitle}>Photographiez une zone du local</Text>
            <Text style={styles.emptyText}>
              Cadrez une étagère ou quelques bidons, avec les étiquettes visibles. Chaque bidon lisible sera rapproché d’une seule fiche réglementaire.
            </Text>
            <Pressable
              onPress={takePicture}
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            >
              <IconSymbol name="camera.fill" size={24} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Prendre une photo</Text>
            </Pressable>
            <Pressable
              onPress={pickFromGallery}
              style={({ pressed }) => [styles.galleryButton, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="doc.text.fill" size={22} color="#0A7EA5" />
              <Text style={styles.galleryButtonText}>Choisir depuis la galerie</Text>
            </Pressable>
            <Text style={styles.notice}>
              Vérifiez les produits et saisissez les quantités avant leur ajout au stock. Une photo compte comme une recherche.
            </Text>
          </View>
        )}
      </SafeAreaView>

      <QuantityModal
        visible={Boolean(selectedDetection?.product)}
        productName={selectedDetection?.stockDisplayName || selectedDetection?.product?.nom || ""}
        onCancel={() => setSelectedDetection(null)}
        onConfirm={addSelectedProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A7EA5" },
  safeArea: { flex: 1 },
  headerBar: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  backButton: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 52 },
  emptyContent: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: { color: "#1A1A1A", fontSize: 23, lineHeight: 29, fontWeight: "700", textAlign: "center" },
  emptyText: { color: "#55616A", fontSize: 16, lineHeight: 23, textAlign: "center" },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#0A7EA5",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  galleryButton: { paddingVertical: 10, flexDirection: "row", gap: 8, alignItems: "center" },
  galleryButtonText: { color: "#0A7EA5", fontSize: 15, fontWeight: "600", textDecorationLine: "underline" },
  notice: { color: "#687076", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8 },
  processingContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 14,
  },
  processingTitle: { color: "#1A1A1A", fontSize: 21, fontWeight: "700", textAlign: "center", marginTop: 8 },
  processingText: { color: "#55616A", fontSize: 16, textAlign: "center" },
  processingHint: { color: "#687076", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
  resultsContent: { backgroundColor: "#F5F5F5", padding: 18, gap: 12 },
  resultsHeader: { gap: 6, marginBottom: 2 },
  resultsTitle: { color: "#1A1A1A", fontSize: 23, fontWeight: "700" },
  resultsSubtitle: { color: "#55616A", fontSize: 15, lineHeight: 21 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  unresolvedCard: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { color: "#374151", fontSize: 14, fontWeight: "700" },
  productName: { color: "#1A1A1A", fontSize: 19, fontWeight: "700", marginTop: 2 },
  productMeta: { color: "#0A7EA5", fontSize: 14, fontWeight: "600" },
  cardHint: { color: "#687076", fontSize: 13, lineHeight: 18 },
  unresolvedText: { color: "#92400E", fontSize: 17, fontWeight: "700" },
  addButton: { marginTop: 4, backgroundColor: "#15803D", borderRadius: 10, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addButtonDone: { backgroundColor: "#64748B" },
  addButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  footerAction: { paddingVertical: 6, alignItems: "center" },
  newPhotoButton: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  newPhotoText: { color: "#0A7EA5", fontSize: 15, fontWeight: "700" },
});
