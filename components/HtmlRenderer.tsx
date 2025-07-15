import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from './ThemedText';

interface HtmlRendererProps {
  htmlContent: string;
  style?: any;
}

export function HtmlRenderer({ htmlContent, style }: HtmlRendererProps) {
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const fadeAnim = new Animated.Value(1);

  useEffect(() => {
    if (showScrollIndicator) {
      // Subtle pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.4,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showScrollIndicator]);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    setShowScrollIndicator(!isAtBottom && contentSize.height > layoutMeasurement.height);
  };

  const generateHtmlContent = (description: string) => {
    const { width } = Dimensions.get('window');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #333;
            padding: 8px;
            background-color: #fff;
          }
          p {
            margin-bottom: 16px;
            line-height: 1.6;
          }
          p:last-child {
            margin-bottom: 0;
          }
          code {
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
            font-size: 14px;
            color: #d63384;
          }
          pre {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 12px;
            margin: 12px 0;
            overflow-x: auto;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
            font-size: 14px;
            line-height: 1.5;
          }
          pre code {
            background-color: transparent;
            padding: 0;
            color: #333;
          }
          strong {
            font-weight: 600;
            color: #000;
          }
          .example {
            background-color: #f8f9fa;
            border-left: 4px solid #6564c7;
            padding: 8px 12px;
            margin: 12px 0;
            border-radius: 0 8px 8px 0;
          }
          .example strong {
            color: #6564c7;
          }
          ul {
            margin: 12px 0;
            padding-left: 18px;
          }
          li {
            margin-bottom: 6px;
          }
          sup {
            font-size: 0.75em;
            vertical-align: super;
          }
          .constraints {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
          }
          .constraints strong {
            color: #856404;
          }
          .follow-up {
            background-color: #e7f3ff;
            border: 1px solid #b8daff;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
          }
          .follow-up strong {
            color: #004085;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 12px auto;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          @media (max-width: ${width}px) {
            img {
              max-width: 95%;
            }
          }
          /* Better spacing around sections */
          h1, h2, h3, h4, h5, h6 {
            margin: 16px 0 8px 0;
            line-height: 1.3;
          }
          /* Better spacing between elements */
          p + ul, p + ol {
            margin-top: 8px;
          }
          ul + p, ol + p {
            margin-top: 8px;
          }
          /* Remove extra spacing from empty paragraphs */
          p:empty {
            display: none;
          }
          /* Ensure proper spacing before constraints */
          p + .constraints, ul + .constraints, * + .constraints {
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        ${description}
      </body>
      </html>
    `;
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html: generateHtmlContent(htmlContent || 'No content available') }}
        style={styles.webview}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        startInLoadingState={true}
        scalesPageToFit={true}
        onScroll={handleScroll}
        injectedJavaScript={`
          window.addEventListener('scroll', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll',
              scrollTop: window.pageYOffset,
              scrollHeight: document.body.scrollHeight,
              clientHeight: window.innerHeight
            }));
          });
          true;
        `}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'scroll') {
              const isAtBottom = data.scrollTop + data.clientHeight >= data.scrollHeight - 20;
              setShowScrollIndicator(!isAtBottom && data.scrollHeight > data.clientHeight);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#6564c7" />
          </View>
        )}
      />
      {showScrollIndicator && (
        <Animated.View style={[styles.scrollIndicator, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.95)']}
            style={styles.gradientOverlay}
          >
            <ThemedText style={styles.scrollText}>↓ Scroll for more</ThemedText>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    pointerEvents: 'none',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    opacity: 0.7,
  },
}); 