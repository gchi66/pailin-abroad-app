export const theme = {
  colors: {
    background: '#F7FAFD',
    surface: '#FFFFFF',
    text: '#1E1E1E',
    mutedText: '#3D3D3D',
    primary: '#FF4545',
    error: '#FF4545',
    accent: '#3CA0FE',
    accentSurface: '#F8FCFF',
    accentMuted: '#DCEEFF',
    success: '#CDEB8B',
    warningSurface: '#FFF4E8',
    border: '#1E1E1E',
    shadow: '#1E1E1E',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radii: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 999,
  },

  typography: {
    fonts: {
      en: 'Poppins',
      th: 'Anuphan',
    },
    fontFaces: {
      en: {
        regular: 'Poppins',
        medium: 'Poppins-Medium',
        semibold: 'Poppins-SemiBold',
        bold: 'Poppins-Bold',
      },
      th: {
        regular: 'Anuphan',
        medium: 'Anuphan-Medium',
        semibold: 'Anuphan-SemiBold',
        bold: 'Anuphan-Bold',
      },
    },

    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 28,
      '2xl': 36,
    },

    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    lineHeights: {
      sm: 18,
      md: 24,
      lg: 30,
      xl: 42,
    },
  },
} as const;
