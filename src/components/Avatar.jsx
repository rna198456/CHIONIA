import { T } from "../utils/theme";

export default function Avatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(145deg, #a06020 0%, #5c2e08 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.max(10, Math.floor(size * 0.3)),
      fontWeight: 600, color: T.amberText,
      fontFamily: T.fontBase,
      border: `1.5px solid ${T.amberDim}`,
      letterSpacing: "0.03em",
      userSelect: "none",
    }}>
      MC
    </div>
  );
}
