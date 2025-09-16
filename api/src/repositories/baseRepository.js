const { logger } = require('../config/logger');
const { 
  DatabaseErrorHandler, 
  NotFoundError, 
  ValidationError,
  QueryError 
} = require('../utils/databaseErrors');

/**
 * Modern Base Repository Class
 * Provides common CRUD operations and modern patterns
 */
class BaseRepository {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Create a new document
   */
  async create(data) {
    try {
      const document = new this.model(data);
      await document.save();
      
      logger.info(`${this.modelName} created:`, { id: document._id });
      return document;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Find document by ID
   */
  async findById(id, options = {}) {
    try {
      const { populate, select } = options;
      let query = this.model.findById(id);
      
      if (populate) {
        query = query.populate(populate);
      }
      
      if (select) {
        query = query.select(select);
      }
      
      const document = await query;
      
      if (!document) {
        throw new NotFoundError(this.modelName);
      }
      
      return document;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by ID:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Find documents with advanced querying
   */
  async find(query = {}, options = {}) {
    try {
      const {
        populate,
        select,
        sort = { createdAt: -1 },
        limit,
        skip = 0,
        lean = false
      } = options;

      let mongooseQuery = this.model.find(query);

      if (populate) {
        mongooseQuery = mongooseQuery.populate(populate);
      }

      if (select) {
        mongooseQuery = mongooseQuery.select(select);
      }

      if (sort) {
        mongooseQuery = mongooseQuery.sort(sort);
      }

      if (skip) {
        mongooseQuery = mongooseQuery.skip(skip);
      }

      if (limit) {
        mongooseQuery = mongooseQuery.limit(limit);
      }

      if (lean) {
        mongooseQuery = mongooseQuery.lean();
      }

      return await mongooseQuery;
    } catch (error) {
      logger.error(`Error finding ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Find one document
   */
  async findOne(query = {}, options = {}) {
    try {
      const { populate, select, lean = false } = options;
      let mongooseQuery = this.model.findOne(query);

      if (populate) {
        mongooseQuery = mongooseQuery.populate(populate);
      }

      if (select) {
        mongooseQuery = mongooseQuery.select(select);
      }

      if (lean) {
        mongooseQuery = mongooseQuery.lean();
      }

      return await mongooseQuery;
    } catch (error) {
      logger.error(`Error finding one ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Update document by ID
   */
  async updateById(id, updateData, options = {}) {
    try {
      const {
        populate,
        select,
        new: returnNew = true,
        runValidators = true
      } = options;

      // Add updatedAt timestamp
      updateData.updatedAt = new Date();

      let query = this.model.findByIdAndUpdate(
        id,
        updateData,
        { 
          new: returnNew, 
          runValidators 
        }
      );

      if (populate) {
        query = query.populate(populate);
      }

      if (select) {
        query = query.select(select);
      }

      const document = await query;

      if (!document) {
        throw new NotFoundError(this.modelName);
      }

      logger.info(`${this.modelName} updated:`, { id: document._id });
      return document;
    } catch (error) {
      logger.error(`Error updating ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Update multiple documents
   */
  async updateMany(query, updateData, options = {}) {
    try {
      updateData.updatedAt = new Date();

      const result = await this.model.updateMany(query, updateData, options);
      
      logger.info(`${this.modelName} bulk update:`, { 
        matched: result.matchedCount, 
        modified: result.modifiedCount 
      });
      
      return result;
    } catch (error) {
      logger.error(`Error bulk updating ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id) {
    try {
      const document = await this.model.findByIdAndDelete(id);
      
      if (!document) {
        throw new NotFoundError(this.modelName);
      }

      logger.info(`${this.modelName} deleted:`, { id });
      return document;
    } catch (error) {
      logger.error(`Error deleting ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(query) {
    try {
      const result = await this.model.deleteMany(query);
      
      logger.info(`${this.modelName} bulk delete:`, { 
        deleted: result.deletedCount 
      });
      
      return result;
    } catch (error) {
      logger.error(`Error bulk deleting ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Count documents
   */
  async count(query = {}) {
    try {
      return await this.model.countDocuments(query);
    } catch (error) {
      logger.error(`Error counting ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Check if document exists
   */
  async exists(query) {
    try {
      const count = await this.model.countDocuments(query);
      return count > 0;
    } catch (error) {
      logger.error(`Error checking ${this.modelName} existence:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Paginated query
   */
  async paginate(query = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        populate,
        select,
        sort = { createdAt: -1 },
        lean = false
      } = options;

      const skip = (page - 1) * limit;

      // Get total count
      const total = await this.count(query);

      // Get documents
      const documents = await this.find(query, {
        populate,
        select,
        sort,
        skip,
        limit,
        lean
      });

      return {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error(`Error paginating ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Aggregate query
   */
  async aggregate(pipeline, options = {}) {
    try {
      const { allowDiskUse = false } = options;
      return await this.model.aggregate(pipeline, { allowDiskUse });
    } catch (error) {
      logger.error(`Error aggregating ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Bulk operations
   */
  async bulkWrite(operations) {
    try {
      const result = await this.model.bulkWrite(operations);
      
      logger.info(`${this.modelName} bulk operations:`, {
        inserted: result.insertedCount,
        updated: result.modifiedCount,
        deleted: result.deletedCount,
        upserted: result.upsertedCount
      });
      
      return result;
    } catch (error) {
      logger.error(`Error bulk writing ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    }
  }

  /**
   * Transaction support
   */
  async withTransaction(callback) {
    const session = await this.model.db.startSession();
    
    try {
      await session.withTransaction(async () => {
        await callback(session);
      });
    } catch (error) {
      logger.error(`Transaction error for ${this.modelName}:`, error);
      throw DatabaseErrorHandler.handleError(error);
    } finally {
      await session.endSession();
    }
  }
}

module.exports = BaseRepository;