import { ScrollView, Text, View, Pressable, StyleSheet, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";

export default function PremiumScreen() {
  const { isPremium, setPremium } = useApp();

  const handlePurchase = () => {
    Alert.alert(
      "PhytoCheck Premium",
      "L'achat in-app sera disponible via Google Play / App Store une fois l'application publiée. Pour le moment, vous pouvez activer le mode Premium pour tester.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Activer Premium (test)",
          onPress: () => setPremium(true),
        },
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert(
      "Restaurer l'achat",
      "La restauration des achats sera disponible via Google Play / App Store une fois l'application publiée.",
      [{ text: "OK" }]
    );
  };

  if (isPremium) {
    return (
      <ScreenContainer containerClassName="bg-primary">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PhytoCheck Premium</Text>
          <Text style={styles.headerSubtitle}>
            Vous bénéficiez de toutes les fonctionnalités avancées
          </Text>
        </View>
        <View style={styles.content}>
          <View style={styles.activeCard}>
            <IconSymbol name="checkmark.circle.fill" size={48} color="#22C55E" />
            <Text style={styles.activeTitle}>Premium actif</Text>
            <Text style={styles.activeSubtitle}>
              Recherches illimitées, stock illimité et export PDF disponibles.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.deactivateButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setPremium(false)}
          >
            <Text style={styles.deactivateText}>Désactiver Premium (test)</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PhytoCheck Premium</Text>
        <Text style={styles.headerSubtitle}>
          Débloquez toutes les fonctionnalités avancées
        </Text>
      </View>

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Feature cards */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol name="magnifyingglass" size={32} color="#1A8A7D" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Recherches illimitées</Text>
              <Text style={styles.featureDesc}>
                Effectuez autant de recherches que vous le souhaitez sans limite
              </Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Gratuit</Text>
                  <Text style={styles.comparisonValue}>15 recherches au total</Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonLabel, { color: "#1A8A7D" }]}>
                    Premium
                  </Text>
                  <Text style={[styles.comparisonValue, { color: "#1A8A7D", fontWeight: "bold" }]}>
                    Illimité
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol name="archivebox.fill" size={32} color="#1A8A7D" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Stock illimité</Text>
              <Text style={styles.featureDesc}>
                Stockez autant de produits que vous le souhaitez
              </Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Gratuit</Text>
                  <Text style={styles.comparisonValue}>20 produits max</Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonLabel, { color: "#1A8A7D" }]}>
                    Premium
                  </Text>
                  <Text style={[styles.comparisonValue, { color: "#1A8A7D", fontWeight: "bold" }]}>
                    Illimité
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol name="doc.text.fill" size={32} color="#1A8A7D" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Export PDF professionnel</Text>
              <Text style={styles.featureDesc}>
                Exportez votre inventaire en PDF pour vos contrôles et audits
              </Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Gratuit</Text>
                  <Text style={styles.comparisonValue}>Non disponible</Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonLabel, { color: "#1A8A7D" }]}>
                    Premium
                  </Text>
                  <Text style={[styles.comparisonValue, { color: "#1A8A7D", fontWeight: "bold" }]}>
                    Disponible
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Purchase button */}
          <Pressable
            style={({ pressed }) => [
              styles.purchaseButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handlePurchase}
          >
            <IconSymbol name="star.fill" size={22} color="#FFFFFF" />
            <Text style={styles.purchaseButtonText}>Passer à Premium</Text>
          </Pressable>

          {/* Restore */}
          <Pressable
            style={({ pressed }) => [
              styles.restoreButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleRestore}
          >
            <Text style={styles.restoreText}>Restaurer un achat</Text>
          </Pressable>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1A8A7D",
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
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    gap: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: "#687076",
    lineHeight: 20,
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  comparisonItem: {},
  comparisonLabel: {
    fontSize: 12,
    color: "#687076",
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  purchaseButton: {
    backgroundColor: "#1A8A7D",
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  purchaseButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  restoreButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: "#1A8A7D",
    textDecorationLine: "underline",
  },
  activeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#22C55E",
  },
  activeSubtitle: {
    fontSize: 16,
    color: "#687076",
    textAlign: "center",
    lineHeight: 24,
  },
  deactivateButton: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 12,
  },
  deactivateText: {
    fontSize: 14,
    color: "#EF4444",
    textDecorationLine: "underline",
  },
});
