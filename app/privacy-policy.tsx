import { ScrollView, StyleSheet, Text } from "react-native";

import { LegalDocumentScreen } from "@/components/legal-document-screen";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen document={LEGAL_DOCUMENTS.privacy}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <Text style={styles.updateDate}>Version intégrée — dernière mise à jour : 20 février 2026</Text>

        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.paragraph}>
          PhytoCheck est une application mobile développée par François Courouble qui permet de vérifier l&apos;homologation des produits phytosanitaires en France. Cette politique explique comment l&apos;application collecte, utilise et protège vos données.
        </Text>

        <Text style={styles.sectionTitle}>Données collectées</Text>
        <Text style={styles.subsectionTitle}>Données personnelles</Text>
        <Text style={styles.paragraph}>
          PhytoCheck <Text style={styles.bold}>ne collecte aucune donnée personnelle identifiable</Text>. L&apos;application ne demande ni ne stocke vos nom, prénom, coordonnées, adresse e-mail, numéro de téléphone ou localisation géographique.
        </Text>
        <Text style={styles.subsectionTitle}>Données d&apos;utilisation</Text>
        <Text style={styles.paragraph}>
          L&apos;application conserve localement sur votre appareil la liste de produits en stock, l&apos;historique de recherches et le statut Premium. Ces données restent sur votre appareil selon les fonctionnalités utilisées.
        </Text>

        <Text style={styles.sectionTitle}>Permissions demandées</Text>
        <Text style={styles.subsectionTitle}>Appareil photo</Text>
        <Text style={styles.paragraph}>
          L&apos;accès à l&apos;appareil photo est demandé uniquement pour scanner les étiquettes de produits phytosanitaires. Vous pouvez refuser cette permission et utiliser la recherche manuelle à la place.
        </Text>

        <Text style={styles.sectionTitle}>Utilisation et partage des données</Text>
        <Text style={styles.paragraph}>
          Les données servent exclusivement à vérifier l&apos;homologation des produits, gérer votre stock personnel et administrer les abonnements Premium. Les photos utilisées pour la reconnaissance d&apos;étiquette sont traitées temporairement pour cette analyse.
        </Text>

        <Text style={styles.sectionTitle}>Base de données E-Phy</Text>
        <Text style={styles.paragraph}>
          L&apos;application utilise la base publique E-Phy. Les informations sont mises à jour régulièrement et restent consultables hors ligne après téléchargement des données de l&apos;application.
        </Text>

        <Text style={styles.sectionTitle}>Droits des utilisateurs</Text>
        <Text style={styles.paragraph}>
          Conformément au RGPD, vous pouvez accéder à vos données stockées sur l&apos;appareil, les supprimer et les exporter lorsque cette fonctionnalité est disponible.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.paragraph}>
          Pour toute question concernant cette politique de confidentialité, contactez François Courouble à l&apos;adresse francois@siteswebs.fr ou sur https://phytocheck.com.
        </Text>

        <Text style={styles.sectionTitle}>Conformité</Text>
        <Text style={styles.paragraph}>
          Cette application est conçue dans le respect du RGPD, de la politique de confidentialité de Google Play et de la Loi Informatique et Libertés française.
        </Text>
      </ScrollView>
    </LegalDocumentScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  updateDate: { color: "#687076", fontSize: 14, fontStyle: "italic", marginBottom: 20, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { color: "#0A7EA5", fontSize: 20, fontWeight: "700", marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  subsectionTitle: { color: "#1A1A1A", fontSize: 17, fontWeight: "600", marginTop: 16, marginBottom: 8, paddingHorizontal: 20 },
  paragraph: { color: "#333333", fontSize: 15, lineHeight: 24, marginBottom: 12, paddingHorizontal: 20, textAlign: "justify" },
  bold: { color: "#0A7EA5", fontWeight: "600" },
});
