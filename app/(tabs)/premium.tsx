import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useIAPContext } from "@/lib/iap-context";
import type { SubscriptionType } from "@/lib/iap-service";

export default function PremiumScreen() {
  const { isPremium: appIsPremium, setPremium } = useApp();
  const {
    connected,
    purchasing,
    isPremium: iapIsPremium,
    subscriptionType,
    purchaseSubscription,
    restorePurchases,
    monthlyPrice,
    yearlyPrice,
    platformSupported,
  } = useIAPContext();

  // L'utilisateur est premium si l'un des deux systèmes le confirme
  const isPremium = appIsPremium || iapIsPremium;

  const handlePurchase = async (type: SubscriptionType) => {
    if (!type) return;

    if (platformSupported && connected) {
      // Achat réel via Google Play / App Store
      await purchaseSubscription(type);
    } else {
      // Fallback : mode test (web ou service non disponible)
      Alert.alert(
        "PhytoCheck Premium",
        platformSupported
          ? "Le service d'abonnement n'est pas disponible actuellement. Vérifiez votre connexion internet et réessayez."
          : "L'abonnement in-app n'est pas disponible sur cette plateforme. Utilisez l'application sur Android ou iOS pour souscrire à Premium.",
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
        "Restaurer l'abonnement",
        platformSupported
          ? "Le service d'abonnement n'est pas disponible actuellement. Vérifiez votre connexion internet."
          : "La restauration des abonnements n'est disponible que sur Android et iOS.",
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
            Abonnement {subscriptionType === "monthly" ? "mensuel" : "annuel"} actif
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
          <Text style={styles.manageText}>
            Gérez votre abonnement depuis les paramètres de votre compte{" "}
            {Platform.OS === "ios" ? "Apple" : "Google Play"}.
          </Text>
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PhytoCheck Premium</Text>
          <Text style={styles.headerSubtitle}>
            Débloquez toutes les fonctionnalités avancées
          </Text>
        </View>

        {/* Comparison table */}
        <View style={styles.content}>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonRow}>
              <Text style={styles.featureLabel}>Recherches</Text>
              <Text style={styles.freeValue}>15 max</Text>
              <Text style={styles.premiumValue}>Illimité</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.featureLabel}>Stock</Text>
              <Text style={styles.freeValue}>20 produits</Text>
              <Text style={styles.premiumValue}>Illimité</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.featureLabel}>Export PDF</Text>
              <Text style={styles.freeValue}>✗</Text>
              <Text style={styles.premiumValue}>✓</Text>
            </View>
          </View>

          {/* Subscription options */}
          <View style={styles.subscriptionSection}>
            <Text style={styles.sectionTitle}>Choisissez votre abonnement</Text>

            {/* Monthly subscription */}
            <Pressable
              style={({ pressed }) => [
                styles.subscriptionCard,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handlePurchase("monthly")}
              disabled={purchasing}
            >
              <View style={styles.subscriptionHeader}>
                <Text style={styles.subscriptionTitle}>Mensuel</Text>
                <Text style={styles.subscriptionPrice}>{monthlyPrice}</Text>
              </View>
              <Text style={styles.subscriptionSubtitle}>par mois</Text>
              <Text style={styles.subscriptionDescription}>
                Facturation mensuelle • Annulation à tout moment
              </Text>
            </Pressable>

            {/* Yearly subscription (recommended) */}
            <Pressable
              style={({ pressed }) => [
                styles.subscriptionCard,
                styles.subscriptionCardRecommended,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handlePurchase("yearly")}
              disabled={purchasing}
            >
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMANDÉ</Text>
              </View>
              <View style={styles.subscriptionHeader}>
                <Text style={styles.subscriptionTitle}>Annuel</Text>
                <Text style={styles.subscriptionPrice}>{yearlyPrice}</Text>
              </View>
              <Text style={styles.subscriptionSubtitle}>par an</Text>
              <Text style={styles.subscriptionDescription}>
                Économisez 17% • Facturation annuelle
              </Text>
            </Pressable>

            {/* Purchase button */}
            <Pressable
              style={({ pressed }) => [
                styles.purchaseButton,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                purchasing && styles.purchaseButtonDisabled,
              ]}
              onPress={() => handlePurchase("monthly")}
              disabled={purchasing}
            >
              <Text style={styles.purchaseButtonText}>
                {purchasing ? "Traitement en cours..." : "Souscrire maintenant"}
              </Text>
            </Pressable>

            {/* Restore button */}
            <Pressable
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleRestore}
              disabled={purchasing}
            >
              <Text style={styles.restoreText}>Restaurer mes achats</Text>
            </Pressable>
          </View>

          {/* Legal text */}
          <View style={styles.legalSection}>
            <Text style={styles.legalText}>
              {Platform.OS === "ios"
                ? "L'abonnement sera facturé sur votre compte Apple à la confirmation de l'achat. Il se renouvelle automatiquement sauf si vous l'annulez au moins 24 heures avant la fin de la période en cours. Gérez vos abonnements dans les Réglages de votre iPhone."
                : "L'abonnement sera facturé sur votre compte Google Play à la confirmation de l'achat. Il se renouvelle automatiquement sauf si vous l'annulez au moins 24 heures avant la fin de la période en cours. Gérez vos abonnements dans les paramètres Google Play."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: "#0a7ea4",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#ffffff",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  comparisonCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  featureLabel: {
    flex: 2,
    fontSize: 16,
    color: "#11181C",
    fontWeight: "500",
  },
  freeValue: {
    flex: 1,
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
  },
  premiumValue: {
    flex: 1,
    fontSize: 14,
    color: "#0a7ea4",
    fontWeight: "600",
    textAlign: "center",
  },
  subscriptionSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#11181C",
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  subscriptionCardRecommended: {
    borderColor: "#0a7ea4",
    position: "relative",
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#11181C",
  },
  subscriptionPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0a7ea4",
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: "#687076",
    marginBottom: 8,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: "#687076",
  },
  purchaseButton: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  restoreText: {
    fontSize: 16,
    color: "#0a7ea4",
    fontWeight: "500",
  },
  legalSection: {
    marginTop: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
  },
  legalText: {
    fontSize: 12,
    color: "#FFFFFF",
    lineHeight: 18,
    textAlign: "center",
  },
  activeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#11181C",
    marginTop: 16,
    marginBottom: 8,
  },
  activeSubtitle: {
    fontSize: 16,
    color: "#687076",
    textAlign: "center",
  },
  manageText: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    marginBottom: 16,
  },
  deactivateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  deactivateText: {
    fontSize: 14,
    color: "#687076",
  },
});
