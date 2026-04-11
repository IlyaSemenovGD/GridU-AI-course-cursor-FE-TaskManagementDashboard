module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      startServerCommand: 'npx serve dist -l 4173',
      startServerReadyPattern: 'Accepting connections',
      url: ['http://127.0.0.1:4173/'],
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.35 }],
        'categories:accessibility': ['warn', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.75 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './qa-reports/lighthouse',
    },
  },
}
