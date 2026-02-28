/**
 * Écran de débogage IAP
 * Affiche toutes les informations de débogage pour diagnostiquer le problème "Produit non trouvé"
 */
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useIAPContext } from "@/lib/iap-context";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { IAP_PRODUCTS_ANDROID, IAP_PRODUCTS_IOS, IAP_BASE_PLANS } from "@/lib/iap-service";

export default function IAPDebugScreen() {
  const router = useRouter();
  const {
    connected,
    products,
    isPremium,
    subscriptionType,
    platformSupported,
    monthlyPrice,
    yearlyPrice,
  } = useIAPContext();

  return (
    <ScreenContainer className="bg-background">
      <ScrollView className="flex-1 p-4">
        {/* Header */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4"
          >
            <Text className="text-primary text-base">← Retour</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-foreground mb-2">
            Débogage IAP
          </Text>
          <Text className="text-muted text-sm">
            Diagnostic du système d'achat intégré
          </Text>
        </View>

        {/* Statut général */}
        <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">
            📊 Statut Général
          </Text>
          <DebugRow label="Plateforme" value={Platform.OS} />
          <DebugRow label="Plateforme supportée" value={platformSupported ? "✅ Oui" : "❌ Non"} />
          <DebugRow label="Connexion IAP" value={connected ? "✅ Connecté" : "❌ Déconnecté"} />
          <DebugRow label="Statut Premium" value={isPremium ? "✅ Premium" : "❌ Gratuit"} />
          <DebugRow label="Type d'abonnement" value={subscriptionType || "Aucun"} />
        </View>

        {/* Configuration Product IDs */}
        <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">
            🔧 Configuration Product IDs
          </Text>
          {Platform.OS === "android" ? (
            <>
              <DebugRow label="Product ID Android" value={IAP_PRODUCTS_ANDROID.PREMIUM} />
              <DebugRow label="Base Plan Mensuel" value={IAP_BASE_PLANS.MONTHLY} />
              <DebugRow label="Base Plan Annuel" value={IAP_BASE_PLANS.YEARLY} />
            </>
          ) : (
            <>
              <DebugRow label="Product ID Mensuel iOS" value={IAP_PRODUCTS_IOS.PREMIUM_MONTHLY} />
              <DebugRow label="Product ID Annuel iOS" value={IAP_PRODUCTS_IOS.PREMIUM_YEARLY} />
            </>
          )}
        </View>

        {/* Produits chargés */}
        <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">
            🛒 Produits Chargés ({products.length})
          </Text>
          {products.length === 0 ? (
            <View className="bg-error/10 rounded-lg p-3 border border-error/30">
              <Text className="text-error font-semibold mb-1">
                ❌ Aucun produit trouvé
              </Text>
              <Text className="text-error/80 text-sm">
                C'est ici que se trouve le problème. Google Play/App Store ne retourne aucun produit.
              </Text>
            </View>
          ) : (
            products.map((product, index) => (
              <View key={index} className="mb-3 bg-success/10 rounded-lg p-3 border border-success/30">
                <Text className="text-success font-semibold mb-2">
                  ✅ Produit {index + 1}
                </Text>
                <DebugRow label="ID" value={product.id} small />
                <DebugRow label="Titre" value={product.title} small />
                <DebugRow label="Prix" value={product.price} small />
                <DebugRow label="Type" value={product.subscriptionType || "N/A"} small />
                {product.basePlanId && (
                  <DebugRow label="Base Plan ID" value={product.basePlanId} small />
                )}
                {product.offerToken && (
                  <DebugRow label="Offer Token" value={product.offerToken.substring(0, 20) + "..."} small />
                )}
              </View>
            ))
          )}
        </View>

        {/* Prix détectés */}
        <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">
            💰 Prix Détectés
          </Text>
          <DebugRow label="Prix mensuel" value={monthlyPrice} />
          <DebugRow label="Prix annuel" value={yearlyPrice} />
        </View>

        {/* Diagnostic */}
        <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">
            🔍 Diagnostic
          </Text>
          {!platformSupported && (
            <DiagnosticItem
              type="error"
              message="Plateforme non supportée (web). Les achats ne fonctionnent que sur iOS/Android."
            />
          )}
          {!connected && platformSupported && (
            <DiagnosticItem
              type="error"
              message="Connexion IAP échouée. Vérifiez que expo-iap est bien installé."
            />
          )}
          {connected && products.length === 0 && (
            <>
              <DiagnosticItem
                type="error"
                message="Aucun produit trouvé malgré une connexion réussie."
              />
              <DiagnosticItem
                type="warning"
                message="Vérifications à faire dans Google Play Console / App Store Connect :"
              />
              <Text className="text-muted text-sm ml-4 mt-2">
                • Les abonnements sont-ils actifs ?{"\n"}
                • Le package name correspond-il ? (siteswebs.phytocheck.app.t20260219){"\n"}
                • L'app est-elle installée via le lien de test (pas APK direct) ?{"\n"}
                • Votre compte est-il bien dans la liste des testeurs ?{"\n"}
                • Les testeurs ont-ils été ajoutés il y a plus de 24h ?
              </Text>
            </>
          )}
          {connected && products.length > 0 && (
            <DiagnosticItem
              type="success"
              message="✅ Tout semble fonctionnel ! Les produits sont chargés correctement."
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function DebugRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View className="flex-row justify-between items-start mb-2">
      <Text className={`${small ? "text-xs" : "text-sm"} text-muted flex-1`}>
        {label}
      </Text>
      <Text className={`${small ? "text-xs" : "text-sm"} text-foreground font-mono flex-1 text-right`}>
        {value}
      </Text>
    </View>
  );
}

function DiagnosticItem({ type, message }: { type: "error" | "warning" | "success"; message: string }) {
  const colors = {
    error: "bg-error/10 border-error/30 text-error",
    warning: "bg-warning/10 border-warning/30 text-warning",
    success: "bg-success/10 border-success/30 text-success",
  };

  return (
    <View className={`${colors[type]} rounded-lg p-3 border mb-2`}>
      <Text className={`${colors[type].split(" ")[2]} text-sm`}>
        {message}
      </Text>
    </View>
  );
}
