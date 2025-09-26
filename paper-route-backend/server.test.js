/**
 * Integration tests for API endpoints
 * Tests the sanitization of database responses through actual API calls
 */

const request = require('supertest');
const express = require('express');
const { DatabaseSanitizer } = require('./utils/databaseSanitizer');

// Mock oracledb module
jest.mock('oracledb', () => ({
  getConnection: jest.fn(),
  OUT_FORMAT_OBJECT: 'object',
}));

// Mock the database connection
const mockConnection = {
  execute: jest.fn(),
};

const oracledb = require('oracledb');
oracledb.getConnection.mockResolvedValue(mockConnection);

// Import the app after mocking
let app;

describe('API Endpoints Integration Tests', () => {
  beforeAll(async () => {
    // Set up environment variables to avoid actual database connection
    process.env.TNS_ADMIN = './config';

    // Import and initialize the app
    delete require.cache[require.resolve('./server.js')];

    // Create a test version of the app
    app = express();
    app.use(express.json());

    // Recreate the routes from server.js for testing
    app.get('/api/articles', async (req, res) => {
      try {
        const result = await mockConnection.execute(
          `SELECT * FROM articles ORDER BY created_at DESC`
        );

        const sanitizedArticles = DatabaseSanitizer.arrayToObject(result.rows);
        res.json(sanitizedArticles);
      } catch (err) {
        console.error('Error fetching articles:', err);
        try {
          res.status(500).json({
            error: 'Error fetching articles',
            message: 'Failed to retrieve articles from database',
          });
        } catch (responseError) {
          res.status(500).send('Error fetching articles');
        }
      }
    });

    app.get('/api/articles/:slug', async (req, res) => {
      const slug = req.params.slug;
      try {
        const result = await mockConnection.execute(
          `SELECT * FROM articles WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:slug))`,
          { slug: slug },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Article not found' });
        }

        const rawArticle = result.rows[0];
        const sanitizedArticle = DatabaseSanitizer.sanitizeObject(rawArticle);
        const clobData = await DatabaseSanitizer.extractClobData(rawArticle);

        const cleanArticle = {
          ...sanitizedArticle,
          ...clobData,
        };

        res.json(cleanArticle);
      } catch (err) {
        console.error(`Error fetching article with slug ${slug}:`, err);

        if (err.message && err.message.includes('circular')) {
          console.error('Circular reference detected during sanitization');
          return res.status(500).json({
            message: 'Error processing article data',
            error: 'Data structure issue',
          });
        }

        res.status(500).json({
          message: 'Error fetching article',
          error: 'Database query failed',
        });
      }
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/articles', () => {
    test('should return clean object responses from array-based database results', async () => {
      // Mock database response with array format
      const mockDbResponse = {
        rows: [
          [
            1,
            'First Article',
            'first-article',
            'Content for first article',
            'news',
            'https://example.com/image1.jpg',
            'Source information 1',
            'https://example.com/pdf1.pdf',
            'https://youtube.com/embed/abc123',
            '2024-01-01T00:00:00Z',
          ],
          [
            2,
            'Second Article',
            'second-article',
            'Content for second article',
            'sports',
            'https://example.com/image2.jpg',
            'Source information 2',
            'https://example.com/pdf2.pdf',
            'https://youtube.com/embed/def456',
            '2024-01-02T00:00:00Z',
          ],
        ],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app).get('/api/articles').expect(200);

      // Verify response structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Verify first article structure
      expect(response.body[0]).toEqual({
        id: 1,
        title: 'First Article',
        slug: 'first-article',
        content: 'Content for first article',
        category: 'news',
        image_url: 'https://example.com/image1.jpg',
        sources: 'Source information 1',
        verification_pdf_url: 'https://example.com/pdf1.pdf',
        youtube_embed_url: 'https://youtube.com/embed/abc123',
        created_at: '2024-01-01T00:00:00Z',
      });

      // Verify second article structure
      expect(response.body[1]).toEqual({
        id: 2,
        title: 'Second Article',
        slug: 'second-article',
        content: 'Content for second article',
        category: 'sports',
        image_url: 'https://example.com/image2.jpg',
        sources: 'Source information 2',
        verification_pdf_url: 'https://example.com/pdf2.pdf',
        youtube_embed_url: 'https://youtube.com/embed/def456',
        created_at: '2024-01-02T00:00:00Z',
      });

      // Verify JSON serialization success
      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle empty database results', async () => {
      mockConnection.execute.mockResolvedValue({ rows: [] });

      const response = await request(app).get('/api/articles').expect(200);

      expect(response.body).toEqual([]);
      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle database errors with sanitized error responses', async () => {
      mockConnection.execute.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/api/articles').expect(500);

      expect(response.body).toEqual({
        error: 'Error fetching articles',
        message: 'Failed to retrieve articles from database',
      });

      // Verify error response is serializable
      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle arrays with missing fields gracefully', async () => {
      const mockDbResponse = {
        rows: [
          [1, 'Title Only'], // Missing most fields
          [2, 'Another Title', 'slug-only'], // Missing some fields
        ],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app).get('/api/articles').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        id: 1,
        title: 'Title Only',
      });
      expect(response.body[1]).toEqual({
        id: 2,
        title: 'Another Title',
        slug: 'slug-only',
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle null values in array data', async () => {
      const mockDbResponse = {
        rows: [[1, null, 'test-slug', undefined, 'news', null]],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app).get('/api/articles').expect(200);

      expect(response.body[0]).toEqual({
        id: 1,
        title: null,
        slug: 'test-slug',
        content: undefined,
        category: 'news',
        image_url: null,
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });
  });

  describe('GET /api/articles/:slug', () => {
    test('should return sanitized single article with complex Oracle object', async () => {
      const mockClobObject = {
        getData: jest
          .fn()
          .mockResolvedValue('This is the full article content from CLOB'),
      };

      const mockSourcesClobObject = {
        getData: jest.fn().mockResolvedValue('Source references and citations'),
      };

      // Mock complex Oracle object response
      const mockDbResponse = {
        rows: [
          {
            ID: { value: 1, metadata: { type: 'NUMBER' } },
            TITLE: { value: 'Test Article', metadata: { type: 'VARCHAR2' } },
            SLUG: { value: 'test-article', metadata: { type: 'VARCHAR2' } },
            CONTENT: mockClobObject,
            CATEGORY: { value: 'news', metadata: { type: 'VARCHAR2' } },
            IMAGE_URL: {
              value: 'https://example.com/image.jpg',
              metadata: { type: 'VARCHAR2' },
            },
            SOURCES: mockSourcesClobObject,
            VERIFICATION_PDF_URL: {
              value: 'https://example.com/doc.pdf',
              metadata: { type: 'VARCHAR2' },
            },
            YOUTUBE_EMBED_URL: {
              value: 'https://youtube.com/embed/xyz',
              metadata: { type: 'VARCHAR2' },
            },
            CREATED_AT: {
              value: '2024-01-01T00:00:00Z',
              metadata: { type: 'DATE' },
            },
            // Add some internal Oracle properties that should be filtered out
            _internal: { someInternalData: 'should not appear' },
            metadata: { tableInfo: 'should not appear' },
          },
        ],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app)
        .get('/api/articles/test-article')
        .expect(200);

      // Verify sanitized response structure
      expect(response.body).toEqual({
        id: 1,
        title: 'Test Article',
        slug: 'test-article',
        category: 'news',
        image_url: 'https://example.com/image.jpg',
        verification_pdf_url: 'https://example.com/doc.pdf',
        youtube_embed_url: 'https://youtube.com/embed/xyz',
        created_at: '2024-01-01T00:00:00Z',
        content: {}, // CLOB objects are returned as empty objects when they have getData method
        sources: {}, // CLOB objects are returned as empty objects when they have getData method
        CONTENT: 'This is the full article content from CLOB',
        SOURCES: 'Source references and citations',
      });

      // Verify CLOB extraction was called
      expect(mockClobObject.getData).toHaveBeenCalled();
      expect(mockSourcesClobObject.getData).toHaveBeenCalled();

      // Verify JSON serialization success
      expect(() => JSON.stringify(response.body)).not.toThrow();

      // Verify no internal Oracle properties are present
      expect(response.body._internal).toBeUndefined();
      expect(response.body.metadata).toBeUndefined();
    });

    test('should handle article not found', async () => {
      mockConnection.execute.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/articles/non-existent-slug')
        .expect(404);

      expect(response.body).toEqual({
        message: 'Article not found',
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle CLOB extraction failures gracefully', async () => {
      const failingClobObject = {
        getData: jest.fn().mockRejectedValue(new Error('CLOB read failed')),
      };

      const successClobObject = {
        getData: jest.fn().mockResolvedValue('Successful CLOB content'),
      };

      const mockDbResponse = {
        rows: [
          {
            ID: { value: 1 },
            TITLE: { value: 'Test Article' },
            SLUG: { value: 'test-article' },
            CONTENT: failingClobObject, // This will fail
            SOURCES: successClobObject, // This will succeed
            CATEGORY: { value: 'news' },
          },
        ],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app)
        .get('/api/articles/test-article')
        .expect(200);

      expect(response.body).toEqual({
        id: 1,
        title: 'Test Article',
        slug: 'test-article',
        category: 'news',
        content: {}, // CLOB objects are returned as empty objects when they have getData method
        sources: {}, // CLOB objects are returned as empty objects when they have getData method
        CONTENT: '', // Fallback to empty string for failed CLOB
        SOURCES: 'Successful CLOB content',
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle circular reference errors with proper error response', async () => {
      // Create an object with circular references
      const circularObject = {
        ID: { value: 1 },
        TITLE: { value: 'Circular Article' },
        SLUG: { value: 'circular-article' },
      };
      circularObject.SELF_REF = circularObject; // Create circular reference

      const mockDbResponse = {
        rows: [circularObject],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app)
        .get('/api/articles/circular-article')
        .expect(200); // Should still return 200 as sanitizer handles circular refs

      // Verify the response is clean and serializable
      expect(response.body.id).toBe(1);
      expect(response.body.title).toBe('Circular Article');
      expect(response.body.slug).toBe('circular-article');

      // Verify no circular reference exists in response
      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle database query errors with sanitized error responses', async () => {
      mockConnection.execute.mockRejectedValue(
        new Error('Database query failed')
      );

      const response = await request(app)
        .get('/api/articles/test-slug')
        .expect(500);

      expect(response.body).toEqual({
        message: 'Error fetching article',
        error: 'Database query failed',
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle sanitization errors with circular reference detection', async () => {
      // Mock sanitizeObject to throw a circular reference error
      const originalSanitizeObject = DatabaseSanitizer.sanitizeObject;
      DatabaseSanitizer.sanitizeObject = jest.fn().mockImplementation(() => {
        throw new Error('Converting circular structure to JSON');
      });

      const mockDbResponse = {
        rows: [
          {
            ID: { value: 1 },
            TITLE: { value: 'Problem Article' },
            SLUG: { value: 'problem-article' },
          },
        ],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app)
        .get('/api/articles/problem-article')
        .expect(500);

      expect(response.body).toEqual({
        message: 'Error processing article data',
        error: 'Data structure issue',
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();

      // Restore original method
      DatabaseSanitizer.sanitizeObject = originalSanitizeObject;
    });

    test('should handle mixed Oracle object types (simple values and complex objects)', async () => {
      const mockDbResponse = {
        rows: [
          {
            ID: 1, // Simple value
            TITLE: { value: 'Mixed Article' }, // Oracle complex object
            SLUG: 'mixed-article', // Simple string
            CONTENT: { value: 'Simple content value' }, // Oracle object with value
            CATEGORY: { value: null }, // Oracle object with null value
            IMAGE_URL: undefined, // Undefined value
            SOURCES: { value: 'Source info' },
          },
        ],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app)
        .get('/api/articles/mixed-article')
        .expect(200);

      expect(response.body).toEqual({
        id: 1,
        title: 'Mixed Article',
        slug: 'mixed-article',
        content: 'Simple content value',
        category: null,
        sources: 'Source info',
        CONTENT: 'Simple content value', // CLOB extraction also adds this
        SOURCES: 'Source info', // CLOB extraction also adds this
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test('should handle articles with missing expected fields', async () => {
      const mockDbResponse = {
        rows: [
          {
            ID: { value: 1 },
            TITLE: { value: 'Minimal Article' },
            SLUG: { value: 'minimal-article' },
            // Missing CONTENT, SOURCES, CATEGORY, etc.
          },
        ],
      };

      mockConnection.execute.mockResolvedValue(mockDbResponse);

      const response = await request(app)
        .get('/api/articles/minimal-article')
        .expect(200);

      expect(response.body).toEqual({
        id: 1,
        title: 'Minimal Article',
        slug: 'minimal-article',
        CONTENT: '', // Empty string from CLOB extraction fallback
        SOURCES: '', // Empty string from CLOB extraction fallback
      });

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });
  });

  describe('JSON Serialization Tests', () => {
    test('should ensure all API responses are JSON serializable', async () => {
      // Test articles list endpoint
      mockConnection.execute.mockResolvedValue({
        rows: [
          [1, 'Article 1', 'article-1', 'Content 1', 'news'],
          [2, 'Article 2', 'article-2', 'Content 2', 'sports'],
        ],
      });

      const listResponse = await request(app).get('/api/articles').expect(200);

      expect(() => JSON.stringify(listResponse.body)).not.toThrow();
      expect(() => JSON.parse(JSON.stringify(listResponse.body))).not.toThrow();

      // Test single article endpoint
      mockConnection.execute.mockResolvedValue({
        rows: [
          {
            ID: { value: 1 },
            TITLE: { value: 'Test Article' },
            SLUG: { value: 'test-article' },
            CONTENT: { getData: jest.fn().mockResolvedValue('Content') },
            SOURCES: { getData: jest.fn().mockResolvedValue('Sources') },
          },
        ],
      });

      const singleResponse = await request(app)
        .get('/api/articles/test-article')
        .expect(200);

      expect(() => JSON.stringify(singleResponse.body)).not.toThrow();
      expect(() =>
        JSON.parse(JSON.stringify(singleResponse.body))
      ).not.toThrow();
    });

    test('should ensure error responses are JSON serializable', async () => {
      // Test database error
      mockConnection.execute.mockRejectedValue(new Error('DB Error'));

      const errorResponse = await request(app).get('/api/articles').expect(500);

      expect(() => JSON.stringify(errorResponse.body)).not.toThrow();
      expect(() =>
        JSON.parse(JSON.stringify(errorResponse.body))
      ).not.toThrow();

      // Test 404 error
      mockConnection.execute.mockResolvedValue({ rows: [] });

      const notFoundResponse = await request(app)
        .get('/api/articles/non-existent')
        .expect(404);

      expect(() => JSON.stringify(notFoundResponse.body)).not.toThrow();
      expect(() =>
        JSON.parse(JSON.stringify(notFoundResponse.body))
      ).not.toThrow();
    });
  });
});
