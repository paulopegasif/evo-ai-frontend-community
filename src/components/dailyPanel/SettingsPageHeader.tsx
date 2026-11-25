interface SettingsPageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SettingsPageHeader({ title, subtitle }: SettingsPageHeaderProps) {
  return (
    <div>
      <h1 className="font-semibold text-xl md:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}
