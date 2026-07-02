import Link from 'next/link';

type LogoProps = {
  href?: string;
  light?: boolean;
};

export function Logo({ href = '/', light = false }: LogoProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-3 text-lg font-extrabold leading-none ${
        light ? 'text-white' : 'text-slate-950'
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-extrabold ${
          light ? 'bg-white text-slate-950' : 'bg-slate-950 text-white'
        }`}
      >
        TH
      </span>
      <span className="block leading-none">Ticket Hub</span>
    </Link>
  );
}
