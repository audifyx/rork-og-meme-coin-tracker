import { useState } from 'react';
import { ThemeSelector } from '@/components/ThemeSelector';

export default function SettingsPage() {
  const [theme, setTheme] = useState('og-cyber');

  const handleThemeChange = (id: string) => {
    setTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    // Add logic to save to Supabase here
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
      <ThemeSelector currentTheme={theme} onSelect={handleThemeChange} />
    </div>
  );
}
