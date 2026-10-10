import { useEffect, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  formatStockWithdrawalDate,
  formatStockWithdrawalRemainingDays,
  type StockWithdrawalWarning,
} from "@/lib/stock-withdrawal-warning";

interface StockWithdrawalWarningModalProps {
  visible: boolean;
  warnings: StockWithdrawalWarning[];
  onClose: (acknowledge: boolean) => void;
}

export function StockWithdrawalWarningModal({
  visible,
  warnings,
  onClose,
}: StockWithdrawalWarningModalProps) {
  const [acknowledge, setAcknowledge] = useState(false);

  useEffect(() => {
    if (visible) setAcknowledge(false);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(acknowledge)}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.heading}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="warning-amber" size={30} color="#B45309" />
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>Retrait à anticiper</Text>
              <Text style={styles.subtitle}>
                {warnings.length} produit{warnings.length > 1 ? "s seront" : " sera"} retiré
                {warnings.length > 1 ? "s" : ""} dans les trois prochains mois.
              </Text>
            </View>
          </View>

          <ScrollView style={styles.warningList} contentContainerStyle={styles.warningListContent}>
            {warnings.map((warning) => (
              <View key={`${warning.amm}:${warning.withdrawalDate}`} style={styles.warningCard}>
                <Text style={styles.productName}>{warning.productName}</Text>
                <Text style={styles.amm}>AMM {warning.amm}</Text>
                <Text style={styles.withdrawalDate}>
                  Retrait prévu le {formatStockWithdrawalDate(warning.withdrawalDate)}
                </Text>
                <View style={styles.remainingPill}>
                  <MaterialIcons name="schedule" size={16} color="#B45309" />
                  <Text style={styles.remainingText}>
                    {formatStockWithdrawalRemainingDays(warning.daysRemaining)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.checkboxRow, pressed && { opacity: 0.72 }]}
            onPress={() => setAcknowledge((current) => !current)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledge }}
            accessibilityLabel="Je suis averti, ne plus afficher ces retraits"
          >
            <View style={[styles.checkbox, acknowledge && styles.checkboxChecked]}>
              {acknowledge ? <MaterialIcons name="check" size={17} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.checkboxLabel}>Je suis averti, ne plus afficher ces retraits</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.86, transform: [{ scale: 0.98 }] }]}
            onPress={() => onClose(acknowledge)}
            accessibilityRole="button"
            accessibilityLabel={acknowledge ? "Enregistrer et fermer" : "Fermer l’alerte"}
          >
            <Text style={styles.closeButtonText}>{acknowledge ? "Enregistrer et fermer" : "Fermer"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(15, 23, 42, 0.58)",
  },
  modal: {
    maxHeight: "82%",
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  heading: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconCircle: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#FEF3C7",
  },
  headingCopy: { flex: 1 },
  title: { color: "#1F2937", fontSize: 21, fontWeight: "800" },
  subtitle: { marginTop: 4, color: "#6B7280", fontSize: 14, lineHeight: 20 },
  warningList: { maxHeight: 310 },
  warningListContent: { gap: 10 },
  warningCard: {
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 13,
    backgroundColor: "#FFFBEB",
  },
  productName: { color: "#1F2937", fontSize: 16, fontWeight: "700" },
  amm: { marginTop: 2, color: "#92400E", fontSize: 12, fontWeight: "700" },
  withdrawalDate: { marginTop: 8, color: "#78350F", fontSize: 13, lineHeight: 18 },
  remainingPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
  },
  remainingText: { color: "#92400E", fontSize: 12, fontWeight: "700" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#B45309",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: { backgroundColor: "#B45309" },
  checkboxLabel: { flex: 1, color: "#374151", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  closeButton: {
    alignItems: "center",
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#B45309",
  },
  closeButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
