import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

export default function PrivacyPolicyScreen() {
  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Politique de Confidentialité</Text>
      </View>

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.updateDate}>Dernière mise à jour : 20 février 2026</Text>

          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.paragraph}>
            PhytoCheck est une application mobile développée par Franck Courrèges qui permet aux utilisateurs de vérifier l'homologation des produits phytosanitaires en France. Cette politique de confidentialité explique comment l'application collecte, utilise et protège vos données.
          </Text>

          <Text style={styles.sectionTitle}>Données collectées</Text>
          
          <Text style={styles.subsectionTitle}>Données personnelles</Text>
          <Text style={styles.paragraph}>
            PhytoCheck <Text style={styles.bold}>ne collecte aucune donnée personnelle identifiable</Text>. L'application ne demande pas et ne stocke pas : nom, prénom, coordonnées, adresse email (sauf pour la gestion des abonnements via Google Play), numéro de téléphone, localisation géographique, ou adresse IP.
          </Text>

          <Text style={styles.subsectionTitle}>Données d'utilisation</Text>
          <Text style={styles.paragraph}>
            L'application stocke localement sur votre appareil : la liste de produits en stock, l'historique de recherches, et le statut Premium. Ces données <Text style={styles.bold}>ne sont jamais transmises à des serveurs externes</Text> et restent sur votre appareil. Elles sont supprimées si vous désinstallez l'application.
          </Text>

          <Text style={styles.sectionTitle}>Permissions demandées</Text>
          
          <Text style={styles.subsectionTitle}>Appareil photo (android.permission.CAMERA)</Text>
          <Text style={styles.paragraph}>
            L'application demande l'accès à votre appareil photo <Text style={styles.bold}>uniquement pour scanner les étiquettes de produits phytosanitaires</Text>. Les photos ne sont jamais sauvegardées sur votre appareil, ne sont jamais envoyées à des serveurs tiers, sont traitées temporairement en mémoire pour l'analyse OCR, puis immédiatement supprimées. Vous pouvez refuser cette permission et utiliser la recherche manuelle à la place.
          </Text>

          <Text style={styles.sectionTitle}>Utilisation des données</Text>
          <Text style={styles.paragraph}>
            Les données sont utilisées exclusivement pour : vérifier l'homologation des produits (recherche dans la base E-Phy publique), gérer votre stock personnel (stockage local), et gérer les abonnements Premium (vérification via Google Play Billing).
          </Text>

          <Text style={styles.sectionTitle}>Partage des données</Text>
          <Text style={styles.paragraph}>
            PhytoCheck <Text style={styles.bold}>ne partage aucune donnée avec des tiers</Text>. Les seules interactions externes sont : Google Play Billing pour la gestion des abonnements Premium, et le serveur d'analyse OCR (les photos sont envoyées temporairement puis immédiatement supprimées après traitement).
          </Text>

          <Text style={styles.sectionTitle}>Base de données E-Phy</Text>
          <Text style={styles.paragraph}>
            L'application utilise la base de données publique E-Phy fournie par le Ministère de l'Agriculture français. La base est mise à jour régulièrement et intégrée dans l'application. Aucune connexion internet n'est requise pour consulter les produits (sauf pour le scan photo).
          </Text>

          <Text style={styles.sectionTitle}>Droits des utilisateurs</Text>
          <Text style={styles.paragraph}>
            Conformément au RGPD, vous avez le droit d'accéder à vos données (stockées localement sur votre appareil), de les supprimer (désinstallez l'application), et de les exporter (fonctionnalité à venir).
          </Text>

          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.paragraph}>
            Pour toute question concernant cette politique de confidentialité, contactez Franck Courrèges.
          </Text>

          <Text style={styles.sectionTitle}>Conformité</Text>
          <Text style={styles.paragraph}>
            Cette application est conforme au RGPD (Règlement Général sur la Protection des Données - UE), à la Politique de confidentialité de Google Play, et à la Loi Informatique et Libertés (France).
          </Text>
        </ScrollView>

        {/* Close button fixed at bottom */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </Pressable>
        </View>
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
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 32,
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  updateDate: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#687076",
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0a7ea5",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  paragraph: {
    fontSize: 15,
    color: "#333",
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
    textAlign: "justify",
  },
  bold: {
    fontWeight: "600",
    color: "#0a7ea5",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  closeButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
