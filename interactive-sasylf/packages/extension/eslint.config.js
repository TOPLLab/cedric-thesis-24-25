import { config } from '@live-sasylf/eslint-config/base';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(globalIgnores(['dist/']), config);

