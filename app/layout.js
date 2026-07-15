import './globals.css';

export const metadata = {
  title: 'Creator Pulse — TikTok Analytics',
  description: 'Dashboard performa video creator TikTok kerjasama.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
