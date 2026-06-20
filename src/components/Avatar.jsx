export default function Avatar({ size = 32 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: "linear-gradient(135deg, #9a5c1e 0%, #5c300a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.floor(size * 0.28),
        fontWeight: 700,
        color: "#fde8c0",
        letterSpacing: "0.5px",
        border: `${size > 36 ? 2 : 1.5}px solid #c47c30`,
        boxShadow: `0 0 ${size * 0.4}px rgba(196,124,48,0.3)`,
      }}
    >
      MC
    </div>
  );
}
