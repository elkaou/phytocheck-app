// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconSymbolName = SymbolViewProps["name"] | "molecule";

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  magnifyingglass: "search",
  "archivebox.fill": "inventory",
  "star.fill": "star",
  "info.circle.fill": "info",
  "camera.fill": "camera-alt",
  "arrow.left": "arrow-back",
  "plus.circle.fill": "add-circle",
  "trash.fill": "delete",
  "xmark.circle.fill": "cancel",
  "checkmark.circle.fill": "check-circle",
  circle: "radio-button-unchecked",
  "exclamationmark.triangle.fill": "warning",
  "doc.text.fill": "description",
  "leaf.fill": "eco",
  // `hub` n’est pas rendu de façon fiable par la police Material Icons sur iOS.
  // `science` est disponible sur iOS et Android et évoque clairement une
  // matière active / une molécule.
  molecule: "science",
  "list.bullet": "format-list-bulleted",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "arrow.clockwise": "refresh",
} as unknown as Record<
  IconSymbolName,
  ComponentProps<typeof MaterialIcons>["name"]
>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
