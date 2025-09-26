/**
 * Database Response Sanitizer Utility
 *
 * Transforms complex Oracle database driver responses into clean, serializable JavaScript objects.
 * Handles metadata removal, circular reference breaking, and CLOB data extraction.
 */

// Performance and error tracking with enhanced metrics
const PERFORMANCE_METRICS = {
  sanitizationCount: 0,
  totalSanitizationTime: 0,
  errorCount: 0,
  clobExtractionCount: 0,
  clobExtractionFailures: 0,
  // Enhanced performance metrics
  memoryUsage: {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    arrayBuffers: 0,
    peakHeapUsed: 0,
  },
  operationTimes: {
    sanitizeObject: [],
    sanitizeArray: [],
    extractClobData: [],
    processBatch: [],
  },
  batchProcessingStats: {
    totalBatches: 0,
    averageBatchSize: 0,
    parallelProcessingCount: 0,
    sequentialProcessingCount: 0,
  },
  largeResultSetStats: {
    processedArrays: 0,
    totalObjectsProcessed: 0,
    averageArraySize: 0,
    maxArraySize: 0,
  },
  optimizationMetrics: {
    circularReferencesDetected: 0,
    fallbackObjectsCreated: 0,
    clobExtractionOptimizations: 0,
    batchSizeOptimizations: 0,
  },
};

/**
 * Enhanced logger utility for sanitization operations with performance monitoring
 */
class SanitizationLogger {
  static logError(operation, error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      operation,
      error: error.message,
      stack: error.stack,
      context,
    };

