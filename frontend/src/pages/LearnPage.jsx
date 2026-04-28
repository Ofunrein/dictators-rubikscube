/**
 * LearnPage.jsx — /learn route
 *
 * Reserved for Eric Solano's general learning modules.
 * Implement your content here.
 */
import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';

export default function LearnPage() {
  const { isDark } = useTheme();

  const bg = isDark ? 'bg-dictator-void text-white' : 'bg-dictator-smoke text-dictator-ink';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bg}`}>
      <PageNavbar />
      {/* TODO: Eric Solano — implement general learning modules here */}
    </div>
  );
}
