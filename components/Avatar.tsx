interface AvatarProps {
  label: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export default function Avatar({ label, size = "md" }: AvatarProps) {
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600 shrink-0`}
    >
      {label}
    </div>
  );
}
