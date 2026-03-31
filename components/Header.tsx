import Link from "next/link";

interface HeaderProps {
  title: string;
  back?: string;
  right?: React.ReactNode;
}

export default function Header({ title, back, right }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div className="w-16">
        {back && (
          <Link href={back} className="text-sm text-gray-500 hover:text-gray-900">
            ← Back
          </Link>
        )}
      </div>
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="w-16 flex justify-end">{right}</div>
    </header>
  );
}
