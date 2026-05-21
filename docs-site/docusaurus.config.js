// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Workly',
  tagline: 'Documentación del proyecto TFG — Plataforma de gestión para freelancers',
  favicon: 'img/favicon.ico',

  url: 'https://workly-docs.vercel.app',
  baseUrl: '/',

  organizationName: 'sanchezdevelop',
  projectName: 'workly-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/workly-social.png',
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Workly',
        logo: {
          alt: 'Workly Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentación',
          },
          {
            href: 'https://github.com/sanchezdevelop/workly-tfg',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentación',
            items: [
              { label: 'Introducción', to: '/' },
              { label: 'Arquitectura', to: '/arquitectura' },
              { label: 'Backend', to: '/backend/api' },
              { label: 'Frontend', to: '/frontend/estructura' },
            ],
          },
          {
            title: 'Proyecto',
            items: [
              { label: 'Lanzamiento local', to: '/local' },
              { label: 'Despliegue en la nube', to: '/despliegue' },
              { label: 'GitHub', to: '/github' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Álvaro Sánchez — TFG DAW`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'sql', 'json', 'yaml'],
      },
    }),
};

export default config;
