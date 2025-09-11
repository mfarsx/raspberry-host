/**
 * Service Container - Simple dependency injection container
 *
 * Provides service registration, resolution, and lifecycle management
 * for better testability and separation of concerns.
 */

class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a service class
   * @param {string} name - Service name
   * @param {Function} serviceClass - Service class constructor
   * @param {Object} options - Registration options
   */
  register(name, serviceClass, options = {}) {
    const { singleton = true, dependencies = [], factory = null } = options;

    this.services.set(name, {
      serviceClass,
      singleton,
      dependencies,
      factory,
    });

    return this;
  }

  /**
   * Register a factory function
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {Object} options - Registration options
   */
  registerFactory(name, factory, options = {}) {
    const { singleton = true, dependencies = [] } = options;

    this.factories.set(name, {
      factory,
      singleton,
      dependencies,
    });

    return this;
  }

  /**
   * Register a singleton instance
   * @param {string} name - Service name
   * @param {any} instance - Service instance
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
    return this;
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  resolve(name) {
    // Check if already instantiated as singleton
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if it's a factory
    if (this.factories.has(name)) {
      return this.resolveFactory(name);
    }

    // Check if it's a registered service
    if (this.services.has(name)) {
      return this.resolveService(name);
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Resolve a service from factory
   * @private
   */
  resolveFactory(name) {
    const factoryConfig = this.factories.get(name);
    const { factory, singleton, dependencies } = factoryConfig;

    // Resolve dependencies
    const resolvedDependencies = dependencies.map((dep) => this.resolve(dep));

    // Create instance
    const instance = factory(...resolvedDependencies);

    // Store as singleton if configured
    if (singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Resolve a service from class
   * @private
   */
  resolveService(name) {
    const serviceConfig = this.services.get(name);
    const { serviceClass, singleton, dependencies, factory } = serviceConfig;

    // Use factory if provided
    if (factory) {
      const resolvedDependencies = dependencies.map((dep) => this.resolve(dep));
      const instance = factory(...resolvedDependencies);

      if (singleton) {
        this.singletons.set(name, instance);
      }

      return instance;
    }

    // Resolve dependencies
    const dependencyInstances = {};
    for (const dep of dependencies) {
      dependencyInstances[dep] = this.resolve(dep);
    }

    // Create instance
    const instance = new serviceClass(dependencyInstances);

    // Store as singleton if configured
    if (singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return (
      this.services.has(name) ||
      this.factories.has(name) ||
      this.singletons.has(name)
    );
  }

  /**
   * Get all registered service names
   * @returns {Array<string>} Service names
   */
  getServiceNames() {
    return [
      ...this.services.keys(),
      ...this.factories.keys(),
      ...this.singletons.keys(),
    ];
  }

  /**
   * Clear all services (useful for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const services = [];

    for (const [name, instance] of this.singletons) {
      if (instance && typeof instance.getHealthStatus === "function") {
        try {
          services.push({
            name,
            ...instance.getHealthStatus(),
          });
        } catch (error) {
          services.push({
            name,
            status: "error",
            error: error.message,
          });
        }
      } else {
        services.push({
          name,
          status: "unknown",
          message: "Health check not available",
        });
      }
    }

    return {
      container: "ServiceContainer",
      status: services.every((s) => s.status === "healthy")
        ? "healthy"
        : "degraded",
      services,
      registeredCount: this.services.size + this.factories.size,
      instantiatedCount: this.singletons.size,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Default service container instance
 */
const defaultContainer = new ServiceContainer();

module.exports = {
  ServiceContainer,
  defaultContainer,
};
