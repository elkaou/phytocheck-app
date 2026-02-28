import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

interface QuantityModalProps {
  visible: boolean;
  productName: string;
  onCancel: () => void;
  onConfirm: (quantity: number, unit: "L" | "Kg") => void;
}

export function QuantityModal({
  visible,
  productName,
  onCancel,
  onConfirm,
}: QuantityModalProps) {
  const colors = useColors();
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"L" | "Kg">("L");

  const handleConfirm = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return;
    }
    onConfirm(qty, unit);
    setQuantity("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.modalView, { backgroundColor: colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Quantité en stock
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              QUANTITÉ
            </Text>
            <TextInput
              style={[
                styles.quantityInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Ex: 25"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              UNITÉ
            </Text>
            <View style={styles.unitRow}>
              <TouchableOpacity
                onPress={() => setUnit("L")}
                style={[
                  styles.unitButton,
                  {
                    backgroundColor: unit === "L" ? colors.primary : colors.surface,
                    borderColor: unit === "L" ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    { color: unit === "L" ? "white" : colors.foreground },
                  ]}
                >
                  L
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setUnit("Kg")}
                style={[
                  styles.unitButton,
                  {
                    backgroundColor: unit === "Kg" ? colors.primary : colors.surface,
                    borderColor: unit === "Kg" ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    { color: unit === "Kg" ? "white" : colors.foreground },
                  ]}
                >
                  Kg
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={onCancel}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.confirmButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  modalView: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: "100%",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  unitRow: {
    flexDirection: "row",
    gap: 8,
  },
  unitButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  unitButtonText: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  confirmButtonText: {
    textAlign: "center",
    fontWeight: "600",
    color: "white",
    fontSize: 16,
  },
});
