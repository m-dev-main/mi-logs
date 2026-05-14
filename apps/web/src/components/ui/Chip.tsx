type ChipProps = {
  label: string;
};

export function Chip({ label }: ChipProps) {
  return <span className="chip">{label}</span>;
}
