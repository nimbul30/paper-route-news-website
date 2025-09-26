# Design Document

## Overview

The Database Response Sanitizer is a utility system designed to transform complex Oracle database driver responses into clean, serializable JavaScript objects. The current implementation shows partial fixes where arrays are used for article lists, but individual article queries still return complex objects with metadata, internal functions, and potential circular references that cause JSON serialization errors.

The solution involves creating a centralized sanitization utility that can handle both array-based responses and complex object responses, ensuring consistent data cleaning across all database interactions.

## Architecture

### Current State Analysis

- **Articles List Endpoint**: Currently returns simple arrays (`result.rows`) which avoids the complex object issue
- **Single Article Endpoint**: Uses `OUT_FORMAT_OBJECT` which returns complex objects with metadata and potential circular references
- **CLOB Handling**: Already handles CLOB data extraction with `getData()` method calls
- **Error Points**: JSON serialization fails when complex objects contain circular references

### Proposed Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Routes    │───▶│   Sanitization   │───▶│  Clean Response │
│                 │    │     Utility      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Oracle DB Query │    │ Object Cleaning  │    │ JSON Serialized │
│ (Complex Object)│    │ & CLOB Handling  │    │ Safe Response   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Database Response Sanitizer Utility

**Purpose**: Central utility for cleaning Oracle database responses

**Interface**:

```javascript
class DatabaseSanitizer {
  // Sanitize a single database object
  static sanitizeObject(dbObject, fieldMapping = null)

  // Sanitize an array of database objects
  static sanitizeArray(dbArray, fieldMapping = null)

  // Handle CLOB data extraction
  static async extractClobData(dbObject, clobFields = [])

  // Create clean object from array-based response
  static arrayToObject(dbArray, fieldNames = [])
}
```

### 2. Field Mapping Configuration

**Purpose**: Define how database fields map to clean response objects

**Structure**:

```javascript
const ARTICLE_FIELD_MAPPING = {
  ID: 'id',
  TITLE: 'title',
  SLUG: 'slug',
  CONTENT: 'content',
  CATEGORY: 'category',
  IMAGE_URL: 'image_url',
  SOURCES: 'sources',
  VERIFICATION_PDF_URL: 'verification_pdf_url',
  YOUTUBE_EMBED_URL: 'youtube_embed_url',
  CREATED_AT: 'created_at',
};

const CLOB_FIELDS = ['CONTENT', 'SOURCES'];
```

### 3. Enhanced API Route Handlers

**Purpose**: Integrate sanitization into existing routes

**Implementation Strategy**:

- Modify `/api/articles` to use consistent object format
- Update `/api/articles/:slug` to use sanitization utility
- Ensure all responses are clean and serializable

## Data Models

### Input Data Structure (Oracle DB Response)

```javascript
// Complex Oracle object with metadata
{
  ID: { value: 1, metadata: {...}, _internal: {...} },
  TITLE: { value: "Article Title", metadata: {...} },
  SLUG: { value: "article-slug", metadata: {...} },
  CONTENT: { getData: function() {...}, metadata: {...} },
  // ... circular references and internal functions
}
```

### Output Data Structure (Sanitized)

```javascript
// Clean, serializable object
{
  id: 1,
  title: "Article Title",
  slug: "article-slug",
  content: "Article content text...",
  category: "news",
  image_url: "https://example.com/image.jpg",
  sources: "Source information...",
  verification_pdf_url: "https://example.com/doc.pdf",
  youtube_embed_url: "https://youtube.com/embed/xyz",
  created_at: "2024-01-01T00:00:00Z"
}
```

## Error Handling

### Sanitization Error Handling

1. **Circular Reference Detection**: Detect and break circular references during object traversal
2. **CLOB Extraction Failures**: Provide fallback empty string if `getData()` fails
3. **Missing Field Handling**: Use null/undefined for missing expected fields
4. **Type Validation**: Ensure output fields match expected types

### API Error Responses

```javascript
// Sanitization failure fallback
{
  error: "Data sanitization failed",
  fallback: true,
  data: {} // Empty safe object
}
```

### Logging Strategy

- Log sanitization failures with original object structure (truncated)
- Track performance metrics for sanitization operations
- Monitor CLOB extraction success rates

## Testing Strategy

### Unit Tests

1. **Sanitization Utility Tests**

   - Test complex object cleaning
   - Test array-to-object conversion
   - Test CLOB data extraction
   - Test circular reference handling
   - Test field mapping accuracy

2. **Error Handling Tests**
   - Test malformed database responses
   - Test CLOB extraction failures
   - Test missing field scenarios
   - Test circular reference edge cases

### Integration Tests

1. **API Route Tests**
   - Test `/api/articles` returns clean array of objects
   - Test `/api/articles/:slug` returns sanitized single object
   - Test JSON serialization success for all responses
   - Test error responses are properly sanitized

### Performance Tests

1. **Sanitization Performance**
   - Benchmark sanitization time for large result sets
   - Memory usage analysis during object cleaning
   - CLOB extraction performance metrics

## Implementation Considerations

### Backward Compatibility

- Maintain existing API response structure
- Ensure frontend applications continue to work without changes
- Preserve all essential business data during sanitization

### Performance Optimization

- Lazy CLOB extraction only when needed
- Efficient object traversal algorithms
- Minimal memory footprint during sanitization

### Extensibility

- Configurable field mappings for different database tables
- Pluggable sanitization strategies for different data types
- Support for future Oracle driver updates
