export default function OfficeHoursLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div data-office-hours-page>{children}</div>;
}
