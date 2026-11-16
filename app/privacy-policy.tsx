import { ScrollView, StyleSheet, Text } from "react-native";

import { LegalDocumentScreen } from "@/components/legal-document-screen";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen document={LEGAL_DOCUMENTS.privacy}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <Text style={styles.updateDate}>Version intégrée — dernière mise à jour : 14 novembre 2026</Text>

        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.paragraph}>
          PhytoCheck est une application mobile développée par François Courouble. Elle permet de vérifier l&apos;homologation de produits phytosanitaires en France, de gérer un stock local et, lorsque vous le demandez, d&apos;analyser des photos d&apos;étiquettes. Cette politique explique quelles données sont traitées, pourquoi elles le sont et comment exercer vos droits.
        </Text>

        <Text style={styles.sectionTitle}>Compte utilisateur</Text>
        <Text style={styles.paragraph}>
          PhytoCheck ne propose pas de parcours de création de compte utilisateur dans l&apos;application mobile. L&apos;utilisation courante ne nécessite donc pas de renseigner un nom, une adresse e-mail ou un mot de passe. Les abonnements Premium sont gérés par Google Play Billing ou par Apple selon la plateforme ; PhytoCheck ne collecte ni ne stocke les données bancaires utilisées par ces plateformes.
        </Text>

        <Text style={styles.sectionTitle}>Données collectées</Text>
        <Text style={styles.subsectionTitle}>Données conservées sur l&apos;appareil</Text>
        <Text style={styles.paragraph}>
          La liste des produits en stock, les cultures déclarées, les réglages, le cache local, une partie du compteur de recherches et le statut Premium local sont conservés sur votre appareil. Ces données sont généralement supprimées lors de la désinstallation, selon le fonctionnement du système d&apos;exploitation et de ses sauvegardes.
        </Text>
        <Text style={styles.subsectionTitle}>Identifiant technique</Text>
        <Text style={styles.paragraph}>
          Pour gérer le quota de recherches gratuites, PhytoCheck utilise l&apos;Android ID sur Android et l&apos;identifiant vendeur (IDFV) sur iOS. Cet identifiant n&apos;est pas utilisé pour la publicité, le profilage ou la géolocalisation. Il est transmis de manière chiffrée à l&apos;API PhytoCheck hébergée sur Render et associé au compteur de recherches, au statut Premium et aux dates de synchronisation.
        </Text>
        <Text style={styles.subsectionTitle}>Photos d&apos;étiquettes</Text>
        <Text style={styles.paragraph}>
          Lorsque vous lancez une analyse par photo, la photo est transmise temporairement au serveur d&apos;analyse sécurisé afin d&apos;extraire le nom du produit et son numéro AMM. Elle est supprimée après le traitement de la demande, sous réserve des journaux techniques indispensables au fonctionnement et à la sécurité du service.
        </Text>

        <Text style={styles.sectionTitle}>Permissions demandées</Text>
        <Text style={styles.subsectionTitle}>Appareil photo</Text>
        <Text style={styles.paragraph}>
          L&apos;accès à l&apos;appareil photo ou à la galerie est facultatif et sert uniquement à scanner les étiquettes de produits phytosanitaires. Vous pouvez refuser ces permissions et utiliser la recherche manuelle à la place.
        </Text>

        <Text style={styles.sectionTitle}>Utilisation et transmission des données</Text>
        <Text style={styles.paragraph}>
          Les données servent à fournir les recherches réglementaires, gérer localement le stock, synchroniser le compteur de recherches gratuites et l&apos;état Premium, analyser les photos demandées et assurer la maintenance et la sécurité du service. Les données techniques du compteur et les demandes d&apos;analyse photo sont transmises à l&apos;infrastructure PhytoCheck hébergée par Render, qui agit comme prestataire technique pour le compte de PhytoCheck. Les données ne sont pas vendues ni utilisées à des fins publicitaires ou de profilage.
        </Text>

        <Text style={styles.sectionTitle}>Sécurité et conservation</Text>
        <Text style={styles.paragraph}>
          Les communications avec les serveurs PhytoCheck utilisent HTTPS/TLS. L&apos;identifiant technique est conservé dans le stockage sécurisé d&apos;iOS lorsqu&apos;il y est enregistré localement. Les données techniques serveur sont conservées tant qu&apos;elles sont nécessaires au quota, à l&apos;abonnement et à la sécurité du service.
        </Text>

        <Text style={styles.sectionTitle}>Sources de données réglementaires</Text>
        <Text style={styles.paragraph}>
          L&apos;application utilise la base publique E‑Phy de l&apos;Anses pour les produits, leurs usages et leur statut. Elle consulte également la page officielle du ministère de l&apos;Agriculture et de la Souveraineté alimentaire pour les autorisations d&apos;urgence de 120 jours prévues par l&apos;article 53 du règlement (CE) n°1107/2009. Ces informations publiques sont mises à jour régulièrement et restent consultables hors ligne après leur téléchargement dans l&apos;application.
        </Text>

        <Text style={styles.sectionTitle}>Droits des utilisateurs et suppression</Text>
        <Text style={styles.paragraph}>
          Conformément au RGPD et aux textes applicables, vous pouvez demander l&apos;accès, la rectification, la limitation ou la suppression des données personnelles ou techniques vous concernant. Pour demander la suppression des données serveur liées à l&apos;identifiant technique, écrivez à francois@siteswebs.fr en indiquant la plateforme, le modèle de l&apos;appareil et la date approximative d&apos;utilisation. La suppression peut empêcher la synchronisation du quota et nécessiter une nouvelle initialisation du compteur. Les données locales peuvent être supprimées depuis les fonctions de l&apos;application ou en désinstallant l&apos;application.
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
