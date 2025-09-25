// server.js

const express = require('express');
const path = require('path');
const oracledb = require('oracledb');
const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Connection Configuration ---
// Make sure the TNS_ADMIN environment variable is set to your wallet directory
process.env.TNS_ADMIN = path.join(__dirname, 'config');

const dbConfig = {
  user: 'ADMIN', // Your DB ADMIN user
  password: 'Sept1977?!?Sept1977?!?', // The password you set for the ADMIN user
  connectString: 'prdb_low', // Find this in your wallet's tnsnames.ora file (e.g., prdb_high)
};

let connection;

// --- Middleware ---
// Parse JSON bodies for POST requests
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

async function startApp() {
  try {
    // Establish a connection to the database
    connection = await oracledb.getConnection(dbConfig);
    console.log('Successfully connected to Oracle Database!');

    // --- API Routes ---

    /**
     * API endpoint to GET all articles.
     */
    app.get('/api/articles', async (req, res) => {
      try {
        const result = await connection.execute(
          `SELECT * FROM articles ORDER BY created_at DESC`
        );
        res.json(result.rows);
      } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).send('Error fetching articles');
      }
    });

    /**
     * API endpoint to GET a single article by its slug.
     */
    app.get('/api/articles/:slug', async (req, res) => {
      const slug = req.params.slug;
      try {
        const result = await connection.execute(
          `SELECT * FROM articles WHERE slug = :slug`,
          [slug] // Binds the slug parameter safely
        );

        if (result.rows.length === 0) {
          return res.status(404).send('Article not found');
        }
        res.json(result.rows[0]);
      } catch (err) {
        console.error(`Error fetching article with slug ${slug}:`, err);
        res.status(500).send('Error fetching article');
      }
    });

    /**
     * API endpoint to CREATE a new article.
     * This uses parameterized queries to prevent SQL injection.
     */
    app.post('/api/articles', async (req, res) => {
      const {
        title,
        slug,
        content,
        category,
        image_url,
        sources,
        verification_details,
        verification_pdf_url,
        youtube_embed_url,
      } = req.body;
      /**
       * API endpoint to DELETE an article by its slug.
       */
      app.delete('/api/articles/:slug', async (req, res) => {
        // In a real application, you would add security here to ensure
        // only an authorized admin can delete articles.
        const slug = req.params.slug;

        try {
          const result = await connection.execute(
            `DELETE FROM articles WHERE slug = :slug`,
            [slug],
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

      if (!title || !slug || !content || !category) {
        return res.status(400).json({
          message: 'Title, slug, content, and category are required.',
        });
      }

      const sql = `INSERT INTO articles (title, slug, content, category, image_url, sources, verification_details, verification_pdf_url, youtube_embed_url)
                 VALUES (:title, :slug, :content, :category, :image_url, :sources, :verification_details, :verification_pdf_url, :youtube_embed_url)`;

      const binds = {
        title,
        slug,
        content,
        category,
        image_url,
        sources,
        verification_details,
        verification_pdf_url,
        youtube_embed_url,
      };

      try {
        const result = await connection.execute(sql, binds, {
          autoCommit: true,
        });
        res
          .status(201)
          .json({ message: 'Article created successfully', data: result });
      } catch (err) {
        console.error('Error inserting article:', err);
        if (err.errorNum === 1) {
          return res
            .status(409)
            .json({ message: 'Error: A post with this slug already exists.' });
        }
        res.status(500).json({ message: 'Database error' });
      }
    });

    // --- Serve Frontend ---
    // A "catch-all" route to send users to the main homepage for any non-API routes.
    // It's important this is the LAST route.
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'home.html'));
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

// --- Start the Application ---
startApp();
