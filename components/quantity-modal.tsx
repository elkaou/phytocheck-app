import React, { useEffect, useState } from "react";
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
import {
  formatStockQuantity,
  normalizeStockQuantityInput,
  parseStockQuantity,
} from "@/lib/quantity";
import type { StockUnit } from "@/lib/product-quantity-unit";

interface QuantityModalProps {
  visible: boolean;
  productName: string;
  mode?: "add" | "edit";
  initialQuantity?: number;
  unit: StockUnit;
  onCancel: () => void;
  onConfirm: (quantity: number, unit: StockUnit) => void;
}

export function QuantityModal({
  visible,
  productName,
  mode = "add",
  initialQuantity,
  unit,
  onCancel,
  onConfirm,
}: QuantityModalProps) {
  const colors = useColors();
  const resolvedUnit: StockUnit = unit === "Kg" ? "Kg" : "L";
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuantity(
        initialQuantity !== undefined
          ? formatStockQuantity(initialQuantity)
          : "",
      );
      setError(null);
    }
  }, [visible, initialQuantity]);

  const handleConfirm = () => {
    const qty = parseStockQuantity(quantity, mode === "edit");
    if (qty === null) {
      setError(
        mode === "edit"
          ? "Saisissez une quantité valide (0 pour retirer le produit)."
          : "Saisissez une quantité supérieure à 0.",
      );
      return;
    }
    onConfirm(qty, resolvedUnit);
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
        <View
          style={[styles.modalView, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {mode === "edit" ? "Modifier la quantité" : "Quantité en stock"}
          </Text>

          {mode === "edit" && (
            <Text style={[styles.helperText, { color: colors.muted }]}>
              Saisissez la quantité totale présente dans votre stock. Entrez 0
              pour retirer le produit.
            </Text>
          )}

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
              placeholder="Ex. 25 ou 0,6"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={(value) => {
                setQuantity(normalizeStockQuantityInput(value));
                setError(null);
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              placeholderTextColor={colors.muted}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View
            style={[
              styles.unitInfo,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              UNITÉ AUTOMATIQUE
            </Text>
            <Text style={[styles.unitInfoText, { color: colors.foreground }]}>
              {resolvedUnit} — déterminée selon la formulation du produit
            </Text>
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
              <Text
                style={[styles.cancelButtonText, { color: colors.foreground }]}
              >
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.confirmButtonText}>
                {mode === "edit" ? "Enregistrer" : "Ajouter"}
              </Text>
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
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 18,
  },
  unitInfo: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 4,
  },
  unitInfoText: {
    fontSize: 16,
    fontWeight: "700",
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
