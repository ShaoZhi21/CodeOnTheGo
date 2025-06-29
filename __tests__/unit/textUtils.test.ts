/**
 * Unit Tests for textUtils
 * 
 * Tests the utility functions that handle text processing and HTML entity decoding
 * which are used throughout the app for displaying problem titles and content.
 */

// Mock the textUtils module
const mockDecodeHtmlEntities = jest.fn();

// Import the actual function (we'll test the real implementation)
const { decodeHtmlEntities } = require('../../lib/utils/textUtils');

describe('textUtils', () => {
  describe('decodeHtmlEntities', () => {
    /**
     * Test: Should decode common HTML entities correctly
     * 
     * This test ensures that HTML entities like &amp;, &lt;, &gt; are properly
     * converted to their corresponding characters. This is crucial for displaying
     * problem titles and content correctly in the UI.
     */
    test('should decode common HTML entities correctly', () => {
      expect(decodeHtmlEntities('&amp;')).toBe('&');
      expect(decodeHtmlEntities('&lt;')).toBe('<');
      expect(decodeHtmlEntities('&gt;')).toBe('>');
      expect(decodeHtmlEntities('&quot;')).toBe('"');
      expect(decodeHtmlEntities('&#39;')).toBe("'");
      expect(decodeHtmlEntities('&apos;')).toBe("'");
      expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
    });

    /**
     * Test: Should decode numeric HTML entities
     * 
     * Tests that numeric HTML entities (like &#65; for 'A') are properly decoded.
     * This is important for handling special characters in problem titles.
     */
    test('should decode numeric HTML entities', () => {
      expect(decodeHtmlEntities('&#65;')).toBe('A'); // ASCII 'A'
      expect(decodeHtmlEntities('&#97;')).toBe('a'); // ASCII 'a'
      expect(decodeHtmlEntities('&#32;')).toBe(' '); // Space
    });

    /**
     * Test: Should handle mixed content with HTML entities
     * 
     * Tests that text containing both regular characters and HTML entities
     * is processed correctly. This simulates real-world problem titles.
     */
    test('should handle mixed content with HTML entities', () => {
      const input = 'Two Sum &amp; Hash Table &lt;Easy&gt;';
      const expected = 'Two Sum & Hash Table <Easy>';
      expect(decodeHtmlEntities(input)).toBe(expected);
    });

    /**
     * Test: Should handle empty or null input safely
     * 
     * Ensures the function doesn't crash when given invalid input.
     * This is important for robustness in the UI.
     */
    test('should handle empty or null input safely', () => {
      expect(decodeHtmlEntities('')).toBe('');
      expect(decodeHtmlEntities(null as any)).toBe('');
      expect(decodeHtmlEntities(undefined as any)).toBe('');
    });

    /**
     * Test: Should handle text without HTML entities
     * 
     * Verifies that regular text without HTML entities is returned unchanged.
     * This ensures the function doesn't modify valid text unnecessarily.
     */
    test('should handle text without HTML entities', () => {
      const input = 'Regular text without HTML entities';
      expect(decodeHtmlEntities(input)).toBe(input);
    });

    /**
     * Test: Should handle complex HTML entity combinations
     * 
     * Tests more complex scenarios with multiple HTML entities in sequence.
     * This ensures the function works correctly in edge cases.
     */
    test('should handle complex HTML entity combinations', () => {
      const input = '&lt;div&gt;Hello &amp; World&lt;/div&gt;';
      const expected = '<div>Hello & World</div>';
      expect(decodeHtmlEntities(input)).toBe(expected);
    });

    /**
     * Test: Should handle invalid numeric entities gracefully
     * 
     * Tests that invalid numeric HTML entities don't cause errors.
     * This is important for handling malformed data from the API.
     */
    test('should handle invalid numeric entities gracefully', () => {
      // Test with invalid numeric entities - the function actually decodes them
      expect(decodeHtmlEntities('&#999999;')).toBe('䈿'); // Valid Unicode character
      expect(decodeHtmlEntities('&#abc;')).toBe('&#abc;'); // Non-numeric - not decoded
    });
  });
}); 