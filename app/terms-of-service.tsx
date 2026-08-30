import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LegalDocumentScreen } from "@/components/legal-document-screen";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export default function TermsOfServiceScreen() {
  return (
    <LegalDocumentScreen document={LEGAL_DOCUMENTS.terms}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <Text style={styles.updateDate}>Version intégrée — dernière mise à jour : 20 février 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptation des conditions</Text>
        <Text style={styles.paragraph}>
          En téléchargeant, installant ou utilisant l&apos;application PhytoCheck, vous acceptez d&apos;être lié par les présentes Conditions Générales d&apos;Utilisation. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser l&apos;application.
        </Text>

        <Text style={styles.sectionTitle}>2. Description du service</Text>
        <Text style={styles.paragraph}>
          PhytoCheck est une application mobile gratuite, avec option d&apos;abonnement Premium, qui permet de vérifier l&apos;homologation des produits phytosanitaires en France, de consulter les informations issues de la base E-Phy, de scanner les étiquettes de produits et de gérer un stock personnel.
        </Text>

        <Text style={styles.sectionTitle}>3. Source des données</Text>
        <Text style={styles.paragraph}>
          Les informations proviennent de la <Text style={styles.bold}>base de données publique E-Phy</Text>, gérée par l&apos;ANSES et le Ministère de l&apos;Agriculture français. La base est mise à jour périodiquement. La date de mise à jour est affichée sur l&apos;écran d&apos;accueil.
        </Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>4. DÉCHARGE DE RESPONSABILITÉ</Text>
          <Text style={styles.warningSubtitle}>4.1 Outil d&apos;information uniquement</Text>
          <Text style={styles.warningText}>
            <Text style={styles.bold}>PhytoCheck est un outil d&apos;information et d&apos;aide à la décision. Il ne remplace en aucun cas la consultation de la base E-Phy officielle ni l&apos;avis d&apos;un professionnel qualifié.</Text>
          </Text>
          <Text style={styles.warningSubtitle}>4.2 Vérification obligatoire</Text>
          <Text style={styles.warningText}>
            <Text style={styles.bold}>VOUS ÊTES TENU DE VÉRIFIER TOUTES LES INFORMATIONS DANS LA BASE E-PHY OFFICIELLE AVANT TOUTE UTILISATION, ACHAT, VENTE OU ÉLIMINATION DE PRODUITS PHYTOSANITAIRES.</Text>
          </Text>
          <Text style={styles.warningSubtitle}>4.3 Limitation de responsabilité</Text>
          <Text style={styles.warningText}>
            <Text style={styles.bold}>LE DÉVELOPPEUR SE DÉGAGE DE TOUTE RESPONSABILITÉ</Text> concernant l&apos;utilisation des produits, les erreurs ou omissions, les dommages directs ou indirects, l&apos;exactitude du scan OCR et l&apos;interruption du service.
          </Text>
          <Text style={styles.warningSubtitle}>4.4 Utilisation à vos risques</Text>
          <Text style={styles.warningText}>
            <Text style={styles.bold}>VOUS UTILISEZ CETTE APPLICATION À VOS PROPRES RISQUES.</Text> En cas de doute, consultez impérativement la base E-Phy officielle, un conseiller agricole agréé, les services de la DRAAF ou un distributeur agréé.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>5. Obligations de l&apos;utilisateur</Text>
        <Text style={styles.paragraph}>
          Vous vous engagez à utiliser l&apos;application conformément à la législation, à ne pas l&apos;utiliser comme unique source d&apos;information, à vérifier systématiquement les informations dans E-Phy officiel et à respecter la réglementation française sur les produits phytosanitaires.
        </Text>

        <Text style={styles.sectionTitle}>6. Abonnement Premium</Text>
        <Text style={styles.paragraph}>
          L&apos;abonnement Premium offre des recherches illimitées et un stock illimité. Les abonnements mensuel ou annuel se renouvellent automatiquement via la plateforme de paiement de votre appareil. Vous pouvez annuler à tout moment depuis votre compte de store.
        </Text>

        <Text style={styles.sectionTitle}>7. Modifications des CGU</Text>
        <Text style={styles.paragraph}>
          Ces CGU peuvent être modifiées à tout moment. Les modifications entrent en vigueur dès leur publication. L&apos;utilisation continue de l&apos;application après modification vaut acceptation des nouvelles conditions.
        </Text>

        <Text style={styles.sectionTitle}>8. Droit applicable</Text>
        <Text style={styles.paragraph}>
          Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux français sont seuls compétents.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact</Text>
        <Text style={styles.paragraph}>
          Pour toute question concernant ces Conditions d&apos;Utilisation, contactez François Courouble à l&apos;adresse francois@siteswebs.fr ou sur https://phytocheck.com.
        </Text>

        <View style={styles.reminderBox}>
          <Text style={styles.reminderTitle}>RAPPEL IMPORTANT</Text>
          <Text style={styles.reminderText}>
            PHYTOCHECK EST UN OUTIL D&apos;AIDE À LA DÉCISION. VOUS DEVEZ IMPÉRATIVEMENT VÉRIFIER TOUTES LES INFORMATIONS DANS LA BASE E-PHY OFFICIELLE AVANT TOUTE UTILISATION DE PRODUITS PHYTOSANITAIRES.
          </Text>
          <Text style={styles.reminderText}>
            LE DÉVELOPPEUR NE PEUT ÊTRE TENU RESPONSABLE DE TOUTE CONSÉQUENCE RÉSULTANT DE L&apos;UTILISATION DE CETTE APPLICATION.
          </Text>
        </View>
      </ScrollView>
    </LegalDocumentScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  updateDate: { color: "#687076", fontSize: 14, fontStyle: "italic", marginBottom: 20, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { color: "#0A7EA5", fontSize: 20, fontWeight: "700", marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  paragraph: { color: "#333333", fontSize: 15, lineHeight: 24, marginBottom: 12, paddingHorizontal: 20, textAlign: "justify" },
  bold: { color: "#0A7EA5", fontWeight: "600" },
  warningBox: { backgroundColor: "#FEE2E2", borderColor: "#DC2626", borderRadius: 12, borderWidth: 2, marginHorizontal: 20, marginVertical: 16, padding: 16 },
  warningTitle: { color: "#DC2626", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  warningSubtitle: { color: "#991B1B", fontSize: 16, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  warningText: { color: "#7F1D1D", fontSize: 14, lineHeight: 20, marginBottom: 8 },
  reminderBox: { backgroundColor: "#FFF7ED", borderLeftColor: "#F4830B", borderLeftWidth: 4, marginHorizontal: 20, marginVertical: 16, padding: 16 },
  reminderTitle: { color: "#C2410C", fontSize: 17, fontWeight: "700", marginBottom: 8 },
  reminderText: { color: "#9A3412", fontSize: 14, fontWeight: "600", lineHeight: 20, marginBottom: 8 },
});
