import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface ClosedShelterIconProps {
  size?: number;
  color?: string;
}

/** Icône compacte d'une serre tunnel contenant une plante et deux baies. */
export function ClosedShelterIcon({
  size = 22,
  color = "#86B82A",
}: ClosedShelterIconProps) {
  return (
    <Svg
      width={size}
      height={(size * 96) / 128}
      viewBox="0 0 128 96"
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="Usage sous abri fermé uniquement"
    >
      <Path
        d="M28 72V38c0-13 16-24 36-24s36 11 36 24v34M18 72h92M64 72V48"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M64 57c-8 0-13-5-13-12 8 0 13 4 13 12ZM64 51c8 0 13-5 13-12-8 0-13 4-13 12Z"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={53} cy={48} r={3.2} fill="#DC2626" />
      <Circle cx={75} cy={42} r={3.2} fill="#DC2626" />
    </Svg>
  );
}

/** Icône d’usage sous abri avec libellé accessible au maintien appuyé. */
export function ClosedShelterBadge() {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      tooltipOpacity.stopAnimation();
    };
  }, [tooltipOpacity]);

  const showTooltip = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setTooltipVisible(true);
    tooltipOpacity.stopAnimation();
    tooltipOpacity.setValue(0);
    Animated.timing(tooltipOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setTooltipVisible(false);
      });
    }, 2500);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.badge,
          pressed && { opacity: 0.72 },
        ]}
        onLongPress={showTooltip}
        delayLongPress={450}
        accessibilityRole="button"
        accessibilityLabel="Usage sous abri uniquement"
        accessibilityHint="Maintenez appuyé pour afficher le libellé"
      >
        <ClosedShelterIcon size={22} />
      </Pressable>
      {tooltipVisible ? (
        <Animated.View
          style={[styles.tooltip, { opacity: tooltipOpacity }]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipText}>Usage sous abri uniquement</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 20,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  tooltip: {
    position: "absolute",
    top: 38,
    right: 0,
    minWidth: 190,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#166534",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
