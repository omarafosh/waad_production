// material-ui
import { useColorScheme } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';

// ==============================|| CODE HIGHLIGHTER ||============================== //

interface SyntaxHighlightProps {
  children: string;
}

export default function SyntaxHighlight({ children }: SyntaxHighlightProps) {
  const { colorScheme } = useColorScheme();

  const style = {
    background: colorScheme === ThemeMode.DARK ? '#0b1226' : '#f8f8f8',
    color: colorScheme === ThemeMode.DARK ? '#dbeafe' : '#1f2937',
    padding: 12,
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 13,
    overflowX: 'auto'
  };

  return (
    <pre style={style}>
      <code>{children}</code>
    </pre>
  );
}
