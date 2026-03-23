import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { execSync } from 'child_process';

let commitHash = 'dev';
try {
	commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* not in a git repo */ }

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__COMMIT_HASH__: JSON.stringify(commitHash)
	},
	test: {
		include: ['src/**/*.test.ts']
	}
});
