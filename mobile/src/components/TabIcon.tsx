import Svg, { Circle, Path, Rect } from "react-native-svg";

type Props = {
  name: "home" | "courses" | "live" | "my" | "profile";
  color: string;
  size?: number;
};

export function TabIcon({ name, color, size = 22 }: Props) {
  if (name === "home") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3v-9.5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === "courses") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke={color} strokeWidth={2} />
        <Path d="M8 8h8M8 12h7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "live") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x={3} y={5} width={18} height={14} rx={3} stroke={color} strokeWidth={2} />
        <Path d="m10 9 5 3-5 3V9Z" fill={color} />
      </Svg>
    );
  }

  if (name === "my") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4h10v16l-5-3-5 3V4Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
      <Path d="M4 21a8 8 0 0 1 16 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
