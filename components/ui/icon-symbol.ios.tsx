import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

type IconSymbolName = SymbolViewProps["name"] | "molecule";

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
  }: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // « molecule » est un alias interne à l’application et non un nom SF Symbol.
  // Sans conversion, SymbolView ne rend rien sur iOS. « atom » est un SF Symbol
  // natif disponible sur les versions iOS ciblées par l’application.
  const symbolName = (name === "molecule" ? "atom" : name) as SymbolViewProps["name"];

  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={symbolName}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
