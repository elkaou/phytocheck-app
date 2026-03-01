import { ScrollView, Text, View, Pressable, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TOTAL_PRODUCTS, DB_UPDATE_DATE } from "@/lib/product-service";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer containerClassName="" style={{ backgroundColor: '#0a7ea5' }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>PhytoCheck</Text>
            <Text style={styles.headerSubtitle}>
              Vérifiez l'homologation{"\n"}de vos produits
            </Text>
          </View>
          <Image
            source={require("@/assets/images/header-illustration.jpg")}
            style={styles.headerImage}
            resizeMode="contain"
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Scanner button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push("/scan" as any)}
          >
            <IconSymbol name="camera.fill" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Scanner un produit</Text>
          </Pressable>

          {/* Manual search button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push("/search")}
          >
            <IconSymbol name="magnifyingglass" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Recherche manuelle</Text>
          </Pressable>

          {/* Stock button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push("/stock")}
          >
            <IconSymbol name="archivebox.fill" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Gestion du stock</Text>
          </Pressable>

          {/* Database info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>BASE DE DONNÉES E-PHY</Text>
            <Text style={styles.infoCardDate}>
              Mise à jour le {DB_UPDATE_DATE}
            </Text>
            <Text style={styles.infoCardCount}>
              {TOTAL_PRODUCTS.toLocaleString("fr-FR")} produits référencés
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0a7ea5",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  headerImage: {
    width: 130,
    height: 110,
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  actionButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  actionButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0a7ea5",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoCardDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  infoCardCount: {
    fontSize: 14,
    color: "#687076",
  },
});
