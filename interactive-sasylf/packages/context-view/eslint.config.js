import { config } from '@live-sasylf/eslint-config/solid';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(globalIgnores(['dist/']), config);
