import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'language',
    'api',
    {
      type: 'category',
      label: 'API 레퍼런스',
      link: { type: 'doc', id: 'api-reference/index' },
      items: [
        'api-reference/zsl',
        'api-reference/compile',
        'api-reference/expression',
        'api-reference/evaluate',
        'api-reference/ast-snapshot',
        'api-reference/zsl-options',
        'api-reference/zsl-error',
        'api-reference/zsl-issue',
        'api-reference/error-codes',
      ],
    },
  ],
}

export default sidebars
