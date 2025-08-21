import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
// Extend expect with jest-dom matchers
expect.extend(matchers);
// Clean up after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});
// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});
// Mock ResizeObserver for components that use it
global.ResizeObserver = class ResizeObserver {
    constructor(_cb) {
        // Mock implementation
    }
    observe() {
        return null;
    }
    unobserve() {
        return null;
    }
    disconnect() {
        return null;
    }
};
// Mock IntersectionObserver for components that use it
global.IntersectionObserver = class IntersectionObserver {
    constructor(_cb) {
        this.root = null;
        this.rootMargin = '';
        this.thresholds = [];
        // Mock implementation
    }
    observe() {
        return null;
    }
    unobserve() {
        return null;
    }
    disconnect() {
        return null;
    }
    takeRecords() {
        return [];
    }
};
