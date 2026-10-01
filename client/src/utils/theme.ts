export const applyThemeToBody = (theme?: string | null) => {
  const activeTheme = theme || (typeof window !== 'undefined' ? localStorage.getItem('neuro_theme') : null) || 'LIGHT_WHITE';
  const isDark = activeTheme === 'DARK' || activeTheme === 'DARK_BLACK';

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const body = document.body;

    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
      body.className = 'bg-[#121212] text-white antialiased selection:bg-[#fde047] selection:text-black dark';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      body.className = 'bg-[#fbf7ee] text-black antialiased selection:bg-[#fde047] selection:text-black';
    }
  }
};
