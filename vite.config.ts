import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { FAQ, FEATURES, SITE } from './src/content/site.ts'

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** What the site is, for search engines: the app, its maker and its questions and answers. */
function structuredData() {
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}#website`,
      name: SITE.name,
      url: SITE.url,
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE.url}#app`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.summary,
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any (runs in a web browser)',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: FEATURES,
      image: `${SITE.url}og-image.png`,
      inLanguage: 'en-US',
      creator: { '@type': 'Person', name: SITE.maker.name, url: SITE.maker.url },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE.url}#faq`,
      mainEntity: FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ]
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}

/**
 * The same words as the app, as plain HTML inside #root, for crawlers and AI
 * assistants that don't run JavaScript. React replaces it as soon as it starts.
 */
function readableText() {
  const features = FEATURES.map((f) => `<li>${escape(f)}.</li>`).join('')
  const faq = FAQ.map(({ q, a }) => `<h3>${escape(q)}</h3><p>${escape(a)}</p>`).join('')
  return `<div class="readable-text"><h1>${escape(SITE.name)}: ${escape(SITE.headline.toLowerCase())}</h1><p>${escape(SITE.summary)}</p><ul>${features}</ul><h2>Questions and answers</h2>${faq}<p>Made by <a href="${SITE.maker.url}">${escape(SITE.maker.name)}</a>.</p></div>`
}

/** llms.txt: a plain summary of the site for AI assistants (https://llmstxt.org). */
function llmsText() {
  return [
    `# ${SITE.name}`,
    '',
    `> ${SITE.summary}`,
    '',
    `Website: ${SITE.url}`,
    '',
    '## What it does',
    '',
    ...FEATURES.map((f) => `- ${f}.`),
    '',
    '## Questions and answers',
    '',
    ...FAQ.flatMap(({ q, a }) => [`### ${q}`, '', a, '']),
    '## Credits',
    '',
    `- Made by ${SITE.maker.name} (${SITE.maker.url}).`,
    '- Thread color data: craft-color-codes by MakeBead (https://makebead.com), CC BY 4.0.',
    '- DMC is a trademark of its owner. This site is not affiliated with DMC; thread codes are used as plain text to identify colors.',
    '',
  ].join('\n')
}

function seo(): Plugin {
  return {
    name: 'seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.filename.endsWith('index.html')) return html
        return html
          .replace(
            '<!-- structured-data -->',
            [
              `<script type="application/ld+json">${structuredData()}</script>`,
              // With JavaScript the app replaces the readable text before it shows; without, it's the page.
              `<script>document.documentElement.classList.add('js')</script>`,
              `<style>.readable-text{max-width:36rem;margin:0 auto;padding:3rem 1.25rem;font:16px/1.6 system-ui,sans-serif;color:#392d28;background:#fbf3ec}.js .readable-text{visibility:hidden}</style>`,
            ].join(''),
          )
          .replace('<div id="root"></div>', `<div id="root">${readableText()}</div>`)
      },
    },
    configureServer(server) {
      server.middlewares.use('/llms.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(llmsText())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsText() })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), seo()],
  build: {
    // 404.html is its own small page: hosts serve it for any address that doesn't exist.
    rollupOptions: { input: ['index.html', '404.html'] },
  },
})
