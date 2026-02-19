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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { searchProducts, ClassifiedProduct } from "@/lib/product-service";
import { useApp } from "@/lib/app-context";

export default function ScanScreen() {
  const router = useRouter();
  const { performSearch } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const processImage = useCallback(
    async (uri: string) => {
      setIsProcessing(true);
      try {
        // Use the built-in server LLM to perform OCR on the image
        const apiBase =
          Platform.OS === "web"
            ? "/api"
            : "https://3000-ix0fvf3uapsj0prlqr0jt-46d68d43.us2.manus.computer/api";

        // Read image as base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] || result);
          };
          reader.readAsDataURL(blob);
        });

        // Call server LLM for OCR
        const llmResponse = await fetch(`${apiBase}/trpc/ai.chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: {
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analyse cette image d'étiquette de produit phytosanitaire. Extrais le nom commercial du produit et/ou le numéro AMM (Autorisation de Mise sur le Marché). Réponds UNIQUEMENT avec un JSON au format: {\"nom\": \"NOM_DU_PRODUIT\", \"amm\": \"NUMERO_AMM\"}. Si tu ne trouves qu'un seul des deux, laisse l'autre vide. Si tu ne trouves rien, réponds {\"nom\": \"\", \"amm\": \"\"}.",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:image/jpeg;base64,${base64}`,
                      },
                    },
                  ],
                },
              ],
            },
          }),
        });

        if (llmResponse.ok) {
          const data = await llmResponse.json();
          const content = data?.result?.data?.json?.content || "";

          // Parse the JSON response
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const searchQuery = parsed.amm || parsed.nom || "";

            if (searchQuery) {
              const canDo = await performSearch();
              if (!canDo) {
                Alert.alert(
                  "Limite atteinte",
                  "Vous avez atteint la limite de recherches gratuites."
                );
                setIsProcessing(false);
                return;
              }

              const results = searchProducts(searchQuery);
              if (results.length > 0) {
                router.replace({
                  pathname: "/product/[amm]" as any,
                  params: { amm: results[0].amm },
                });
              } else {
                Alert.alert(
                  "Produit non trouvé",
                  `Aucun produit trouvé pour "${searchQuery}". Essayez la recherche manuelle.`,
                  [
                    { text: "OK", onPress: () => setPhotoUri(null) },
                  ]
                );
              }
            } else {
              Alert.alert(
                "Texte non reconnu",
                "Impossible d'identifier le produit sur cette image. Essayez de prendre une photo plus nette ou utilisez la recherche manuelle.",
                [{ text: "OK", onPress: () => setPhotoUri(null) }]
              );
            }
          }
        } else {
          // Fallback: simple text-based search prompt
          Alert.alert(
            "OCR non disponible",
            "Le service de reconnaissance d'image n'est pas disponible. Utilisez la recherche manuelle.",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      } catch (error) {
        Alert.alert(
          "Erreur",
          "Une erreur est survenue lors de l'analyse de l'image. Essayez la recherche manuelle.",
          [{ text: "OK", onPress: () => setPhotoUri(null) }]
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [performSearch, router]
  );

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
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
      setPhotoUri(result.assets[0].uri);
      await processImage(result.assets[0].uri);
    }
  }, [processImage]);

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle}>Scanner</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#1A8A7D" />
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
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle}>Scanner</Text>
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
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle}>Analyse en cours</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#1A8A7D" />
            <Text style={styles.processingText}>
              Analyse de l'étiquette en cours...
            </Text>
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
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
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
            <IconSymbol name="doc.text.fill" size={24} color="#1A8A7D" />
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
    backgroundColor: "#1A8A7D",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#1A8A7D",
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
    backgroundColor: "#1A8A7D",
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
    color: "#1A8A7D",
    textDecorationLine: "underline",
  },
  processingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
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
