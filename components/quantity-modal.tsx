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
  const [quantityL, setQuantityL] = useState("");
  const [quantityKg, setQuantityKg] = useState("");

  const handleConfirm = () => {
    const qtyL = parseFloat(quantityL) || 0;
    const qtyKg = parseFloat(quantityKg) || 0;
    
    if (qtyL > 0) {
      onConfirm(qtyL, "L");
    } else if (qtyKg > 0) {
      onConfirm(qtyKg, "Kg");
    } else {
      // Si aucune quantité n'est saisie, ne rien faire
      return;
    }
    
    setQuantityL(""); // Reset for next time
    setQuantityKg(""); // Reset for next time
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

              {/* Row 1: Two input fields for L and Kg */}
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>L</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={quantityL}
                    onChangeText={(text) => {
                      setQuantityL(text);
                      if (text) setQuantityKg(""); // Vider Kg si L est rempli
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    selectTextOnFocus
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Kg</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={quantityKg}
                    onChangeText={(text) => {
                      setQuantityKg(text);
                      if (text) setQuantityL(""); // Vider L si Kg est rempli
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    selectTextOnFocus
                  />
                </View>
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
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  quantityInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlign: "center",
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
