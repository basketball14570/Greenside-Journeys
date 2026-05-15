import Image from "next/image";

type Variant = "horizontal" | "horizontal-light" | "icon" | "stacked";

const SRC: Record<Variant, string> = {
  horizontal: "/brand/greenside-journeys-horizontal.svg",
  "horizontal-light": "/brand/greenside-journeys-horizontal-light.svg",
  icon: "/brand/greenside-journeys-icon.svg",
  stacked: "/brand/greenside-journeys-logo.svg",
};

export function Logo({
  variant = "horizontal",
  height = 32,
  className = "",
}: {
  variant?: Variant;
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src={SRC[variant]}
      alt="Greenside Edge"
      height={height}
      width={height * 4}
      className={className}
      priority
    />
  );
}
