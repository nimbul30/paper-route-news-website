# Paper Route News - Homepage Redesign

## Overview

This document outlines the recent redesign of the Paper Route News homepage. The goal was to create a modern, dark-themed, and visually appealing user experience based on a provided design image.

## Changes Made

The redesign involved significant updates to the core files responsible for the homepage's structure, styling, and functionality.

### 1. `home.html`

The HTML structure of the homepage was completely overhauled to match the new two-section layout:

-   **Hero Section:** A prominent section at the top of the page to showcase four featured articles. This is implemented using a `hero-section` div that is dynamically populated by `app.js`.
-   **Article List:** A grid-based list of the latest articles, displayed below the hero section. This is implemented using an `article-list` div, also populated by `app.js`.

The header and footer were also updated to match the dark theme and new design.

### 2. `style.css`

The stylesheet was extensively modified to implement the new dark theme and support the redesigned layout:

-   **Dark Theme:** The color palette was updated to a dark theme, using the existing brand colors. The primary background is now a dark blue-gray (`--pr-primary`), with text in a light, off-white (`--pr-text-accent`).
-   **New Layout Styles:** New CSS classes were created to style the `hero-section` and `article-list`, including styles for featured articles, article items, and their content.
-   **Responsive Design:** The existing responsive styles were updated to ensure the new layout looks great on all screen sizes.

### 3. `app.js`

The JavaScript file was updated to fetch and render articles into the new homepage layout:

-   **New Rendering Functions:** The old `renderSpotType` functions were replaced with new functions:
    -   `renderFeaturedArticle`: Creates the HTML for a featured article and appends it to the `hero-section`.
    -   `renderArticleItem`: Creates the HTML for a regular article and appends it to the `article-list`.
-   **Updated `renderArticles` function:** This function now orchestrates the rendering process by splitting the fetched articles into "featured" and "regular" articles and calling the appropriate rendering functions.
-   **Placeholder Images:** The `getImageUrl` function was updated to use a placeholder image from `https://via.placeholder.com` if an article does not have an image.

## How It Works

1.  **Fetching Articles:** When the homepage loads, the `fetchArticles` function in `app.js` sends a request to the `/api/articles` endpoint to get the latest articles from the database.
2.  **Rendering Articles:** The `renderArticles` function takes the fetched articles and divides them into two groups:
    -   The first four articles are designated as "featured" articles.
    -   The remaining articles are "regular" articles.
3.  **Dynamic Content:** The `renderFeaturedArticle` and `renderArticleItem` functions dynamically create the HTML for each article and inject it into the `hero-section` and `article-list` divs in `home.html`.
4.  **Styling:** The `style.css` file applies the dark theme and layout styles to the dynamically generated content, ensuring a consistent and visually appealing experience.

## How to Run the Project

1.  **Start the server:** Open a terminal in the `paper-route-backend` directory and run the following command:
    ```
    node server.js
    ```
2.  **View the homepage:** Open your web browser and navigate to `http://localhost:3000/home.html`.

---

## Recent Changes and Current State (September 27, 2025)

This section details the recent debugging and feature implementation work.

### Resolved Issues:

1.  **"404 Not Found" for `autism-breakthrough-biological`:**
    *   **Problem:** User was encountering a 404 error when trying to view or edit an article with a specific slug.
    *   **Root Cause:** Discovered that old, static HTML files (e.g., `home.html`, `article-page.html`) existed in the project root directory, which were being opened directly by the user instead of the dynamic versions served by the Node.js backend. These static files contained outdated or incorrect links.
    *   **Resolution:** Instructed the user to always access the application via `http://localhost:3000/home.html` and deleted the problematic static HTML files from the project root.

2.  **Duplicate Articles in Homepage Spots:**
    *   **Problem:** When a new article was created with an existing `spot_number` (e.g., spot 1), it would appear next to the old article, breaking the layout.
    *   **Root Cause:** The database contained multiple articles with the same `spot_number`. The server-side `POST /api/articles` (create) and `POST /api/articles/update` (edit) routes were not clearing an existing `spot_number` before assigning a new article to it. Additionally, a data type mismatch (string vs. integer) for `spot_number` in the database queries was identified.
    *   **Resolution:**
        *   Modified `server.js` to parse `spot_number` to an integer.
        *   Added logic to both `POST /api/articles` and `POST /api/articles/update` routes to set `spot_number = NULL` for any existing article occupying the target spot before inserting/updating a new article into that spot.
        *   Guided the user to manually clean up existing duplicate `spot_number` entries in the database using the "Edit Article" functionality.

3.  **`CONTENT` and `SOURCES` Not Loading on Edit Page:**
    *   **Problem:** When editing an article, the "Body" (`CONTENT`) and "Sources" fields in the form were not populating, despite other fields loading correctly.
    *   **Root Cause:** The `GET /api/articles/:slug` endpoint in `server.js` was using `SELECT *`, which caused the `DatabaseSanitizer` to misinterpret the order of columns, especially for large text fields (CLOBs). Additionally, the client-side `create.js` was using the standard `.value` property to set the content of `textarea` elements, but these were being managed by the SimpleMDE rich text editor library, which requires its own API (`editor.value()`) to update content.
    *   **Resolution:**
        *   Modified `server.js` to replace `SELECT *` with an explicit list of columns in the `GET /api/articles/:slug` query, ensuring correct data mapping.
        *   Modified `create.html` to remove the inline SimpleMDE initialization script.
        *   Modified `create.js` to move the SimpleMDE initialization into the main script, making the editor instances accessible.
        *   Updated `create.js` to use `contentEditor.value(article.CONTENT)` and `sourcesEditor.value(article.SOURCES)` to correctly populate the editor fields when loading an article for editing.
        *   Updated `create.js` to use `contentEditor.value()` and `sourcesEditor.value()` when submitting the form to retrieve the content from the editors.

### Current Feature Implementation: Tags on Homepage

*   **Goal:** Implement clickable tags on article images on the homepage, similar to the provided image example, without obscuring the image. Clicking a tag should filter articles by that tag.
*   **Progress:**
    *   **`app.js`:** Updated to include logic for parsing `tag` query parameters from the URL, filtering articles by tag, and generating HTML for clickable tag badges within `renderFeaturedArticle` and `renderArticleItem`.
    *   **`style.css`:** Pending. New CSS rules are needed to style and position the tag badges.

### Next Steps:

1.  **Complete Tags Feature:** Add the necessary CSS to `style.css` to visually style the tag badges.
2.  **Verify Tags Feature:** Instruct the user to test the new tags functionality.