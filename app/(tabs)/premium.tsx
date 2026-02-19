import { ScrollView, Text, View, Pressable, StyleSheet, Alert, ActivityIndicator, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useIAPContext } from "@/lib/iap-context";

export default function PremiumScreen() {
  const { isPremium: appIsPremium, setPremium } = useApp();
  const {
    connected,
    purchasing,
    isPremium: iapIsPremium,
    purchasePremium,
    restorePurchases,
    premiumPrice,
    platformSupported,
  } = useIAPContext();

  // L'utilisateur est premium si l'un des deux systèmes le confirme
  const isPremium = appIsPremium || iapIsPremium;

  const handlePurchase = async () => {
    if (platformSupported && connected) {
      // Achat réel via Google Play / App Store
      await purchasePremium();
    } else {
      // Fallback : mode test (web ou service non disponible)
      Alert.alert(
        "PhytoCheck Premium",
        platformSupported
          ? "Le service d'achat n'est pas disponible actuellement. Vérifiez votre connexion internet et réessayez."
          : "L'achat in-app n'est pas disponible sur cette plateforme. Utilisez l'application sur Android ou iOS pour acheter Premium.",
        [
          { text: "Annuler", style: "cancel" },
          ...(platformSupported
            ? []
            : [
                {
                  text: "Activer Premium (test)",
                  onPress: () => setPremium(true),
                },
              ]),
        ]
      );
    }
  };

  const handleRestore = async () => {
    if (platformSupported && connected) {
      await restorePurchases();
    } else {
      Alert.alert(
        "Restaurer l'achat",
        platformSupported
          ? "Le service d'achat n'est pas disponible actuellement. Vérifiez votre connexion internet."
          : "La restauration des achats n'est disponible que sur Android et iOS.",
        [{ text: "OK" }]
      );
    }
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
          {/* Bouton de désactivation uniquement en mode test (web) */}
          {!platformSupported && (
            <Pressable
              style={({ pressed }) => [
                styles.deactivateButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setPremium(false)}
            >
              <Text style={styles.deactivateText}>Désactiver Premium (test)</Text>
            </Pressable>
          )}
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

          {/* Prix */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Achat unique</Text>
            <Text style={styles.priceValue}>{premiumPrice}</Text>
            <Text style={styles.priceNote}>Paiement unique, pas d'abonnement</Text>
          </View>

          {/* Purchase button */}
          <Pressable
            style={({ pressed }) => [
              styles.purchaseButton,
              pressed && !purchasing && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              purchasing && { opacity: 0.7 },
            ]}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <IconSymbol name="star.fill" size={22} color="#FFFFFF" />
            )}
            <Text style={styles.purchaseButtonText}>
              {purchasing ? "Achat en cours..." : "Passer à Premium"}
            </Text>
          </Pressable>

          {/* Statut connexion IAP */}
          {platformSupported && (
            <Text style={styles.connectionStatus}>
              {connected
                ? "Service d'achat connecté"
                : "Connexion au service d'achat..."}
            </Text>
          )}

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

          {/* Mentions légales */}
          <Text style={styles.legalText}>
            {Platform.OS === "ios"
              ? "Le paiement sera débité de votre compte Apple ID lors de la confirmation de l'achat. L'abonnement se renouvelle automatiquement sauf si vous le désactivez au moins 24h avant la fin de la période en cours."
              : "Le paiement sera traité via votre compte Google Play. Achat unique sans renouvellement automatique."}
          </Text>
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
  priceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1A8A7D",
  },
  priceLabel: {
    fontSize: 14,
    color: "#687076",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1A8A7D",
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 13,
    color: "#687076",
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
  connectionStatus: {
    fontSize: 12,
    color: "#9BA1A6",
    textAlign: "center",
    marginTop: 8,
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
  legalText: {
    fontSize: 11,
    color: "#9BA1A6",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 16,
    paddingHorizontal: 12,
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
