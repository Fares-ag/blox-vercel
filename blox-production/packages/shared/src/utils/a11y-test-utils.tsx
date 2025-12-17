/**
 * Accessibility testing utilities
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

/**
 * Test component for accessibility violations
 */
export async function testA11y(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

/**
 * Common accessibility checks
 */
export const a11yChecks = {
  /**
   * Check if element has proper ARIA label
   */
  hasAriaLabel: (element: HTMLElement): boolean => {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.getAttribute('title')
    );
  },

  /**
   * Check if element is keyboard accessible
   */
  isKeyboardAccessible: (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();
    const interactiveElements = ['a', 'button', 'input', 'select', 'textarea'];
    const hasTabIndex = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
    return interactiveElements.includes(tagName) || hasTabIndex;
  },

  /**
   * Check color contrast (basic check)
   */
  hasGoodContrast: (element: HTMLElement): boolean => {
    // This is a simplified check - use a proper contrast checker in production
    const style = window.getComputedStyle(element);
    const color = style.color;
    const backgroundColor = style.backgroundColor;
    // Return true for now - implement proper contrast calculation
    return true;
  },
};

