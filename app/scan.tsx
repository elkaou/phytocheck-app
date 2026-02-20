import { useState, useRef, useCallback } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { searchProducts } from "@/lib/product-service";
import { useApp } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";

export default function ScanScreen() {
  const router = useRouter();
  const { performSearch } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Analyse de l'étiquette en cours...");

  const analyzeMutation = trpc.ocr.analyzeLabel.useMutation();

  const processImage = useCallback(
    async (uri: string) => {
      // Check search limit FIRST (before processing image)
      const canDo = await performSearch();
      if (!canDo) {
        Alert.alert(
          "Limite atteinte",
          "Vous avez atteint la limite de recherches gratuites. Passez à Premium pour des recherches illimitées.",
          [
            { text: "Annuler" },
            {
              text: "Voir Premium",
              onPress: () => router.replace("/premium" as any),
            },
          ]
        );
        return;
      }

      setIsProcessing(true);
      setStatusText("Lecture de l'image...");
      try {
        console.log("[Scan] Starting image processing for URI:", uri);
        console.log("[Scan] Platform:", Platform.OS);
        
        // Read image as base64
        let base64: string;
        if (Platform.OS === "web") {
          const response = await fetch(uri);
          const blob = await response.blob();
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1] || result);
            };
            reader.readAsDataURL(blob);
          });
        } else {
          // Native: use fetch for content:// URIs (gallery) or FileSystem for file:// URIs (camera)
          console.log("[Scan] Reading file with fetch (works for content:// URIs)...");
          try {
            // Use fetch which works with both content:// and file:// URIs on Android
            const response = await fetch(uri);
            const blob = await response.blob();
            console.log("[Scan] Blob created, size:", blob.size);
            
            // Convert blob to base64
            base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                const base64Data = result.split(",")[1] || result;
                resolve(base64Data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            console.log("[Scan] File read successfully, base64 length:", base64.length);
          } catch (fileError: any) {
            console.error("[Scan] File reading error:", fileError);
            throw new Error(`Erreur de lecture du fichier: ${fileError.message || fileError}`);
          }
        }

        setStatusText("Envoi au serveur d'analyse...");

        // Determine MIME type
        const mimeType = uri.toLowerCase().includes("png")
          ? "image/png"
          : "image/jpeg";
        console.log("[Scan] MIME type:", mimeType);

        // Call server OCR via tRPC
        setStatusText("Identification du produit...");
        console.log("[Scan] Calling analyzeMutation.mutateAsync...");
        const result = await analyzeMutation.mutateAsync({
          imageBase64: base64,
          mimeType,
        });
        console.log("[Scan] Server response:", result);

        if (result.success && (result.nom || result.amm)) {
          // Try searching by name first, then by AMM
          let results = searchProducts(result.nom || "");
          let searchQuery = result.nom || "";

          // If no results by name, try by AMM
          if (results.length === 0 && result.amm) {
            results = searchProducts(result.amm);
            searchQuery = result.amm;
          }

          // If still no results and name has multiple words, try each word
          if (results.length === 0 && result.nom) {
            const words = result.nom.split(/\s+/).filter((w: string) => w.length >= 3);
            for (const word of words) {
              results = searchProducts(word);
              if (results.length > 0) {
                searchQuery = word;
                break;
              }
            }
          }

          // Check if multiple AMMs exist for the same product name
          const uniqueAMMs = [...new Set(results.map((r) => r.amm))];

          if (results.length === 1) {
            // Single result: go directly to product detail
            router.replace({
              pathname: "/product/[amm]" as any,
              params: { amm: results[0].amm },
            });
          } else if (uniqueAMMs.length > 1) {
            // Multiple AMMs: go to search so user can choose the right one
            router.replace({
              pathname: "/(tabs)/search" as any,
              params: { q: searchQuery },
            });
          } else if (results.length > 0) {
            // Same AMM, go to product detail
            router.replace({
              pathname: "/product/[amm]" as any,
              params: { amm: results[0].amm },
            });
          } else {
            // No results found
            const detectedInfo = result.nom
              ? `Nom détecté : "${result.nom}"`
              : result.amm
                ? `AMM détecté : "${result.amm}"`
                : "";
            Alert.alert(
              "Produit non trouvé",
              `Aucun produit trouvé dans la base de données.\n${detectedInfo}\n\nEssayez la recherche manuelle.`,
              [{ text: "OK", onPress: () => setIsProcessing(false) }]
            );
          }
        } else {
          Alert.alert(
            "Texte non reconnu",
            "Impossible d'identifier le produit sur cette image. Essayez de prendre une photo plus nette de l'étiquette, en vous assurant que le nom du produit ou le numéro AMM est bien visible.",
            [{ text: "Réessayer", onPress: () => setIsProcessing(false) }]
          );
        }
      } catch (error: any) {
        console.error("[Scan] Error:", error);
        const errorMessage = error?.message || error?.toString() || "Erreur inconnue";
        console.error("[Scan] Error details:", errorMessage);
        
        // More specific error messages
        let userMessage = "Une erreur est survenue lors de l'analyse de l'image.";
        if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorMessage.includes("timeout")) {
          userMessage = "Erreur de connexion. Vérifiez votre connexion internet et réessayez.";
        } else if (errorMessage.includes("TRPCClientError")) {
          userMessage = "Erreur de communication avec le serveur. Vérifiez votre connexion et réessayez.";
        }
        
        Alert.alert(
          "Erreur d'analyse",
          userMessage,
          [{ text: "OK", onPress: () => setIsProcessing(false) }]
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [performSearch, router, analyzeMutation]
  );

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      if (photo?.uri) {
        await processImage(photo.uri);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de prendre la photo.");
    }
  }, [processImage]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  }, [processImage]);

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
            >
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle}>Scanner une étiquette</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#0a7ea5" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
            >
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle}>Scanner une étiquette</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <IconSymbol name="camera.fill" size={64} color="#687076" />
            <Text style={styles.permissionText}>
              PhytoCheck a besoin d'accéder à votre appareil photo pour scanner
              les étiquettes de produits.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.permissionButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>
                Autoriser l'appareil photo
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.galleryButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={pickFromGallery}
            >
              <Text style={styles.galleryButtonText}>
                Choisir depuis la galerie
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              onPress={() => {
                setIsProcessing(false);
                router.back();
              }}
            >
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle}>Analyse en cours</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#0a7ea5" />
            <Text style={styles.processingText}>{statusText}</Text>
            <Text style={styles.processingSubtext}>
              Identification du nom et du numéro AMM
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerBarTitle}>Scanner une étiquette</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            {/* Overlay guide */}
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.guideText}>
                Cadrez l'étiquette du produit
              </Text>
            </View>
          </CameraView>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [
              styles.gallerySmallButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={pickFromGallery}
          >
            <IconSymbol name="doc.text.fill" size={24} color="#0a7ea5" />
            <Text style={styles.gallerySmallText}>Galerie</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.captureButton,
              pressed && { transform: [{ scale: 0.93 }] },
            ]}
            onPress={takePicture}
          >
            <View style={styles.captureInner} />
          </Pressable>

          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a7ea5",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#0a7ea5",
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  centerContent: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    color: "#687076",
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  galleryButton: {
    paddingVertical: 12,
  },
  galleryButtonText: {
    fontSize: 14,
    color: "#0a7ea5",
    textDecorationLine: "underline",
  },
  processingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
    textAlign: "center",
  },
  processingSubtext: {
    fontSize: 14,
    color: "#687076",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 280,
    height: 200,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#FFFFFF",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  guideText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "#1A1A1A",
  },
  gallerySmallButton: {
    width: 60,
    alignItems: "center",
    gap: 4,
  },
  gallerySmallText: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
});