    console.error(`[DatabaseSanitizer] ${operation} failed:`, errorInfo);
    PERFORMANCE_METRICS.errorCount++;
  }

  static logWarning(operation, message, context = {}) {
    const timestamp = new Date().toISOString();
    console.warn(`[DatabaseSanitizer] ${operation}:`, {
      timestamp,
      message,
      context,
    });
  }

  static logPerformance(operation, duration, context = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[DatabaseSanitizer] Performance - ${operation}:`, {
      timestamp,
      duration: `${duration}ms`,
      context,
    });

    // Store operation times for analysis
    if (PERFORMANCE_METRICS.operationTimes[operation]) {
      PERFORMANCE_METRICS.operationTimes[operation].push(duration);
      // Keep only last 100 measurements to prevent memory bloat
      if (PERFORMANCE_METRICS.operationTimes[operation].length > 100) {
        PERFORMANCE_METRICS.operationTimes[operation].shift();
      }
    }
  }

  static trackMemoryUsage(operation) {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memUsage = process.memoryUsage();
        PERFORMANCE_METRICS.memoryUsage.heapUsed = memUsage.heapUsed;
        PERFORMANCE_METRICS.memoryUsage.heapTotal = memUsage.heapTotal;
        PERFORMANCE_METRICS.memoryUsage.external = memUsage.external;
        PERFORMANCE_METRICS.memoryUsage.arrayBuffers =
          memUsage.arrayBuffers || 0;

        // Track peak heap usage
        if (memUsage.heapUsed > PERFORMANCE_METRICS.memoryUsage.peakHeapUsed) {
          PERFORMANCE_METRICS.memoryUsage.peakHeapUsed = memUsage.heapUsed;
        }

        // Log memory warnings for high usage
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        if (heapUsedMB > 500) {
          // Warn if heap usage exceeds 500MB
          this.logWarning(
            'memoryUsage',
            `High memory usage detected: ${heapUsedMB}MB`,
            {
              operation,
              heapUsed: heapUsedMB,
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            }
          );
        }
      }
    } catch (memoryError) {
      this.logError('trackMemoryUsage', memoryError, { operation });
    }
  }

  static createBenchmark(operation) {
    const startTime = Date.now();
    let startMemory = null;

    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        startMemory = process.memoryUsage();
      }
    } catch (memError) {
      // Memory tracking not available, continue without it
    }

    return {
      end: () => {
        const duration = Date.now() - startTime;
        let memoryDelta = null;

        try {
          if (
            startMemory &&
            typeof process !== 'undefined' &&
            process.memoryUsage
          ) {
            const endMemory = process.memoryUsage();
            memoryDelta = {
              heapUsed: endMemory.heapUsed - startMemory.heapUsed,
              heapTotal: endMemory.heapTotal - startMemory.heapTotal,
              external: endMemory.external - startMemory.external,
            };
          }
        } catch (memError) {
          // Memory tracking failed, continue without it
        }

        // Log performance with memory delta if available
        SanitizationLogger.logPerformance(operation, duration, {
          memoryDelta: memoryDelta
            ? {
                heapUsedMB: Math.round(memoryDelta.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memoryDelta.heapTotal / 1024 / 1024),
                externalMB: Math.round(memoryDelta.external / 1024 / 1024),
              }
            : null,
        });

        SanitizationLogger.trackMemoryUsage(operation);
        return { duration, memoryDelta };
      },
    };
  }

  static getPerformanceAnalysis() {
    const analysis = {
      averageOperationTimes: {},
      memoryUsage: { ...PERFORMANCE_METRICS.memoryUsage },
      batchProcessingStats: { ...PERFORMANCE_METRICS.batchProcessingStats },
      largeResultSetStats: { ...PERFORMANCE_METRICS.largeResultSetStats },
      optimizationMetrics: { ...PERFORMANCE_METRICS.optimizationMetrics },
      recommendations: [],
    };

    // Calculate average operation times
    for (const [operation, times] of Object.entries(
      PERFORMANCE_METRICS.operationTimes
    )) {
      if (times.length > 0) {
        const sum = times.reduce((a, b) => a + b, 0);
        const avg = sum / times.length;
        const max = Math.max(...times);
        const min = Math.min(...times);

        analysis.averageOperationTimes[operation] = {
          average: Math.round(avg * 100) / 100,
          max,
          min,
          samples: times.length,
        };

        // Generate performance recommendations
        if (avg > 1000) {
          // Operations taking more than 1 second on average
          analysis.recommendations.push({
            type: 'performance',
            operation,
            issue: `${operation} operations are slow (avg: ${Math.round(
              avg
            )}ms)`,
            suggestion:
              'Consider optimizing batch sizes or implementing parallel processing',
          });
        }
      }
    }

    // Memory usage recommendations
    const heapUsedMB = Math.round(
      PERFORMANCE_METRICS.memoryUsage.heapUsed / 1024 / 1024
    );
    const peakHeapUsedMB = Math.round(
      PERFORMANCE_METRICS.memoryUsage.peakHeapUsed / 1024 / 1024
    );

    if (peakHeapUsedMB > 1000) {
      // Peak usage over 1GB
      analysis.recommendations.push({
        type: 'memory',
        issue: `High peak memory usage: ${peakHeapUsedMB}MB`,
        suggestion:
          'Consider reducing batch sizes or implementing streaming processing',
      });
    }

    // Batch processing recommendations
    if (PERFORMANCE_METRICS.batchProcessingStats.averageBatchSize > 500) {
      analysis.recommendations.push({
        type: 'batch',
        issue: `Large average batch size: ${PERFORMANCE_METRICS.batchProcessingStats.averageBatchSize}`,
        suggestion: 'Consider reducing batch size for better memory management',
      });
    }

    return analysis;
  }

  static getMetrics() {
    return { ...PERFORMANCE_METRICS };
  }

  static resetMetrics() {
    PERFORMANCE_METRICS.sanitizationCount = 0;
    PERFORMANCE_METRICS.totalSanitizationTime = 0;
    PERFORMANCE_METRICS.errorCount = 0;
    PERFORMANCE_METRICS.clobExtractionCount = 0;
    PERFORMANCE_METRICS.clobExtractionFailures = 0;

    // Reset enhanced metrics
    PERFORMANCE_METRICS.memoryUsage = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      peakHeapUsed: 0,
    };

    for (const operation in PERFORMANCE_METRICS.operationTimes) {
      PERFORMANCE_METRICS.operationTimes[operation] = [];
    }

    PERFORMANCE_METRICS.batchProcessingStats = {
      totalBatches: 0,
      averageBatchSize: 0,
      parallelProcessingCount: 0,
      sequentialProcessingCount: 0,
    };

    PERFORMANCE_METRICS.largeResultSetStats = {
      processedArrays: 0,
      totalObjectsProcessed: 0,
      averageArraySize: 0,
      maxArraySize: 0,
    };

    PERFORMANCE_METRICS.optimizationMetrics = {
      circularReferencesDetected: 0,
      fallbackObjectsCreated: 0,
      clobExtractionOptimizations: 0,
      batchSizeOptimizations: 0,
    };
  }
}

// Field names array in the exact order of database columns
// Order MUST match the database column order: ID, TITLE, SLUG, CONTENT, CATEGORY, AUTHOR_ID, CREATED_AT, IMAGE_URL, SOURCES, VERIFICATION_DETAILS, VERIFICATION_PDF_URL, YOUTUBE_EMBED_URL
const ARTICLE_FIELD_NAMES = [
  'ID',
  'TITLE',
  'SLUG',
  'CONTENT',
  'CATEGORY',
  'AUTHOR_ID',
  'CREATED_AT',
  'IMAGE_URL',
  'SOURCES',
  'VERIFICATION_DETAILS',
  'VERIFICATION_PDF_URL',
  'YOUTUBE_EMBED_URL',
];

// Field mapping configuration for articles table
// Maps database field names to frontend field names (frontend expects uppercase)
const ARTICLE_FIELD_MAPPING = {
  ID: 'ID',
  TITLE: 'TITLE',
  SLUG: 'SLUG',
  CONTENT: 'CONTENT',
  CATEGORY: 'CATEGORY',
  AUTHOR_ID: 'AUTHOR_ID',
  CREATED_AT: 'CREATED_AT',
  IMAGE_URL: 'IMAGE_URL',
  SOURCES: 'SOURCES',
  VERIFICATION_DETAILS: 'VERIFICATION_DETAILS',
  VERIFICATION_PDF_URL: 'VERIFICATION_PDF_URL',
  YOUTUBE_EMBED_URL: 'YOUTUBE_EMBED_URL',
};

// CLOB fields that require special handling with getData() calls
const CLOB_FIELDS = ['CONTENT', 'SOURCES'];

class DatabaseSanitizer {
  /**
   * Extract clean properties from a complex Oracle database object
   * @param {Object} dbObject - Complex Oracle database response object
   * @param {Object} fieldMapping - Optional field mapping configuration
   * @param {Set} visitedObjects - Set to track visited objects for circular reference detection
   * @returns {Object} Clean object with only essential properties
   */
  static sanitizeObject(
    dbObject,
    fieldMapping = ARTICLE_FIELD_MAPPING,
    visitedObjects = new Set()
  ) {
    const benchmark = SanitizationLogger.createBenchmark('sanitizeObject');

    try {
      // Input validation with comprehensive error handling
      if (!dbObject || typeof dbObject !== 'object') {
        SanitizationLogger.logWarning(
          'sanitizeObject',
          'Invalid input provided',
          {
            inputType: typeof dbObject,
            inputValue: dbObject,
          }
        );
        return this.createFallbackObject();
      }

      // Circular reference detection
      if (visitedObjects.has(dbObject)) {
        PERFORMANCE_METRICS.optimizationMetrics.circularReferencesDetected++;
        SanitizationLogger.logWarning(
          'sanitizeObject',
          'Circular reference detected, breaking reference',
          {
            objectKeys: Object.keys(dbObject).slice(0, 5), // Log first 5 keys for context
          }
        );
        return this.createFallbackObject();
      }

      // Add current object to visited set
      visitedObjects.add(dbObject);

      const cleanObject = {};
      let successfulFields = 0;
      let failedFields = 0;

      try {
        // Extract properties based on field mapping with individual error handling
        for (const [dbField, cleanField] of Object.entries(fieldMapping)) {
          try {
            // Use safer property existence check
            let hasProperty = false;
            try {
              hasProperty = Object.prototype.hasOwnProperty.call(
                dbObject,
                dbField
              );
            } catch (propCheckError) {
              // If hasOwnProperty fails, try direct property access
              try {
                hasProperty =
                  dbField in dbObject && dbObject[dbField] !== undefined;
              } catch (inCheckError) {
                SanitizationLogger.logError(
                  'sanitizeObject.propertyCheck',
                  inCheckError,
                  {
                    field: dbField,
                  }
                );
                continue; // Skip this field
              }
            }

            if (hasProperty) {
              const extractedValue = this.extractPropertyValue(
                dbObject[dbField],
                visitedObjects
              );
              cleanObject[cleanField] = extractedValue;
              successfulFields++;
            }
          } catch (fieldError) {
            failedFields++;
            SanitizationLogger.logError(
              'sanitizeObject.fieldExtraction',
              fieldError,
              {
                field: dbField,
                mappedField: cleanField,
              }
            );
            // Continue processing other fields even if one fails
            cleanObject[cleanField] = null; // Provide fallback value
          }
        }

        // Log performance metrics
        PERFORMANCE_METRICS.sanitizationCount++;
        const { duration } = benchmark.end();
        PERFORMANCE_METRICS.totalSanitizationTime += duration;

        if (duration > 100) {
          // Log slow operations with enhanced context
          SanitizationLogger.logPerformance('sanitizeObject', duration, {
            successfulFields,
            failedFields,
            totalFields: Object.keys(fieldMapping).length,
            efficiency: `${Math.round(
              (successfulFields / Object.keys(fieldMapping).length) * 100
            )}%`,
          });
        }

        return cleanObject;
      } catch (error) {
        SanitizationLogger.logError('sanitizeObject.processing', error, {
          objectKeys: Object.keys(dbObject).slice(0, 10),
          fieldMappingKeys: Object.keys(fieldMapping).slice(0, 10),
        });

        // Return partial object if error occurs during sanitization
        return Object.keys(cleanObject).length > 0
          ? cleanObject
          : this.createFallbackObject();
      }
    } catch (criticalError) {
      SanitizationLogger.logError('sanitizeObject.critical', criticalError, {
        inputType: typeof dbObject,
      });
      return this.createFallbackObject();
    } finally {
      // Remove current object from visited set to allow reuse in different branches
      if (
        visitedObjects &&
        visitedObjects.has &&
        visitedObjects.has(dbObject)
      ) {
        visitedObjects.delete(dbObject);
      }
    }
  }

  /**
   * Extract the actual value from a complex Oracle property object
   * @param {*} property - Oracle property which may be complex object or simple value
   * @param {Set} visitedObjects - Set to track visited objects for circular reference detection
   * @returns {*} Clean property value
   */
  static extractPropertyValue(property, visitedObjects = new Set()) {
    try {
      // Handle null/undefined
      if (property === null || property === undefined) {
        return property;
      }

      // If it's a simple value (string, number, boolean), return as-is
      if (typeof property !== 'object') {
        return this.validateAndSanitizeValue(property);
      }

      // Circular reference detection for complex objects
      if (visitedObjects.has(property)) {
        PERFORMANCE_METRICS.optimizationMetrics.circularReferencesDetected++;
        SanitizationLogger.logWarning(
          'extractPropertyValue',
          'Circular reference detected in property extraction',
          {
            propertyType: typeof property,
            propertyConstructor: property.constructor?.name,
          }
        );
        return null;
      }

      // Add to visited objects
      visitedObjects.add(property);

      try {
        // Handle Oracle complex objects with value property
        let hasValueProperty = false;
        try {
          hasValueProperty = Object.prototype.hasOwnProperty.call(
            property,
            'value'
          );
        } catch (valueCheckError) {
          try {
            hasValueProperty = 'value' in property;
          } catch (inCheckError) {
            // If both checks fail, assume no value property
            hasValueProperty = false;
          }
        }

        if (hasValueProperty) {
          try {
            const value = property.value;
            return this.validateAndSanitizeValue(value);
          } catch (valueError) {
            SanitizationLogger.logError(
              'extractPropertyValue.oracleValue',
              valueError,
              {
                hasValue: hasValueProperty,
              }
            );
            return null;
          }
        }

        // Handle CLOB objects with getData method (will be handled in separate method)
        if (typeof property.getData === 'function') {
          // Return the property as-is for now, CLOB extraction will be handled separately
          return property;
        }

        // Handle arrays with error recovery
        if (Array.isArray(property)) {
          try {
            return property.map((item, index) => {
              try {
                return this.extractPropertyValue(item, visitedObjects);
              } catch (itemError) {
                SanitizationLogger.logError(
                  'extractPropertyValue.arrayItem',
                  itemError,
                  {
                    itemIndex: index,
                    itemType: typeof item,
                  }
                );
                return null; // Fallback for failed array item
              }
            });
          } catch (arrayError) {
            SanitizationLogger.logError(
              'extractPropertyValue.array',
              arrayError,
              {
                arrayLength: property.length,
              }
            );
            return []; // Fallback to empty array
          }
        }

        // For other complex objects, try to extract meaningful data
        // This handles cases where the object might have direct properties
        if (property.constructor === Object) {
          try {
            // Create a clean version of the plain object
            const cleanObj = {};
            let processedProperties = 0;

            // Use Object.getOwnPropertyNames to avoid issues with getters
            let propertyNames = [];
            try {
              propertyNames = Object.getOwnPropertyNames(property);
            } catch (namesError) {
              SanitizationLogger.logError(
                'extractPropertyValue.getPropertyNames',
                namesError,
                {
                  objectType: typeof property,
                }
              );
              return {}; // Fallback to empty object
            }

            for (const key of propertyNames) {
              try {
                // Skip functions and internal properties
                if (!key.startsWith('_')) {
                  let value;
                  try {
                    value = property[key];
                  } catch (accessError) {
                    SanitizationLogger.logError(
                      'extractPropertyValue.propertyAccess',
                      accessError,
                      {
                        propertyKey: key,
                      }
                    );
                    continue; // Skip this property and continue with others
                  }

                  if (typeof value !== 'function') {
                    cleanObj[key] = this.extractPropertyValue(
                      value,
                      visitedObjects
                    );
                    processedProperties++;
                  }
                }
              } catch (propError) {
                SanitizationLogger.logError(
                  'extractPropertyValue.objectProperty',
                  propError,
                  {
                    propertyKey: key,
                  }
                );
                // Continue processing other properties
              }
            }

            return cleanObj;
          } catch (objectError) {
            SanitizationLogger.logError(
              'extractPropertyValue.plainObject',
              objectError,
              {
                objectKeys: Object.keys(property).slice(0, 5),
              }
            );
            return {}; // Fallback to empty object
          }
        }

        // Handle Date objects
        if (property instanceof Date) {
          try {
            return property.toISOString();
          } catch (dateError) {
            SanitizationLogger.logError(
              'extractPropertyValue.date',
              dateError,
              {
                dateValue: property.toString(),
              }
            );
            return null;
          }
        }

        // Fallback: convert to string if possible, otherwise return null
        try {
          const stringValue = String(property);
          return this.validateAndSanitizeValue(stringValue);
        } catch (stringError) {
          SanitizationLogger.logWarning(
            'extractPropertyValue',
            'Failed to convert property to string',
            {
              propertyType: typeof property,
              propertyConstructor: property.constructor?.name,
              error: stringError.message,
            }
          );
          return null;
        }
      } catch (processingError) {
        SanitizationLogger.logError(
          'extractPropertyValue.processing',
          processingError,
          {
            propertyType: typeof property,
            hasGetData: typeof property.getData === 'function',
            isArray: Array.isArray(property),
          }
        );
        return null;
      } finally {
        // Remove from visited objects
        if (
          visitedObjects &&
          visitedObjects.has &&
          visitedObjects.has(property)
        ) {
          visitedObjects.delete(property);
        }
      }
    } catch (criticalError) {
      SanitizationLogger.logError(
        'extractPropertyValue.critical',
        criticalError,
        {
          propertyType: typeof property,
        }
      );
      return null;
    }
  }

  /**
   * Validate and sanitize a primitive value
   * @param {*} value - The value to validate and sanitize
   * @returns {*} Sanitized value
   */
  static validateAndSanitizeValue(value) {
    try {
      // Handle null/undefined
      if (value === null || value === undefined) {
        return value;
      }

      // Handle strings
      if (typeof value === 'string') {
        try {
          // Remove any potential control characters and trim
          const sanitized = value.replace(/[\x00-\x1F\x7F]/g, '').trim();
          return sanitized;
        } catch (stringError) {
          SanitizationLogger.logError(
            'validateAndSanitizeValue.string',
            stringError,
            {
              originalLength: value.length,
              valuePreview: value.substring(0, 50),
            }
          );
          return ''; // Fallback to empty string
        }
      }

      // Handle numbers
      if (typeof value === 'number') {
        try {
          // Check for valid numbers (not NaN or Infinity)
          if (isNaN(value) || !isFinite(value)) {
            SanitizationLogger.logWarning(
              'validateAndSanitizeValue',
              'Invalid number detected',
              {
                value,
                isNaN: isNaN(value),
                isFinite: isFinite(value),
              }
            );
            return null;
          }
          return value;
        } catch (numberError) {
          SanitizationLogger.logError(
            'validateAndSanitizeValue.number',
            numberError,
            {
              value,
            }
          );
          return null;
        }
      }

      // Handle booleans
      if (typeof value === 'boolean') {
        return value;
      }

      // For other types, log and return as-is
      if (
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean'
      ) {
        SanitizationLogger.logWarning(
          'validateAndSanitizeValue',
          'Unexpected value type encountered',
          {
            valueType: typeof value,
            valueConstructor: value.constructor?.name,
          }
        );
      }

      return value;
    } catch (criticalError) {
      SanitizationLogger.logError(
        'validateAndSanitizeValue.critical',
        criticalError,
        {
          valueType: typeof value,
        }
      );
      return null; // Safe fallback
    }
  }

  /**
   * Convert Oracle array response to clean objects using field mapping
   * @param {Array} dbArray - Array response from Oracle database
   * @param {Array} fieldNames - Array of field names corresponding to array indices
   * @returns {Array} Array of clean objects
   */
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

          // Handle Date objects by converting to ISO string
          if (value instanceof Date) {
            value = value.toISOString();
          }

          cleanObject[mappedField] = value;
        }
      });

      return cleanObject;
    });
  }

  /**
   * Get the field mapping configuration for articles
   * @returns {Object} Article field mapping configuration
   */
  static getArticleFieldMapping() {
    return { ...ARTICLE_FIELD_MAPPING };
  }

  /**
   * Extract CLOB data from database objects with getData() method calls
   * @param {Object} dbObject - Database object that may contain CLOB fields
   * @param {Array} clobFields - Array of field names that are CLOB fields (defaults to CLOB_FIELDS)
   * @returns {Promise<Object>} Object with extracted CLOB data
   */
  static async extractClobData(dbObject, clobFields = CLOB_FIELDS) {
    const benchmark = SanitizationLogger.createBenchmark('extractClobData');

    try {
      // Input validation
      if (!dbObject || typeof dbObject !== 'object') {
        SanitizationLogger.logWarning(
          'extractClobData',
          'Invalid database object provided',
          {
            inputType: typeof dbObject,
            inputValue: dbObject,
          }
        );
        return {};
      }

      if (!Array.isArray(clobFields)) {
        SanitizationLogger.logWarning(
          'extractClobData',
          'Invalid CLOB fields array provided',
          {
            clobFieldsType: typeof clobFields,
            clobFields,
          }
        );
        clobFields = CLOB_FIELDS; // Fallback to default
      }

      const extractedData = {};
      let successfulExtractions = 0;
      let failedExtractions = 0;

      for (const clobField of clobFields) {
        try {
          PERFORMANCE_METRICS.clobExtractionCount++;

          // Use safer property existence check
          let hasProperty = false;
          try {
            hasProperty = Object.prototype.hasOwnProperty.call(
              dbObject,
              clobField
            );
          } catch (propCheckError) {
            try {
              hasProperty =
                clobField in dbObject && dbObject[clobField] !== undefined;
            } catch (inCheckError) {
              SanitizationLogger.logError(
                'extractClobData.propertyCheck',
                inCheckError,
                {
                  field: clobField,
                }
              );
              continue; // Skip this field
            }
          }

          if (hasProperty) {
            const clobProperty = dbObject[clobField];

            // Check if the property has a getData method (CLOB object)
            if (clobProperty && typeof clobProperty.getData === 'function') {
              try {
                const clobData = await clobProperty.getData();
                extractedData[clobField] = clobData || '';
                successfulExtractions++;
              } catch (clobError) {
                PERFORMANCE_METRICS.clobExtractionFailures++;
                failedExtractions++;
                SanitizationLogger.logError(
                  'extractClobData.getData',
                  clobError,
                  {
                    field: clobField,
                    hasGetData: true,
                  }
                );
                extractedData[clobField] = ''; // Fallback to empty string
              }
            } else if (
              clobProperty &&
              Object.prototype.hasOwnProperty.call(clobProperty, 'value')
            ) {
              try {
                // Handle Oracle complex objects with value property
                extractedData[clobField] = clobProperty.value || '';
                successfulExtractions++;
              } catch (valueError) {
                failedExtractions++;
                SanitizationLogger.logError(
                  'extractClobData.value',
                  valueError,
                  {
                    field: clobField,
                    hasValue: true,
                  }
                );
                extractedData[clobField] = '';
              }
            } else if (typeof clobProperty === 'string') {
              try {
                // Handle simple string values
                extractedData[clobField] = clobProperty;
                successfulExtractions++;
              } catch (stringError) {
                failedExtractions++;
                SanitizationLogger.logError(
                  'extractClobData.string',
                  stringError,
                  {
                    field: clobField,
                    propertyType: 'string',
                  }
                );
                extractedData[clobField] = '';
              }
            } else {
              // Fallback for other cases
              SanitizationLogger.logWarning(
                'extractClobData',
                'Unexpected CLOB property type',
                {
                  field: clobField,
                  propertyType: typeof clobProperty,
                  propertyConstructor: clobProperty?.constructor?.name,
                }
              );
              extractedData[clobField] = '';
            }
          } else {
            // Field not present in object, set to empty string
            extractedData[clobField] = '';
          }
        } catch (fieldError) {
          failedExtractions++;
          PERFORMANCE_METRICS.clobExtractionFailures++;
          SanitizationLogger.logError('extractClobData.field', fieldError, {
            field: clobField,
          });
          extractedData[clobField] = ''; // Fallback to empty string on any error
        }
      }

      // Log performance metrics with enhanced analysis
      const { duration } = benchmark.end();
      const extractionRate = Math.round(
        (successfulExtractions / clobFields.length) * 100
      );

      if (duration > 50 || failedExtractions > 0) {
        // Log slow operations or operations with failures
        SanitizationLogger.logPerformance('extractClobData', duration, {
          totalFields: clobFields.length,
          successfulExtractions,
          failedExtractions,
          extractionRate: `${extractionRate}%`,
          averageTimePerField: `${
            Math.round((duration / clobFields.length) * 100) / 100
          }ms`,
        });
      }

      // Track CLOB extraction optimizations
      if (successfulExtractions > 0 && failedExtractions === 0) {
        PERFORMANCE_METRICS.optimizationMetrics.clobExtractionOptimizations++;
      }

      return extractedData;
    } catch (criticalError) {
      SanitizationLogger.logError('extractClobData.critical', criticalError, {
        clobFieldsLength: clobFields?.length,
        objectKeys: dbObject ? Object.keys(dbObject).slice(0, 5) : [],
      });

      // Return fallback object with empty strings for all expected fields
      const fallbackData = {};
      if (Array.isArray(clobFields)) {
        clobFields.forEach((field) => {
          fallbackData[field] = '';
        });
      }
      return fallbackData;
    }
  }

  /**
   * Sanitize an array of database objects with performance optimizations
   * @param {Array} dbArray - Array of complex Oracle database response objects
   * @param {Object} fieldMapping - Optional field mapping configuration
   * @param {Object} options - Optional configuration for batch processing
   * @param {number} options.batchSize - Number of objects to process in each batch (default: 100)
   * @param {boolean} options.parallel - Whether to process batches in parallel (default: false)
   * @returns {Promise<Array>} Array of clean objects
   */
  static async sanitizeArray(
    dbArray,
    fieldMapping = ARTICLE_FIELD_MAPPING,
    options = {}
  ) {
    const benchmark = SanitizationLogger.createBenchmark('sanitizeArray');

    try {
      // Input validation with comprehensive error handling
      if (!Array.isArray(dbArray)) {
        SanitizationLogger.logWarning(
          'sanitizeArray',
          'Non-array input provided',
          {
            inputType: typeof dbArray,
            inputValue: dbArray,
          }
        );
        return [];
      }

      if (dbArray.length === 0) {
        return [];
      }

      // Update large result set statistics
      PERFORMANCE_METRICS.largeResultSetStats.processedArrays++;
      PERFORMANCE_METRICS.largeResultSetStats.totalObjectsProcessed +=
        dbArray.length;

      if (
        dbArray.length > PERFORMANCE_METRICS.largeResultSetStats.maxArraySize
      ) {
        PERFORMANCE_METRICS.largeResultSetStats.maxArraySize = dbArray.length;
      }

      // Calculate running average
      PERFORMANCE_METRICS.largeResultSetStats.averageArraySize = Math.round(
        PERFORMANCE_METRICS.largeResultSetStats.totalObjectsProcessed /
          PERFORMANCE_METRICS.largeResultSetStats.processedArrays
      );

      // Validate options and optimize batch size based on array size
      let { batchSize = 100, parallel = false } = options || {};

      // Dynamic batch size optimization for large arrays
      if (dbArray.length > 1000 && batchSize === 100) {
        batchSize = Math.min(
          200,
          Math.max(50, Math.floor(dbArray.length / 10))
        );
        PERFORMANCE_METRICS.optimizationMetrics.batchSizeOptimizations++;
        SanitizationLogger.logWarning(
          'sanitizeArray',
          'Optimized batch size for large array',
          {
            originalBatchSize: 100,
            optimizedBatchSize: batchSize,
            arraySize: dbArray.length,
          }
        );
      }

      if (typeof batchSize !== 'number' || batchSize <= 0) {
        SanitizationLogger.logWarning(
          'sanitizeArray',
          'Invalid batch size, using default',
          {
            providedBatchSize: batchSize,
            defaultBatchSize: 100,
          }
        );
        batchSize = 100;
      }

      const effectiveBatchSize = batchSize;

      // For small arrays, process directly without batching
      if (dbArray.length <= effectiveBatchSize) {
        try {
          const result = await this.processBatch(dbArray, fieldMapping);

          const { duration } = benchmark.end();
          SanitizationLogger.logPerformance('sanitizeArray.small', duration, {
            arrayLength: dbArray.length,
            resultLength: result.length,
            throughput: `${Math.round(
              dbArray.length / (duration / 1000)
            )} objects/sec`,
          });

          return result;
        } catch (smallArrayError) {
          SanitizationLogger.logError('sanitizeArray.small', smallArrayError, {
            arrayLength: dbArray.length,
          });

          // Return array of fallback objects
          return dbArray.map(() => this.createFallbackObject(fieldMapping));
        }
      }

      // Split large arrays into batches for performance optimization
      let batches;
      try {
        batches = this.createBatches(dbArray, effectiveBatchSize);
      } catch (batchError) {
        SanitizationLogger.logError('sanitizeArray.createBatches', batchError, {
          arrayLength: dbArray.length,
          batchSize: effectiveBatchSize,
        });
        return dbArray.map(() => this.createFallbackObject(fieldMapping));
      }

      const results = [];
      let successfulBatches = 0;
      let failedBatches = 0;

      // Update batch processing statistics
      PERFORMANCE_METRICS.batchProcessingStats.totalBatches += batches.length;
      const totalBatchItems = batches.reduce(
        (sum, batch) => sum + batch.length,
        0
      );
      PERFORMANCE_METRICS.batchProcessingStats.averageBatchSize = Math.round(
        totalBatchItems / batches.length
      );

      if (parallel) {
        PERFORMANCE_METRICS.batchProcessingStats.parallelProcessingCount++;
        // Process batches in parallel for better performance with large datasets
        try {
          const batchPromises = batches.map((batch, index) =>
            this.processBatch(batch, fieldMapping).catch((batchError) => {
              SanitizationLogger.logError(
                'sanitizeArray.parallelBatch',
                batchError,
                {
                  batchIndex: index,
                  batchSize: batch.length,
                }
              );
              // Return fallback objects for failed batch
              return batch.map(() => this.createFallbackObject(fieldMapping));
            })
          );

          const batchResults = await Promise.all(batchPromises);

          // Flatten results from all batches
          for (const batchResult of batchResults) {
            if (Array.isArray(batchResult)) {
              results.push(...batchResult);
              successfulBatches++;
            } else {
              failedBatches++;
              SanitizationLogger.logWarning(
                'sanitizeArray',
                'Batch returned non-array result',
                {
                  resultType: typeof batchResult,
                }
              );
            }
          }
        } catch (parallelError) {
          SanitizationLogger.logError('sanitizeArray.parallel', parallelError, {
            totalBatches: batches.length,
            arrayLength: dbArray.length,
          });

          // Fallback to sequential processing if parallel fails
          SanitizationLogger.logWarning(
            'sanitizeArray',
            'Falling back to sequential processing due to parallel failure'
          );
          return this.sanitizeArray(dbArray, fieldMapping, {
            ...options,
            parallel: false,
          });
        }
      } else {
        PERFORMANCE_METRICS.batchProcessingStats.sequentialProcessingCount++;
        // Process batches sequentially to control memory usage
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          try {
            const batchResult = await this.processBatch(batch, fieldMapping);
            if (Array.isArray(batchResult)) {
              results.push(...batchResult);
              successfulBatches++;
            } else {
              failedBatches++;
              SanitizationLogger.logWarning(
                'sanitizeArray',
                'Batch returned non-array result in sequential mode',
                {
                  batchIndex: i,
                  resultType: typeof batchResult,
                }
              );
              // Add fallback objects for this batch
              results.push(
                ...batch.map(() => this.createFallbackObject(fieldMapping))
              );
            }
          } catch (batchError) {
            failedBatches++;
            SanitizationLogger.logError(
              'sanitizeArray.sequentialBatch',
              batchError,
              {
                batchIndex: i,
                batchSize: batch.length,
              }
            );

            // Add fallback objects for failed batch and continue with next batch
            results.push(
              ...batch.map(() => this.createFallbackObject(fieldMapping))
            );
          }
        }
      }

      // Log final performance metrics with enhanced analysis
      const { duration } = benchmark.end();
      const throughput = Math.round(dbArray.length / (duration / 1000));
      const successRate = Math.round(
        (successfulBatches / batches.length) * 100
      );

      SanitizationLogger.logPerformance('sanitizeArray.complete', duration, {
        inputLength: dbArray.length,
        outputLength: results.length,
        totalBatches: batches.length,
        successfulBatches,
        failedBatches,
        successRate: `${successRate}%`,
        throughput: `${throughput} objects/sec`,
        parallel,
        batchSize: effectiveBatchSize,
        averageTimePerObject: `${
          Math.round((duration / dbArray.length) * 100) / 100
        }ms`,
      });

      return results;
    } catch (criticalError) {
      SanitizationLogger.logError('sanitizeArray.critical', criticalError, {
        inputType: typeof dbArray,
        inputLength: Array.isArray(dbArray) ? dbArray.length : 'N/A',
      });

      // Return array of fallback objects as ultimate fallback
      if (Array.isArray(dbArray)) {
        return dbArray.map(() => this.createFallbackObject(fieldMapping));
      } else {
        return [];
      }
    }
  }

  /**
   * Process a single batch of database objects
   * @param {Array} batch - Batch of database objects to sanitize
   * @param {Object} fieldMapping - Field mapping configuration
   * @returns {Promise<Array>} Array of sanitized objects from the batch
   */
  static async processBatch(batch, fieldMapping) {
    const benchmark = SanitizationLogger.createBenchmark('processBatch');

    try {
      if (!Array.isArray(batch)) {
        SanitizationLogger.logError(
          'processBatch',
          new Error('Invalid batch input'),
          {
            batchType: typeof batch,
          }
        );
        return [];
      }

      const sanitizedBatch = [];
      let successfulObjects = 0;
      let failedObjects = 0;

      for (let i = 0; i < batch.length; i++) {
        const dbObject = batch[i];

        try {
          // Create a new visited objects set for each object to avoid cross-contamination
          const visitedObjects = new Set();
          let sanitizedObject = this.sanitizeObject(
            dbObject,
            fieldMapping,
            visitedObjects
          );

          // Check if sanitization returned a fallback object
          if (sanitizedObject._isFallback) {
            failedObjects++;
            SanitizationLogger.logWarning(
              'processBatch',
              'Object sanitization returned fallback',
              {
                objectIndex: i,
                fallbackReason: sanitizedObject._fallbackReason,
              }
            );
          }

          // Check if the object has any CLOB fields before extracting
          let hasClobFields = false;
          try {
            hasClobFields = CLOB_FIELDS.some((clobField) => {
              if (!dbObject) return false;
              try {
                return Object.prototype.hasOwnProperty.call(
                  dbObject,
                  clobField
                );
              } catch (propCheckError) {
                try {
                  return (
                    clobField in dbObject && dbObject[clobField] !== undefined
                  );
                } catch (inCheckError) {
                  return false; // If both checks fail, assume property doesn't exist
                }
              }
            });
          } catch (clobCheckError) {
            SanitizationLogger.logError(
              'processBatch.clobCheck',
              clobCheckError,
              {
                objectIndex: i,
              }
            );
          }

          if (hasClobFields) {
            try {
              // Handle CLOB extraction only if CLOB fields are present
              const clobData = await this.extractClobData(dbObject);

              // Merge CLOB data with sanitized object, using field mapping
              for (const [clobField, clobValue] of Object.entries(clobData)) {
                try {
                  const mappedField =
                    fieldMapping[clobField] || clobField.toLowerCase();
                  if (clobValue !== '') {
                    // Add non-empty CLOB values
                    sanitizedObject[mappedField] = clobValue;
                  } else {
                    // Remove CLOB objects that failed extraction (empty string result)
                    delete sanitizedObject[mappedField];
                  }
                } catch (clobMergeError) {
                  SanitizationLogger.logError(
                    'processBatch.clobMerge',
                    clobMergeError,
                    {
                      objectIndex: i,
                      clobField,
                    }
                  );
                }
              }
            } catch (clobExtractionError) {
              SanitizationLogger.logError(
                'processBatch.clobExtraction',
                clobExtractionError,
                {
                  objectIndex: i,
                }
              );
              // Continue with object without CLOB data
            }
          }

          sanitizedBatch.push(sanitizedObject);

          if (!sanitizedObject._isFallback) {
            successfulObjects++;
          }
        } catch (objectError) {
          failedObjects++;
          SanitizationLogger.logError('processBatch.object', objectError, {
            objectIndex: i,
            objectType: typeof dbObject,
          });

          // Add fallback object to maintain array indices
          sanitizedBatch.push(this.createFallbackObject(fieldMapping));
        }
      }

      // Log batch performance with enhanced metrics
      const { duration } = benchmark.end();
      const successRate = Math.round((successfulObjects / batch.length) * 100);
      const throughput = Math.round(batch.length / (duration / 1000));

      if (duration > 200 || failedObjects > 0) {
        // Log slow batches or batches with failures
        SanitizationLogger.logPerformance('processBatch', duration, {
          batchSize: batch.length,
          successfulObjects,
          failedObjects,
          successRate: `${successRate}%`,
          throughput: `${throughput} objects/sec`,
          averageTimePerObject: `${
            Math.round((duration / batch.length) * 100) / 100
          }ms`,
        });
      }

      return sanitizedBatch;
    } catch (criticalError) {
      SanitizationLogger.logError('processBatch.critical', criticalError, {
        batchLength: Array.isArray(batch) ? batch.length : 'N/A',
      });

      // Return array of fallback objects
      if (Array.isArray(batch)) {
        return batch.map(() => this.createFallbackObject(fieldMapping));
      } else {
        return [];
      }
    }
  }

  /**
   * Split an array into smaller batches for processing
   * @param {Array} array - Array to split into batches
   * @param {number} batchSize - Size of each batch
   * @returns {Array<Array>} Array of batches
   */
  static createBatches(array, batchSize) {
    try {
      if (!Array.isArray(array)) {
        throw new Error('Input must be an array');
      }

      if (typeof batchSize !== 'number' || batchSize <= 0) {
        throw new Error('Batch size must be a positive number');
      }

      const batches = [];
      for (let i = 0; i < array.length; i += batchSize) {
        try {
          const batch = array.slice(i, i + batchSize);
          batches.push(batch);
        } catch (sliceError) {
          SanitizationLogger.logError('createBatches.slice', sliceError, {
            startIndex: i,
            endIndex: i + batchSize,
            arrayLength: array.length,
          });
          // Continue with next batch
        }
      }

      return batches;
    } catch (criticalError) {
      SanitizationLogger.logError('createBatches.critical', criticalError, {
        arrayType: typeof array,
        arrayLength: Array.isArray(array) ? array.length : 'N/A',
        batchSize,
      });

      // Return single batch with original array as fallback
      return Array.isArray(array) ? [array] : [];
    }
  }

  /**
   * Get the list of CLOB fields that require special handling
   * @returns {Array} Array of CLOB field names
   */
  static getClobFields() {
    return [...CLOB_FIELDS];
  }

  /**
   * Create a fallback object for complete sanitization failures
   * @param {Object} fieldMapping - Optional field mapping to create structured fallback
   * @returns {Object} Safe fallback object
   */
  static createFallbackObject(fieldMapping = ARTICLE_FIELD_MAPPING) {
    try {
      // Track fallback object creation for optimization metrics
      PERFORMANCE_METRICS.optimizationMetrics.fallbackObjectsCreated++;

      const fallbackObject = {};

      // Create fallback with null values for all expected fields
      for (const [dbField, cleanField] of Object.entries(fieldMapping)) {
        fallbackObject[cleanField] = null;
      }

      // Add metadata to indicate this is a fallback
      fallbackObject._isFallback = true;
      fallbackObject._fallbackReason = 'sanitization_failure';

      return fallbackObject;
    } catch (fallbackError) {
      SanitizationLogger.logError('createFallbackObject', fallbackError, {
        fieldMappingKeys: Object.keys(fieldMapping).slice(0, 5),
      });

      // Ultimate fallback - minimal safe object
      return {
        _isFallback: true,
        _fallbackReason: 'critical_failure',
      };
    }
  }

  /**
   * Get performance metrics and error statistics
   * @returns {Object} Performance and error metrics
   */
  static getPerformanceMetrics() {
    return SanitizationLogger.getMetrics();
  }

  /**
   * Get detailed performance analysis with recommendations
   * @returns {Object} Performance analysis and optimization recommendations
   */
  static getPerformanceAnalysis() {
    return SanitizationLogger.getPerformanceAnalysis();
  }

  /**
   * Create performance benchmark for large result set processing
   * @param {number} expectedSize - Expected size of the result set
   * @returns {Object} Benchmark configuration and recommendations
   */
  static createLargeResultSetBenchmark(expectedSize) {
    const benchmark = {
      expectedSize,
      recommendedBatchSize: 100,
      recommendedParallel: false,
      memoryWarning: false,
      recommendations: [],
    };

    // Optimize batch size based on expected size
    if (expectedSize > 1000) {
      benchmark.recommendedBatchSize = Math.min(
        200,
        Math.max(50, Math.floor(expectedSize / 10))
      );
      benchmark.recommendations.push(
        `Optimized batch size to ${benchmark.recommendedBatchSize} for large result set`
      );
    }

    // Recommend parallel processing for very large sets
    if (expectedSize > 5000) {
      benchmark.recommendedParallel = true;
      benchmark.recommendations.push(
        'Parallel processing recommended for very large result set'
      );
    }

    // Memory usage warning
    const estimatedMemoryMB = Math.round((expectedSize * 2) / 1024); // Rough estimate: 2KB per object
    if (estimatedMemoryMB > 500) {
      benchmark.memoryWarning = true;
      benchmark.recommendations.push(
        `High memory usage expected: ~${estimatedMemoryMB}MB. Consider streaming or chunked processing.`
      );
    }

    return benchmark;
  }

  /**
   * Optimize sanitization algorithms based on performance data
   * @returns {Object} Optimization results and applied changes
   */
  static optimizeSanitizationAlgorithms() {
    const analysis = this.getPerformanceAnalysis();
    const optimizations = {
      applied: [],
      recommendations: [],
      metrics: analysis,
    };

    // Analyze operation performance and suggest optimizations
    for (const [operation, stats] of Object.entries(
      analysis.averageOperationTimes
    )) {
      if (stats.average > 500) {
        // Operations taking more than 500ms on average
        optimizations.recommendations.push({
          operation,
          issue: `Slow ${operation} operations (avg: ${stats.average}ms)`,
          suggestions: [
            'Consider reducing batch sizes',
            'Implement caching for repeated operations',
            'Use parallel processing where applicable',
          ],
        });
      }

      if (stats.max > stats.average * 3) {
        // High variance in operation times
        optimizations.recommendations.push({
          operation,
          issue: `High variance in ${operation} performance (max: ${stats.max}ms, avg: ${stats.average}ms)`,
          suggestions: [
            'Investigate outlier cases',
            'Implement adaptive batch sizing',
            'Add circuit breaker for problematic objects',
          ],
        });
      }
    }

    // Memory optimization recommendations
    const currentMemoryMB = Math.round(
      PERFORMANCE_METRICS.memoryUsage.heapUsed / 1024 / 1024
    );
    const peakMemoryMB = Math.round(
      PERFORMANCE_METRICS.memoryUsage.peakHeapUsed / 1024 / 1024
    );

    if (peakMemoryMB > currentMemoryMB * 2) {
      optimizations.recommendations.push({
        operation: 'memory',
        issue: `High memory peak usage: ${peakMemoryMB}MB (current: ${currentMemoryMB}MB)`,
        suggestions: [
          'Implement garbage collection hints',
          'Reduce object retention time',
          'Use streaming processing for large datasets',
        ],
      });
    }

    // Batch processing optimizations
    const batchStats = PERFORMANCE_METRICS.batchProcessingStats;
    if (batchStats.averageBatchSize > 300) {
      optimizations.recommendations.push({
        operation: 'batch',
        issue: `Large average batch size: ${batchStats.averageBatchSize}`,
        suggestions: [
          'Reduce default batch size to improve memory usage',
          'Implement dynamic batch sizing based on object complexity',
        ],
      });
    }

    // Error rate analysis
    const totalOperations =
      PERFORMANCE_METRICS.sanitizationCount +
      PERFORMANCE_METRICS.clobExtractionCount;
    const errorRate =
      totalOperations > 0
        ? (PERFORMANCE_METRICS.errorCount / totalOperations) * 100
        : 0;

    if (errorRate > 5) {
      // More than 5% error rate
      optimizations.recommendations.push({
        operation: 'error_handling',
        issue: `High error rate: ${Math.round(errorRate * 100) / 100}%`,
        suggestions: [
          'Improve input validation',
          'Add more robust error recovery',
          'Implement better fallback mechanisms',
        ],
      });
    }

    return optimizations;
  }

  /**
   * Reset performance metrics and error statistics
   */
  static resetPerformanceMetrics() {
    SanitizationLogger.resetMetrics();
  }
}

module.exports = {
  DatabaseSanitizer,
  SanitizationLogger,
  ARTICLE_FIELD_MAPPING,
  ARTICLE_FIELD_NAMES,
  CLOB_FIELDS,
  PERFORMANCE_METRICS, // Export for testing
};
