import { useTheme } from '../context/ThemeContext.jsx';

/*
 * Couleurs de graphiques par thème.
 * Les palettes catégorielles sont VALIDÉES (bande de luminosité, chroma,
 * séparation daltonisme, contraste ≥ 3:1 sur la surface) :
 *  - clair  : #6355F5 / #0891B2 / #EA580C sur #FFFFFF
 *  - sombre : #8577FF / #0FA3BC / #E2600D sur #12172E
 * L'attribution est fixe (la couleur suit l'entité, jamais son rang) :
 *  series[0] = utilisateurs/primaire · series[1] = réservations · series[2] = inscriptions
 */
const THEMES = {
  light: {
    series: ['#6355F5', '#0891B2', '#EA580C'],
    primary: '#6355F5',
    success: '#0FA97A',
    ink: '#565D7E',
    grid: 'rgba(18, 20, 46, 0.08)',
    cursor: 'rgba(99, 85, 245, 0.06)',
    tooltip: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #E3E6F3',
      borderRadius: '12px',
      boxShadow: '0 8px 24px -8px rgba(18, 20, 46, 0.2)',
      color: '#12142E',
      fontSize: '12.5px',
    },
  },
  dark: {
    series: ['#8577FF', '#0FA3BC', '#E2600D'],
    primary: '#8577FF',
    success: '#2BD596',
    ink: '#A9B1D6',
    grid: 'rgba(241, 243, 255, 0.08)',
    cursor: 'rgba(133, 119, 255, 0.08)',
    tooltip: {
      backgroundColor: '#10152B',
      border: '1px solid #252D52',
      borderRadius: '12px',
      boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.6)',
      color: '#F1F3FF',
      fontSize: '12.5px',
    },
  },
};

export function useChartTheme() {
  const { isDark } = useTheme();
  return THEMES[isDark ? 'dark' : 'light'];
}
