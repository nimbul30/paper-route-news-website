const ARTICLE_FIELD_NAMES = [
  'ID',
  'TITLE',
  'SLUG',
  'CONTENT',
  'AUTHOR_ID',
  'CREATED_AT',
  'IMAGE_URL',
  'SOURCES',
  'VERIFICATION_DETAILS',
  'VERIFICATION_PDF_URL',
  'YOUTUBE_EMBED_URL',
  'SPOT_NUMBER',
  'TAGS',
  'LAYOUT',
  'WIDESCREEN_IMAGE_URL',
];

const ARTICLE_FIELD_MAPPING = {
  ID: 'ID',
  TITLE: 'TITLE',
  SLUG: 'SLUG',
  CONTENT: 'CONTENT',
  AUTHOR_ID: 'AUTHOR_ID',
  CREATED_AT: 'CREATED_AT',
  IMAGE_URL: 'IMAGE_URL',
  SOURCES: 'SOURCES',
  VERIFICATION_DETAILS: 'VERIFICATION_DETAILS',
  VERIFICATION_PDF_URL: 'VERIFICATION_PDF_URL',
  YOUTUBE_EMBED_URL: 'YOUTUBE_EMBED_URL',
  SPOT_NUMBER: 'SPOT_NUMBER',
  TAGS: 'TAGS',
  LAYOUT: 'LAYOUT',
  WIDESCREEN_IMAGE_URL: 'WIDESCREEN_IMAGE_URL',
};

const CLOB_FIELDS = ['CONTENT', 'SOURCES'];

class DatabaseSanitizer {
  static arrayToObject(dbArray, fieldNames = ARTICLE_FIELD_NAMES) {
    if (!Array.isArray(dbArray)) {
      return [];
    }

    return dbArray.map((row) => {
      if (!Array.isArray(row)) {
        return {};
      }

      const cleanObject = {};
      fieldNames.forEach((fieldName, index) => {
        if (index < row.length) {
          const mappedField =
            ARTICLE_FIELD_MAPPING[fieldName] || fieldName.toLowerCase();
          let value = row[index];

          if (value instanceof Date) {
            value = value.toISOString();
          }

          cleanObject[mappedField] = value;
        }
      });

      return cleanObject;
    });
  }

  static async sanitizeArray(dbArray) {
    if (!Array.isArray(dbArray)) {
      return [];
    }

    const sanitized = [];
    for (const item of dbArray) {
      const sanitizedItem = await this.sanitizeObject(item);
      sanitized.push(sanitizedItem);
    }
    return sanitized;
  }

  static async sanitizeObject(dbObject) {
    const cleanObject = {};
    for (const key in dbObject) {
      if (Object.prototype.hasOwnProperty.call(dbObject, key)) {
        let value = dbObject[key];
        if (value && typeof value.getData === 'function') {
          try {
            value = await value.getData();
          } catch (e) {
            console.error(`Error getting data for CLOB field ${key}`, e);
            value = '';
          }
        }
        cleanObject[key] = value;
      }
    }
    return cleanObject;
  }
}

module.exports = {
  DatabaseSanitizer,
  ARTICLE_FIELD_MAPPING,
  ARTICLE_FIELD_NAMES,
  CLOB_FIELDS,
};