/**
 * Decodes HTML entities in text strings
 * Converts entities like &amp;, &lt;, &gt;, etc. to their actual characters
 */
export const decodeHtmlEntities = (text: string | null | undefined): string => {
  if (!text || typeof text !== 'string') return '';
  
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  
  if (text !== decoded) {
    console.log(`HTML entity decoded: "${text}" -> "${decoded}"`);
  }
  
  return decoded;
};

/**
 * Truncates text to a specified length and adds ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalizes the first letter of each word in a string
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return text;
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}; 