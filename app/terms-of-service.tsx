import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

export default function TermsOfServiceScreen() {
  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conditions d'Utilisation</Text>
      </View>

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.updateDate}>Dernière mise à jour : 20 février 2026</Text>

          <Text style={styles.sectionTitle}>1. Acceptation des conditions</Text>
          <Text style={styles.paragraph}>
            En téléchargeant, installant ou utilisant l'application PhytoCheck, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
          </Text>

          <Text style={styles.sectionTitle}>2. Description du service</Text>
          <Text style={styles.paragraph}>
            PhytoCheck est une application mobile gratuite (avec option d'abonnement Premium) qui permet de vérifier l'homologation des produits phytosanitaires en France, consulter les informations issues de la base E-Phy, scanner les étiquettes de produits, et gérer un stock personnel.
          </Text>

          <Text style={styles.sectionTitle}>3. Source des données</Text>
          <Text style={styles.paragraph}>
            Les informations proviennent de la <Text style={styles.bold}>base de données publique E-Phy</Text>, gérée par l'ANSES et le Ministère de l'Agriculture français. La base est mise à jour périodiquement. La date de mise à jour est affichée sur l'écran d'accueil.
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>4. DÉCHARGE DE RESPONSABILITÉ</Text>
            
            <Text style={styles.warningSubtitle}>4.1 Outil d'information uniquement</Text>
            <Text style={styles.warningText}>
              <Text style={styles.bold}>PhytoCheck est un outil d'information et d'aide à la décision. Il ne remplace en aucun cas la consultation de la base de données officielle E-Phy ni l'avis d'un professionnel qualifié.</Text>
            </Text>

            <Text style={styles.warningSubtitle}>4.2 Vérification obligatoire</Text>
            <Text style={styles.warningText}>
              <Text style={styles.bold}>VOUS ÊTES TENU DE VÉRIFIER TOUTES LES INFORMATIONS DANS LA BASE DE DONNÉES OFFICIELLE E-Phy (https://ephy.anses.fr/) AVANT TOUTE UTILISATION, ACHAT, VENTE OU ÉLIMINATION DE PRODUITS PHYTOSANITAIRES.</Text>
            </Text>

            <Text style={styles.warningSubtitle}>4.3 Limitation de responsabilité</Text>
            <Text style={styles.warningText}>
              <Text style={styles.bold}>LE DÉVELOPPEUR SE DÉGAGE DE TOUTE RESPONSABILITÉ</Text> concernant : l'utilisation des produits, les erreurs ou omissions, les dommages directs ou indirects (matériels, corporels, environnementaux, financiers, sanctions légales), l'exactitude du scan OCR, et l'interruption du service.
            </Text>

            <Text style={styles.warningSubtitle}>4.4 Utilisation à vos risques</Text>
            <Text style={styles.warningText}>
              <Text style={styles.bold}>VOUS UTILISEZ CETTE APPLICATION À VOS PROPRES RISQUES.</Text> En cas de doute, consultez impérativement la base E-Phy officielle, un conseiller agricole agréé, les services de la DRAAF, ou un distributeur agréé.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>5. Obligations de l'utilisateur</Text>
          <Text style={styles.paragraph}>
            Vous vous engagez à utiliser l'application conformément à la législation, ne pas l'utiliser comme unique source d'information, vérifier systématiquement dans E-Phy officiel, et respecter la réglementation française sur les produits phytosanitaires (Certiphyto si requis, respect des ZNT, registre phytosanitaire, etc.).
          </Text>

          <Text style={styles.sectionTitle}>6. Abonnement Premium</Text>
          <Text style={styles.paragraph}>
            L'abonnement Premium offre des recherches illimitées et un stock illimité. Les abonnements (mensuel ou annuel) se renouvellent automatiquement via Google Play Billing. Vous pouvez annuler à tout moment depuis votre compte Google Play. Les abonnements ne sont pas remboursables sauf obligation légale.
          </Text>

          <Text style={styles.sectionTitle}>7. Modifications des CGU</Text>
          <Text style={styles.paragraph}>
            Ces CGU peuvent être modifiées à tout moment. Les modifications entrent en vigueur dès leur publication. L'utilisation continue de l'application après modification vaut acceptation des nouvelles conditions.
          </Text>

          <Text style={styles.sectionTitle}>8. Droit applicable</Text>
          <Text style={styles.paragraph}>
            Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </Text>

          <Text style={styles.sectionTitle}>9. Contact</Text>
          <Text style={styles.paragraph}>
            Pour toute question concernant ces Conditions d'Utilisation, contactez François Courouble à l'adresse francois@siteswebs.fr ou sur https://siteswebs.fr/application-phytocheck
          </Text>

          <View style={styles.reminderBox}>
            <Text style={styles.reminderTitle}>⚠️ RAPPEL IMPORTANT</Text>
            <Text style={styles.reminderText}>
              PHYTOCHECK EST UN OUTIL D'AIDE À LA DÉCISION. VOUS DEVEZ IMPÉRATIVEMENT VÉRIFIER TOUTES LES INFORMATIONS DANS LA BASE E-PHY OFFICIELLE AVANT TOUTE UTILISATION DE PRODUITS PHYTOSANITAIRES.
            </Text>
            <Text style={styles.reminderText}>
              LE DÉVELOPPEUR NE PEUT ÊTRE TENU RESPONSABLE DE TOUTE CONSÉQUENCE RÉSULTANT DE L'UTILISATION DE CETTE APPLICATION.
            </Text>
          </View>
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
  warningBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 2,
    borderColor: "#DC2626",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 12,
  },
  warningSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#991B1B",
    marginTop: 12,
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: "#7F1D1D",
    lineHeight: 20,
    marginBottom: 8,
  },
  reminderBox: {
    backgroundColor: "#FFF7ED",
    borderLeftWidth: 4,
    borderLeftColor: "#F4830B",
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  reminderTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#C2410C",
    marginBottom: 8,
  },
  reminderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9A3412",
    lineHeight: 20,
    marginBottom: 8,
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
