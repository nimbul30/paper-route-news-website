const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '.env'),
  override: true,
});

const express = require('express');
const oracledb = require('oracledb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { DatabaseSanitizer } = require('./utils/databaseSanitizer');
const app = express();
const PORT = process.env.PORT || 3000;

// --- Gemini API Configuration ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- API Routes (moved outside async function) ---

app.post('/api/generate-article', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: `You are a news article writer. Based on the user's prompt, generate a complete news article with a title, content (in Markdown format), and relevant tags. The title should be compelling and SEO-friendly. The content should be well-structured with headings and paragraphs. The tags should be a comma-separated list of relevant keywords. Your output must be a valid JSON object and nothing else. Do not wrap the JSON in a markdown block.`,
    });

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          content: { type: 'STRING' },
          tags: { type: 'STRING' },
        },
        required: ['title', 'content', 'tags'],
      },
    };

    const result = await model.generateContent(prompt, generationConfig);
    const response = await result.response;
    const text = await response.text();

    res.json(JSON.parse(text));
  } catch (error) {
    console.error('Error generating article with AI:', error);
    res.status(500).json({ message: 'Failed to generate article.' });
  }
});

app.get('/api/articles', async (req, res) => {
  try {
    console.log('Articles endpoint called - using REAL database data');

    if (!connection) {
      console.log('No database connection available');
      return res
        .status(500)
        .json({ message: 'Database connection not available' });
    }

    const result = await connection.execute(
      `SELECT ID, TITLE, SLUG, CONTENT, AUTHOR_ID, CREATED_AT, IMAGE_URL, SOURCES, VERIFICATION_DETAILS, VERIFICATION_PDF_URL, YOUTUBE_EMBED_URL, SPOT_NUMBER, TAGS, LAYOUT, WIDESCREEN_IMAGE_URL FROM articles ORDER BY created_at DESC`
    );

    console.log('Database query completed, processing results...');

    let sanitizedArticles = [];

    if (result.rows.length > 0 && Array.isArray(result.rows[0])) {
      console.log('Processing array format with CLOB handling...');

      const objectsFromArrays = DatabaseSanitizer.arrayToObject(result.rows);

      for (const obj of objectsFromArrays) {
        try {
          const processedObj = { ...obj };

          for (const [key, value] of Object.entries(processedObj)) {
            if (
              value &&
              typeof value === 'object' &&
              value._type &&
              value._type.toString().includes('CLOB')
            ) {
              try {
                console.log(`Extracting CLOB for field ${key}...`);
                const clobData = await value.getData();
                processedObj[key] = clobData || '';
                console.log(`Successfully extracted CLOB for field ${key}.`);
              } catch (clobError) {
                console.error(
                  `Error extracting CLOB for field ${key}:`,
                  clobError
                );
                processedObj[key] = '';
              }
            }
          }

          sanitizedArticles.push(processedObj);
        } catch (objError) {
          console.error('Error processing object:', objError);
          sanitizedArticles.push(obj);
        }
      }
    } else {
      console.log('Processing object format...');
      sanitizedArticles = await DatabaseSanitizer.sanitizeArray(result.rows);
    }

    console.log('Raw articles from DB:', sanitizedArticles);
    console.log(`Returning ${sanitizedArticles.length} articles`);
    res.json(sanitizedArticles);
  } catch (err) {
    console.error('Error fetching articles:', err);
    console.error('Error stack:', err.stack);

    try {
      res.status(500).json({
        error: 'Error fetching articles',
        message: 'Failed to retrieve articles from database',
        details: err.message,
      });
    } catch (responseError) {
      res.status(500).send('Error fetching articles');
    }
  }
});

