/**
 * Response Utility Functions
 * 
 * Provides consistent response formatting for API endpoints.
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, data = null, message = "Success", statusCode = 200) => {
  const response = {
    status: "success",
    message,
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Send a created response (HTTP 201)
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 * @param {string} message - Success message
 */
export const sendCreated = (res, data, message = "Created successfully") => {
  sendSuccess(res, data, message, 201);
};

/**
 * Send a no content response (HTTP 204)
 * @param {Object} res - Express response object
 */
export const sendNoContent = (res) => {
  res.status(204).send();
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Object} options - Pagination options
 * @param {Array} options.data - Array of items
 * @param {number} options.page - Current page
 * @param {number} options.limit - Items per page
 * @param {number} options.total - Total items count
 */
export const sendPaginated = (res, { data, page, limit, total }) => {
  const totalPages = Math.ceil(total / limit);
  
  res.status(200).json({
    status: "success",
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};
