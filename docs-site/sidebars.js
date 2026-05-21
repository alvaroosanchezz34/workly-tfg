/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '📋 Introducción',
    },
    {
      type: 'doc',
      id: 'arquitectura',
      label: '🏗️ Arquitectura',
    },
    {
      type: 'category',
      label: '⚙️ Backend',
      items: [
        'backend/api',
        'backend/autenticacion',
      ],
    },
    {
      type: 'category',
      label: '🖥️ Frontend',
      items: [
        'frontend/estructura',
        'frontend/componentes',
      ],
    },
    {
      type: 'doc',
      id: 'uso',
      label: '📖 Uso de la aplicación',
    },
    {
      type: 'doc',
      id: 'local',
      label: '🚀 Lanzamiento local',
    },
    {
      type: 'doc',
      id: 'despliegue',
      label: '☁️ Despliegue en la nube',
    },
    {
      type: 'doc',
      id: 'github',
      label: '🐙 GitHub',
    },
    {
      type: 'doc',
      id: 'decisiones',
      label: '💡 Decisiones de diseño',
    },
  ],
};

export default sidebars;
