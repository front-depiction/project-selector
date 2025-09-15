import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: {
      // Compilation modes:
      // 'annotation' - Only compile components with "use memo" directive
      // 'all' - Compile all components (more aggressive)
      compilationMode: 'annotation',

      // Target specific file patterns
      include: [
        '**/*.tsx',
        '**/*.ts',
        '**/*.jsx',
        '**/*.js'
      ],

      // Exclude patterns
      exclude: [
        'node_modules/**',
        '.next/**',
        'convex/_generated/**'
      ],

      // Enable debug mode in development
      debug: process.env.NODE_ENV === 'development',
    },
  },
  // Enable React Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
