import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

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
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<"L" | "Kg">("L");

  const handleConfirm = () => {
    const qty = parseFloat(quantity) || 1;
    onConfirm(qty, selectedUnit);
    setQuantity(""); // Reset for next time
    setSelectedUnit("L"); // Reset to default
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.centeredView}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Ajouter au stock</Text>
              <Text style={styles.modalSubtitle}>{productName}</Text>

              <Text style={styles.label}>Quantité :</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                placeholder="1"
                autoFocus
                selectTextOnFocus
              />

              {/* Row 1: L and Kg buttons */}
              <View style={styles.unitRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.unitButton,
                    selectedUnit === "L" && styles.unitButtonSelected,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => setSelectedUnit("L")}
                >
                  <Text style={[
                    styles.unitButtonText,
                    selectedUnit === "L" && styles.unitButtonTextSelected,
                  ]}>L</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.unitButton,
                    selectedUnit === "Kg" && styles.unitButtonSelected,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => setSelectedUnit("Kg")}
                >
                  <Text style={[
                    styles.unitButtonText,
                    selectedUnit === "Kg" && styles.unitButtonTextSelected,
                  ]}>Kg</Text>
                </Pressable>
              </View>

              {/* Row 2: Ajouter and Annuler buttons */}
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.confirmButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>Ajouter</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.cancelButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </Pressable>
              </View>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  modalView: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#687076",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  unitRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  unitButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  unitButtonSelected: {
    backgroundColor: "#0a7ea5",
    borderColor: "#0a7ea5",
  },
  unitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#687076",
  },
  unitButtonTextSelected: {
    color: "#FFFFFF",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#687076",
  },
  confirmButton: {
    backgroundColor: "#0a7ea5",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
