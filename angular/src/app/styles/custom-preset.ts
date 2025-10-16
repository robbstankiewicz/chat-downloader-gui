import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

// Custom preset based on your existing color palette
export const CustomPreset = definePreset(Aura, {
    primitive: {
        borderRadius: {
            none: '0',
            xs: '2px',
            sm: '4px',
            md: '6px',
            lg: '8px',
            xl: '12px',
        },
    },
    semantic: {
        primary: {
            50: '#d6e3ff',
            100: '#aac7ff',
            200: '#86acf0',
            300: '#6b91d3',
            400: '#769CDF', // Your primary color
            500: '#5177b8',
            600: '#365e9d',
            700: '#285290',
            800: '#194683',
            900: '#033a77',
            950: '#001b3e',
        },
        colorScheme: {
            light: {
                primary: {
                    color: '#769CDF',
                    contrastColor: '#ffffff',
                    hoverColor: '#5177b8',
                    activeColor: '#365e9d',
                },
                surface: {
                    0: '#fefbff',
                    50: '#f2f0f3',
                    100: '#e4e2e5',
                    200: '#c7c6c9',
                    300: '#acabae',
                    400: '#919093',
                    500: '#777779',
                    600: '#5e5e61',
                    700: '#525255',
                    800: '#464649',
                    900: '#1b1b1e',
                    950: '#0d0e10',
                },
            },
            // dark: {
            //   primary: {
            //     color: '#aac7ff',
            //     contrastColor: '#001b3e',
            //     hoverColor: '#86acf0',
            //     activeColor: '#6b91d3'
            //   },
            //   surface: {
            //     0: '#0d0e10',
            //     50: '#1b1b1e',
            //     100: '#464649',
            //     200: '#525255',
            //     300: '#5e5e61',
            //     400: '#777779',
            //     500: '#919093',
            //     600: '#acabae',
            //     700: '#c7c6c9',
            //     800: '#e4e2e5',
            //     900: '#f2f0f3',
            //     950: '#fefbff'
            //   }
            // }
        },
    },
});
