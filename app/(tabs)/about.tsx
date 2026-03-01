import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TOTAL_PRODUCTS, DB_UPDATE_DATE } from "@/lib/product-service";
// Numéro de build lu depuis expo-constants
// Constants.nativeBuildVersion retourne le versionCode Android ou buildNumber iOS réel du build EAS
const BUILD_NUMBER = Constants.nativeBuildVersion ?? "?";

export default function AboutScreen() {
  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>À propos</Text>
        <Text style={styles.headerSubtitle}>
          PhytoCheck - Vérifiez l'homologation de vos produits
        </Text>
      </View>

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Version card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>VERSION</Text>
            <Text style={styles.versionText}>
              Version 1.0.0 (Build {BUILD_NUMBER})
            </Text>
          </View>

          {/* Legal documents */}
          <Text style={styles.sectionTitle}>DOCUMENTS LÉGAUX</Text>

          <Pressable
            style={({ pressed }) => [
              styles.legalButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push("/privacy-policy")}
          >
            <IconSymbol name="doc.text.fill" size={20} color="#FFFFFF" />
            <Text style={styles.legalButtonText}>
              Politique de Confidentialité
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.legalButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push("/terms-of-service")}
          >
            <IconSymbol name="doc.text.fill" size={20} color="#FFFFFF" />
            <Text style={styles.legalButtonText}>
              Conditions d'Utilisation
            </Text>
          </Pressable>

          {/* Database info */}
          <View style={[styles.card, { marginTop: 24 }]}>
            <Text style={styles.dbTitle}>Base de données</Text>
            <Text style={styles.dbText}>
              Les données de produits proviennent de la base E-Phy officielle,
              mise à jour le {DB_UPDATE_DATE}.
            </Text>
            <Text style={styles.dbText}>
              {TOTAL_PRODUCTS.toLocaleString("fr-FR")} produits phytosanitaires
              référencés.
            </Text>
          </View>

          {/* Credits */}
          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.dbTitle}>Crédits</Text>
            <Text style={styles.dbText}>
              PhytoCheck est une application indépendante destinée aux
              professionnels et particuliers souhaitant vérifier le statut
              d'homologation de leurs produits phytosanitaires.
            </Text>
            <Text style={[styles.dbText, { marginTop: 8 }]}>
              Les données sont issues du catalogue E-Phy de l'ANSES (Agence
              nationale de sécurité sanitaire de l'alimentation, de
              l'environnement et du travail).
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0a7ea5",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 22,
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#687076",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  versionText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1A1A1A",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  legalButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  legalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dbTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  dbText: {
    fontSize: 15,
    color: "#687076",
    lineHeight: 22,
  },
});
