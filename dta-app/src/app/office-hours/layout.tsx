export default function OfficeHoursLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div data-office-hours-page className="flex flex-1 flex-col">{children}</div>;
}
