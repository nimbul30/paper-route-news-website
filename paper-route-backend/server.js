// server.js

const express = require('express');
const path = require('path');
const oracledb = require('oracledb');
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
        // This will now return a simple array of arrays, e.g., [ [1, 'Title', 'slug', ...], [...] ]
        const result = await connection.execute(
          `SELECT * FROM articles ORDER BY created_at DESC`
        );
        res.json(result.rows);
      } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).send('Error fetching articles');
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

        const article = result.rows[0];

        if (article.CONTENT && typeof article.CONTENT.getData === 'function') {
          article.CONTENT = await article.CONTENT.getData();
        }
        if (article.SOURCES && typeof article.SOURCES.getData === 'function') {
          article.SOURCES = await article.SOURCES.getData();
        }

        res.json(article);
      } catch (err) {
        console.error(`Error fetching article with slug ${slug}:`, err);
        res.status(500).json({ message: 'Error fetching article' });
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
