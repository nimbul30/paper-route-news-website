// server.js

const express = require('express');
const path = require('path');
const oracledb = require('oracledb');
const { DatabaseSanitizer } = require('./utils/databaseSanitizer');
const app = express();
const PORT = process.env.PORT || 3000;

// NOTE: We are intentionally REMOVING the outFormat line to get simple arrays.

// --- Database Connection Configuration ---
process.env.TNS_ADMIN = path.join(__dirname, 'config');

const dbConfig = {
  user: 'ADMIN', // Your DB ADMIN user
  password: 'Sept1977?!?Sept1977?!?', // The password you set for the ADMIN user
  connectString: 'prdb_low', // Find this in your wallet's tnsnames.ora file (e.g., prdb_high)
};

let connection;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function startApp() {
  try {
    connection = await oracledb.getConnection(dbConfig);
    console.log('Successfully connected to Oracle Database!');

    // --- API Routes ---

    app.get('/api/articles', async (req, res) => {
      try {
        // Get array response from Oracle database
        const result = await connection.execute(
          `SELECT * FROM articles ORDER BY created_at DESC`
        );

        // Convert array response to consistent object structure using sanitization utility
        const sanitizedArticles = DatabaseSanitizer.arrayToObject(result.rows);

        res.json(sanitizedArticles);
      } catch (err) {
        console.error('Error fetching articles:', err);

        // Return sanitized error response
        try {
          res.status(500).json({
            error: 'Error fetching articles',
            message: 'Failed to retrieve articles from database',
          });
        } catch (responseError) {
          // Fallback if JSON response fails
          res.status(500).send('Error fetching articles');
        }
      }
    });

    // The single article route needs to be updated to use outFormat OBJECT locally
    app.get('/api/articles/:slug', async (req, res) => {
      const slug = req.params.slug;
      try {
        const result = await connection.execute(
          `SELECT * FROM articles WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:slug))`,
          { slug: slug },
          { outFormat: oracledb.OUT_FORMAT_OBJECT } // Use object format for this query only
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Article not found' });
        }

        const rawArticle = result.rows[0];

        // Use DatabaseSanitizer to clean the complex Oracle object
        const sanitizedArticle = DatabaseSanitizer.sanitizeObject(rawArticle);

        // Extract CLOB data using the utility method
        const clobData = await DatabaseSanitizer.extractClobData(rawArticle);

        // Merge the sanitized object with extracted CLOB data
        const cleanArticle = {
          ...sanitizedArticle,
          ...clobData,
        };

        res.json(cleanArticle);
      } catch (err) {
        console.error(`Error fetching article with slug ${slug}:`, err);

        // Enhanced error handling for sanitization failures
        if (err.message && err.message.includes('circular')) {
          console.error('Circular reference detected during sanitization');
          return res.status(500).json({
            message: 'Error processing article data',
            error: 'Data structure issue',
          });
        }

        // Return sanitized error response to avoid JSON serialization issues
        res.status(500).json({
          message: 'Error fetching article',
          error: 'Database query failed',
        });
      }
    });

    // --- The POST and DELETE routes remain the same ---
    app.post('/api/articles', async (req, res) => {
      const {
        title,
        slug,
        content,
        category,
        image_url,
        sources,
        verification_pdf_url,
        youtube_embed_url,
      } = req.body;
      if (!title || !slug || !content || !category) {
        return res.status(400).json({
          message: 'Title, slug, content, and category are required.',
        });
      }
      const sql = `INSERT INTO articles (title, slug, content, category, image_url, sources, verification_pdf_url, youtube_embed_url)
                         VALUES (:title, :slug, :content, :category, :image_url, :sources, :verification_pdf_url, :youtube_embed_url)`;
      const binds = {
        title,
        slug,
        content,
        category,
        image_url,
        sources,
        verification_pdf_url,
        youtube_embed_url,
      };
      try {
        await connection.execute(sql, binds, { autoCommit: true });
        res.status(201).json({ message: 'Article created successfully' });
      } catch (err) {
        console.error('Error inserting article:', err);
        if (err.errorNum === 1)
          return res
            .status(409)
            .json({ message: 'Error: A post with this slug already exists.' });
        res.status(500).json({ message: 'Database error' });
      }
    });

    app.delete('/api/articles/:slug', async (req, res) => {
      const slug = req.params.slug;
      try {
        const result = await connection.execute(
          `DELETE FROM articles WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:slug))`,
          { slug: slug },
          { autoCommit: true }
        );
        if (result.rowsAffected === 0) {
          return res
            .status(404)
            .json({ message: 'Article not found, nothing deleted.' });
        }
        res.status(200).json({ message: 'Article deleted successfully.' });
      } catch (err) {
        console.error('Error deleting article:', err);
        res.status(500).json({ message: 'Database error' });
      }
    });

    // --- Serve Frontend ---
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'home.html'));
    });

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

startApp();
