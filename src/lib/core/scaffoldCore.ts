/**
 * src/lib/core/scaffoldCore.ts
 *
 * Orchestrator for the core project scaffold pipeline.
 * Delegates each scaffolding concern to a dedicated section module under
 * `core/sections/` and re-exports `scaffoldQueryBuilder` for the DB generators.
 */

import fs from 'fs';
import path from 'path';
import type { TokenDelivery } from '../types';
import { scaffoldErrors } from './sections/errors';
import { scaffoldUtils } from './sections/utils';
import { scaffoldMiddlewares, scaffoldInterfaces } from './sections/middlewares';
import { scaffoldRoutes } from './sections/routes';
import { scaffoldApp } from './sections/app';

/**
 * Runs the full core scaffold pipeline for a new CEM project.
 * Writes errors, utils, shared interfaces, core middlewares, the route
 * registry, and the Express app entry point.
 *
 * @param projectPath   - Absolute path to the project root.
 * @param useRateLimit  - `true` when auth is enabled (adds rate limiter import to app.ts).
 * @param tokenDelivery - Determines whether cookie-parser is added to app.ts.
 */
export function scaffoldCoreFiles(
  projectPath: string,
  useRateLimit = false,
  tokenDelivery: TokenDelivery = 'header',
): void {
  scaffoldErrors(projectPath);
  scaffoldUtils(projectPath);
  scaffoldInterfaces(projectPath);
  scaffoldMiddlewares(projectPath);
  scaffoldRoutes(projectPath);
  scaffoldApp(projectPath, useRateLimit, tokenDelivery);
}

/**
 * Overwrites `src/app/utils/QueryBuilder.ts` with the full Mongoose
 * QueryBuilder implementation (search, filter, sort, paginate, fields).
 * Called by the Mongoose DB generator after `scaffoldCoreFiles`.
 *
 * @param projectPath - Absolute path to the project root.
 */
export function scaffoldQueryBuilder(projectPath: string): void {
  fs.writeFileSync(
    path.join(projectPath, 'src/app/utils/QueryBuilder.ts'),
    `import { QueryFilter, Query } from 'mongoose';

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchableFields: string[]) {
    const searchTerm = this.query?.searchTerm;
    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      } as QueryFilter<T>);
    }
    return this;
  }

  filter() {
    const queryObj = { ...this.query };
    const excludedFields = ['searchTerm', 'sort', 'limit', 'page', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    this.modelQuery = this.modelQuery.find(queryObj as QueryFilter<T>);
    return this;
  }

  sort() {
    const sort =
      (this.query?.sort as string)?.split(',').join(' ') || '-createdAt';
    this.modelQuery = this.modelQuery.sort(sort);
    return this;
  }

  paginate() {
    const page = Number(this.query?.page) || 1;
    const limit = Number(this.query?.limit) || 10;
    const skip = (page - 1) * limit;
    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields() {
    const fields =
      (this.query?.fields as string)?.split(',').join(' ') || '-__v';
    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  async countTotal() {
    const filter = this.modelQuery.getFilter();
    const total = await this.modelQuery.model.countDocuments(filter);
    const page = Number(this.query?.page) || 1;
    const limit = Number(this.query?.limit) || 10;
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default QueryBuilder;
`,
  );
}
