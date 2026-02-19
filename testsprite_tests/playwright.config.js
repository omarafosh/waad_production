import { defineConfig } from '@playwright/test';

export default defineConfig({
    // نجعل Playwright يبحث فقط عن اختبارات E2E
    testDir: './frontend',

    // تجاهل اختبارات React Unit Tests
    testIgnore: ['**/__tests__/**'],

    use: {
        headless: true
    }
});
