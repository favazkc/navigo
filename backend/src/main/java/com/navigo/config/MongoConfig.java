package com.navigo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB configuration: enables auditing (@CreatedDate / @LastModifiedDate) and
 * repository scanning.
 *
 * IPv4 note: MongoDB Atlas URIs already resolve to IPv4. For local Docker deployments
 * where NAT64 may be an issue, add ?family=4 to the MONGO_URI connection string, or
 * configure the driver via a MongoClientSettingsBuilderCustomizer bean if needed.
 */
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.navigo.repository")
public class MongoConfig {
}