// The single article route needs to be updated to use outFormat OBJECT locally
app.get('/api/articles/:slug', async (req, res) => {
  const slug = req.params.slug;
  try {
    if (!connection) {
      return res
        .status(500)
        .json({ message: 'Database connection not available' });
    }

    const result = await connection.execute(
      `SELECT ID, TITLE, SLUG, CONTENT, AUTHOR_ID, CREATED_AT, IMAGE_URL, SOURCES, VERIFICATION_DETAILS, VERIFICATION_PDF_URL, YOUTUBE_EMBED_URL, SPOT_NUMBER, TAGS, LAYOUT, WIDESCREEN_IMAGE_URL FROM articles WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:slug))`,
      { slug: slug }
      // Use array format (same as articles list) to avoid circular reference issues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }

    console.log('Article found, processing with sanitizer...');

    // Use the same approach as the articles list endpoint
    const objectsFromArrays = DatabaseSanitizer.arrayToObject(result.rows);
    const articleObj = objectsFromArrays[0];

    // Handle CLOB fields
    const processedObj = { ...articleObj };
    for (const [key, value] of Object.entries(processedObj)) {
      if (
        value &&
        typeof value === 'object' &&
        value._type &&
        value._type.toString().includes('CLOB')
      ) {
        try {
          console.log(`Extracting CLOB data for field: ${key}`);
          const clobData = await value.getData();
          processedObj[key] = clobData || '';
        } catch (clobError) {
          console.error(`Error extracting CLOB for field ${key}:`, clobError);
          processedObj[key] = '';
        }
      }
    }

    console.log('Article processed successfully');
    res.json(processedObj);
  } catch (err) {
    console.error(`Error fetching article with slug ${slug}:`, err);
    console.error('Error stack:', err.stack);

    // Simple error response
    res.status(500).json({
      message: 'Error fetching article',
      error: 'Database query failed',
      details: err.message,
    });
  }
});

async function startApp() {
  try {
    connection = await oracledb.getConnection(dbConfig);
    console.log('Successfully connected to Oracle Database!');

    // Temporary POST route for updates (to test if PUT is the issue)
    app.post('/api/articles/update', async (req, res) => {
      const {
        title,
        new_slug,
        content,
        tags,
        image_url,
        widescreen_image_url, // Add widescreen_image_url
        sources,
        verification_pdf_url,
        youtube_embed_url,
        spot_number,
        layout, // Add layout
        _originalSlug,
      } = req.body;

      const spotNumberInt = spot_number ? parseInt(spot_number, 10) : null;
      if (spot_number && isNaN(spotNumberInt)) {
        return res
          .status(400)
          .json({ message: 'Invalid spot number provided.' });
      }

      if (!title || !new_slug || !content || !tags || !_originalSlug) {
        return res.status(400).json({
          message:
            'Title, slug, content, tags, and original slug are required.',
        });
      }

      if (!connection) {
        return res
          .status(500)
          .json({ message: 'Database connection not available' });
      }

      try {
        // If a new spot_number is being assigned, clear that spot first.
        // Make sure not to un-spot the article we are currently editing.
        if (spotNumberInt) {
          const updateSpotSql = `UPDATE articles SET spot_number = NULL WHERE spot_number = :spot_number AND UPPER(TRIM(slug)) != UPPER(TRIM(:original_slug))`;
          await connection.execute(
            updateSpotSql,
            { spot_number: spotNumberInt, original_slug: _originalSlug },
            { autoCommit: false }
          );
        }

        const sql = `UPDATE articles SET 
                       title = :title, 
                       slug = :new_slug, 
                       content = :content, 
                       tags = :tags, 
                       image_url = :image_url, 
                       widescreen_image_url = :widescreen_image_url,
                       sources = :sources, 
                       verification_pdf_url = :verification_pdf_url, 
                       youtube_embed_url = :youtube_embed_url,
                       spot_number = :spot_number,
                       layout = :layout
                     WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:original_slug))`;

        const binds = {
          title,
          new_slug,
          content,
          tags,
          image_url,
          widescreen_image_url, // Add widescreen_image_url
          sources,
          verification_pdf_url,
          youtube_embed_url,
          spot_number: spotNumberInt,
          layout, // Add layout
          original_slug: _originalSlug,
        };

        const result = await connection.execute(sql, binds, {
          autoCommit: true, // This commits both the spot clearing and the update
        });

        if (result.rowsAffected === 0) {
          return res.status(404).json({ message: 'Article not found.' });
        }

        res
          .status(200)
          .json({ message: 'Article updated successfully', new_slug });
      } catch (err) {
        console.error('Error updating article:', err);
        // Attempt to rollback if something went wrong
        try {
          await connection.rollback();
        } catch (rollErr) {
          console.error('Failed to rollback in update route:', rollErr);
        }
        res.status(500).json({ message: 'Database error' });
      }
    });

    // --- The POST and DELETE routes remain the same ---
    app.post('/api/articles', async (req, res) => {
      const {
        title,
        slug,
        content,
        tags,
        image_url,
        widescreen_image_url, // Add widescreen_image_url
        sources,
        verification_pdf_url,
        youtube_embed_url,
        spot_number,
        layout, // Add layout
      } = req.body;

      const spotNumberInt = spot_number ? parseInt(spot_number, 10) : null;
      if (spot_number && isNaN(spotNumberInt)) {
        return res
          .status(400)
          .json({ message: 'Invalid spot number provided.' });
      }

      if (!title || !slug || !content || !tags) {
        return res.status(400).json({
          message: 'Title, slug, content, and tags are required.',
        });
      }

      if (!connection) {
        return res
          .status(500)
          .json({ message: 'Database connection not available' });
      }

      try {
        if (spotNumberInt) {
          const updateSql = `UPDATE articles SET spot_number = NULL WHERE spot_number = :spot_number`;
          await connection.execute(
            updateSql,
            { spot_number: spotNumberInt },
            { autoCommit: false }
          );
        }

        const sql = `INSERT INTO articles (title, slug, content, tags, image_url, widescreen_image_url, sources, verification_pdf_url, youtube_embed_url, spot_number, layout)
                     VALUES (:title, :slug, :content, :tags, :image_url, :widescreen_image_url, :sources, :verification_pdf_url, :youtube_embed_url, :spot_number, :layout)`;
        const binds = {
          title,
          slug,
          content,
          tags,
          image_url,
          widescreen_image_url, // Add widescreen_image_url
          sources,
          verification_pdf_url,
          youtube_embed_url,
          spot_number: spotNumberInt,
          layout, // Add layout
        };

        await connection.execute(sql, binds, { autoCommit: true });
        res.status(201).json({ message: 'Article created successfully' });
      } catch (err) {
        console.error('Error inserting article:', err);
        try {
          await connection.rollback();
        } catch (rollErr) {
          console.error('Failed to rollback:', rollErr);
        }
        if (err.errorNum === 1)
          return res
            .status(409)
            .json({ message: 'Error: A post with this slug already exists.' });
        res.status(500).json({ message: 'Database error' });
      }
    });

    app.put('/api/articles/:slug', async (req, res) => {
      const slug = req.params.slug;
      const {
        title,
        new_slug,
        content,
        tags,
        image_url,
        widescreen_image_url, // Add widescreen_image_url
        sources,
        verification_pdf_url,
        youtube_embed_url,
        spot_number,
        layout, // Add layout
      } = req.body;

      console.log('PUT request received:');
      console.log('URL slug:', slug);
      console.log('Body new_slug:', new_slug);
      console.log(
        'Slug changed:',
        slug.toLowerCase().trim() !== new_slug.toLowerCase().trim()
      );

      if (!title || !new_slug || !content || !tags) {
        return res.status(400).json({
          message: 'Title, slug, content, and tags are required.',
        });
      }

      if (!connection) {
        return res
          .status(500)
          .json({ message: 'Database connection not available' });
      }

      try {
        // Check if slug is actually changing
        const slugChanged =
          slug.toLowerCase().trim() !== new_slug.toLowerCase().trim();

        // If slug is changing, check if new slug already exists
        if (slugChanged) {
          const checkResult = await connection.execute(
            `SELECT COUNT(*) as count FROM articles WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:new_slug))`,
            { new_slug }
          );

          if (checkResult.rows[0][0] > 0) {
            return res.status(409).json({
              message: 'Error: A post with this slug already exists.',
            });
          }
        }

        const sql = `UPDATE articles SET 
                       title = :title, 
                       slug = :new_slug, 
                       content = :content, 
                       tags = :tags, 
                       image_url = :image_url, 
                       widescreen_image_url = :widescreen_image_url,
                       sources = :sources, 
                       verification_pdf_url = :verification_pdf_url, 
                       youtube_embed_url = :youtube_embed_url,
                       spot_number = :spot_number,
                       layout = :layout
                     WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:slug))`;

        const binds = {
          title,
          new_slug,
          content,
          tags,
          image_url,
          widescreen_image_url, // Add widescreen_image_url
          sources,
          verification_pdf_url,
          youtube_embed_url,
          spot_number,
          layout, // Add layout
          slug: slug,
        };

        const result = await connection.execute(sql, binds, {
          autoCommit: true,
        });

        if (result.rowsAffected === 0) {
          return res.status(404).json({ message: 'Article not found.' });
        }

        res
          .status(200)
          .json({ message: 'Article updated successfully', new_slug });
      } catch (err) {
        console.error('Error updating article:', err);
        if (err.errorNum === 1) {
          return res
            .status(409)
            .json({ message: 'Error: A post with this slug already exists.' });
        }
        res.status(500).json({ message: 'Database error' });
      }
    });

    app.delete('/api/articles/:slug', async (req, res) => {
      const slug = req.params.slug;
      try {
        if (!connection) {
          return res
            .status(500)
            .json({ message: 'Database connection not available' });
        }

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

    app.put('/api/articles/:slug/archive', async (req, res) => {
      const slug = req.params.slug;

      if (!connection) {
        return res
          .status(500)
          .json({ message: 'Database connection not available' });
      }

      try {
        const sql = `UPDATE articles SET spot_number = NULL WHERE UPPER(TRIM(slug)) = UPPER(TRIM(:slug))`;
        const binds = { slug: slug };

        const result = await connection.execute(sql, binds, {
          autoCommit: true,
        });

        if (result.rowsAffected === 0) {
          return res.status(404).json({ message: 'Article not found.' });
        }

        res.status(200).json({ message: 'Article archived successfully' });
      } catch (err) {
        console.error('Error archiving article:', err);
        res.status(500).json({ message: 'Database error' });
      }
    });

    // --- Serve Frontend ---
    // Only serve home.html for root and specific routes, not for assets
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'home.html'));
    });

    // Serve specific HTML files
    app.get('/home.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'home.html'));
    });

    app.get('/article-page.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'article-page.html'));
    });

    app.get('/create.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'create.html'));
    });

    app.get('/verify.html', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'verify.html'));
    });

    app.post('/api/verify-article', async (req, res) => {
      const { articleText, sourceUrls } = req.body;

      if (!articleText || !sourceUrls) {
        return res
          .status(400)
          .json({ message: 'articleText and sourceUrls are required.' });
      }

      try {
        const verificationReport = {};

        // Phase 1: Triage
        const triageModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-pro',
          systemInstruction: `You are a meticulous fact-checker. From the article, extract each key claim. For each claim, search the provided source texts for direct evidence. You must classify the evidence for each claim as either 'Supported', 'Contradicted', or 'No Evidence Found'. If evidence is found, you must provide the exact quote from the source text as 'evidence_quote'. Your output must be a valid JSON object and nothing else. Do not wrap the JSON in a markdown block.`,
        });
        const triageResult = await triageModel.generateContent(
          `ARTICLE TO VERIFY:\n${articleText}\n\nSOURCE URLs:\n${sourceUrls.join(
            '\n'
          )}`,
          {
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  verified_claims: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        claim: { type: 'STRING' },
                        verification_status: {
                          type: 'STRING',
                          enum: [
                            'Supported',
                            'Contradicted',
                            'No Evidence Found',
                          ],
                        },
                        evidence_quote: { type: 'STRING' },
                      },
                      required: [
                        'claim',
                        'verification_status',
                        'evidence_quote',
                      ],
                    },
                  },
                },
              },
            },
          }
        );
        const triageResponse = await triageResult.response;
        verificationReport['Phase 1: Triage'] = JSON.parse(
          await triageResponse.text()
        );

        // Phase 2: Deep Dive
        const deepDiveModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-pro',
          systemInstruction: `You are a data extraction tool. From the user's article, extract all key entities into structured lists for verification. Your output must be a valid JSON object and nothing else. Do not wrap the JSON in a markdown block.`,
        });
        const deepDiveResult = await deepDiveModel.generateContent(
          articleText,
          {
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  entities: {
                    type: 'OBJECT',
                    properties: {
                      personal_names_titles: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                      },
                      organization_names: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                      },
                      numbers_statistics: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                      },
                      dates_times: { type: 'ARRAY', items: { type: 'STRING' } },
                      locations: { type: 'ARRAY', items: { type: 'STRING' } },
                    },
                  },
                },
              },
            },
          }
        );
        const deepDiveResponse = await deepDiveResult.response;
        verificationReport['Phase 2: Factual Deep Dive'] = JSON.parse(
          await deepDiveResponse.text()
        );

        // Phase 3: Quality & Ethics
        const qualityModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-pro',
          systemInstruction: `You are an ethics and fairness editor. Analyze the article for bias, loaded language, or unfair framing. Suggest neutral alternatives for any flagged phrases. Your output must be a valid JSON object and nothing else. Do not wrap the JSON in a markdown block.`,
        });
        const qualityResult = await qualityModel.generateContent(articleText, {
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                bias_analysis: {
                  type: 'OBJECT',
                  properties: {
                    flagged_phrases: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          phrase: { type: 'STRING' },
                          suggestion: { type: 'STRING' },
                        },
                      },
                    },
                    overall_sentiment: { type: 'STRING' },
                    framing: { type: 'STRING' },
                  },
                },
              },
            },
          },
        });
        const qualityResponse = await qualityResult.response;
        verificationReport['Phase 3: Quality & Ethics Consultant'] = JSON.parse(
          await qualityResponse.text()
        );

        res.json(verificationReport);
      } catch (error) {
        console.error('Error verifying article with AI:', error);
        res.status(500).json({
          message: 'Failed to verify article.',
          error: error.message,
          details: error.stack,
        });
      }
    });

    // --- Start Server ---
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

// Connect to database
startApp();
