import { statSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import type { Config } from '@docusaurus/types'
import type { Options, ThemeConfig } from '@docusaurus/preset-classic'
import type { Root } from 'mdast'
import { visit } from 'unist-util-visit'
import packageManifest from '../package.json'

const organizationName = 'brainz-thbak'
const projectName = 'zenius-scripting-language'
const repositoryUrl = `https://github.com/${organizationName}/${projectName}`
const repositoryRoot = resolve(__dirname, '..')
const docsRoute = 'docs'
const repositoryOnlyFolders = ['adr', 'roadmap']
const repositoryOnlyFiles = ['ebnf.md', 'verification.md']
const basePath = process.env.ZSL_BASE_URL?.replace(/^\/+|\/+$/g, '')
const baseUrl = basePath ? `/${basePath}/` : '/'

function resolveRepositoryLinks() {
  return (tree: Root, file: { path?: string }) => {
    const source = file.path
    if (!source) return

    visit(tree, (node) => {
      if (node.type !== 'link' && node.type !== 'definition') return

      const match = /^([^?#]+)(.*)$/.exec(node.url)
      if (!match || /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(node.url)) return

      const [, linkPath, suffix] = match
      const target = resolve(dirname(source), linkPath)
      const repoPath = relative(repositoryRoot, target).split(sep).join('/')
      const isRepositoryOnlyDoc =
        repositoryOnlyFiles.some((name) => repoPath === `docs/${name}`) ||
        repositoryOnlyFolders.some(
          (name) =>
            repoPath === `docs/${name}` || repoPath.startsWith(`docs/${name}/`),
        )

      if (
        isRepositoryOnlyDoc ||
        /^(?:package\.json$|(?:src|tests)\/)/.test(repoPath)
      ) {
        const entry = statSync(target, { throwIfNoEntry: false })
        if (!entry) return

        const view = entry.isDirectory() ? 'tree' : 'blob'
        node.url = `${repositoryUrl}/${view}/main/${repoPath}${suffix}`
      }
    })
  }
}

const config: Config = {
  title: 'ZSL',
  url: process.env.ZSL_SITE_URL || `https://${organizationName}.github.io`,
  baseUrl,
  organizationName,
  projectName,
  customFields: {
    zslVersion: packageManifest.version,
  },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: docsRoute,
          sidebarPath: './sidebars.ts',
          exclude: [
            ...repositoryOnlyFolders.map((name) => `${name}/**`),
            ...repositoryOnlyFiles,
          ],
          beforeDefaultRemarkPlugins: [resolveRepositoryLinks],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
    },
    navbar: {
      title: 'ZSL',
      items: [
        { to: '/', label: 'Playground', exact: true, position: 'right' },
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          label: '문서',
          position: 'right',
        },
      ],
    },
  } satisfies ThemeConfig,
}

export default config
