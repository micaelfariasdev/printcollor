import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      // iOS 9 Safari (iPad mini antigo) como floor mínimo.
      // iOS 10+ é automaticamente suportado por ser mais novo.
      targets: {
        ios: '9',
        safari: '9',
      },
      // Safari 9 NÃO tem Promise/Symbol/Map/Set nativamente.
      // NEM 'fetch' nem 'url' aqui: core-js@3 mudou paths, plugin-legacy
      // (v7) quebra tentando resolver. Safari 9.0+ tem fetch e URLSearchParams
      // nativos, então não precisa de polyfill externo pra eles.
      polyfills: [
        'es.symbol',
        'es.promise',
        'es.array.iterator',
        'es.map',
        'es.set',
        'es.object.assign',
        'es.object.keys',
        'es.string.includes',
        'es.string.starts-with',
        'es.string.ends-with',
        'es.array.includes',
        'es.array.from',
      ],
      modernPolyfills: true,
      renderLegacyChunks: true,
      // Garante que o Babel transpile pra ES5 (Safari 9 não suporta ES2015+ em tudo)
      // Por padrão já faz isso com esses targets.
    }),
  ],
  build: {
    // Força o esbuild (usado por Vite pra módulos não-legacy) a não gerar
    // sintaxe que Safari 9 não entende, mesmo no bundle "modern".
    target: 'es2015',
  },
})
