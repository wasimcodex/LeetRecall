import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup.js'),
                background: resolve(__dirname, 'src/background.js'),
                content: resolve(__dirname, 'src/content.js'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        },
        outDir: 'dist'
    },
    publicDir: '.'
});
