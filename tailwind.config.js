/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        forest: '#1A5C44',
        forestDeep: '#0F3D2E',
        leaf: '#4CB178',
        leafPale: '#E8F5EE',
        terra: '#D97A4D',
        amber: '#F5A623',
        amberPale: '#FFF3DC',
        cream: '#FAF6EE',
        creamDark: '#F1EBDC',
        ink: '#1F2937',
        inkMuted: '#4B5563',
        inkFaint: '#9CA3AF',
        border: '#E5E7EB',
      },
      fontFamily: {
        baloo: ['Baloo2_400Regular'],
        balooMedium: ['Baloo2_500Medium'],
        balooSemi: ['Baloo2_600SemiBold'],
        balooBold: ['Baloo2_700Bold'],
        balooExtraBold: ['Baloo2_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
