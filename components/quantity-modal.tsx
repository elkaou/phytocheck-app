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
  const [quantity, setQuantity] = useState("1");

  const handleConfirm = (unit: "L" | "Kg") => {
    const qty = parseFloat(quantity) || 1;
    onConfirm(qty, unit);
    setQuantity("1"); // Reset for next time
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

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.confirmButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => handleConfirm("L")}
                >
                  <Text style={styles.confirmButtonText}>Ajouter (L)</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.confirmButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => handleConfirm("Kg")}
                >
                  <Text style={styles.confirmButtonText}>Ajouter (Kg)</Text>
                </Pressable>
              </View>
            </View>
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
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
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
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
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
